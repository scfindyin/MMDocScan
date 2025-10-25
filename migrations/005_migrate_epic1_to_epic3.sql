-- Migration 005: Epic 1 to Epic 3 Schema Migration (BREAKING CHANGE)
-- Story 3.4: Template CRUD API Endpoints
-- Purpose: Transform Epic 1 normalized schema (3 tables) to Epic 3 denormalized schema (1 table with JSONB + user_id + RLS)
--
-- BREAKING CHANGE WARNING:
-- This migration is DESTRUCTIVE and transforms the entire template storage model:
-- - Epic 1: templates, template_fields, template_prompts (normalized, no user isolation)
-- - Epic 3: templates table with user_id, fields JSONB, extraction_prompt (denormalized, multi-user with RLS)
--
-- BACKUP REQUIRED: Run backup script before executing this migration
-- ROLLBACK AVAILABLE: See migrations/005_rollback_epic3_to_epic1.sql
--
-- Migration Steps:
-- 1. Add user_id column to templates table
-- 2. Backfill user_id for existing templates (using first auth user if available)
-- 3. Add fields JSONB column
-- 4. Migrate template_fields rows into fields JSONB array
-- 5. Add extraction_prompt TEXT column
-- 6. Migrate template_prompts.prompt_text to extraction_prompt
-- 7. Remove template_type column (not in Epic 3 spec)
-- 8. Add UNIQUE(user_id, name) constraint
-- 9. Create RLS policies (SELECT, INSERT, UPDATE, DELETE)
-- 10. Enable RLS on templates table
-- 11. Drop template_fields and template_prompts tables

-- ==============================================================================
-- STEP 1: Add user_id column with FK to auth.users
-- ==============================================================================

-- Add user_id column (nullable initially for backfill)
ALTER TABLE templates
ADD COLUMN user_id UUID;

-- Backfill user_id for existing templates
-- Strategy: Use the first user in auth.users, or a placeholder UUID if no users exist
DO $$
DECLARE
  default_user_id UUID;
BEGIN
  -- Try to get the first user from auth.users
  SELECT id INTO default_user_id FROM auth.users LIMIT 1;

  -- If no users exist, use a known placeholder UUID (will need manual correction)
  IF default_user_id IS NULL THEN
    default_user_id := '00000000-0000-0000-0000-000000000000';
    RAISE NOTICE 'WARNING: No users found in auth.users. Using placeholder UUID. You MUST manually update user_id values before deploying to production.';
  END IF;

  -- Backfill existing templates
  UPDATE templates SET user_id = default_user_id WHERE user_id IS NULL;

  RAISE NOTICE 'Backfilled user_id for % templates with user: %', (SELECT COUNT(*) FROM templates), default_user_id;
END $$;

-- Make user_id NOT NULL after backfill
ALTER TABLE templates
ALTER COLUMN user_id SET NOT NULL;

-- Add foreign key constraint to auth.users with CASCADE delete
ALTER TABLE templates
ADD CONSTRAINT templates_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id)
ON DELETE CASCADE;

-- Create index for user_id lookups
CREATE INDEX idx_templates_user_id ON templates(user_id);

COMMENT ON COLUMN templates.user_id IS 'User who owns this template (FK to auth.users with CASCADE delete)';

-- ==============================================================================
-- STEP 2: Add fields JSONB column
-- ==============================================================================

ALTER TABLE templates
ADD COLUMN fields JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN templates.fields IS 'Template field definitions as JSONB array: [{ id, name, instructions, order }]';

-- ==============================================================================
-- STEP 3: Migrate template_fields to templates.fields JSONB
-- ==============================================================================

-- Aggregate template_fields rows into fields JSONB array
UPDATE templates t
SET fields = (
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', tf.id::text,
      'name', tf.field_name,
      'instructions', '',  -- Epic 1 didn't have instructions field
      'order', tf.display_order
    ) ORDER BY tf.display_order
  ), '[]'::jsonb)
  FROM template_fields tf
  WHERE tf.template_id = t.id
);

-- Log migration stats
DO $$
DECLARE
  templates_migrated INTEGER;
  total_fields_migrated INTEGER;
BEGIN
  SELECT COUNT(*) INTO templates_migrated FROM templates WHERE jsonb_array_length(fields) > 0;
  SELECT COUNT(*) INTO total_fields_migrated FROM template_fields;

  RAISE NOTICE 'Migrated % fields from % templates into fields JSONB column', total_fields_migrated, templates_migrated;
END $$;

-- ==============================================================================
-- STEP 4: Add extraction_prompt TEXT column
-- ==============================================================================

ALTER TABLE templates
ADD COLUMN extraction_prompt TEXT;

COMMENT ON COLUMN templates.extraction_prompt IS 'Custom AI extraction prompt (optional, 0-2000 chars recommended)';

-- ==============================================================================
-- STEP 5: Migrate template_prompts to templates.extraction_prompt
-- ==============================================================================

