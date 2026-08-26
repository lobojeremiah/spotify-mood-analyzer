# Database Schema

## artists

Stores canonical artist names. Artist names are unique in Phase 1 because Spotify exports do not provide stable artist IDs.

## tracks

Stores canonical tracks linked to artists. A track is considered unique by artist, track name, and album name. Phase 2 can add external IDs from Last.fm or Spotify later.

## listening_history

Stores one row per listening event. The table references `tracks`, keeps the normalized timestamp in `played_at`, and stores listening duration in milliseconds.

## Why this shape?

The schema keeps repeated strings out of the event table while preserving the raw behavior timeline needed for heatmaps, trends, and future clustering.

