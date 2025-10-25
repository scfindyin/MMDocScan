# Epic 3 Migration Notes - Story 3.4

## Database Migration Status

**IMPORTANT**: The database migration SQL is ready but **NOT YET EXECUTED**.

### Migration Files
- **Forward Migration**: `migrations/005_migrate_epic1_to_epic3.sql`
- **Rollback Migration**: `migrations/005_rollback_epic3_to_epic1.sql`

### Manual Migration Steps Required

1. **Before Migration**:
   - Backup production database
   - Test migration on staging environment first
   - Verify all users have valid auth.users entries

2. **Execute Migration**:
   - Open Supabase Dashboard → SQL Editor
   - Copy and paste `migrations/005_migrate_epic1_to_epic3.sql`
   - Click "Run" to execute migration
   - Verify migration success with test queries

3. **Post-Migration Verification**:
   - Test RLS policies with multiple users
   - Verify data migrated correctly (check fields JSONB structure)
   - Test all API endpoints (GET, POST, PUT, DELETE)
   - Verify extraction functions still work

## Frontend Code Updates Needed

The following files reference Epic 1 schema and need updates for Epic 3:

### Files Requiring Updates
1. `app/api/extract/production/route.ts` - Uses `field_name`, `field_type` (Epic 1)
2. `app/api/extract/test/route.ts` - Uses `field_name`, `field_type` (Epic 1)
3. `app/api/extract/suggest-fields/route.ts` - Uses Epic 1 types
4. `app/templates/[id]/edit/page.tsx` - Imports `TemplateType`, `FieldType`  
5. `app/templates/new/page.tsx` - Imports `TemplateType`, `FieldType`
6. `app/templates/page.tsx` - Imports Epic 1 types
7. `app/process/page.tsx` - Uses Epic 1 template structure

### Schema Changes to Apply

**Epic 1 → Epic 3 Field Mapping**:
```typescript
// Epic 1 (OLD)
templateField.field_name → templateField.name  // Epic 3 (NEW)
templateField.field_type → (removed - not in Epic 3)
templateField.is_header → (removed - not in Epic 3)
templateField.display_order → templateField.order  // Epic 3 (NEW)
```

**Epic 1 → Epic 3 Template Structure**:
```typescript
// Epic 1 (OLD)
{
  id, name, template_type, created_at, updated_at,
  fields: [{id, template_id, field_name, field_type, is_header, display_order}],
  prompts: [{id, template_id, prompt_text, prompt_type}]
}

// Epic 3 (NEW)
{
  id, user_id, name, created_at, updated_at,
  fields: [{id, name, instructions?, order}],  // JSONB array
  extraction_prompt: string | null              // single TEXT field
}
```

## Implementation Status

### ✅ Completed (Story 3.4)
- [x] Server-side Supabase client (`lib/supabase-server.ts`)
- [x] Zod validation schemas (`lib/validation/templates.ts`)
- [x] Type definitions updated to Epic 3 schema
- [x] Database helper functions updated (`lib/db/templates.ts`)
- [x] GET /api/templates endpoint with auth + RLS
- [x] POST /api/templates endpoint with auth + RLS  
- [x] GET /api/templates/:id endpoint with auth + RLS
- [x] PUT /api/templates/:id endpoint with auth + RLS
- [x] DELETE /api/templates/:id endpoint with auth + RLS
- [x] Migration SQL scripts (forward + rollback)

### ⚠️ Pending (Follow-Up Stories)
- [ ] Execute database migration (manual step via Supabase Dashboard)
- [ ] Update extraction API routes for Epic 3 schema
- [ ] Update frontend template pages for Epic 3 schema
- [ ] Update process page for Epic 3 schema
- [ ] End-to-end testing after migration

## Breaking Changes

1. **Database Schema**: Epic 1 (3 tables) → Epic 3 (1 table with JSONB)
2. **Authentication**: All template endpoints now require authentication
3. **User Isolation**: Templates are now user-specific (RLS enforced)
4. **API Contracts**: Template structure changed (removed template_type, changed field structure)
5. **Field Types**: Epic 3 removed field_type concept (flexible extraction)

## Rollback Procedure

If migration fails or causes issues:

1. Open Supabase Dashboard → SQL Editor
2. Run `migrations/005_rollback_epic3_to_epic1.sql`
3. Restore from backup if needed
4. Redeploy previous code version

## Testing Checklist (Post-Migration)

- [ ] Test GET /api/templates with authenticated user (should return only their templates)
- [ ] Test GET /api/templates with unauthenticated request (should return 401)
- [ ] Test POST /api/templates creates template with RLS user_id enforcement
- [ ] Test GET /api/templates/:id returns template (RLS-filtered)
- [ ] Test GET /api/templates/:id with another user's template ID (should return 404)
- [ ] Test PUT /api/templates/:id updates template (RLS-filtered)
- [ ] Test DELETE /api/templates/:id deletes template (RLS-filtered)
- [ ] Test duplicate template name returns 400
- [ ] Test invalid UUID returns 400
- [ ] Verify RLS policies with multiple users (no cross-user access)

## Support

For migration issues, contact: Steve (Project Owner)
Date Created: 2025-10-24
Story: 3.4 - Template CRUD API Endpoints
