CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS artists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  album_name TEXT NOT NULL DEFAULT 'Unknown Album',
  spotify_track_uri TEXT,
  genre TEXT,
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT tracks_artist_name_album_unique UNIQUE (artist_id, name, album_name)
);

CREATE TABLE IF NOT EXISTS listening_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  played_at TIMESTAMPTZ NOT NULL,
  ms_played INTEGER NOT NULL DEFAULT 0 CHECK (ms_played >= 0),
  platform TEXT,
  country TEXT,
  reason_start TEXT,
  reason_end TEXT,
  skipped BOOLEAN,
  shuffle BOOLEAN,
  source_file TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT listening_history_track_time_unique UNIQUE (track_id, played_at, ms_played)
);

CREATE INDEX IF NOT EXISTS idx_listening_history_played_at ON listening_history (played_at);
CREATE INDEX IF NOT EXISTS idx_listening_history_track_id ON listening_history (track_id);
CREATE INDEX IF NOT EXISTS idx_tracks_artist_id ON tracks (artist_id);
