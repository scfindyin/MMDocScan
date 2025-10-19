-- Migration 003: Create template_prompts table
-- Story 1.3: Template Data Model and Storage
-- Purpose: Store custom AI prompts for each template

-- Create template_prompts table
CREATE TABLE template_prompts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  prompt_text TEXT NOT NULL,
  prompt_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on template_id for faster joins
CREATE INDEX idx_template_prompts_template_id ON template_prompts(template_id);

-- Create index on prompt_type for filtering
CREATE INDEX idx_template_prompts_prompt_type ON template_prompts(template_id, prompt_type);

-- Add comments for documentation
COMMENT ON TABLE template_prompts IS 'Stores custom AI prompts for each template';
COMMENT ON COLUMN template_prompts.id IS 'Unique prompt identifier (UUID)';
COMMENT ON COLUMN template_prompts.template_id IS 'Foreign key to templates table (CASCADE DELETE)';
COMMENT ON COLUMN template_prompts.prompt_text IS 'The custom prompt text for AI extraction';
COMMENT ON COLUMN template_prompts.prompt_type IS 'Type/category of prompt (e.g., extraction, validation, refinement)';
COMMENT ON COLUMN template_prompts.created_at IS 'Timestamp when prompt was created';
