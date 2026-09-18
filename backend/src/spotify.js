import { config } from "./config.js";
import { query } from "./db.js";

// ---------------------------------------------------------------------------
// Token management — Client Credentials flow, no user auth required
// ---------------------------------------------------------------------------
let cachedToken = null;
let tokenExpiresAt = 0;

export async function getSpotifyAccessToken() {
  const { clientId, clientSecret } = config.spotify;
  if (!clientId || !clientSecret) return null;

  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt - 60_000) return cachedToken;

  try {
    const creds = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const res = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${creds}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: "grant_type=client_credentials"
    });
    if (!res.ok) { console.error("Spotify token error:", res.status); return null; }
    const data = await res.json();
    cachedToken = data.access_token;
    tokenExpiresAt = now + (data.expires_in || 3600) * 1000;
    return cachedToken;
  } catch (err) {
    console.error("Spotify token fetch error:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
export function extractSpotifyTrackId(uriOrUrl) {
  if (!uriOrUrl) return null;
  if (uriOrUrl.startsWith("spotify:track:")) return uriOrUrl.split(":")[2];
  const m = uriOrUrl.match(/open\.spotify\.com\/track\/([a-zA-Z0-9]+)/);
  if (m) return m[1];
  if (/^[a-zA-Z0-9]{22}$/.test(uriOrUrl)) return uriOrUrl;
  return null;
}

export function getCanonicalSpotifyUrl(spotifyTrackUri) {
  const id = extractSpotifyTrackId(spotifyTrackUri);
  return id ? `https://open.spotify.com/track/${id}` : null;
}

// ---------------------------------------------------------------------------
// Track enrichment — fetches artwork from Spotify Web API for a single track,
// falls back to oEmbed, caches result into PostgreSQL
// ---------------------------------------------------------------------------
export async function fetchSpotifyTrackMetadata(spotifyTrackUri) {
  const trackId = extractSpotifyTrackId(spotifyTrackUri);
  if (!trackId) return null;

  const token = await getSpotifyAccessToken();
  if (token) {
    try {
      const res = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        return {
          trackId,
          artworkUrl: data.album?.images?.[0]?.url ?? null,
          albumName: data.album?.name ?? null,
          canonicalUrl: `https://open.spotify.com/track/${trackId}`
        };
      }
    } catch (err) {
      console.error(`Spotify track API error ${trackId}:`, err);
    }
  }

  // oEmbed fallback (no auth needed)
  try {
    const canonicalUrl = `https://open.spotify.com/track/${trackId}`;
    const res = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(canonicalUrl)}`);
    if (res.ok) {
      const data = await res.json();
      return { trackId, artworkUrl: data.thumbnail_url ?? null, albumName: null, canonicalUrl };
    }
  } catch (err) {
    console.error(`Spotify oEmbed error ${trackId}:`, err);
  }

  return null;
}

/**
 * Given a list of track rows (each with id, spotify_track_uri,
 * spotify_artwork_url), fetch missing artwork from Spotify in small batches
 * and persist into PostgreSQL so subsequent requests are free.
 */
export async function enrichTracksWithSpotify(tracks) {
  if (!Array.isArray(tracks) || tracks.length === 0) return tracks;

  const updated = [...tracks];
  const toFetch = updated.filter(
    (t) => !t.spotify_artwork_url && t.spotify_track_uri
  );

  const BATCH = 10;
  for (let i = 0; i < toFetch.length; i += BATCH) {
    await Promise.all(
      toFetch.slice(i, i + BATCH).map(async (track) => {
        const meta = await fetchSpotifyTrackMetadata(track.spotify_track_uri);
        if (!meta?.artworkUrl) return;

        track.spotify_artwork_url = meta.artworkUrl;
        if (meta.albumName && (!track.album_name || track.album_name === "Unknown Album")) {
          track.album_name = meta.albumName;
        }

        try {
          await query(
            `UPDATE tracks
               SET spotify_artwork_url = $1,
                   album_name = COALESCE(NULLIF(album_name, 'Unknown Album'), $2)
             WHERE id = $3`,
            [meta.artworkUrl, meta.albumName ?? "Unknown Album", track.id]
          );
          await query(
            `INSERT INTO track_metadata (track_id, provider, provider_recording_id, image_url, enrichment_status, enriched_at)
             VALUES ($1, 'spotify', $2, $3, 'enriched', NOW())
             ON CONFLICT (track_id, provider)
             DO UPDATE SET image_url = EXCLUDED.image_url, enrichment_status = 'enriched', enriched_at = NOW()`,
            [track.id, meta.trackId, meta.artworkUrl]
          );
        } catch (dbErr) {
          console.error(`Failed caching artwork for track ${track.id}:`, dbErr);
        }
      })
    );
  }

  return updated.map((t) => ({
    ...t,
    spotify_track_url: getCanonicalSpotifyUrl(t.spotify_track_uri)
  }));
}

// ---------------------------------------------------------------------------
// Artist enrichment — search Spotify by name, grab artist image, cache it
// ---------------------------------------------------------------------------

/**
 * Search Spotify for an artist by exact name and return their image URL + Spotify ID.
 */
async function fetchSpotifyArtistMetadata(artistName) {
  const token = await getSpotifyAccessToken();
  if (!token) return null;

  try {
    const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(artistName)}&type=artist&limit=1`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return null;

    const data = await res.json();
    const artist = data.artists?.items?.[0];
    if (!artist) return null;

    // Only accept if name matches well (case-insensitive)
    const nameMatch = artist.name.toLowerCase() === artistName.toLowerCase();
    if (!nameMatch) return null;

    return {
      spotifyArtistId: artist.id,
      imageUrl: artist.images?.[0]?.url ?? null  // largest image
    };
  } catch (err) {
    console.error(`Spotify artist search error for "${artistName}":`, err);
    return null;
  }
}

/**
 * Given a list of artist rows (each with name, spotify_image_url),
 * fetch missing images from Spotify and persist into the artists table.
 */
export async function enrichArtistsWithSpotify(artists) {
  if (!Array.isArray(artists) || artists.length === 0) return artists;

  const updated = [...artists];
  const toFetch = updated.filter((a) => !a.spotify_image_url);

  const BATCH = 5;
  for (let i = 0; i < toFetch.length; i += BATCH) {
    await Promise.all(
      toFetch.slice(i, i + BATCH).map(async (artist) => {
        const meta = await fetchSpotifyArtistMetadata(artist.artist);
        if (!meta?.imageUrl) return;

        artist.spotify_image_url = meta.imageUrl;
        artist.spotify_artist_id = meta.spotifyArtistId;

        try {
          await query(
            `UPDATE artists
               SET spotify_image_url = $1, spotify_artist_id = $2
             WHERE name = $3`,
            [meta.imageUrl, meta.spotifyArtistId, artist.artist]
          );
        } catch (dbErr) {
          console.error(`Failed caching image for artist "${artist.artist}":`, dbErr);
        }
      })
    );
  }

  return updated;
}
