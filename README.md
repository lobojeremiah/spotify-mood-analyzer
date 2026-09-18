# Soundscape

A personal listening analytics dashboard built from a Spotify Extended Streaming History export.

Soundscape transforms years of personal listening history into an interactive view of listening habits, including listening trends, repeat behavior, listening rhythms, top artists and tracks, searchable history, music metadata, and a limited metadata-based mood view.

This is a single-user portfolio project built around one personal listening dataset.

## Live Demo

**[Soundscape](https://jerrys-soundscape.vercel.app/)**

Frontend: Vercel  
Backend API: Render  
Database: Neon PostgreSQL

## What it does

- Imports Spotify Extended Streaming History JSON into normalized PostgreSQL tables.
- Tracks listening frequency, duration, artists, tracks, albums, and listening time patterns.
- Provides yearly and monthly listening trends.
- Visualizes listening activity by weekday and hour.
- Shows top artists and tracks based on plays or listening time.
- Provides an "On Repeat" view for frequently replayed tracks.
- Provides a searchable archive of artists, tracks, and albums.
- Enriches music records with supplementary Spotify catalog metadata such as artwork.
- Uses MusicBrainz metadata and tags where available.
- Generates a limited mood view using explicit MusicBrainz tag mappings.
- Provides track, artist, and album archive/detail views through the API.

## Dataset

The current personal dataset contains:

| Metric | Value |
| --- | ---: |
| Listening events | 70,692 |
| Unique tracks | 11,727 |
| Unique artists | 3,776 |
| Listening time | 2,960.84 hours |
| First recorded event | 2019-09-27 |
| Last recorded event | 2026-06-05 |

The dataset covers approximately 6.7 years of listening history.

## Mood analysis

The mood section is intentionally limited.

Soundscape does **not** attempt to scientifically determine the emotional state of a listener or classify every song by mood.

Instead, mood categories are derived from available MusicBrainz tags using explicit mappings defined in:

`backend/src/moodRules.js`

For example, only tags that have been deliberately mapped to a mood category can contribute to that category. Tracks without a mapped tag remain unclassified.

This makes the mood system transparent and inspectable rather than presenting an opaque emotion-classification model as fact.

## Architecture

```text
Spotify Extended Streaming History JSON
                |
                v
        Node.js ETL / Import
                |
                v
        PostgreSQL Database
                |
        +-------+--------+
        |                |
        v                v
 Python Analytics    Express REST API
   (supplementary)          |
        |                   v
        +------------> React / Vite
                           |
                           v
                       Dashboard