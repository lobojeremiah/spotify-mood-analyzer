<<<<<<< HEAD
# Spotify Mood Analyzer

A full-stack portfolio project for analyzing Spotify listening-history exports.

Phase 1 focuses on reliable ingestion, cleaning, storage, and analytics. Spotify OAuth, external enrichment, and machine learning are intentionally deferred.

## Architecture

The project is organized as a small monorepo:

- `backend/` - Node.js + Express API and ETL import scripts.
- `database/` - PostgreSQL migrations and schema documentation.
- `analytics/` - Python analytics jobs that read from PostgreSQL and produce JSON outputs.
- `frontend/` - React dashboard for mood, genre, and behavior insights.
- `data/raw/` - local Spotify export JSON files, ignored by Git.
- `data/processed/` - generated analytics files, ignored by Git except for `.gitkeep`.

## Design Decisions

### Ingestion is script-based

Spotify exports are batch files, not live app traffic. A command-line import script is easier to rerun, debug, and document than hiding ingestion behind an API endpoint.

### PostgreSQL is normalized

Artists and tracks are stored once, while `listening_history` stores each play event. This avoids repeated artist and track strings, supports analytics efficiently, and leaves room for Phase 2 enrichment fields.

### Analytics is separated from the API

Python is used for analytics outputs because Phase 3 will introduce clustering. Keeping analytics in its own folder makes it natural to add pandas, scikit-learn, and notebooks later without bloating the Express app.

### Genres are placeholders in Phase 1

Spotify listening exports usually do not include genre. The Phase 1 schema includes nullable genre/tag fields so Phase 2 Last.fm enrichment can fill them later.

## Setup

1. Copy environment examples:

```bash
cp backend/.env.example backend/.env
cp analytics/.env.example analytics/.env
```

2. Start PostgreSQL:

```bash
docker compose up -d postgres
```

3. Install dependencies:

```bash
cd backend && npm install
cd ../frontend && npm install
cd ../analytics && python -m pip install -r requirements.txt
```

4. Apply database schema:

```bash
cd backend
npm run db:migrate
```

5. Put Spotify JSON export files in `data/raw/`.

6. Import data:

```bash
cd backend
npm run import -- ../data/raw
```

7. Generate analytics:

```bash
cd analytics
python generate_analytics.py
```

8. Run the API and frontend:

```bash
cd backend && npm run dev
cd frontend && npm run dev
```

## Expected Spotify Export Files

The importer supports common Spotify export shapes such as:

- `StreamingHistory*.json`
- `endsong*.json`
- JSON arrays of listening records

Records are normalized into a shared internal shape before validation and import.

## Phase Roadmap

### Phase 1

- Read Spotify JSON exports.
- Validate and clean listening records.
- Store artists, tracks, and listening history in PostgreSQL.
- Generate top artists, top tracks, listening heatmap, trends over time, and placeholder genre distribution.

### Phase 2

- Add Last.fm API enrichment.
- Store genres, tags, and mood-related metadata.
- Build rule-based mood classification.

### Phase 3

- Add K-Means clustering.
- Group songs into listening clusters.
- Compare clusters with rule-based mood classification.

=======
# spotify-mood-analyzer
>>>>>>> 7244ea0c2368772f46588680f75e01ba3a77a364
