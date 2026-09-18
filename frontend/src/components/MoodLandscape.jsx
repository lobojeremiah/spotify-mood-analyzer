import React, { useState } from "react";
import { Sparkles, Info, ChevronRight } from "lucide-react";

export function MoodLandscape({ moods, onSelectTag }) {
  const [selectedMood, setSelectedMood] = useState(null);

  const formatHours = (val) => Number(val || 0).toFixed(1) + "h";
  const formatNum = (val) => new Intl.NumberFormat().format(val || 0);

  const moodItems = moods?.items || [];
  const maxHours = Math.max(...moodItems.map((m) => m.hours), 1);

  // Map mood names to tag rules explanation
  const moodRulesMap = {
    Energetic: ["dance", "electronic", "rock", "upbeat", "metal", "fast"],
    Romantic: ["love", "ballad", "soul", "r&b", "romantic"],
    Calm: ["ambient", "chillout", "lo-fi", "downtempo", "relax", "acoustic"],
    Sad: ["melancholy", "sad", "grief", "heartbreak", "slow"],
    Happy: ["pop", "joyful", "fun", "summer", "bright"],
    Dark: ["goth", "industrial", "darkwave", "heavy"],
    Reflective: ["indie", "folk", "poetry", "experimental", "instrumental"]
  };

  return (
    <div className="story-section">
      <div className="section-header">
        <div className="section-title-group">
          <p>05 · Rule-Based Mood Analysis</p>
          <h2>Mood, in the margins</h2>
          <span className="section-note">
            {moods?.method || "Rule-based mapping from MusicBrainz tags. Tracks without a mapped tag remain unclassified."}
          </span>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: 20 }}>
        <Info size={14} />
        <span>Click any mood block to inspect the contributing MusicBrainz rules and tags.</span>
      </div>

      <div className="mood-container">
        {moodItems.map((item) => {
          const ratio = (item.hours / maxHours) * 100;
          const isSelected = selectedMood?.mood === item.mood;

          return (
            <div
              key={item.mood}
              className="mood-card"
              style={{ "--mood-size": `${ratio}%` }}
              onClick={() => setSelectedMood(isSelected ? null : item)}
            >
              <span className="mood-title">{item.mood}</span>
              <span className="mood-hours">{formatHours(item.hours)}</span>
              <span className="mood-plays">{formatNum(item.plays)} plays tagged</span>
            </div>
          );
        })}
      </div>

      {selectedMood && (
        <div
          style={{
            marginTop: 24,
            background: "var(--bg-card)",
            border: "1px solid var(--border-color)",
            borderRadius: "var(--radius-md)",
            padding: 24,
            boxShadow: "var(--shadow-md)"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h4 style={{ fontFamily: "var(--font-serif)", fontSize: "1.8rem", color: "var(--accent-bright)" }}>
              Mood: {selectedMood.mood}
            </h4>
            <button className="chip-btn" onClick={() => setSelectedMood(null)}>
              Close
            </button>
          </div>

          <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: 16 }}>
            Rule classification triggers: Matches tracks enriched with tags such as{" "}
            <strong>{(moodRulesMap[selectedMood.mood] || ["genre tags"]).join(", ")}</strong>.
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            {(moodRulesMap[selectedMood.mood] || []).map((tag) => (
              <button key={tag} className="tag-pill" onClick={() => onSelectTag(tag)}>
                <span>Search tag "{tag}"</span>
                <ChevronRight size={14} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
