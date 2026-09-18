import React from "react";

export function YearsInSound({ items }) {
  const trends = items || [];
  const maxHours = Math.max(...trends.map((item) => Number(item.hours)), 1);

  const formatHours = (val) => Number(val || 0).toFixed(1) + "h";
  const formatNum = (val) => new Intl.NumberFormat().format(val || 0);

  return (
    <div className="story-section">
      <div className="section-header">
        <div className="section-title-group">
          <p>01 · Timeline</p>
          <h2>The years in sound</h2>
          <span className="section-note">
            Annual listening duration in hours · 2019 to June 5, 2026 (partial year).
          </span>
        </div>
      </div>

      <div className="year-bars" style={{ height: 260, display: "flex", alignItems: "flex-end", gap: 12, borderBottom: "1px solid var(--border-color)", paddingBottom: 8 }}>
        {trends.map((item) => {
          const ratio = (Number(item.hours) / maxHours) * 100;
          const year = item.period ? item.period.slice(0, 4) : "—";

          return (
            <div
              key={item.period}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                height: "100%",
                justifyContent: "flex-end",
                gap: 8
              }}
            >
              <div
                style={{
                  width: "100%",
                  maxWidth: 60,
                  height: `${ratio}%`,
                  background: "var(--accent-bright)",
                  borderRadius: "var(--radius-sm) var(--radius-sm) 0 0",
                  transition: "var(--transition-smooth)",
                  minHeight: 6
                }}
                title={`${year}: ${formatHours(item.hours)} (${formatNum(item.plays)} plays)`}
              />
              <b style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>{year}</b>
              <small style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{formatHours(item.hours)}</small>
            </div>
          );
        })}
      </div>
    </div>
  );
}
