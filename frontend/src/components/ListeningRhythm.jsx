import React, { useState, useMemo } from "react";
import { Clock, Calendar, Sun, Moon, Zap, BarChart3 } from "lucide-react";

export function ListeningRhythm({ heatmap, rhythmStats }) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const daysFull = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const hoursList = Array.from({ length: 24 }, (_, i) => i);

  // Map heatmap rows into 7x24 matrix lookup
  const matrix = useMemo(() => {
    const map = {};
    (heatmap || []).forEach((item) => {
      const key = `${item.day_of_week}-${item.hour}`;
      map[key] = item;
    });
    return map;
  }, [heatmap]);

  const maxHours = useMemo(() => {
    return Math.max(...(heatmap || []).map((item) => Number(item.hours)), 1);
  }, [heatmap]);

  // Selected cell state (defaults to peak moment or Sunday 15:00)
  const defaultCell = useMemo(() => {
    let best = null;
    (heatmap || []).forEach((item) => {
      if (!best || Number(item.hours) > Number(best.hours)) {
        best = item;
      }
    });
    return best || { day_of_week: 5, hour: 15, hours: 25.4, plays: 320 };
  }, [heatmap]);

  const [selected, setSelected] = useState(null);
  const activeCell = selected || defaultCell;

  const formatHours = (val) => Number(val || 0).toFixed(1) + "h";
  const formatNum = (val) => new Intl.NumberFormat().format(val || 0);

  const getIntensityColor = (hours) => {
    if (!hours || hours === 0) return "var(--bg-secondary)";
    const ratio = Math.min(hours / maxHours, 1);
    // Dynamic opacity / green hue
    return `rgba(130, 172, 36, ${0.15 + ratio * 0.85})`;
  };

  const totalLibraryHours = rhythmStats?.total_hours || 2960.8;
  const cellPercent = ((activeCell.hours / totalLibraryHours) * 100).toFixed(2);

  return (
    <div className="story-section">
      <div className="section-header">
        <div className="section-title-group">
          <p>03 · Listening Rhythm</p>
          <h2>Your 7 × 24 listening matrix</h2>
          <span className="section-note">
            Explore every hour of every weekday across seven years of listening data.
          </span>
        </div>
      </div>

      <div className="rhythm-layout-container">
        {/* 7x24 HEATMAP MATRIX */}
        <div className="heatmap-matrix-wrapper">
          <div className="rhythm-matrix-grid">
            <div />
            {hoursList.map((h) => (
              <div key={h} className="grid-hour-header">
                {h % 3 === 0 ? String(h).padStart(2, "0") : ""}
              </div>
            ))}

            {days.map((dayLabel, dayIdx) => (
              <React.Fragment key={dayLabel}>
                <div className="grid-day-label">{dayLabel}</div>
                {hoursList.map((h) => {
                  const item = matrix[`${dayIdx}-${h}`] || { day_of_week: dayIdx, hour: h, hours: 0, plays: 0 };
                  const isSelected = activeCell.day_of_week === dayIdx && activeCell.hour === h;

                  return (
                    <div
                      key={h}
                      className={`rhythm-cell ${isSelected ? "selected" : ""}`}
                      style={{ background: getIntensityColor(item.hours) }}
                      onMouseEnter={() => setSelected(item)}
                      onClick={() => setSelected(item)}
                      title={`${daysFull[dayIdx]} · ${h}:00 — ${formatHours(item.hours)} (${formatNum(item.plays)} plays)`}
                    />
                  );
                })}
              </React.Fragment>
            ))}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16, fontSize: "0.75rem", color: "var(--text-muted)" }}>
            <span>← Hover or click any cell to inspect specific hour</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span>Less</span>
              <div style={{ width: 12, height: 12, borderRadius: 2, background: "rgba(130,172,36,0.15)" }} />
              <div style={{ width: 12, height: 12, borderRadius: 2, background: "rgba(130,172,36,0.5)" }} />
              <div style={{ width: 12, height: 12, borderRadius: 2, background: "rgba(130,172,36,1)" }} />
              <span>More</span>
            </div>
          </div>
        </div>

        {/* CONTEXTUAL DETAIL PANEL */}
        <div className="rhythm-detail-panel">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--accent-bright)", fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
              <Clock size={16} />
              <span>Contextual Period</span>
            </div>

            <h4>
              {daysFull[activeCell.day_of_week]} · {String(activeCell.hour).padStart(2, "0")}:00
            </h4>

            <div className="rhythm-detail-stats">
              <div>
                <span style={{ fontSize: "0.75rem", color: "#9cb1a7", textTransform: "uppercase" }}>Listening Duration</span>
                <strong style={{ display: "block", fontSize: "1.8rem" }}>{formatHours(activeCell.hours)}</strong>
              </div>
              <div>
                <span style={{ fontSize: "0.75rem", color: "#9cb1a7", textTransform: "uppercase" }}>Listening Moments</span>
                <strong style={{ display: "block" }}>{formatNum(activeCell.plays)} plays</strong>
              </div>
              <div>
                <span style={{ fontSize: "0.75rem", color: "#9cb1a7", textTransform: "uppercase" }}>Share of Total Library Time</span>
                <strong style={{ display: "block" }}>{cellPercent}% of total</strong>
              </div>
            </div>
          </div>

          <p style={{ fontSize: "0.8rem", color: "#8da397", lineHeight: 1.4, borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 16 }}>
            {activeCell.hour >= 22 || activeCell.hour < 5
              ? "Late night listening window. Reflective, quiet acoustic or ambient listening patterns."
              : activeCell.hour >= 17
              ? "Evening wind-down window. Strongest listening volume typically concentrates around dinner and late evening."
              : activeCell.hour >= 12
              ? "Afternoon focus listening. Steady rhythm throughout work and daily activities."
              : "Morning start window. Waking up and starting the daily soundtrack."}
          </p>
        </div>
      </div>

      {/* FACTUAL OBSERVATIONS GRID */}
      <div className="rhythm-observations-grid">
        <div className="observation-card">
          <p>Peak Listening Hour</p>
          <strong>{rhythmStats?.peak_hour ?? 15}:00</strong>
          <span>Highest concentration of daily audio playback</span>
        </div>

        <div className="observation-card">
          <p>Peak Listening Day</p>
          <strong>{rhythmStats?.peak_day || "Friday"}</strong>
          <span>Day with the most total accumulated listening time</span>
        </div>

        <div className="observation-card">
          <p>Strongest Listening Window</p>
          <strong>{rhythmStats?.strongest_window || "Evening (5 PM–9 PM)"}</strong>
          <span>Multi-hour window with highest overall activity</span>
        </div>

        <div className="observation-card">
          <p>Weekend vs. Weekday</p>
          <strong>{rhythmStats?.weekday_percent ?? 68}% Weekday</strong>
          <span>{rhythmStats?.weekend_percent ?? 32}% Weekend split</span>
        </div>
      </div>
    </div>
  );
}
