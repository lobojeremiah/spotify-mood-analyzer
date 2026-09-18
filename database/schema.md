# Database Schema

## artists

Stores canonical artist names. Artist names are unique in Phase 1 because Spotify exports do not provide stable artist IDs.

## tracks

Stores canonical tracks linked to artists. A track is considered unique by artist, track name, and album name.

The existing `genre` and `tags` columns remain for Phase 1 compatibility, but external provider metadata should live in `track_metadata` going forward. This avoids mixing the app's canonical track identity with metadata from a specific enrichment source.

## listening_history

Stores one row per listening event. The table references `tracks`, keeps the normalized timestamp in `played_at`, and stores listening duration in milliseconds.

In the future multi-user version, listening history will be associated with a user or session. Track metadata will still remain shared because it describes the track, not an individual user's behavior.

## track_metadata

Stores reusable external metadata for canonical tracks.

This table is intentionally provider-agnostic. A row identifies the metadata provider with `provider`, then stores provider-specific recording and release identifiers in generic columns. For example, a future enrichment process can use `provider = 'musicbrainz'` without requiring a table named after MusicBrainz.

`track_metadata` does not contain a `user_id`. If multiple users listen to the same canonical track, they can reuse the same cached metadata row through:

```text
users
  -> listening_history
  -> tracks
  -> track_metadata
```

This keeps external metadata from being fetched separately for every user.

### Enrichment status

`enrichment_status` supports resumable enrichment:

- `pending` means the provider has not been checked yet.
- `enriched` means metadata was successfully found and stored.
- `not_found` means the provider was searched, but no sufficiently confident match was found.
- `ambiguous` means candidates were found, but the matcher could not choose one safely.
- `error` means a temporary or unexpected problem occurred and the row can be retried later.

Temporary errors should not be treated as permanent no-match results.

## Why this shape?

The schema keeps repeated strings out of the event table while preserving the raw behavior timeline needed for heatmaps, trends, and future clustering.

The metadata cache keeps provider-derived genres, tags, and identifiers separate from the canonical track table. That separation makes Phase 2 deployment-friendly because metadata can be reused across future users and across repeated imports.
