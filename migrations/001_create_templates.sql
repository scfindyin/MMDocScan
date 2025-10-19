-- Migration 001: Create templates table
-- Story 1.3: Template Data Model and Storage
-- Purpose: Store template metadata with 6 supported template types

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create templates table
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  template_type TEXT NOT NULL CHECK (template_type IN ('invoice', 'estimate', 'equipment_log', 'timesheet', 'consumable_log', 'generic')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on template_type for faster filtering
CREATE INDEX idx_templates_template_type ON templates(template_type);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
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
