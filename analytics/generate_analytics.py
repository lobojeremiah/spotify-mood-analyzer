import json
import os
from datetime import datetime, timezone
from pathlib import Path

import psycopg
from dotenv import load_dotenv


load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgres://spotify:spotify@localhost:5432/spotify_mood")
OUTPUT_PATH = Path(os.getenv("ANALYTICS_OUTPUT_PATH", "../data/processed/analytics.json"))


def fetch_all(connection, query, params=None):
    with connection.cursor() as cursor:
        cursor.execute(query, params or ())
        columns = [column.name for column in cursor.description]
        return [dict(zip(columns, row)) for row in cursor.fetchall()]


def main():
    with psycopg.connect(DATABASE_URL) as connection:
        top_artists = fetch_all(
            connection,
            """
            SELECT
              a.name AS artist,
              COUNT(*)::int AS plays,
              ROUND(SUM(lh.ms_played) / 3600000.0, 2)::float AS hours
            FROM listening_history lh
            JOIN tracks t ON t.id = lh.track_id
            JOIN artists a ON a.id = t.artist_id
            GROUP BY a.name
            ORDER BY plays DESC, hours DESC
            LIMIT 20
            """
        )

        top_tracks = fetch_all(
            connection,
            """
            SELECT
              t.name AS track,
              a.name AS artist,
              COUNT(*)::int AS plays,
              ROUND(SUM(lh.ms_played) / 3600000.0, 2)::float AS hours
            FROM listening_history lh
            JOIN tracks t ON t.id = lh.track_id
            JOIN artists a ON a.id = t.artist_id
            GROUP BY t.name, a.name
            ORDER BY plays DESC, hours DESC
            LIMIT 20
            """
        )

        heatmap = fetch_all(
            connection,
            """
            SELECT
              EXTRACT(DOW FROM played_at)::int AS day_of_week,
              EXTRACT(HOUR FROM played_at)::int AS hour,
              COUNT(*)::int AS plays,
              ROUND(SUM(ms_played) / 3600000.0, 2)::float AS hours
            FROM listening_history
            GROUP BY day_of_week, hour
            ORDER BY day_of_week, hour
            """
        )

        trends = fetch_all(
            connection,
            """
            SELECT
              DATE_TRUNC('day', played_at)::date::text AS date,
              COUNT(*)::int AS plays,
              ROUND(SUM(ms_played) / 3600000.0, 2)::float AS hours
            FROM listening_history
            GROUP BY DATE_TRUNC('day', played_at)::date
            ORDER BY date
            """
        )

        genre_distribution = fetch_all(
            connection,
            """
            SELECT
              COALESCE(NULLIF(t.genre, ''), 'Unknown - pending enrichment') AS genre,
              COUNT(*)::int AS plays
            FROM listening_history lh
            JOIN tracks t ON t.id = lh.track_id
            GROUP BY COALESCE(NULLIF(t.genre, ''), 'Unknown - pending enrichment')
            ORDER BY plays DESC
            """
        )

    output = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "topArtists": top_artists,
        "topTracks": top_tracks,
        "listeningHoursHeatmap": heatmap,
        "listeningTrends": trends,
        "genreDistribution": genre_distribution
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(output, indent=2), encoding="utf-8")
    print(f"Wrote {OUTPUT_PATH}")


if __name__ == "__main__":
    main()

