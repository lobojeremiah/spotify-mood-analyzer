import fs from "node:fs/promises";
import path from "node:path";
import cors from "cors";
import express from "express";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import { query } from "./db.js";
import { moodForTag } from "./moodRules.js";
import { enrichArtistsWithSpotify, enrichTracksWithSpotify } from "./spotify.js";

const app = express();
const analyticsPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", config.analyticsOutputPath);
const asyncRoute = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const maxLimit = (value, fallback = 10) => Math.min(Math.max(Number(value) || fallback, 1), 50);
const rank = (metric) => metric === "hours" ? "hours DESC, plays DESC" : "plays DESC, hours DESC";

app.use(cors({ origin: config.corsOrigin === "*" ? "*" : config.corsOrigin.split(",").map((origin) => origin.trim()) }));
app.use(express.json());

app.get("/api/health", async (_req, res) => {
  try {
    await query("SELECT 1");
    res.json({ status: "ok" });
  } catch (error) {
    res.status(500).json({ status: "error" });
  }
});

app.get("/api/overview", asyncRoute(async (_req, res) => {
  const result = await query(`SELECT COUNT(*)::int AS listening_events, ROUND(SUM(ms_played)/3600000.0,2)::float AS total_hours, COUNT(DISTINCT lh.track_id)::int AS unique_tracks, COUNT(DISTINCT t.artist_id)::int AS unique_artists, MIN(played_at)::date::text AS first_listening_date, MAX(played_at)::date::text AS last_listening_date, ROUND(AVG(ms_played)/60000.0,2)::float AS average_minutes_per_event FROM listening_history lh JOIN tracks t ON t.id=lh.track_id`);
  res.json(result.rows[0]);
}));
app.get("/api/summary", asyncRoute(async (_req, res) => res.json((await query(`SELECT COUNT(*)::int AS listening_events, COALESCE(SUM(ms_played),0)::bigint AS total_ms_played, COUNT(DISTINCT track_id)::int AS unique_tracks FROM listening_history`)).rows[0])));

app.get("/api/top/artists", asyncRoute(async (req, res) => {
  const result = await query(
    `SELECT a.name AS artist, a.spotify_image_url, a.spotify_artist_id,
            COUNT(*)::int AS plays, ROUND(SUM(lh.ms_played)/3600000.0,2)::float AS hours
     FROM listening_history lh
     JOIN tracks t ON t.id=lh.track_id
     JOIN artists a ON a.id=t.artist_id
     GROUP BY a.name, a.spotify_image_url, a.spotify_artist_id
     ORDER BY ${rank(req.query.metric)}
     LIMIT $1`,
    [maxLimit(req.query.limit)]
  );
  const enriched = await enrichArtistsWithSpotify(result.rows);
  res.json(enriched);
}));
app.get("/api/top/tracks", asyncRoute(async (req, res) => {
  const result = await query(
    `SELECT t.id, t.name AS track, a.name AS artist, t.album_name,
       t.spotify_track_uri, t.spotify_artwork_url,
       tm.provider_release_id, tm.image_url AS mb_image_url,
            COUNT(*)::int AS plays, ROUND(SUM(lh.ms_played)/3600000.0,2)::float AS hours
     FROM listening_history lh
     JOIN tracks t ON t.id=lh.track_id
     JOIN artists a ON a.id=t.artist_id
     LEFT JOIN track_metadata tm ON tm.track_id=t.id AND tm.provider='musicbrainz'
     GROUP BY t.id, t.name, a.name, t.album_name,
         t.spotify_track_uri, t.spotify_artwork_url, tm.provider_release_id,tm.image_url
     ORDER BY ${rank(req.query.metric)}
     LIMIT $1`,
    [maxLimit(req.query.limit)]
  );
  const enriched = await enrichTracksWithSpotify(result.rows);
  res.json(enriched);
}));

