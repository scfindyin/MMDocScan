-- Migration 006: Remove Template Authentication
-- Purpose: Revert to single-user, no-auth pattern from Epics 1-2
-- Story: Rollback authentication added in Story 3.4
--
-- Changes:
-- 1. Disable Row Level Security (RLS)
-- 2. Drop RLS policies
-- 3. Remove user_id column
-- 4. Remove UNIQUE(user_id, name) constraint
-- 5. Re-add simple UNIQUE(name) constraint for single-user mode
--
-- This reverts the multi-user authentication pattern back to single-user tool mode

-- ==============================================================================
-- STEP 1: Disable Row Level Security
-- ==============================================================================

ALTER TABLE templates DISABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- STEP 2: Drop RLS Policies
-- ==============================================================================

DROP POLICY IF EXISTS select_own_templates ON templates;
DROP POLICY IF EXISTS insert_own_templates ON templates;
DROP POLICY IF EXISTS update_own_templates ON templates;
DROP POLICY IF EXISTS delete_own_templates ON templates;

-- ==============================================================================
-- STEP 3: Drop UNIQUE(user_id, name) constraint
-- ==============================================================================

ALTER TABLE templates
DROP CONSTRAINT IF EXISTS templates_user_id_name_unique;

-- ==============================================================================
-- STEP 4: Remove user_id column
-- ==============================================================================

-- Drop the index first
DROP INDEX IF EXISTS idx_templates_user_id;

-- Drop the foreign key constraint
ALTER TABLE templates
DROP CONSTRAINT IF EXISTS templates_user_id_fkey;

-- Drop the user_id column
ALTER TABLE templates
DROP COLUMN IF EXISTS user_id;

-- ==============================================================================
-- STEP 5: Add simple UNIQUE(name) constraint for single-user mode
-- ==============================================================================

ALTER TABLE templates
ADD CONSTRAINT templates_name_unique UNIQUE(name);

-- ==============================================================================
-- MIGRATION COMPLETE
-- ==============================================================================

DO $$
BEGIN
  RAISE NOTICE '=======================================================================';
  RAISE NOTICE 'Template Authentication Removal Complete!';
  RAISE NOTICE '=======================================================================';
  RAISE NOTICE 'Schema Changes:';
  RAISE NOTICE '  - Disabled: Row Level Security (RLS)';
  RAISE NOTICE '  - Dropped: All RLS policies (select, insert, update, delete)';
  RAISE NOTICE '  - Removed: user_id column and related constraints';
  RAISE NOTICE '  - Added: UNIQUE(name) constraint for single-user mode';
  RAISE NOTICE '=======================================================================';
  RAISE NOTICE 'Templates table now accessible without authentication';
  RAISE NOTICE 'Single-user tool pattern restored';
  RAISE NOTICE '=======================================================================';
END $$;
