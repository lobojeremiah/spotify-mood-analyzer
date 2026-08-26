import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT || 4000),
  databaseUrl: process.env.DATABASE_URL || "postgres://spotify:spotify@localhost:5432/spotify_mood",
  analyticsOutputPath: process.env.ANALYTICS_OUTPUT_PATH || "../data/processed/analytics.json"
};