app.get("/api/listening/trends", asyncRoute(async (req, res) => {
  const granularity = req.query.granularity === "month" ? "month" : "year";
  const result = await query(`SELECT DATE_TRUNC('${granularity}',played_at)::date::text AS period, COUNT(*)::int AS plays, ROUND(SUM(ms_played)/3600000.0,2)::float AS hours FROM listening_history GROUP BY 1 ORDER BY 1`);
  res.json({ granularity, items: result.rows });
}));
app.get("/api/listening/heatmap", asyncRoute(async (_req, res) => res.json((await query(`SELECT EXTRACT(DOW FROM played_at)::int AS day_of_week, EXTRACT(HOUR FROM played_at)::int AS hour, COUNT(*)::int AS plays, ROUND(SUM(ms_played)/3600000.0,2)::float AS hours FROM listening_history GROUP BY 1,2 ORDER BY 1,2`)).rows)));
app.get("/api/listening/by-weekday", asyncRoute(async (_req, res) => res.json((await query(`SELECT EXTRACT(DOW FROM played_at)::int AS day_of_week, COUNT(*)::int AS plays, ROUND(SUM(ms_played)/3600000.0,2)::float AS hours FROM listening_history GROUP BY 1 ORDER BY 1`)).rows)));

app.get("/api/metadata/coverage", asyncRoute(async (_req, res) => {
  const coverage = (await query(`SELECT COUNT(*) FILTER (WHERE enrichment_status='enriched')::int AS enriched, COUNT(*) FILTER (WHERE enrichment_status='ambiguous')::int AS ambiguous, COUNT(*) FILTER (WHERE enrichment_status='not_found')::int AS not_found, COUNT(*) FILTER (WHERE enrichment_status='error')::int AS errors, COUNT(*) FILTER (WHERE cardinality(genres)>0)::int AS tracks_with_genres, COUNT(*) FILTER (WHERE cardinality(tags)>0)::int AS tracks_with_tags, COUNT(*) FILTER (WHERE cardinality(genres)>0 OR cardinality(tags)>0)::int AS useful_metadata_tracks, (SELECT COUNT(*)::int FROM tracks) AS total_tracks FROM track_metadata WHERE provider='musicbrainz'`)).rows[0];
  coverage.useful_metadata_percent = Number(((coverage.useful_metadata_tracks / coverage.total_tracks) * 100).toFixed(2));
  res.json(coverage);
}));
app.get("/api/metadata/tags", asyncRoute(async (req, res) => res.json((await query(`SELECT tag,COUNT(DISTINCT tm.track_id)::int AS tracks,COUNT(lh.id)::int AS plays,ROUND(COALESCE(SUM(lh.ms_played),0)/3600000.0,2)::float AS hours FROM track_metadata tm CROSS JOIN LATERAL unnest(tm.tags) AS tag LEFT JOIN listening_history lh ON lh.track_id=tm.track_id WHERE tm.provider='musicbrainz' GROUP BY tag ORDER BY plays DESC,tracks DESC LIMIT $1`, [maxLimit(req.query.limit, 20)])).rows)));
app.get("/api/moods", asyncRoute(async (_req, res) => {
  const rows = (await query(`SELECT tag,COUNT(lh.id)::int AS plays,COALESCE(SUM(lh.ms_played),0)::bigint AS ms_played FROM track_metadata tm CROSS JOIN LATERAL unnest(tm.tags) AS tag JOIN listening_history lh ON lh.track_id=tm.track_id WHERE tm.provider='musicbrainz' GROUP BY tag`)).rows;
  const moods = new Map();
  rows.forEach((row) => { const mood = moodForTag(row.tag); if (mood) { const value = moods.get(mood) || { mood, plays: 0, hours: 0 }; value.plays += row.plays; value.hours += Number(row.ms_played) / 3600000; moods.set(mood, value); } });
  res.json({ method: "MusicBrainz tag-based inference; tracks without a mapped tag are unclassified.", items: [...moods.values()].map((item) => ({ ...item, hours: Number(item.hours.toFixed(2)) })).sort((a, b) => b.hours - a.hours) });
}));

