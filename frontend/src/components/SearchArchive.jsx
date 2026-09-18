import React, { useState, useEffect, useRef } from "react";
import { Search, User, Disc, Music2, ExternalLink } from "lucide-react";

export function SearchArchive({ apiBase, onSelectResult, searchRef }) {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const sampleSearches = ["Justin Bieber", "The Weeknd", "Radiohead", "Starboy", "Coldplay", "Taylor Swift", "Blinding Lights"];

  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      return;
    }

    const timer = setTimeout(() => {
      setLoading(true);
      fetch(`${apiBase}/api/search?q=${encodeURIComponent(query)}&limit=16`)
        .then((res) => res.json())
        .then((data) => {
          setResults(data);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Search error:", err);
          setLoading(false);
        });
    }, 250);

    return () => clearTimeout(timer);
  }, [query, apiBase]);

  const formatNum = (val) => new Intl.NumberFormat().format(val || 0);

  const getSpotifyTrackUrl = (uri) => {
    if (!uri) return null;
    if (uri.startsWith("spotify:track:")) {
      return `https://open.spotify.com/track/${uri.split(":")[2]}`;
    }
    if (uri.startsWith("http")) return uri;
    return `https://open.spotify.com/track/${uri}`;
  };

  const getCoverArt = (item) => {
    if (item?.spotify_artwork_url) return item.spotify_artwork_url;
    if (item?.provider_release_id) return `https://coverartarchive.org/release/${item.provider_release_id}/front-250`;
    return null;
  };

  return (
    <div className="story-section" ref={searchRef}>
      <div className="section-header">
        <div className="section-title-group">
          <p>01 · Core Archive Feature</p>
          <h2>Search your listening history</h2>
          <span className="section-note">
            Query your personal 70,692 event PostgreSQL database for artists, songs, or albums.
          </span>
        </div>
      </div>

      <div className="archive-search-box">
        <div className="search-input-wrapper">
          <Search size={22} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search artists, tracks, or albums (e.g. Justin Bieber)..."
          />
        </div>

        <div className="quick-search-chips">
          <span>Try searching:</span>
          {sampleSearches.map((term) => (
            <button key={term} className="chip-btn" onClick={() => setQuery(term)}>
              {term}
            </button>
          ))}
        </div>

        {query.trim() && (
          <div className="search-tabs">
            <button className={`tab-btn ${activeTab === "all" ? "active" : ""}`} onClick={() => setActiveTab("all")}>
              All Results
            </button>
            <button className={`tab-btn ${activeTab === "artist" ? "active" : ""}`} onClick={() => setActiveTab("artist")}>
              Artists ({results?.artists?.length || 0})
            </button>
            <button className={`tab-btn ${activeTab === "track" ? "active" : ""}`} onClick={() => setActiveTab("track")}>
              Tracks ({results?.tracks?.length || 0})
            </button>
            <button className={`tab-btn ${activeTab === "album" ? "active" : ""}`} onClick={() => setActiveTab("album")}>
              Albums ({results?.albums?.length || 0})
            </button>
          </div>
        )}

        {loading && <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", padding: "12px 0" }}>Searching your database...</p>}

        {results && (
          <div>
            {(activeTab === "all" || activeTab === "artist") && results.artists?.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <h4 style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--accent-bright)", marginBottom: 12 }}>
                  Artists
                </h4>
                <div className="search-results-grid">
                  {results.artists.map((item) => (
                    <div key={item.artist} className="search-result-card" onClick={() => onSelectResult({ type: "artist", name: item.artist })}>
                      <div className="result-thumb" style={{ borderRadius: "50%" }}>
                        <User size={24} />
                      </div>
                      <div className="result-meta">
                        <strong>{item.artist}</strong>
                        <span>{formatNum(item.plays)} plays · {item.hours} hrs</span>
                        <small>{item.track_count} unique tracks in library</small>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(activeTab === "all" || activeTab === "track") && results.tracks?.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <h4 style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--accent-bright)", marginBottom: 12 }}>
                  Tracks
                </h4>
                <div className="search-results-grid">
                  {results.tracks.map((item) => {
                    const cover = getCoverArt(item);
                    const spotifyUrl = item.spotify_track_url || getSpotifyTrackUrl(item.spotify_track_uri);
                    return (
                      <div key={item.id} className="search-result-card" onClick={() => onSelectResult({ type: "track", id: item.id })}>
                        <div className="result-thumb">
                          {cover ? (
                            <img src={cover} alt="" onError={(e) => (e.target.style.display = "none")} />
                          ) : (
                            <Music2 size={24} />
                          )}
                        </div>
                        <div className="result-meta" style={{ flex: 1 }}>
                          <strong>{item.track}</strong>
                          <span>{item.artist}</span>
                          <small>{formatNum(item.plays)} plays · {item.hours} hrs</small>
                        </div>
                        {spotifyUrl && (
                          <a
                            href={spotifyUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="spotify-external-link"
                            onClick={(e) => e.stopPropagation()}
                            title="Open track on Spotify"
                          >
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {(activeTab === "all" || activeTab === "album") && results.albums?.length > 0 && (
              <div>
                <h4 style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--accent-bright)", marginBottom: 12 }}>
                  Albums
                </h4>
                <div className="search-results-grid">
                  {results.albums.map((item) => {
                    const cover = getCoverArt(item);
                    return (
                      <div
                        key={item.album_name + item.artist}
                        className="search-result-card"
                        onClick={() => onSelectResult({ type: "album", name: item.album_name, artist: item.artist })}
                      >
                        <div className="result-thumb">
                          {cover ? (
                            <img src={cover} alt="" onError={(e) => (e.target.style.display = "none")} />
                          ) : (
                            <Disc size={24} />
                          )}
                        </div>
                        <div className="result-meta">
                          <strong>{item.album_name}</strong>
                          <span>{item.artist}</span>
                          <small>{formatNum(item.plays)} plays · {item.hours} hrs</small>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {results.artists?.length === 0 && results.tracks?.length === 0 && results.albums?.length === 0 && (
              <p style={{ color: "var(--text-muted)", padding: "20px 0" }}>
                No matching results found in your listening history database for "{query}".
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
