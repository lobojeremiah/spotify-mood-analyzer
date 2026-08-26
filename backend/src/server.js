import fs from "node:fs/promises";
import path from "node:path";
import cors from "cors";
import express from "express";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import { query } from "./db.js";

const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const analyticsPath = path.resolve(__dirname, "..", config.analyticsOutputPath);

app.use(cors());
app.use(express.json());

app.get("/health", async (_req, res) => {
  const db = await query("SELECT 1 AS ok");
  res.json({ ok: true, database: db.rows[0].ok === 1 });
});

app.get("/api/summary", async (_req, res) => {
  const result = await query(`
    SELECT
      COUNT(*)::int AS listening_events,
      COALESCE(SUM(ms_played), 0)::bigint AS total_ms_played,
      COUNT(DISTINCT track_id)::int AS unique_tracks
    FROM listening_history
  `);

  res.json(result.rows[0]);
});

app.get("/api/analytics", async (_req, res) => {
  try {
    const contents = await fs.readFile(analyticsPath, "utf8");
    res.json(JSON.parse(contents));
  } catch (error) {
    if (error.code === "ENOENT") {
      res.status(404).json({
        message: "Analytics output has not been generated yet.",
        nextStep: "Run `python generate_analytics.py` from the analytics folder."
      });
      return;
    }

    throw error;
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: "Unexpected server error" });
});

app.listen(config.port, () => {
  console.log(`Spotify Mood API listening on port ${config.port}`);
});