app.get("/api/search", asyncRoute(async (req, res) => {
  const q = (req.query.q || "").trim();

  if (!q) {
    return res.json({
      query: "",
      artists: [],
      tracks: [],
      albums: []
    });
  }

  const pattern = `%${q}%`;
  const limit = maxLimit(req.query.limit, 15);

  const [artistsRes, tracksRes, albumsRes] = await Promise.all([
    query(`
      SELECT a.id,
             a.name AS artist,
             a.spotify_artist_id,
             a.spotify_image_url,
             COUNT(lh.id)::int AS plays,
             ROUND(SUM(lh.ms_played)/3600000.0, 2)::float AS hours,
             COUNT(DISTINCT t.id)::int AS track_count
      FROM artists a
      JOIN tracks t ON t.artist_id = a.id
      JOIN listening_history lh ON lh.track_id = t.id
      WHERE a.name ILIKE $1
      GROUP BY a.id,
               a.name,
               a.spotify_artist_id,
               a.spotify_image_url
      ORDER BY plays DESC, hours DESC
      LIMIT $2
    `, [pattern, limit]),

    query(`
      SELECT t.id,
             t.name AS track,
             a.name AS artist,
             t.album_name,
             t.spotify_track_uri,
             t.spotify_artwork_url,
             tm.provider_release_id,
             COUNT(lh.id)::int AS plays,
             ROUND(SUM(lh.ms_played)/3600000.0, 2)::float AS hours,
             MIN(lh.played_at)::date::text AS first_played,
             MAX(lh.played_at)::date::text AS last_played
      FROM tracks t
      JOIN artists a ON a.id = t.artist_id
      JOIN listening_history lh ON lh.track_id = t.id
      LEFT JOIN track_metadata tm
        ON tm.track_id = t.id
       AND tm.provider = 'musicbrainz'
      WHERE t.name ILIKE $1
         OR a.name ILIKE $1
         OR t.album_name ILIKE $1
      GROUP BY t.id,
               t.name,
               a.name,
               t.album_name,
               t.spotify_track_uri,
               t.spotify_artwork_url,
               tm.provider_release_id
      ORDER BY plays DESC, hours DESC
      LIMIT $2
    `, [pattern, limit]),

    query(`
      SELECT t.album_name,
             a.name AS artist,
             tm.provider_release_id,
             COUNT(lh.id)::int AS plays,
             ROUND(SUM(lh.ms_played)/3600000.0, 2)::float AS hours,
             COUNT(DISTINCT t.id)::int AS track_count
      FROM tracks t
      JOIN artists a ON a.id = t.artist_id
      JOIN listening_history lh ON lh.track_id = t.id
      LEFT JOIN track_metadata tm
        ON tm.track_id = t.id
       AND tm.provider = 'musicbrainz'
      WHERE t.album_name ILIKE $1
        AND t.album_name != 'Unknown Album'
      GROUP BY t.album_name,
               a.name,
               tm.provider_release_id
      ORDER BY plays DESC, hours DESC
      LIMIT $2
    `, [pattern, limit])
  ]);

  const [enrichedArtists, enrichedTracks] = await Promise.all([
    enrichArtistsWithSpotify(artistsRes.rows),
    enrichTracksWithSpotify(tracksRes.rows)
  ]);

  res.json({
    query: q,
    artists: enrichedArtists,
    tracks: enrichedTracks,
    albums: albumsRes.rows
  });
}));

app.get("/api/archive/artist", asyncRoute(async (req, res) => {
  const name = req.query.name;
  if (!name) return res.status(400).json({ message: "Artist name required" });

  const summary = (await query(`
    SELECT a.id, a.name AS artist, COUNT(lh.id)::int AS plays, ROUND(SUM(lh.ms_played)/3600000.0, 2)::float AS hours,
           COUNT(DISTINCT t.id)::int AS unique_tracks, MIN(lh.played_at)::date::text AS first_played, MAX(lh.played_at)::date::text AS last_played
    FROM artists a
    JOIN tracks t ON t.artist_id = a.id
    JOIN listening_history lh ON lh.track_id = t.id
    WHERE a.name = $1
    GROUP BY a.id, a.name
  `, [name])).rows[0];

  if (!summary) return res.status(404).json({ message: "Artist not found" });

  const topTracks = (await query(`
    SELECT t.id, t.name AS track, a.name AS artist, t.album_name, t.spotify_track_uri, tm.provider_release_id,
           COUNT(lh.id)::int AS plays, ROUND(SUM(lh.ms_played)/3600000.0, 2)::float AS hours
    FROM tracks t
    JOIN artists a ON a.id = t.artist_id
    JOIN listening_history lh ON lh.track_id = t.id
    LEFT JOIN track_metadata tm ON tm.track_id = t.id AND tm.provider = 'musicbrainz'
    WHERE a.name = $1
    GROUP BY t.id, t.name, a.name, t.album_name, t.spotify_track_uri, tm.provider_release_id
    ORDER BY plays DESC, hours DESC
    LIMIT 10
  `, [name])).rows;

  const topAlbums = (await query(`
    SELECT t.album_name, COUNT(lh.id)::int AS plays, ROUND(SUM(lh.ms_played)/3600000.0, 2)::float AS hours, COUNT(DISTINCT t.id)::int AS track_count
    FROM tracks t
    JOIN artists a ON a.id = t.artist_id
    JOIN listening_history lh ON lh.track_id = t.id
    WHERE a.name = $1 AND t.album_name != 'Unknown Album'
    GROUP BY t.album_name
    ORDER BY plays DESC, hours DESC
    LIMIT 6
  `, [name])).rows;

  const timeline = (await query(`
    SELECT DATE_TRUNC('year', lh.played_at)::date::text AS year, COUNT(lh.id)::int AS plays, ROUND(SUM(lh.ms_played)/3600000.0, 2)::float AS hours
    FROM listening_history lh
    JOIN tracks t ON t.id = lh.track_id
    JOIN artists a ON a.id = t.artist_id
    WHERE a.name = $1
    GROUP BY 1 ORDER BY 1
  `, [name])).rows;

  res.json({ ...summary, topTracks, topAlbums, timeline });
}));

