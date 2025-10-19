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

-- ==============================================================================
-- SUCCESS! All migrations completed.
-- ==============================================================================
