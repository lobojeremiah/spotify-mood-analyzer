CREATE TABLE IF NOT EXISTS track_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track_id UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_recording_id TEXT,
  provider_release_id TEXT,
  genres TEXT[] NOT NULL DEFAULT '{}',
  tags TEXT[] NOT NULL DEFAULT '{}',
  enrichment_status TEXT NOT NULL DEFAULT 'pending',
  enriched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT track_metadata_track_provider_unique UNIQUE (track_id, provider),
  CONSTRAINT track_metadata_status_check CHECK (
    enrichment_status IN ('pending', 'enriched', 'not_found', 'error')
  )
);

CREATE INDEX IF NOT EXISTS idx_track_metadata_track_id ON track_metadata (track_id);
CREATE INDEX IF NOT EXISTS idx_track_metadata_provider_status
  ON track_metadata (provider, enrichment_status);