app.get("/api/archive/track", asyncRoute(async (req, res) => {
  const { id, name, artist } = req.query;
  let trackRow;
  if (id) {
    trackRow = (await query(`
      SELECT t.id, t.name AS track, a.name AS artist, t.album_name, t.spotify_track_uri, tm.provider_release_id, tm.genres, tm.tags,
             COUNT(lh.id)::int AS plays, ROUND(SUM(lh.ms_played)/3600000.0, 2)::float AS hours,
             MIN(lh.played_at)::date::text AS first_played, MAX(lh.played_at)::date::text AS last_played
      FROM tracks t
      JOIN artists a ON a.id = t.artist_id
      JOIN listening_history lh ON lh.track_id = t.id
      LEFT JOIN track_metadata tm ON tm.track_id = t.id AND tm.provider = 'musicbrainz'
      WHERE t.id = $1
      GROUP BY t.id, t.name, a.name, t.album_name, t.spotify_track_uri, tm.provider_release_id, tm.genres, tm.tags
    `, [id])).rows[0];
  } else if (name && artist) {
    trackRow = (await query(`
      SELECT t.id, t.name AS track, a.name AS artist, t.album_name, t.spotify_track_uri, tm.provider_release_id, tm.genres, tm.tags,
             COUNT(lh.id)::int AS plays, ROUND(SUM(lh.ms_played)/3600000.0, 2)::float AS hours,
             MIN(lh.played_at)::date::text AS first_played, MAX(lh.played_at)::date::text AS last_played
      FROM tracks t
      JOIN artists a ON a.id = t.artist_id
      JOIN listening_history lh ON lh.track_id = t.id
      LEFT JOIN track_metadata tm ON tm.track_id = t.id AND tm.provider = 'musicbrainz'
      WHERE t.name ILIKE $1 AND a.name ILIKE $2
      GROUP BY t.id, t.name, a.name, t.album_name, t.spotify_track_uri, tm.provider_release_id, tm.genres, tm.tags
      ORDER BY plays DESC LIMIT 1
    `, [name, artist])).rows[0];
  }

  if (!trackRow) return res.status(404).json({ message: "Track not found" });

  const timeline = (await query(`
    SELECT DATE_TRUNC('year', lh.played_at)::date::text AS year, COUNT(lh.id)::int AS plays, ROUND(SUM(lh.ms_played)/3600000.0, 2)::float AS hours
    FROM listening_history lh
    WHERE lh.track_id = $1
    GROUP BY 1 ORDER BY 1
  `, [trackRow.id])).rows;

  res.json({ ...trackRow, timeline });
}));

