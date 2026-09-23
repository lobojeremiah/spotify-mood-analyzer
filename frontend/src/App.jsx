import React, { useState, useEffect, useRef } from "react";
import { Header } from "./components/Header";
import { SearchArchive } from "./components/SearchArchive";
import { ArchiveDrawer } from "./components/ArchiveDrawer";
import { YearsInSound } from "./components/YearsInSound";
import { OnRepeat } from "./components/OnRepeat";
import { ListeningRhythm } from "./components/ListeningRhythm";
import { MusicBrainzProfile } from "./components/MusicBrainzProfile";
import { MoodLandscape } from "./components/MoodLandscape";
import { Headphones, Clock, Music, Users, Calendar } from "lucide-react";
import "./styles.css";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem("spotify_mood_theme") || "dark");
  const [metric, setMetric] = useState("plays");
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("loading");
  const [selectedObject, setSelectedObject] = useState(null);

  const searchRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("spotify_mood_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch(`${API}/api/overview`).then((r) => r.json()),
      fetch(`${API}/api/top/artists?metric=${metric}&limit=10`).then((r) => r.json()),
      fetch(`${API}/api/top/tracks?metric=${metric}&limit=12`).then((r) => r.json()),
      fetch(`${API}/api/listening/trends`).then((r) => r.json()),
      fetch(`${API}/api/listening/heatmap`).then((r) => r.json()),
      fetch(`${API}/api/listening/rhythm-stats`).then((r) => r.json()),
      fetch(`${API}/api/metadata/coverage`).then((r) => r.json()),
      fetch(`${API}/api/metadata/tags?limit=30`).then((r) => r.json()),
      fetch(`${API}/api/moods`).then((r) => r.json())
    ])
      .then(([overview, artists, tracks, trends, heatmap, rhythmStats, coverage, tags, moods]) => {
        if (active) {
          setData({
            overview,
            artists,
            tracks,
            trends: trends.items,
            heatmap,
            rhythmStats,
            coverage,
            tags,
            moods
          });
          setStatus("ready");
        }
      })
      .catch((err) => {
        console.error("Fetch error:", err);
        if (active) setStatus("error");
      });

    return () => {
      active = false;
    };
  }, [metric]);

  const scrollToSearch = () => {
    if (searchRef.current) {
      searchRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleSelectTag = (tag) => {
    scrollToSearch();
    // Dispatch query to search archive if needed
  };

  const formatHours = (val) => Number(val || 0).toFixed(1) + "h";
  const formatNum = (val) => new Intl.NumberFormat().format(val || 0);

  return (
    <div className="music-app">
      <Header
        theme={theme}
        toggleTheme={toggleTheme}
        overview={data?.overview}
        scrollToSearch={scrollToSearch}
      />

      {/* HERO EDITORIAL SECTION */}
      <section className="hero-editorial">
        <div>
          <span className="hero-tag">Personal Listening History Archive · 2019—2026</span>
          <h1>
            Seven years of sound, <em>remembered.</em>
          </h1>
          <p className="hero-description">
            Explore my listening history through trends, listening rhythms, repeat patterns, and music metadata. Scroll to discover patterns, switch between views, and use the archive to search for specific artists, tracks, and albums.
          </p>
        </div>

        <div className="hero-metrics-card">
          <div className="metric-box">
            <strong>{formatHours(data?.overview?.total_hours)}</strong>
            <span>Hours In Headphones</span>
          </div>
          <div className="metric-box">
            <strong>{formatNum(data?.overview?.listening_events)}</strong>
            <span>Moments Played</span>
          </div>
          <div className="metric-box">
            <strong>{formatNum(data?.overview?.unique_tracks)}</strong>
            <span>Unique Tracks</span>
          </div>
          <div className="metric-box">
            <strong>{formatNum(data?.overview?.unique_artists)}</strong>
            <span>Artists Visited</span>
          </div>
        </div>
      </section>

      {status === "error" && (
        <div style={{ background: "#f8d7da", color: "#721c24", padding: 16, borderRadius: 8, marginBottom: 24 }}>
          Unable to connect to the backend server API (http://localhost:4000). Please check backend status.
        </div>
      )}

      {/* 01. SEARCH ARCHIVE */}
      <SearchArchive
        apiBase={API}
        onSelectResult={setSelectedObject}
        searchRef={searchRef}
      />

      {/* 02. YEARS IN SOUND */}
      <YearsInSound items={data?.trends} />

      {/* 03. ON REPEAT (ARTISTS & ALBUM SLEEVES) */}
      <OnRepeat
        artists={data?.artists}
        tracks={data?.tracks}
        metric={metric}
        setMetric={setMetric}
        onSelectResult={setSelectedObject}
      />

      {/* 04. 7x24 LISTENING RHYTHM MATRIX */}
      <ListeningRhythm
        heatmap={data?.heatmap}
        rhythmStats={data?.rhythmStats}
      />

      {/* 05. MUSICBRAINZ TAG CLOUD */}
      <MusicBrainzProfile
        coverage={data?.coverage}
        tags={data?.tags}
        onSelectTag={handleSelectTag}
      />

      {/* 06. MOOD LANDSCAPE */}
      <MoodLandscape
        moods={data?.moods}
        onSelectTag={handleSelectTag}
      />

      {/* ARCHIVE DETAIL DRAWER / MODAL */}
      <ArchiveDrawer
        selectedObject={selectedObject}
        onClose={() => setSelectedObject(null)}
        apiBase={API}
      />
      {/* SITE FOOTER */}
      <footer className="site-footer">
        <p>Soundscape · Personal Listening Data Application</p>
        <p style={{ marginTop: 4 }}>
          PostgreSQL Database · Node.js Express API · MusicBrainz Open Metadata Enrichment
        </p>
      </footer>
    </div>
  );
}
