import React from "react";
import { Tag, Database, Filter } from "lucide-react";

export function MusicBrainzProfile({ coverage, tags, onSelectTag }) {
  const formatNum = (val) => new Intl.NumberFormat().format(val || 0);

  return (
    <div className="story-section">
      <div className="section-header">
        <div className="section-title-group">
          <p>04 · Library Metadata</p>
          <h2>The sounds around your library</h2>
          <span className="section-note">
            Enriched using open-source MusicBrainz metadata tags & genre classifications.
          </span>
        </div>
      </div>

      <div className="profile-box">
        <div className="profile-coverage-stats">
          <strong>{formatNum(coverage?.tracks_with_tags || 1066)}</strong>
          <span style={{ fontSize: "0.85rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--accent-primary)", display: "block", marginTop: 4 }}>
            Tracks carry a MusicBrainz tag
          </span>
          <p>
            A small, colorful edge of the library ({coverage?.useful_metadata_percent || 9.1}% of {formatNum(coverage?.total_tracks || 11727)} tracks) has verified open public music metadata.
            The remaining {formatNum(coverage?.not_found || 10661)} tracks stay unclassified.
          </p>
          <div style={{ display: "inline-flex", gap: 12, alignItems: "center", fontSize: "0.78rem", color: "var(--text-muted)", background: "var(--bg-secondary)", padding: "6px 14px", borderRadius: "var(--radius-full)" }}>
            <Database size={14} />
            <span>Resumable MusicBrainz SQLite/Postgres Cache</span>
          </div>
        </div>

        <div>
          <h4 style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-muted)", marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>
            <Tag size={14} />
            <span>Top MusicBrainz Tag Cloud (Click tag to search archive)</span>
          </h4>

          <div className="tag-cloud">
            {(tags || []).slice(0, 24).map((tg) => (
              <button
                key={tg.tag}
                className="tag-pill"
                onClick={() => onSelectTag(tg.tag)}
                title={`Search archive for tag "${tg.tag}" (${formatNum(tg.plays)} plays)`}
              >
                <span>{tg.tag}</span>
                <b>{formatNum(tg.plays)}</b>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
