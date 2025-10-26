-- Migration 006: Create Batch Extraction Tables for Story 3.11
-- Epic 3: Unified Batch Extraction Workflow
-- Story 3.11: Batch Extraction API with Rate Limit Mitigation

-- extraction_sessions table
-- Stores batch extraction session metadata and status
CREATE TABLE extraction_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  template_snapshot JSONB NOT NULL,
  files JSONB NOT NULL,
  custom_columns JSONB,
  status VARCHAR(50) NOT NULL CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'timeout')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes for extraction_sessions
CREATE INDEX idx_extraction_sessions_user_id ON extraction_sessions(user_id);
CREATE INDEX idx_extraction_sessions_status ON extraction_sessions(status);
CREATE INDEX idx_extraction_sessions_created_at ON extraction_sessions(created_at DESC);

-- extraction_results table
-- Stores individual extraction results for each file in a session
CREATE TABLE extraction_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES extraction_sessions(id) ON DELETE CASCADE,
  file_id VARCHAR(255) NOT NULL,
  source_file VARCHAR(500) NOT NULL,
  page_number INTEGER,
  detection_confidence DECIMAL(5, 4),
  extracted_data JSONB NOT NULL,
  raw_api_response JSONB,
  error TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for extraction_results
CREATE INDEX idx_extraction_results_session_id ON extraction_results(session_id);
CREATE INDEX idx_extraction_results_file_id ON extraction_results(file_id);
CREATE INDEX idx_extraction_results_created_at ON extraction_results(created_at DESC);

-- Row Level Security (RLS) Policies for extraction_sessions
ALTER TABLE extraction_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own extraction sessions
CREATE POLICY extraction_sessions_select_own
  ON extraction_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert their own extraction sessions
CREATE POLICY extraction_sessions_insert_own
  ON extraction_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own extraction sessions
CREATE POLICY extraction_sessions_update_own
  ON extraction_sessions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can only delete their own extraction sessions
CREATE POLICY extraction_sessions_delete_own
  ON extraction_sessions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Row Level Security (RLS) Policies for extraction_results
ALTER TABLE extraction_results ENABLE ROW LEVEL SECURITY;

-- Users can only see results for their own sessions
CREATE POLICY extraction_results_select_own
  ON extraction_results
  FOR SELECT
  USING (
    session_id IN (
      SELECT id FROM extraction_sessions WHERE auth.uid() = user_id
    )
  );

-- Users can only insert results for their own sessions
CREATE POLICY extraction_results_insert_own
  ON extraction_results
  FOR INSERT
  WITH CHECK (
    session_id IN (
      SELECT id FROM extraction_sessions WHERE auth.uid() = user_id
    )
  );

-- Users can only update results for their own sessions
CREATE POLICY extraction_results_update_own
  ON extraction_results
  FOR UPDATE
  USING (
    session_id IN (
      SELECT id FROM extraction_sessions WHERE auth.uid() = user_id
    )
  );

-- Users can only delete results for their own sessions
CREATE POLICY extraction_results_delete_own
  ON extraction_results
  FOR DELETE
  USING (
    session_id IN (
      SELECT id FROM extraction_sessions WHERE auth.uid() = user_id
    )
  );

-- Comments for documentation
COMMENT ON TABLE extraction_sessions IS 'Stores batch extraction sessions with status tracking and progress monitoring';
COMMENT ON TABLE extraction_results IS 'Stores individual file extraction results for batch sessions';
COMMENT ON COLUMN extraction_sessions.template_snapshot IS 'JSONB snapshot of template configuration at time of extraction';
COMMENT ON COLUMN extraction_sessions.files IS 'JSONB array of uploaded file metadata (name, size, type)';
COMMENT ON COLUMN extraction_sessions.custom_columns IS 'JSONB object of custom column values to apply to all results';
COMMENT ON COLUMN extraction_sessions.status IS 'Current session status: queued, processing, completed, failed, timeout';
COMMENT ON COLUMN extraction_sessions.progress IS 'Extraction progress percentage (0-100)';
COMMENT ON COLUMN extraction_results.detection_confidence IS 'Confidence score from DocumentDetector (0.0000-1.0000)';
COMMENT ON COLUMN extraction_results.extracted_data IS 'JSONB array of ExtractedRow objects with field values';
COMMENT ON COLUMN extraction_results.metadata IS 'JSONB object with chunk info, token usage, cache stats, etc.';
