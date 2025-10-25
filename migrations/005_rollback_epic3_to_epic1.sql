-- Rollback Migration 005: Epic 3 to Epic 1 Schema Restoration
-- Story 3.4: Template CRUD API Endpoints
-- Purpose: Restore Epic 1 normalized schema from Epic 3 denormalized schema
--
-- ROLLBACK STRATEGY:
-- This script reverses the Epic 1 → Epic 3 migration by:
-- 1. Recreating template_fields and template_prompts tables
-- 2. Extracting data from templates.fields JSONB → template_fields rows
-- 3. Extracting data from templates.extraction_prompt → template_prompts rows
-- 4. Restoring template_type column with default value 'generic'
-- 5. Dropping RLS policies
-- 6. Disabling RLS on templates table
-- 7. Removing user_id, fields, extraction_prompt columns
-- 8. Removing UNIQUE(user_id, name) constraint
--
-- WARNING: This rollback will LOSE user_id information (Epic 1 doesn't support multi-user)
-- WARNING: template_type will be set to 'generic' for all templates (original values not recoverable)

-- ==============================================================================
-- STEP 1: Recreate template_fields table
-- ==============================================================================

CREATE TABLE template_fields (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text',
  is_header BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_template_fields_template_id ON template_fields(template_id);
CREATE INDEX idx_template_fields_display_order ON template_fields(template_id, display_order);

COMMENT ON TABLE template_fields IS 'Stores individual field definitions for each template (Epic 1 schema)';

-- ==============================================================================
-- STEP 2: Recreate template_prompts table
-- ==============================================================================

CREATE TABLE template_prompts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
  prompt_text TEXT NOT NULL,
  prompt_type TEXT NOT NULL CHECK (prompt_type IN ('extraction', 'validation', 'refinement', 'custom')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_template_prompts_template_id ON template_prompts(template_id);

COMMENT ON TABLE template_prompts IS 'Stores AI prompts for each template (Epic 1 schema)';

-- ==============================================================================
-- STEP 3: Migrate templates.fields JSONB → template_fields rows
-- ==============================================================================

-- Disable RLS temporarily to allow data migration
ALTER TABLE templates DISABLE ROW LEVEL SECURITY;

-- Extract fields from JSONB and insert into template_fields table
INSERT INTO template_fields (template_id, field_name, field_type, is_header, display_order, created_at)
SELECT
  t.id AS template_id,
  field->>'name' AS field_name,
  'text' AS field_type,  -- Default to 'text' (Epic 1 field_type not stored in Epic 3)
  false AS is_header,    -- Default to false (Epic 1 is_header not stored in Epic 3)
  (field->>'order')::INTEGER AS display_order,
  NOW() AS created_at
FROM templates t
CROSS JOIN LATERAL jsonb_array_elements(t.fields) AS field
WHERE jsonb_array_length(t.fields) > 0;

-- Log migration stats
DO $$
DECLARE
  fields_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO fields_count FROM template_fields;
  RAISE NOTICE 'Restored % field rows to template_fields table from templates.fields JSONB', fields_count;
END $$;

-- ==============================================================================
-- STEP 4: Migrate templates.extraction_prompt → template_prompts rows
-- ==============================================================================

INSERT INTO template_prompts (template_id, prompt_text, prompt_type, created_at)
SELECT
  id AS template_id,
  extraction_prompt AS prompt_text,
  'extraction' AS prompt_type,
  NOW() AS created_at
FROM templates
WHERE extraction_prompt IS NOT NULL AND extraction_prompt != '';

-- Log migration stats
DO $$
DECLARE
  prompts_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO prompts_count FROM template_prompts;
  RAISE NOTICE 'Restored % prompt rows to template_prompts table from templates.extraction_prompt', prompts_count;
END $$;

-- ==============================================================================
-- STEP 5: Restore template_type column (default to 'generic')
-- ==============================================================================

ALTER TABLE templates
ADD COLUMN template_type TEXT NOT NULL DEFAULT 'generic' CHECK (template_type IN ('invoice', 'estimate', 'equipment_log', 'timesheet', 'consumable_log', 'generic'));

CREATE INDEX idx_templates_template_type ON templates(template_type);

COMMENT ON COLUMN templates.template_type IS 'Template type: invoice, estimate, equipment_log, timesheet, consumable_log, or generic';

RAISE NOTICE 'Restored template_type column (defaulted to ''generic'' - original values not recoverable)';

-- ==============================================================================
-- STEP 6: Drop RLS policies
-- ==============================================================================

DROP POLICY IF EXISTS select_own_templates ON templates;
DROP POLICY IF EXISTS insert_own_templates ON templates;
DROP POLICY IF EXISTS update_own_templates ON templates;
DROP POLICY IF EXISTS delete_own_templates ON templates;

RAISE NOTICE 'Dropped 4 RLS policies from templates table';

-- ==============================================================================
-- STEP 7: Drop UNIQUE(user_id, name) constraint
-- ==============================================================================

ALTER TABLE templates
DROP CONSTRAINT IF EXISTS templates_user_id_name_unique;

RAISE NOTICE 'Dropped UNIQUE(user_id, name) constraint';

-- ==============================================================================
-- STEP 8: Remove Epic 3 columns
-- ==============================================================================

-- Drop user_id index
DROP INDEX IF EXISTS idx_templates_user_id;

-- Remove user_id column (FK constraint auto-dropped)
ALTER TABLE templates
DROP COLUMN IF EXISTS user_id CASCADE;

-- Remove fields JSONB column
ALTER TABLE templates
DROP COLUMN IF EXISTS fields;

-- Remove extraction_prompt column
ALTER TABLE templates
DROP COLUMN IF EXISTS extraction_prompt;

RAISE NOTICE 'Removed Epic 3 columns: user_id, fields, extraction_prompt';

-- ==============================================================================
-- ROLLBACK COMPLETE
-- ==============================================================================

DO $$
BEGIN
  RAISE NOTICE '=======================================================================';
  RAISE NOTICE 'Epic 3 to Epic 1 Rollback Complete!';
  RAISE NOTICE '=======================================================================';
  RAISE NOTICE 'Schema Changes:';
  RAISE NOTICE '  - Recreated: template_fields table with data from templates.fields JSONB';
  RAISE NOTICE '  - Recreated: template_prompts table with data from templates.extraction_prompt';
  RAISE NOTICE '  - Restored: template_type column (defaulted to ''generic'')';
  RAISE NOTICE '  - Dropped: 4 RLS policies';
  RAISE NOTICE '  - Disabled: Row Level Security on templates table';
  RAISE NOTICE '  - Removed: user_id column (multi-user support lost)';
  RAISE NOTICE '  - Removed: fields JSONB column';
  RAISE NOTICE '  - Removed: extraction_prompt column';
  RAISE NOTICE '=======================================================================';
  RAISE NOTICE 'WARNINGS:';
  RAISE NOTICE '  - User isolation (user_id) data has been LOST';
  RAISE NOTICE '  - template_type defaulted to ''generic'' (original values not recoverable)';
  RAISE NOTICE '  - field_type defaulted to ''text'' (original values not recoverable)';
  RAISE NOTICE '  - is_header defaulted to false (original values not recoverable)';
  RAISE NOTICE '=======================================================================';
  RAISE NOTICE 'Epic 1 schema restored successfully!';
  RAISE NOTICE '=======================================================================';
END $$;
