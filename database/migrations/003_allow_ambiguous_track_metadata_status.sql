DO $$
BEGIN
  ALTER TABLE track_metadata
    DROP CONSTRAINT IF EXISTS track_metadata_status_check;

  ALTER TABLE track_metadata
    ADD CONSTRAINT track_metadata_status_check CHECK (
      enrichment_status IN ('pending', 'enriched', 'not_found', 'ambiguous', 'error')
    );
END $$;
