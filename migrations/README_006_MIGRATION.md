# Migration 006: Remove Template Authentication

## Overview
This migration reverts the authentication changes added in Story 3.4 and restores the single-user, no-auth pattern from Epics 1-2.

## Changes
- Disables Row Level Security (RLS) on templates table
- Drops all RLS policies (select, insert, update, delete)
- Removes `user_id` column from templates table
- Removes `UNIQUE(user_id, name)` constraint
- Adds `UNIQUE(name)` constraint for single-user mode

## Running the Migration

### Option 1: Supabase Dashboard (Recommended)
1. Go to https://supabase.com/dashboard
2. Select your project: ttvykbxlufwwfucfrkfy
3. Navigate to SQL Editor
4. Copy and paste the contents of `006_remove_template_authentication.sql`
5. Click "Run" to execute the migration

### Option 2: Manual SQL Execution
If you have direct database access, run:
```bash
psql "postgresql://postgres:YOUR_PASSWORD@db.ttvykbxlufwwfucfrkfy.supabase.co:5432/postgres" \
  -f migrations/006_remove_template_authentication.sql
```

### Option 3: Supabase CLI
If you have the Supabase CLI installed:
```bash
supabase db push --file migrations/006_remove_template_authentication.sql
```

## Verification
After running the migration, verify the changes:

1. Check that RLS is disabled:
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'templates';
-- rowsecurity should be 'f' (false)
```

2. Check that user_id column is gone:
```sql
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'templates' AND column_name = 'user_id';
-- Should return 0 rows
```

3. Check that the UNIQUE(name) constraint exists:
```sql
SELECT conname, contype
FROM pg_constraint
WHERE conrelid = 'templates'::regclass AND contype = 'u';
-- Should show templates_name_unique
```

## Code Changes
The following files were updated to remove authentication:

### API Routes
- `app/api/templates/route.ts` - Removed auth checks from GET and POST
- `app/api/templates/[id]/route.ts` - Removed auth checks from GET, PUT, DELETE

### Types
- `types/template.ts` - Removed `user_id` field from Template interface

### Database Layer
- `lib/db/templates.ts` - Updated all functions to work without authentication

## Rollback
To rollback this migration, you would need to:
1. Re-run migration `005_migrate_epic1_to_epic3.sql` (or relevant portions)
2. Restore authentication code in API routes
3. Add back `user_id` field to TypeScript types

**WARNING**: Rollback would require re-adding user_id values to existing templates.

## Impact
- Templates are now accessible without authentication
- Single-user mode restored
- All templates are shared (no user isolation)
- Suitable for personal/single-user tool usage

## Testing
After migration, test the API endpoints:

```bash
# Should return 200 with templates array (no 401 error)
curl http://localhost:3000/api/templates

# Should create a template without auth
curl -X POST http://localhost:3000/api/templates \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","fields":[{"id":"1","name":"Field1","order":1}]}'
```