-- Copy prompt_text from template_prompts to extraction_prompt
-- Only migrate prompts with prompt_type = 'extraction' or 'custom'
UPDATE templates t
SET extraction_prompt = (
  SELECT tp.prompt_text
  FROM template_prompts tp
  WHERE tp.template_id = t.id
    AND tp.prompt_type IN ('extraction', 'custom')
  LIMIT 1  -- Take first matching prompt if multiple exist
);

-- Log migration stats
DO $$
DECLARE
  prompts_migrated INTEGER;
BEGIN
  SELECT COUNT(*) INTO prompts_migrated FROM templates WHERE extraction_prompt IS NOT NULL;

  RAISE NOTICE 'Migrated % extraction prompts to templates.extraction_prompt column', prompts_migrated;
END $$;

-- ==============================================================================
-- STEP 6: Remove template_type column (not in Epic 3 spec)
-- ==============================================================================

-- Drop the template_type index first
DROP INDEX IF EXISTS idx_templates_template_type;

-- Drop the template_type column
ALTER TABLE templates
DROP COLUMN template_type;

DO $$
BEGIN
  RAISE NOTICE 'Removed template_type column (not in Epic 3 specification)';
END $$;

-- ==============================================================================
-- STEP 7: Add UNIQUE constraint on (user_id, name)
-- ==============================================================================

-- Add unique constraint for per-user template name uniqueness
ALTER TABLE templates
ADD CONSTRAINT templates_user_id_name_unique UNIQUE(user_id, name);

COMMENT ON CONSTRAINT templates_user_id_name_unique ON templates IS 'Ensures template names are unique per user';

-- ==============================================================================
-- STEP 8: Create RLS Policies
-- ==============================================================================

-- Policy 1: SELECT - Users can only see their own templates
CREATE POLICY select_own_templates ON templates
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy 2: INSERT - Users can only create templates for themselves
CREATE POLICY insert_own_templates ON templates
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy 3: UPDATE - Users can only update their own templates
CREATE POLICY update_own_templates ON templates
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy 4: DELETE - Users can only delete their own templates
CREATE POLICY delete_own_templates ON templates
  FOR DELETE
  USING (auth.uid() = user_id);

COMMENT ON POLICY select_own_templates ON templates IS 'RLS: Users can only SELECT their own templates (auth.uid() = user_id)';
COMMENT ON POLICY insert_own_templates ON templates IS 'RLS: Users can only INSERT templates with their own user_id';
COMMENT ON POLICY update_own_templates ON templates IS 'RLS: Users can only UPDATE their own templates';
COMMENT ON POLICY delete_own_templates ON templates IS 'RLS: Users can only DELETE their own templates';

-- ==============================================================================
-- STEP 9: Enable Row Level Security
-- ==============================================================================

ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  RAISE NOTICE 'Row Level Security (RLS) enabled on templates table with 4 policies';
END $$;

-- ==============================================================================
-- STEP 10: Drop Epic 1 tables (template_fields, template_prompts)
-- ==============================================================================

-- Drop template_prompts table (data already migrated)
DROP TABLE IF EXISTS template_prompts CASCADE;

-- Drop template_fields table (data already migrated)
DROP TABLE IF EXISTS template_fields CASCADE;

DO $$
BEGIN
  RAISE NOTICE 'Dropped template_prompts table (data migrated to templates.extraction_prompt)';
  RAISE NOTICE 'Dropped template_fields table (data migrated to templates.fields JSONB)';
END $$;

-- ==============================================================================
-- MIGRATION COMPLETE
-- ==============================================================================

DO $$
BEGIN
  RAISE NOTICE '=======================================================================';
  RAISE NOTICE 'Epic 1 to Epic 3 Migration Complete!';
  RAISE NOTICE '=======================================================================';
  RAISE NOTICE 'Schema Changes:';
  RAISE NOTICE '  - Added: user_id UUID NOT NULL (FK to auth.users with CASCADE)';
  RAISE NOTICE '  - Added: fields JSONB (migrated from template_fields table)';
  RAISE NOTICE '  - Added: extraction_prompt TEXT (migrated from template_prompts)';
  RAISE NOTICE '  - Removed: template_type column';
  RAISE NOTICE '  - Added: UNIQUE(user_id, name) constraint';
  RAISE NOTICE '  - Enabled: Row Level Security with 4 policies';
  RAISE NOTICE '  - Dropped: template_fields table (data in fields JSONB)';
  RAISE NOTICE '  - Dropped: template_prompts table (data in extraction_prompt)';
  RAISE NOTICE '=======================================================================';
  RAISE NOTICE 'IMPORTANT: Verify migration success before deploying to production!';
  RAISE NOTICE 'Rollback script available at: migrations/005_rollback_epic3_to_epic1.sql';
  RAISE NOTICE '=======================================================================';
END $$;
