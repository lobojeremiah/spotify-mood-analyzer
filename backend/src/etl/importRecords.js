export async function importRecords(client, records) {
  const summary = {
    imported: 0,
    skippedDuplicates: 0
  };

  for (const record of records) {
    const artistResult = await client.query(
      `
        INSERT INTO artists (name)
        VALUES ($1)
        ON CONFLICT (name)
        DO UPDATE SET updated_at = now()
        RETURNING id
      `,
      [record.artistName]
    );

    const artistId = artistResult.rows[0].id;

    const trackResult = await client.query(
      `
        INSERT INTO tracks (artist_id, name, album_name, spotify_track_uri)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (artist_id, name, album_name)
        DO UPDATE SET
          spotify_track_uri = COALESCE(tracks.spotify_track_uri, EXCLUDED.spotify_track_uri),
          updated_at = now()
        RETURNING id
      `,
      [artistId, record.trackName, record.albumName, record.spotifyTrackUri]
    );

    const trackId = trackResult.rows[0].id;

    const historyResult = await client.query(
      `
        INSERT INTO listening_history (
          track_id,
          played_at,
          ms_played,
          platform,
          country,
          reason_start,
          reason_end,
          skipped,
          shuffle,
          source_file
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (track_id, played_at, ms_played) DO NOTHING
        RETURNING id
      `,
      [
        trackId,
        record.playedAt,
        record.msPlayed,
        record.platform,
        record.country,
        record.reasonStart,
        record.reasonEnd,
        record.skipped,
        record.shuffle,
        record.sourceFile
      ]
    );

    if (historyResult.rowCount === 0) {
      summary.skippedDuplicates += 1;
    } else {
      summary.imported += 1;
    }
  }

  return summary;
}

