#!/usr/bin/env node

/**
 * Run Migration 006: Remove Template Authentication
 *
 * This script executes the migration to remove authentication from the templates system
 * and revert to the single-user pattern.
 *
 * Usage: node scripts/run-migration-006.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing environment variables');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)');
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('========================================');
  console.log('Running Migration 006: Remove Template Authentication');
  console.log('========================================\n');

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'migrations', '006_remove_template_authentication.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Executing migration SQL...\n');

    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: migrationSql });

    if (error) {
      console.error('Migration failed:', error);

      // If exec_sql RPC doesn't exist, try executing statements individually
      console.log('\nAttempting to execute migration statements individually...\n');

      const statements = [
        'ALTER TABLE templates DISABLE ROW LEVEL SECURITY',
        'DROP POLICY IF EXISTS select_own_templates ON templates',
        'DROP POLICY IF EXISTS insert_own_templates ON templates',
        'DROP POLICY IF EXISTS update_own_templates ON templates',
        'DROP POLICY IF EXISTS delete_own_templates ON templates',
        'ALTER TABLE templates DROP CONSTRAINT IF EXISTS templates_user_id_name_unique',
        'DROP INDEX IF EXISTS idx_templates_user_id',
        'ALTER TABLE templates DROP CONSTRAINT IF EXISTS templates_user_id_fkey',
        'ALTER TABLE templates DROP COLUMN IF EXISTS user_id',
        'ALTER TABLE templates ADD CONSTRAINT templates_name_unique UNIQUE(name)'
      ];

      for (const statement of statements) {
        console.log(`Executing: ${statement}`);
        const { error: stmtError } = await supabase.rpc('exec_sql', { sql_query: statement });
        if (stmtError) {
          console.error(`  Error: ${stmtError.message}`);
        } else {
          console.log('  Success');
        }
      }

      console.log('\nMigration completed with manual statement execution.');
      console.log('Please verify the results in the Supabase dashboard.');
      process.exit(1);
    }

    console.log('Migration completed successfully!\n');
    console.log('Changes applied:');
    console.log('  - Disabled Row Level Security (RLS)');
    console.log('  - Dropped all RLS policies');
    console.log('  - Removed user_id column and related constraints');
    console.log('  - Added UNIQUE(name) constraint for single-user mode');
    console.log('\nTemplates table is now accessible without authentication.');

  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
}

runMigration();
