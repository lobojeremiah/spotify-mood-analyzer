function firstNonEmpty(...values) {
  return values.find((value) => value !== undefined && value !== null && String(value).trim() !== "");
}

function toBoolean(value) {
  if (typeof value === "boolean") return value;
  if (value === undefined || value === null) return null;
  if (value === 1 || value === "1" || value === "true") return true;
  if (value === 0 || value === "0" || value === "false") return false;
  return null;
}

function normalizeTimestamp(value) {
  if (!value) return null;

  const normalizedValue = typeof value === "string" && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(value)
    ? `${value.replace(" ", "T")}:00Z`
    : value;

  const timestamp = new Date(normalizedValue);
  if (Number.isNaN(timestamp.getTime())) return null;

  return timestamp.toISOString();
}

export function normalizeRecord(raw, sourceFile) {
  const artistName = firstNonEmpty(raw.artistName, raw.master_metadata_album_artist_name, raw.artist_name);
  const trackName = firstNonEmpty(raw.trackName, raw.master_metadata_track_name, raw.track_name);
  const albumName = firstNonEmpty(raw.albumName, raw.master_metadata_album_album_name, raw.album_name);
  const playedAt = normalizeTimestamp(firstNonEmpty(raw.endTime, raw.ts, raw.played_at));
  const msPlayed = Number(firstNonEmpty(raw.msPlayed, raw.ms_played, 0));

  return {
    artistName: artistName?.trim() || null,
    trackName: trackName?.trim() || null,
    albumName: albumName?.trim() || "Unknown Album",
    playedAt,
    msPlayed: Number.isFinite(msPlayed) && msPlayed > 0 ? Math.round(msPlayed) : 0,
    platform: firstNonEmpty(raw.platform),
    country: firstNonEmpty(raw.conn_country, raw.country),
    reasonStart: firstNonEmpty(raw.reason_start),
    reasonEnd: firstNonEmpty(raw.reason_end),
    skipped: toBoolean(firstNonEmpty(raw.skipped)),
    shuffle: toBoolean(firstNonEmpty(raw.shuffle)),
    spotifyTrackUri: firstNonEmpty(raw.spotify_track_uri, raw.spotifyTrackUri),
    sourceFile
  };
}

export function validateRecord(record) {
  const errors = [];

  if (!record.artistName) errors.push("Missing artist name");
  if (!record.trackName) errors.push("Missing track name");
  if (!record.playedAt) errors.push("Missing or invalid timestamp");

  return {
    valid: errors.length === 0,
    errors
  };
}
