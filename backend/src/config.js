import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT || 4000),
  corsOrigin: process.env.CORS_ORIGIN || "*",
  databaseUrl: process.env.DATABASE_URL || "postgres://spotify:spotify@localhost:5432/spotify_mood",
  analyticsOutputPath: process.env.ANALYTICS_OUTPUT_PATH || "../data/processed/analytics.json",
  musicbrainz: {
    baseUrl: process.env.MUSICBRAINZ_BASE_URL || "https://musicbrainz.org/ws/2",
    userAgent: process.env.MUSICBRAINZ_USER_AGENT || "",
    requestDelayMs: Number(process.env.MUSICBRAINZ_REQUEST_DELAY_MS || 1100)
  },
  spotify: {
    clientId: process.env.SPOTIFY_CLIENT_ID || "",
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET || ""
  }
};
