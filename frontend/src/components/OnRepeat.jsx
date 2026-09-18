import React from "react";
import { MetricToggle } from "./MetricToggle";
import { ExternalLink, User, Play, Music } from "lucide-react";

export function OnRepeat({ artists, tracks, metric, setMetric, onSelectResult }) {
  const formatNum = (val) => new Intl.NumberFormat().format(val || 0);
  const formatHours = (val) => Number(val || 0).toFixed(1) + "h";

  const getSpotifyTrackUrl = (uri) => {
    if (!uri) return null;
    if (uri.startsWith("spotify:track:")) {
      return `https://open.spotify.com/track/${uri.split(":")[2]}`;
    }
    if (uri.startsWith("http")) return uri;
    return `https://open.spotify.com/track/${uri}`;
  };

  const getCoverArt = (tr) => {
    if (tr?.spotify_artwork_url) return tr.spotify_artwork_url;
    if (tr?.provider_release_id) return `https://coverartarchive.org/release/${tr.provider_release_id}/front-250`;
    return null;
  };

  return (
    <div className="story-section">
      <div className="section-header">
        <div className="section-title-group">
          <p>02 · Leaders</p>
          <h2>On repeat</h2>
          <span className="section-note">
            Your most played artists and album sleeve tracks across seven years of listening.
          </span>
        </div>
        <MetricToggle metric={metric} setMetric={setMetric} />
      </div>

      <div className="leader-grid">
        {/* ARTISTS COLUMN */}
        <div>
          <h3 style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-muted)", marginBottom: 16 }}>
            Top Artists
          </h3>
          <div className="artist-cards-list">
            {(artists || []).slice(0, 8).map((art, idx) => (
              <div
                key={art.artist}
                className="artist-visual-card"
                onClick={() => onSelectResult({ type: "artist", name: art.artist })}
              >
                <div className="artist-info-group">
                  <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--accent-bright)", width: 22 }}>
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <div className="artist-avatar-badge">
                    <User size={20} />
                    {art.spotify_image_url && (
                      <img
                        src={art.spotify_image_url}
                        alt={`${art.artist} artist portrait`}
                        onError={(event) => { event.currentTarget.style.display = "none"; }}
                      />
                    )}
                  </div>
                  <div>
                    <strong style={{ display: "block", fontSize: "1rem", color: "var(--text-primary)" }}>{art.artist}</strong>
                    <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                      {formatNum(art.plays)} plays · {formatHours(art.hours)}
                    </span>
                  </div>
                </div>
                <button className="chip-btn" style={{ fontSize: "0.72rem" }}>
                  Explore
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* TRACK SLEEVES COLUMN */}
        <div>
          <h3 style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--text-muted)", marginBottom: 16 }}>
            Top Tracks · Album Sleeves
          </h3>
          <div className="track-sleeves-grid">
            {(tracks || []).slice(0, 8).map((tr, idx) => {
              const cover = getCoverArt(tr);
              const spotifyUrl = tr.spotify_track_url || getSpotifyTrackUrl(tr.spotify_track_uri);

              return (
                <div
                  key={tr.track + tr.artist}
                  className="track-sleeve-card"
                  onClick={() => onSelectResult({ type: "track", id: tr.id, name: tr.track, artist: tr.artist })}
                >
                  <div className="track-cover-bg">
                    {cover ? (
                      <img src={cover} alt="" onError={(e) => (e.target.style.display = "none")} />
                    ) : (
                      <div className="track-vinyl-placeholder">{tr.track.slice(0, 1)}</div>
                    )}
                  </div>

                  <div className="track-hover-actions">
                    {spotifyUrl && (
                      <a
                        href={spotifyUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="spotify-external-link"
                        onClick={(e) => e.stopPropagation()}
                        title="Open in Spotify"
                      >
                        <ExternalLink size={12} />
                        <span>Spotify</span>
                      </a>
                    )}
                  </div>

                  <div className="track-card-content">
                    <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "var(--accent-bright)", display: "block", marginBottom: 4 }}>
                      #{String(idx + 1).padStart(2, "0")}
                    </span>
                    <div className="track-card-title">{tr.track}</div>
                    <span className="track-card-artist">{tr.artist}</span>
                    <span className="track-card-stats">
                      {metric === "hours" ? formatHours(tr.hours) : `${formatNum(tr.plays)} plays`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
