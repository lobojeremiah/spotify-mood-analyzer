import React from "react";

export function MetricToggle({ metric, setMetric }) {
  return (
    <div className="metric-toggle">
      <button className={metric === "plays" ? "active" : ""} onClick={() => setMetric("plays")}>
        Plays
      </button>
      <button className={metric === "hours" ? "active" : ""} onClick={() => setMetric("hours")}>
        Hours
      </button>
    </div>
  );
}
