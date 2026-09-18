import { closePool, pool } from "../db.js";
import {
  assertMusicBrainzConfig,
  getMusicBrainzRequestDelayMs,
  MusicBrainzApiError,
  searchRecordings
} from "./client.js";
import { matchMusicBrainzRecording } from "./matching.js";

const PROVIDER = "musicbrainz";
const DEFAULT_LIMIT = 5;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function searchRecordingsWithRetry(searchInput, options = {}) {
  const maxAttempts = options.maxAttempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 2000;

  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await searchRecordings(searchInput);
    } catch (error) {
      lastError = error;

      const retryable =
        error instanceof MusicBrainzApiError &&
        ["network_error", "service_unavailable", "rate_limited"].includes(
          error.kind
        );

      if (!retryable || attempt === maxAttempts) {
        throw error;
      }

      const retryDelay = baseDelayMs * 2 ** (attempt - 1);

      console.warn(
        `MusicBrainz ${error.kind}, retrying in ${retryDelay}ms ` +
        `(attempt ${attempt + 1}/${maxAttempts})`
      );

      await delay(retryDelay);
    }
  }

  throw lastError;
}

function extractNames(items = []) {
  return [...new Set(items.map((item) => item.name).filter(Boolean))];
}

function parseLimit(value) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return DEFAULT_LIMIT;
  }

  return parsed;
}

async function getTracksNeedingEnrichment(client, limit) {
  const result = await client.query(
    `
      SELECT
        t.id AS track_id,
        t.name AS track_name,
        t.album_name,
        a.name AS artist_name,
        tm.enrichment_status
      FROM tracks t
      JOIN artists a ON a.id = t.artist_id
      LEFT JOIN track_metadata tm
        ON tm.track_id = t.id
       AND tm.provider = $1
      WHERE tm.id IS NULL
         OR tm.enrichment_status IN ('pending', 'error')
      ORDER BY t.created_at, t.id
    `,
    [PROVIDER]
  );

  return result.rows.slice(0, limit);
}

async function upsertMetadata(client, track, metadata) {
  await client.query(
    `
      INSERT INTO track_metadata (
        track_id,
        provider,
        provider_recording_id,
        provider_release_id,
        genres,
        tags,
        enrichment_status,
        enriched_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())
      ON CONFLICT (track_id, provider)
      DO UPDATE SET
        provider_recording_id = EXCLUDED.provider_recording_id,
        provider_release_id = EXCLUDED.provider_release_id,
        genres = EXCLUDED.genres,
        tags = EXCLUDED.tags,
        enrichment_status = EXCLUDED.enrichment_status,
        enriched_at = EXCLUDED.enriched_at,
        updated_at = now()
    `,
    [
      track.track_id,
      PROVIDER,
      metadata.providerRecordingId,
      metadata.providerReleaseId,
      metadata.genres,
      metadata.tags,
      metadata.enrichmentStatus,
      metadata.enrichedAt
    ]
  );
}

function metadataFromMatch(match) {
  if (match.status !== "matched") {
    return {
      providerRecordingId: null,
      providerReleaseId: null,
      genres: [],
      tags: [],
      enrichmentStatus: match.status,
      enrichedAt: null
    };
  }

  const candidate = match.bestCandidate;

  return {
    providerRecordingId: candidate.id,
    providerReleaseId: candidate.releases?.[0]?.id || null,
    genres: extractNames(candidate.genres),
    tags: extractNames(candidate.tags),
    enrichmentStatus: "enriched",
    enrichedAt: new Date().toISOString()
  };
}

async function markError(client, track) {
  await upsertMetadata(client, track, {
    providerRecordingId: null,
    providerReleaseId: null,
    genres: [],
    tags: [],
    enrichmentStatus: "error",
    enrichedAt: null
  });
}

export async function enrichTracks(options = {}) {
  assertMusicBrainzConfig();

  const limit = parseLimit(options.limit);

  console.log(`Requested enrichment limit: ${limit}`);

  const client = await pool.connect();

  const summary = {
    processed: 0,
    matched: 0,
    ambiguous: 0,
    notFound: 0,
    errors: 0,
    skippedAlreadyEnriched: 0,
    results: []
  };

  try {
    const tracks = await getTracksNeedingEnrichment(client, limit);

    console.log(`Tracks selected for enrichment: ${tracks.length}`);

    for (const [index, track] of tracks.entries()) {
      console.log(
        `Enriching ${index + 1}/${tracks.length}: ` +
        `${track.track_name} - ${track.artist_name}`
      );

      try {
        const searchInput = {
          trackName: track.track_name,
          artistName: track.artist_name,
          albumName:
            track.album_name === "Unknown Album"
              ? null
              : track.album_name,
          limit: 5
        };

        // First attempt: title + artist + album
        let response = await searchRecordingsWithRetry(searchInput);

        // Fallback: title + artist
        if (response.recordings.length === 0 && searchInput.albumName) {
          await delay(getMusicBrainzRequestDelayMs());

          response = await searchRecordingsWithRetry({
            trackName: searchInput.trackName,
            artistName: searchInput.artistName,
            albumName: null,
            limit: 5
          });
        }

        const match = matchMusicBrainzRecording(
          {
            trackName: track.track_name,
            artistName: track.artist_name,
            albumName: track.album_name
          },
          response.recordings
        );

        await upsertMetadata(
          client,
          track,
          metadataFromMatch(match)
        );

        summary.processed += 1;

        if (match.status === "matched") {
          summary.matched += 1;
        }

        if (match.status === "ambiguous") {
          summary.ambiguous += 1;
        }

        if (match.status === "not_found") {
          summary.notFound += 1;
        }

        summary.results.push({
          track: track.track_name,
          artist: track.artist_name,
          status: match.status,
          confidence: match.confidence,
          recordingId: match.bestCandidate?.id || null,
          scoringBreakdown: match.scoringBreakdown,
          candidates: response.recordings.map((candidate) => ({
            id: candidate.id,
            score: candidate.score,
            title: candidate.title,
            artistCredits: candidate.artistCredits,
            releases: candidate.releases,
            tags: candidate.tags,
            genres: candidate.genres
          }))
        });
      } catch (error) {
        await markError(client, track);

        summary.processed += 1;
        summary.errors += 1;

        summary.results.push({
          track: track.track_name,
          artist: track.artist_name,
          status: "error",
          errorKind:
            error instanceof MusicBrainzApiError
              ? error.kind
              : "unexpected_error"
        });
      }

      if (index < tracks.length - 1) {
        await delay(getMusicBrainzRequestDelayMs());
      }
    }

    return summary;
  } finally {
    client.release();
    await closePool();
  }
}