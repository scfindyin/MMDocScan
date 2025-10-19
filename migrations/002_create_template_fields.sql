-- Migration 002: Create template_fields table
-- Story 1.3: Template Data Model and Storage
-- Purpose: Store field definitions for each template

-- Create template_fields table
CREATE TABLE template_fields (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_type TEXT NOT NULL,
  is_header BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on template_id for faster joins
CREATE INDEX idx_template_fields_template_id ON template_fields(template_id);

-- Create index on display_order for sorting
CREATE INDEX idx_template_fields_display_order ON template_fields(template_id, display_order);

-- Add comments for documentation
COMMENT ON TABLE template_fields IS 'Stores field definitions for each template';
COMMENT ON COLUMN template_fields.id IS 'Unique field identifier (UUID)';
COMMENT ON COLUMN template_fields.template_id IS 'Foreign key to templates table (CASCADE DELETE)';
COMMENT ON COLUMN template_fields.field_name IS 'Name of the field to extract';
COMMENT ON COLUMN template_fields.field_type IS 'Data type: text, number, date, currency';
COMMENT ON COLUMN template_fields.is_header IS 'True if field is header-level (vs detail/line-item)';
COMMENT ON COLUMN template_fields.display_order IS 'Order for displaying fields (0-based)';
COMMENT ON COLUMN template_fields.created_at IS 'Timestamp when field was created';
