-- Migration 004: Create extractions table
-- Story 2.9: Extraction Session Management
-- Purpose: Store extraction results for session persistence and re-export

-- Create extractions table
CREATE TABLE extractions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  extracted_data JSONB NOT NULL,
  row_count INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on template_id for faster joins
CREATE INDEX idx_extractions_template_id ON extractions(template_id);

-- Create index on created_at for sorting (newest first)
CREATE INDEX idx_extractions_created_at ON extractions(created_at DESC);

-- Create function to enforce 10-item limit per table
-- Deletes oldest extractions when count exceeds 10
CREATE OR REPLACE FUNCTION enforce_extraction_limit()
RETURNS TRIGGER AS $$
BEGIN
  -- Delete oldest extractions if count exceeds 10
  DELETE FROM extractions
  WHERE id IN (
    SELECT id
    FROM extractions
    ORDER BY created_at DESC
    OFFSET 10
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce 10-item limit after each insert
CREATE TRIGGER trigger_enforce_extraction_limit
  AFTER INSERT ON extractions
  FOR EACH ROW
  EXECUTE FUNCTION enforce_extraction_limit();

-- Create function to delete extractions older than N days
-- Can be called manually or scheduled via Supabase cron job
CREATE OR REPLACE FUNCTION cleanup_old_extractions(days_old INTEGER DEFAULT 7)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM extractions
  WHERE created_at < NOW() - (days_old || ' days')::INTERVAL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE extractions IS 'Stores extraction results for session persistence and re-export (10-item limit, 7-day expiry)';
COMMENT ON COLUMN extractions.id IS 'Unique extraction identifier (UUID)';
COMMENT ON COLUMN extractions.template_id IS 'Foreign key to templates table (CASCADE DELETE)';
COMMENT ON COLUMN extractions.filename IS 'Original document filename (without extension)';
COMMENT ON COLUMN extractions.extracted_data IS 'Extraction results as JSONB array of ExtractedRow objects';
COMMENT ON COLUMN extractions.row_count IS 'Number of rows extracted from document';
COMMENT ON COLUMN extractions.created_at IS 'Timestamp when extraction was created';

COMMENT ON FUNCTION enforce_extraction_limit() IS 'Trigger function to maintain 10-item limit (FIFO retention policy)';
COMMENT ON FUNCTION cleanup_old_extractions(INTEGER) IS 'Delete extractions older than N days (default 7). Returns count of deleted rows. Can be called manually or via Supabase cron job.';
