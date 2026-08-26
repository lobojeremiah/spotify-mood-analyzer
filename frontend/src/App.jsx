import { useEffect, useMemo, useState } from "react";
import { Activity, BarChart3, Clock3, Music2, RefreshCcw } from "lucide-react";
import "./styles.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

function formatHours(value) {
  return `${Number(value || 0).toFixed(1)}h`;
}

function App() {
  const [summary, setSummary] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [status, setStatus] = useState("loading");

  async function loadData() {
    setStatus("loading");

    try {
      const [summaryResponse, analyticsResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/summary`),
        fetch(`${API_BASE_URL}/api/analytics`)
      ]);

      if (!summaryResponse.ok) throw new Error("Summary request failed");

      setSummary(await summaryResponse.json());
      setAnalytics(analyticsResponse.ok ? await analyticsResponse.json() : null);
      setStatus("ready");
    } catch (error) {
      console.error(error);
      setStatus("error");
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const peakHour = useMemo(() => {
    const heatmap = analytics?.listeningHoursHeatmap || [];
    return heatmap.reduce((winner, item) => {
      if (!winner || item.hours > winner.hours) return item;
      return winner;
    }, null);
  }, [analytics]);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Portfolio Analytics</p>
          <h1>Spotify Mood Analyzer</h1>
        </div>
        <button className="icon-button" onClick={loadData} aria-label="Refresh dashboard">
          <RefreshCcw size={18} />
        </button>
      </header>

      {status === "error" && (
        <section className="notice">
          The dashboard could not reach the API. Start the backend, then refresh.
        </section>
      )}

      <section className="metrics-grid">
        <Metric icon={<Music2 />} label="Listening Events" value={summary?.listening_events || 0} />
        <Metric icon={<Clock3 />} label="Total Hours" value={formatHours((summary?.total_ms_played || 0) / 3600000)} />
        <Metric icon={<BarChart3 />} label="Unique Tracks" value={summary?.unique_tracks || 0} />
        <Metric icon={<Activity />} label="Peak Slot" value={peakHour ? `${peakHour.hour}:00` : "Pending"} />
      </section>

      <section className="dashboard-grid">
        <Panel title="Top Artists">
          <RankedList items={analytics?.topArtists || []} primaryKey="artist" secondaryKey="hours" />
        </Panel>

        <Panel title="Top Tracks">
          <RankedList items={analytics?.topTracks || []} primaryKey="track" secondaryKey="artist" />
        </Panel>

        <Panel title="Listening Trends">
          <TrendBars items={analytics?.listeningTrends || []} />
        </Panel>

        <Panel title="Genre Distribution">
          <RankedList items={analytics?.genreDistribution || []} primaryKey="genre" secondaryKey="plays" />
        </Panel>
      </section>
    </main>
  );
}

function Metric({ icon, label, value }) {
  return (
    <article className="metric-card">
      <div className="metric-icon">{icon}</div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

function Panel({ title, children }) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function RankedList({ items, primaryKey, secondaryKey }) {
  if (!items.length) return <p className="empty-state">Run imports and analytics to fill this view.</p>;

  return (
    <ol className="ranked-list">
      {items.slice(0, 8).map((item, index) => (
        <li key={`${primaryKey}-${index}`}>
          <span>{index + 1}</span>
          <div>
            <strong>{item[primaryKey]}</strong>
            <p>{item[secondaryKey]}</p>
          </div>
          {item.plays && <em>{item.plays}</em>}
        </li>
      ))}
    </ol>
  );
}

function TrendBars({ items }) {
  if (!items.length) return <p className="empty-state">Listening trends will appear after analytics are generated.</p>;

  const maxHours = Math.max(...items.map((item) => item.hours));

  return (
    <div className="trend-bars">
      {items.slice(-24).map((item) => (
        <div key={item.date} className="trend-row">
          <time>{item.date}</time>
          <span>
            <i style={{ width: `${Math.max((item.hours / maxHours) * 100, 4)}%` }} />
          </span>
          <strong>{formatHours(item.hours)}</strong>
        </div>
      ))}
    </div>
  );
}

export default App;

