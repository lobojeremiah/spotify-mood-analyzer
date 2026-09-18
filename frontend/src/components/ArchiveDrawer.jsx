import React, { useState, useEffect } from "react";
import { X, ExternalLink, Calendar, Music, User, Disc, Clock } from "lucide-react";

export function ArchiveDrawer({ selectedObject, onClose, apiBase }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedObject) return;
    setLoading(true);

    let url = "";
    if (selectedObject.type === "artist") {
      url = `${apiBase}/api/archive/artist?name=${encodeURIComponent(selectedObject.name)}`;
    } else if (selectedObject.type === "track") {
      url = selectedObject.id
        ? `${apiBase}/api/archive/track?id=${selectedObject.id}`
        : `${apiBase}/api/archive/track?name=${encodeURIComponent(selectedObject.name)}&artist=${encodeURIComponent(selectedObject.artist)}`;
    } else if (selectedObject.type === "album") {
      url = `${apiBase}/api/archive/album?name=${encodeURIComponent(selectedObject.name)}&artist=${encodeURIComponent(selectedObject.artist || "")}`;
    }

    fetch(url)
      .then((res) => res.json())
      .then((resData) => {
        setData(resData);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching detail:", err);
        setLoading(false);
      });
  }, [selectedObject, apiBase]);

  if (!selectedObject) return null;

  const formatNum = (val) => new Intl.NumberFormat().format(val || 0);

  const getSpotifyTrackUrl = (uri) => {
    if (!uri) return null;
    if (uri.startsWith("spotify:track:")) {
      return `https://open.spotify.com/track/${uri.split(":")[2]}`;
    }
    if (uri.startsWith("http")) return uri;
    return `https://open.spotify.com/track/${uri}`;
  };

  const coverArt = data?.spotify_artwork_url
    || (data?.provider_release_id ? `https://coverartarchive.org/release/${data.provider_release_id}/front-250` : null);

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-drawer-btn" onClick={onClose} aria-label="Close detail panel">
          <X size={20} />
        </button>

        {loading ? (
          <p style={{ color: "var(--text-muted)", padding: "40px 0" }}>Loading object archive details...</p>
        ) : data ? (
          <div>
            {/* ARTIST ARCHIVE VIEW */}
            {selectedObject.type === "artist" && (
              <div>
                <div className="drawer-header">
                  <span className="section-note" style={{ textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700 }}>
                    Artist Archive
                  </span>
                  <h3>{data.artist}</h3>
                  <p className="drawer-sub">Personal listening history breakdown for {data.artist}</p>
                </div>

                <div className="drawer-stats-row">
                  <div className="drawer-stat-item">
                    <strong>{formatNum(data.plays)}</strong>
                    <span>Total Plays</span>
                  </div>
                  <div className="drawer-stat-item">
                    <strong>{data.hours}h</strong>
                    <span>Listening Time</span>
                  </div>
                  <div className="drawer-stat-item">
                    <strong>{data.unique_tracks}</strong>
                    <span>Unique Tracks</span>
                  </div>
                </div>

                <div style={{ marginBottom: 24, fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                  <div style={{ display: "flex", gap: 16 }}>
                    <span>
                      <Calendar size={14} style={{ verticalAlign: "middle", marginRight: 4 }} />
                      First played: <strong>{data.first_played || "—"}</strong>
                    </span>
                    <span>
                      Last played: <strong>{data.last_played || "—"}</strong>
                    </span>
                  </div>
                </div>

                <div className="drawer-section-title">Top Tracks</div>
                <div className="drawer-list">
                  {data.topTracks?.map((tr, idx) => {
                    const trackUrl = getSpotifyTrackUrl(tr.spotify_track_uri);
                    return (
                      <div key={tr.id || tr.track} className="drawer-list-item">
                        <div>
                          <strong>{idx + 1}. {tr.track}</strong>
                          <span style={{ display: "block", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                            {tr.album_name}
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <span>{formatNum(tr.plays)} plays ({tr.hours}h)</span>
                          {trackUrl && (
                            <a href={trackUrl} target="_blank" rel="noreferrer" className="spotify-external-link">
                              <ExternalLink size={12} />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {data.topAlbums?.length > 0 && (
                  <>
                    <div className="drawer-section-title">Top Albums</div>
                    <div className="drawer-list">
                      {data.topAlbums.map((alb) => (
                        <div key={alb.album_name} className="drawer-list-item">
                          <div>
                            <strong>{alb.album_name}</strong>
                            <span style={{ display: "block", fontSize: "0.78rem", color: "var(--text-muted)" }}>
                              {alb.track_count} tracks played
                            </span>
                          </div>
                          <span>{formatNum(alb.plays)} plays ({alb.hours}h)</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* TRACK ARCHIVE VIEW */}
            {selectedObject.type === "track" && (
              <div>
                <div className="drawer-header" style={{ display: "flex", gap: 20, alignItems: "center" }}>
                  <div style={{ width: 84, height: 84, borderRadius: 12, overflow: "hidden", background: "var(--bg-dark-banner)", flexShrink: 0 }}>
                    {coverArt ? (
                      <img src={coverArt} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => (e.target.style.display = "none")} />
                    ) : (
                      <div style={{ display: "flex", height: "100%", alignItems: "center", justifyCenter: "center" }}>
                        <Music size={36} style={{ margin: "auto", color: "var(--accent-bright)" }} />
                      </div>
                    )}
                  </div>
                  <div>
                    <span className="section-note" style={{ textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700 }}>
                      Track Archive
                    </span>
                    <h3 style={{ fontSize: "2rem" }}>{data.track}</h3>
                    <p className="drawer-sub">{data.artist} · <em>{data.album_name}</em></p>
                  </div>
                </div>

                <div className="drawer-stats-row">
                  <div className="drawer-stat-item">
                    <strong>{formatNum(data.plays)}</strong>
                    <span>Total Plays</span>
                  </div>
                  <div className="drawer-stat-item">
                    <strong>{data.hours}h</strong>
                    <span>Listening Time</span>
                  </div>
                  <div className="drawer-stat-item">
                    <strong>{data.first_played ? data.first_played.slice(0, 4) : "—"}</strong>
                    <span>First Discovered</span>
                  </div>
                </div>

                {getSpotifyTrackUrl(data.spotify_track_uri) && (
                  <div style={{ marginBottom: 28 }}>
                    <a
                      href={getSpotifyTrackUrl(data.spotify_track_uri)}
                      target="_blank"
                      rel="noreferrer"
                      className="spotify-external-link"
                      style={{ padding: "12px 24px", fontSize: "0.9rem" }}
                    >
                      <ExternalLink size={16} />
                      <span>Listen on Spotify</span>
                    </a>
                  </div>
                )}

                <div className="drawer-section-title">Timeline History</div>
                <div className="drawer-list">
                  {data.timeline?.map((t) => (
                    <div key={t.year} className="drawer-list-item">
                      <strong>Year {t.year.slice(0, 4)}</strong>
                      <span>{formatNum(t.plays)} plays ({t.hours}h)</span>
                    </div>
                  ))}
                </div>

                {(data.genres?.length > 0 || data.tags?.length > 0) && (
                  <>
                    <div className="drawer-section-title">MusicBrainz Tags</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {(data.tags || data.genres || []).map((tg) => (
                        <span key={tg} className="chip-btn">
                          {tg}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ALBUM ARCHIVE VIEW */}
            {selectedObject.type === "album" && (
              <div>
                <div className="drawer-header" style={{ display: "flex", gap: 20, alignItems: "center" }}>
                  <div style={{ width: 84, height: 84, borderRadius: 12, overflow: "hidden", background: "var(--bg-dark-banner)", flexShrink: 0 }}>
                    {coverArt ? (
                      <img src={coverArt} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => (e.target.style.display = "none")} />
                    ) : (
                      <div style={{ display: "flex", height: "100%", alignItems: "center", justifyCenter: "center" }}>
                        <Disc size={36} style={{ margin: "auto", color: "var(--accent-bright)" }} />
                      </div>
                    )}
                  </div>
                  <div>
                    <span className="section-note" style={{ textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700 }}>
                      Album Archive
                    </span>
                    <h3 style={{ fontSize: "2rem" }}>{data.album_name}</h3>
                    <p className="drawer-sub">{data.artist}</p>
                  </div>
                </div>

                <div className="drawer-stats-row">
                  <div className="drawer-stat-item">
                    <strong>{formatNum(data.plays)}</strong>
                    <span>Total Plays</span>
                  </div>
                  <div className="drawer-stat-item">
                    <strong>{data.hours}h</strong>
                    <span>Listening Time</span>
                  </div>
                  <div className="drawer-stat-item">
                    <strong>{data.tracks?.length || 0}</strong>
                    <span>Tracks Played</span>
                  </div>
                </div>

                <div className="drawer-section-title">Album Tracklist in Library</div>
                <div className="drawer-list">
                  {data.tracks?.map((tr, idx) => {
                    const trackUrl = getSpotifyTrackUrl(tr.spotify_track_uri);
                    return (
                      <div key={tr.id || tr.track} className="drawer-list-item">
                        <strong>{idx + 1}. {tr.track}</strong>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <span>{formatNum(tr.plays)} plays</span>
                          {trackUrl && (
                            <a href={trackUrl} target="_blank" rel="noreferrer" className="spotify-external-link">
                              <ExternalLink size={12} />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p style={{ color: "var(--text-muted)" }}>No details found for this object.</p>
        )}
      </div>
    </div>
  );
}
