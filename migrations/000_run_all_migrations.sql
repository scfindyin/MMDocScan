-- ==============================================================================
-- COMPLETE MIGRATION SCRIPT FOR STORY 1.3
-- ==============================================================================
-- Story 1.3: Template Data Model and Storage
-- Purpose: Create complete database schema for template storage
--
-- INSTRUCTIONS:
-- 1. Open Supabase Dashboard → SQL Editor
-- 2. Copy and paste this ENTIRE file
-- 3. Click "Run" to execute all migrations at once
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- Migration 001: Create templates table
-- ------------------------------------------------------------------------------

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create templates table
CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  template_type TEXT NOT NULL CHECK (template_type IN ('invoice', 'estimate', 'equipment_log', 'timesheet', 'consumable_log', 'generic')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on template_type for faster filtering
CREATE INDEX IF NOT EXISTS idx_templates_template_type ON templates(template_type);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_templates_updated_at ON templates;
CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE templates IS 'Stores extraction template metadata';
COMMENT ON COLUMN templates.id IS 'Unique template identifier (UUID)';
COMMENT ON COLUMN templates.name IS 'Human-readable template name';
COMMENT ON COLUMN templates.template_type IS 'Template type: invoice, estimate, equipment_log, timesheet, consumable_log, or generic';
COMMENT ON COLUMN templates.created_at IS 'Timestamp when template was created';
COMMENT ON COLUMN templates.updated_at IS 'Timestamp when template was last updated (automatically maintained)';

-- ------------------------------------------------------------------------------
-- Migration 002: Create template_fields table
-- ------------------------------------------------------------------------------

-- Create template_fields table
CREATE TABLE IF NOT EXISTS template_fields (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_type TEXT NOT NULL,
  is_header BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on template_id for faster joins
CREATE INDEX IF NOT EXISTS idx_template_fields_template_id ON template_fields(template_id);

-- Create index on display_order for sorting
CREATE INDEX IF NOT EXISTS idx_template_fields_display_order ON template_fields(template_id, display_order);

-- Add comments for documentation
COMMENT ON TABLE template_fields IS 'Stores field definitions for each template';
COMMENT ON COLUMN template_fields.id IS 'Unique field identifier (UUID)';
COMMENT ON COLUMN template_fields.template_id IS 'Foreign key to templates table (CASCADE DELETE)';
COMMENT ON COLUMN template_fields.field_name IS 'Name of the field to extract';
COMMENT ON COLUMN template_fields.field_type IS 'Data type: text, number, date, currency';
COMMENT ON COLUMN template_fields.is_header IS 'True if field is header-level (vs detail/line-item)';
COMMENT ON COLUMN template_fields.display_order IS 'Order for displaying fields (0-based)';
COMMENT ON COLUMN template_fields.created_at IS 'Timestamp when field was created';

-- ------------------------------------------------------------------------------
-- Migration 003: Create template_prompts table
-- ------------------------------------------------------------------------------

-- Create template_prompts table
CREATE TABLE IF NOT EXISTS template_prompts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  prompt_text TEXT NOT NULL,
  prompt_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on template_id for faster joins
CREATE INDEX IF NOT EXISTS idx_template_prompts_template_id ON template_prompts(template_id);

-- Create index on prompt_type for filtering
CREATE INDEX IF NOT EXISTS idx_template_prompts_prompt_type ON template_prompts(template_id, prompt_type);

-- Add comments for documentation
COMMENT ON TABLE template_prompts IS 'Stores custom AI prompts for each template';
COMMENT ON COLUMN template_prompts.id IS 'Unique prompt identifier (UUID)';
COMMENT ON COLUMN template_prompts.template_id IS 'Foreign key to templates table (CASCADE DELETE)';
COMMENT ON COLUMN template_prompts.prompt_text IS 'The custom prompt text for AI extraction';
COMMENT ON COLUMN template_prompts.prompt_type IS 'Type/category of prompt (e.g., extraction, validation, refinement)';
COMMENT ON COLUMN template_prompts.created_at IS 'Timestamp when prompt was created';

-- ==============================================================================
-- VERIFICATION QUERIES (Run these after migration to verify success)
-- ==============================================================================

-- Check that all tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('templates', 'template_fields', 'template_prompts')
ORDER BY table_name;

-- Check templates table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'templates'
ORDER BY ordinal_position;

-- Check foreign key constraints
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name IN ('template_fields', 'template_prompts');

-- ------------------------------------------------------------------------------
-- Migration 004: Create extractions table
-- ------------------------------------------------------------------------------

-- Create extractions table
CREATE TABLE IF NOT EXISTS extractions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  extracted_data JSONB NOT NULL,
  row_count INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on template_id for faster joins
CREATE INDEX IF NOT EXISTS idx_extractions_template_id ON extractions(template_id);

-- Create index on created_at for sorting (newest first)
CREATE INDEX IF NOT EXISTS idx_extractions_created_at ON extractions(created_at DESC);

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
DROP TRIGGER IF EXISTS trigger_enforce_extraction_limit ON extractions;
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

-- ==============================================================================
-- SUCCESS! All migrations completed.
-- ==============================================================================
