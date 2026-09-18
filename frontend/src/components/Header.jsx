import React from "react";
import { Music, Sun, Moon, Search } from "lucide-react";

export function Header({ theme, toggleTheme, overview, scrollToSearch }) {
  const formatHours = (val) => Number(val || 0).toFixed(1) + "h";
  const formatNum = (val) => new Intl.NumberFormat().format(val || 0);

  return (
    <header className="site-header">
      <div className="brand-container">
        <div className="brand-icon">
          <Music size={20} />
        </div>
        <div>
          <h2 className="brand-title">Spotify Mood Analyzer</h2>
          <span className="brand-subtitle">Personal Listening History · 2019–2026</span>
        </div>
      </div>

      <div className="header-right">
        {overview && (
          <div className="archive-stats-badge">
            <span>{formatNum(overview.listening_events)} events</span>
            <span>·</span>
            <span>{formatNum(overview.unique_tracks)} tracks</span>
            <span>·</span>
            <span>{formatNum(overview.unique_artists)} artists</span>
            <span>·</span>
            <span>{formatHours(overview.total_hours)}</span>
          </div>
        )}

        <button className="chip-btn" onClick={scrollToSearch} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Search size={14} />
          <span>Search Archive</span>
        </button>

        <button
          className="theme-toggle-btn"
          onClick={toggleTheme}
          title={`Switch to ${theme === "dark" ? "Light" : "Dark"} Mode`}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  );
}