app.get("/api/archive/album", asyncRoute(async (req, res) => {
  const { name, artist } = req.query;
  if (!name) return res.status(400).json({ message: "Album name required" });

  const tracks = (await query(`
    SELECT t.id, t.name AS track, a.name AS artist, t.album_name, t.spotify_track_uri, tm.provider_release_id,
           COUNT(lh.id)::int AS plays, ROUND(SUM(lh.ms_played)/3600000.0, 2)::float AS hours
    FROM tracks t
    JOIN artists a ON a.id = t.artist_id
    JOIN listening_history lh ON lh.track_id = t.id
    LEFT JOIN track_metadata tm ON tm.track_id = t.id AND tm.provider = 'musicbrainz'
    WHERE t.album_name = $1 ${artist ? "AND a.name = $2" : ""}
    GROUP BY t.id, t.name, a.name, t.album_name, t.spotify_track_uri, tm.provider_release_id
    ORDER BY plays DESC
  `, artist ? [name, artist] : [name])).rows;

  const totalPlays = tracks.reduce((acc, tr) => acc + tr.plays, 0);
  const totalHours = Number(tracks.reduce((acc, tr) => acc + tr.hours, 0).toFixed(2));
  const providerReleaseId = tracks.find((tr) => tr.provider_release_id)?.provider_release_id || null;

  res.json({
    album_name: name,
    artist: artist || tracks[0]?.artist || "Unknown Artist",
    provider_release_id: providerReleaseId,
    plays: totalPlays,
    hours: totalHours,
    tracks
  });
}));

app.get("/api/listening/rhythm-stats", asyncRoute(async (_req, res) => {
  const heatmap = (await query(`SELECT EXTRACT(DOW FROM played_at)::int AS day_of_week, EXTRACT(HOUR FROM played_at)::int AS hour, COUNT(*)::int AS plays, ROUND(SUM(ms_played)/3600000.0,2)::float AS hours FROM listening_history GROUP BY 1,2 ORDER BY 1,2`)).rows;

  const hoursMap = Array(24).fill(0);
  const daysMap = Array(7).fill(0);
  let totalHours = 0;
  let weekdayHours = 0;
  let weekendHours = 0;

  heatmap.forEach(({ day_of_week, hour, hours }) => {
    hoursMap[hour] += hours;
    daysMap[day_of_week] += hours;
    totalHours += hours;
    if (day_of_week === 0 || day_of_week === 6) {
      weekendHours += hours;
    } else {
      weekdayHours += hours;
    }
  });

  const peakHourIndex = hoursMap.indexOf(Math.max(...hoursMap));
  const peakDayIndex = daysMap.indexOf(Math.max(...daysMap));

  const windowSums = {
    "Morning (5 AM–11 AM)": hoursMap.slice(5, 12).reduce((a, b) => a + b, 0),
    "Afternoon (12 PM–4 PM)": hoursMap.slice(12, 17).reduce((a, b) => a + b, 0),
    "Evening (5 PM–9 PM)": hoursMap.slice(17, 22).reduce((a, b) => a + b, 0),
    "Night (10 PM–4 AM)": hoursMap.slice(22, 24).reduce((a, b) => a + b, 0) + hoursMap.slice(0, 5).reduce((a, b) => a + b, 0)
  };
  let strongestWindow = "Evening (5 PM–9 PM)";
  let maxWindowHours = 0;
  for (const [w, val] of Object.entries(windowSums)) {
    if (val > maxWindowHours) {
      maxWindowHours = val;
      strongestWindow = w;
    }
  }

  const daysNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const weekdayPercent = Math.round((weekdayHours / (totalHours || 1)) * 100);
  const weekendPercent = Math.round((weekendHours / (totalHours || 1)) * 100);

  res.json({
    peak_hour: peakHourIndex,
    peak_day: daysNames[peakDayIndex],
    peak_day_index: peakDayIndex,
    strongest_window: strongestWindow,
    weekday_percent: weekdayPercent,
    weekend_percent: weekendPercent,
    total_hours: Number(totalHours.toFixed(1))
  });
}));

app.get("/api/analytics", asyncRoute(async (_req, res) => { try { res.json(JSON.parse(await fs.readFile(analyticsPath, "utf8"))); } catch (error) { if (error.code === "ENOENT") return res.status(404).json({ message: "Analytics output has not been generated yet." }); throw error; } }));
app.use((error, _req, res, _next) => { console.error(error); res.status(500).json({ message: "Unexpected server error" }); });
app.listen(config.port, () => console.log(`Spotify Mood API listening on port ${config.port}`));

