# Spotify Mood Analyzer

A single-user portfolio application that turns a personal Spotify Extended Streaming History export into a PostgreSQL-backed listening dashboard. It shows listening trends, repeat behavior, time-of-day patterns, top artists/tracks, and a deliberately limited metadata-based mood view.

## What it does

- Imports personal Spotify history JSON into normalized PostgreSQL tables.
- Serves dashboard data through a small Express REST API.
- Generates a supplementary Python analytics JSON artifact.
- Renders a responsive React dashboard.
- Uses MusicBrainz tags only when present; it does not claim full genre or mood classification.

The current personal dataset contains 70,692 events, 11,727 tracks, 3,776 artists, 2,960.84 listening hours, and runs from 2019-09-27 through 2026-06-05.

## Stack and architecture

```text
Spotify Extended Streaming History JSON
  -> Node ETL/import scripts -> PostgreSQL
  -> Python analytics JSON (supplementary)
  -> Express REST API -> React/Vite dashboard
```

- `backend/`: Node.js, Express, PostgreSQL queries, ETL, MusicBrainz enrichment scripts.
- `database/`: versioned PostgreSQL migrations.
- `analytics/`: Python/Psycopg generator for `data/processed/analytics.json`.
- `frontend/`: React/Vite dashboard.

## Dashboard/API

| Endpoint | Purpose |
| --- | --- |
| `GET /health` | API/database health check |
| `GET /api/overview` | Core totals and date range |
| `GET /api/top/artists?metric=plays|hours&limit=10` | Ranked artists |
| `GET /api/top/tracks?metric=plays|hours&limit=10` | Ranked tracks |
| `GET /api/listening/trends?granularity=year|month` | Listening time series |
| `GET /api/listening/heatmap` | Weekday × hour data |
| `GET /api/listening/by-weekday` | Weekday totals |
| `GET /api/metadata/coverage` | MusicBrainz coverage/statuses |
| `GET /api/metadata/tags?limit=20` | Available tags by listening use |
| `GET /api/moods` | Transparent tag-rule mood aggregation |
| `GET /api/analytics` | Generated Python analytics JSON |

The mood categories are only assigned when an available MusicBrainz tag is explicitly mapped in `backend/src/moodRules.js`. Unmapped tracks are unclassified. This is metadata-based inference, not scientific emotion detection.

## Local setup

Prerequisites: Node.js, Python 3, Docker Desktop (for PostgreSQL).

```powershell
# PostgreSQL
docker compose up -d postgres

# Backend
cd backend
Copy-Item .env.example .env
npm install
npm run db:migrate
npm run dev

# Frontend (new terminal)
cd frontend
npm install
npm run dev

# Optional Python analytics (new terminal)
cd analytics
python -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements.txt
.\.venv\Scripts\python generate_analytics.py
```

Place private Spotify export JSON files in `data/raw/`, then import with:

```powershell
cd backend
npm run import -- ../data/raw
```

## Environment variables

Backend `.env`:

```text
PORT=4000
DATABASE_URL=postgres://spotify:spotify@localhost:5432/spotify_mood
CORS_ORIGIN=http://localhost:5173
ANALYTICS_OUTPUT_PATH=../data/processed/analytics.json
MUSICBRAINZ_BASE_URL=https://musicbrainz.org/ws/2
MUSICBRAINZ_USER_AGENT=YourApp/1.0 (contact@example.com)
MUSICBRAINZ_REQUEST_DELAY_MS=1100
```

Frontend deployment builds may set `VITE_API_BASE_URL` to the public backend URL. Never commit `.env`, raw Spotify JSON, or private generated data.

## Deployment preparation

Deploy the React static build and Express API separately, with a managed PostgreSQL instance. Set `DATABASE_URL`, `CORS_ORIGIN` (the dashboard origin), and `VITE_API_BASE_URL` (the API origin) in the respective hosts. Run the migrations against the production database before starting the API:

```powershell
cd backend
npm run db:migrate
npm start

cd frontend
npm run build
```

MusicBrainz enrichment is complete and should not be rerun as part of deployment. Metadata coverage is intentionally partial: 3,887 enriched, 3,318 ambiguous, 4,521 not found, 1 error; 1,066 tracks have tags and none have MusicBrainz genres.

## Scope decisions

This is a personal, single-user project: no authentication, users table, Spotify OAuth, public uploads, multi-tenancy, ML, paid audio-feature APIs, queues, Redis, or microservices. Raw listening data is preserved, including non-standard audio entries.
