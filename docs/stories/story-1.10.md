# Story 1.10: Save Validated Template

Status: Done

## Story

As a user,
I want to save my template after successful testing,
so that I can reuse it for production document processing.

## Acceptance Criteria

1. "Save Template" button enabled after successful test extraction
2. Saves template with:
   - Template name and type
   - Field definitions (name, type, header/detail)
   - Custom prompts
   - Metadata (created date)
3. Template appears in template list after save
4. Success message: "Template '[name]' saved successfully"
5. Redirect to template list after save
6. Saved template can be selected and edited later (view/edit mode)
7. Editing existing template follows same workflow (load data, allow changes, re-test, save)

## Tasks / Subtasks

### Task Group 1: Save Template Button and State Management (AC: #1)
- [x] Task 1.1: Add "Save Template" button to template builder
  - [x] Subtask 1.1.1: Position button at bottom of page (after test results section)
  - [x] Subtask 1.1.2: Enable button only when: (template name set AND at least 1 field defined AND test extraction successful) OR (editing existing template)
  - [x] Subtask 1.1.3: Disable button during save operation (loading state)
  - [x] Subtask 1.1.4: Use ShadCN Button component with primary styling
- [x] Task 1.2: Implement save template handler
  - [x] Subtask 1.2.1: Prepare template payload (name, type, fields, custom prompt)
  - [x] Subtask 1.2.2: Call `/api/templates` POST endpoint for new templates
  - [x] Subtask 1.2.3: Call `/api/templates/:id` PUT endpoint for editing existing templates
  - [x] Subtask 1.2.4: Handle API response and errors

### Task Group 2: Template Save API Integration (AC: #2, #3)
- [x] Task 2.1: Verify POST /api/templates endpoint (created in Story 1.3)
  - [x] Subtask 2.1.1: Confirm endpoint accepts: {name, template_type, fields[], custom_prompt}
  - [x] Subtask 2.1.2: Verify fields array structure: {field_name, field_type, is_header, display_order}
  - [x] Subtask 2.1.3: Verify custom_prompt field saved to template_prompts table
  - [x] Subtask 2.1.4: Confirm created_at and updated_at timestamps auto-generated
- [x] Task 2.2: Map template builder state to API payload
  - [x] Subtask 2.2.1: Extract template name and type from form state
  - [x] Subtask 2.2.2: Transform fields state to database format (convert to is_header boolean, set display_order)
  - [x] Subtask 2.2.3: Include custom prompt from state
  - [x] Subtask 2.2.4: Validate payload before sending (Zod schema validation)
- [x] Task 2.3: Handle template save response
  - [x] Subtask 2.3.1: Extract saved template ID from response
  - [x] Subtask 2.3.2: Store template ID in state for potential future edits
  - [x] Subtask 2.3.3: Handle 400 validation errors (display field-specific errors)
  - [x] Subtask 2.3.4: Handle 500 server errors (display generic error message)

### Task Group 3: Success Feedback and Navigation (AC: #4, #5)
- [x] Task 3.1: Display success message after save
  - [x] Subtask 3.1.1: Show toast notification: "Template '[name]' saved successfully"
  - [x] Subtask 3.1.2: Use ShadCN Toast component for non-blocking notification
  - [x] Subtask 3.1.3: Auto-dismiss toast after 3 seconds
- [x] Task 3.2: Redirect to template list page
  - [x] Subtask 3.2.1: Use Next.js router.push to navigate to /templates
  - [x] Subtask 3.2.2: Redirect after 1 second delay (allow user to see success message)
  - [x] Subtask 3.2.3: Clear form state on navigation
  - [x] Subtask 3.2.4: Verify new template appears in template list

### Task Group 4: Edit Existing Template Workflow (AC: #6, #7)
- [x] Task 4.1: Create template edit page route
  - [x] Subtask 4.1.1: Create page at `/app/templates/[id]/edit/page.tsx`
  - [x] Subtask 4.1.2: Use same template builder component from /templates/new
  - [x] Subtask 4.1.3: Extract template ID from route params
  - [x] Subtask 4.1.4: Fetch template data on page load
- [x] Task 4.2: Load existing template data
  - [x] Subtask 4.2.1: Call GET /api/templates/:id endpoint
  - [x] Subtask 4.2.2: Parse response and populate form state:
    - Template name
    - Template type
    - Fields array (convert from database format to UI format)
    - Custom prompt
  - [x] Subtask 4.2.3: Set isEditMode flag to true in component state
  - [x] Subtask 4.2.4: Display loading state while fetching template
- [x] Task 4.3: Handle edit mode differences
  - [x] Subtask 4.3.1: Page title shows "Edit Template" vs "Create New Template"
  - [x] Subtask 4.3.2: Enable "Save Template" button immediately (don't require test)
  - [x] Subtask 4.3.3: Save button calls PUT /api/templates/:id instead of POST
  - [x] Subtask 4.3.4: Success message shows "Template '[name]' updated successfully"
- [x] Task 4.4: Support re-testing in edit mode
  - [x] Subtask 4.4.1: Allow user to upload new sample document
  - [x] Subtask 4.4.2: Allow user to modify fields and prompts
  - [x] Subtask 4.4.3: Allow user to run test extraction
  - [x] Subtask 4.4.4: User can save changes after re-testing

### Task Group 5: Template List Navigation Integration (AC: #3, #6)
- [x] Task 5.1: Add edit link to template list page
  - [x] Subtask 5.1.1: Modify `/app/templates/page.tsx` to add "Edit" button/link per template
  - [x] Subtask 5.1.2: Link navigates to `/templates/[id]/edit`
  - [x] Subtask 5.1.3: Style edit link consistently with existing UI
- [x] Task 5.2: Verify template list refresh after save
  - [x] Subtask 5.2.1: Template list page fetches templates on load
  - [x] Subtask 5.2.2: New template appears in list after redirect
  - [x] Subtask 5.2.3: Updated template shows latest changes after edit
  - [x] Subtask 5.2.4: Template metadata displays correctly (field count, type, date)

### Task Group 6: Validation and Error Handling (AC: #2)
- [x] Task 6.1: Pre-save validation
  - [x] Subtask 6.1.1: Validate template name not empty
  - [x] Subtask 6.1.2: Validate template type selected
  - [x] Subtask 6.1.3: Validate at least 1 field defined
  - [x] Subtask 6.1.4: Display validation errors inline (field-level errors)
- [x] Task 6.2: Handle API save errors
  - [x] Subtask 6.2.1: Database connection errors → "Unable to save template, please try again"
  - [x] Subtask 6.2.2: Duplicate template name errors → "Template name already exists"
  - [x] Subtask 6.2.3: Validation errors → Display specific field errors
  - [x] Subtask 6.2.4: Show error in Alert component, don't navigate away
- [x] Task 6.3: Handle edit-specific errors
  - [x] Subtask 6.3.1: Template not found (404) → Redirect to template list with error message
  - [x] Subtask 6.3.2: Template load errors → Display error, offer retry
  - [x] Subtask 6.3.3: Permission errors (future) → Display "Access denied" message

### Task Group 7: UI/UX Polish (AC: #4, #5)
- [x] Task 7.1: Loading states
  - [x] Subtask 7.1.1: Show spinner on "Save Template" button during save
  - [x] Subtask 7.1.2: Disable all form inputs during save
  - [x] Subtask 7.1.3: Show loading state on edit page while fetching template
  - [x] Subtask 7.1.4: Show loading overlay during redirect
- [x] Task 7.2: Visual feedback
  - [x] Subtask 7.2.1: Highlight "Save Template" button when test succeeds
  - [x] Subtask 7.2.2: Show checkmark icon on success toast
  - [x] Subtask 7.2.3: Smooth transitions between states
- [x] Task 7.3: Cancel and discard changes
  - [x] Subtask 7.3.1: Add "Cancel" button next to "Save Template"
  - [x] Subtask 7.3.2: Cancel navigates back to template list without saving
  - [x] Subtask 7.3.3: Show confirmation dialog if unsaved changes exist
  - [x] Subtask 7.3.4: "Discard changes" clears state and navigates away

### Task Group 8: Type Definitions and API Contracts (AC: #2)
- [x] Task 8.1: Define template save types
  - [x] Subtask 8.1.1: Verify Template interface in types/template.ts (from Story 1.3)
  - [x] Subtask 8.1.2: Verify TemplateField interface structure
  - [x] Subtask 8.1.3: Create SaveTemplateRequest type if needed
  - [x] Subtask 8.1.4: Create SaveTemplateResponse type if needed
- [x] Task 8.2: Ensure type compatibility across workflow
  - [x] Subtask 8.2.1: Template builder state matches API payload structure
  - [x] Subtask 8.2.2: Database schema matches TypeScript types
  - [x] Subtask 8.2.3: Template list displays correct type information

### Task Group 9: Integration with Previous Stories (AC: #1, #2, #7)
- [x] Task 9.1: Integrate with template field definition (Story 1.5)
  - [x] Subtask 9.1.1: Fields state from Story 1.5 used in save payload
  - [x] Subtask 9.1.2: Field validation rules applied before save
  - [x] Subtask 9.1.3: Header/detail categorization preserved in save
- [x] Task 9.2: Integrate with sample document upload (Story 1.6)
  - [x] Subtask 9.2.1: Sample document not saved to database (stays in memory only)
  - [x] Subtask 9.2.2: Sample document cleared from state after save
  - [x] Subtask 9.2.3: Edit mode allows uploading new sample for re-testing
- [x] Task 9.3: Integrate with custom prompt definition (Story 1.8)
  - [x] Subtask 9.3.1: Custom prompt from Story 1.8 included in save payload
  - [x] Subtask 9.3.2: Prompt saved to template_prompts table with prompt_type='custom'
  - [x] Subtask 9.3.3: Prompt loaded and displayed in edit mode
- [x] Task 9.4: Integrate with test extraction (Story 1.9)
  - [x] Subtask 9.4.1: Test results state indicates successful test
  - [x] Subtask 9.4.2: Save button enabled only after test succeeds (new template) or immediately (edit mode)
  - [x] Subtask 9.4.3: Test results cleared from state after save
  - [x] Subtask 9.4.4: User can re-test in edit mode before saving

### Task Group 10: Testing and Validation (AC: All)
- [x] Task 10.1: Build and lint validation
  - [x] Subtask 10.1.1: Run `npm run build` and verify zero errors
  - [x] Subtask 10.1.2: Run `npm run lint` and verify zero warnings
  - [x] Subtask 10.1.3: Check bundle size impact (expect minimal increase)
- [x] Task 10.2: Manual testing scenarios - New template creation
  - [x] Subtask 10.2.1: Create new template, run test extraction, save successfully
  - [x] Subtask 10.2.2: Verify template appears in template list
  - [x] Subtask 10.2.3: Verify success message displays correctly
  - [x] Subtask 10.2.4: Verify redirect to template list works
  - [x] Subtask 10.2.5: Verify all template data persisted (name, type, fields, prompt)
- [x] Task 10.3: Manual testing scenarios - Edit template
  - [x] Subtask 10.3.1: Click edit link from template list
  - [x] Subtask 10.3.2: Verify template data loads correctly in form
  - [x] Subtask 10.3.3: Modify fields and/or prompt, save successfully
  - [x] Subtask 10.3.4: Verify changes persisted in database
  - [x] Subtask 10.3.5: Verify updated template displays correctly in list
- [x] Task 10.4: Manual testing scenarios - Validation and errors
  - [x] Subtask 10.4.1: Try to save without template name, verify error
  - [x] Subtask 10.4.2: Try to save without fields, verify error
  - [x] Subtask 10.4.3: Try to save without running test (new template), verify button disabled
  - [x] Subtask 10.4.4: Simulate API error, verify error handling
- [x] Task 10.5: Integration testing
  - [x] Subtask 10.5.1: Full workflow: create → define fields → upload sample → test → save → verify in list
  - [x] Subtask 10.5.2: Full edit workflow: list → edit → modify → save → verify changes
  - [x] Subtask 10.5.3: Verify database CRUD operations work correctly
  - [x] Subtask 10.5.4: Verify all 6 template types can be created and saved

## Dev Notes

### Epic 1 Completion Context
Story 1.10 is the **final story in Epic 1**, completing the template creation and management foundation. After this story:
- Users can create templates with AI assistance (Stories 1.6, 1.7)
- Users can define custom prompts and test extraction (Stories 1.8, 1.9)
- Users can save validated templates for reuse (Story 1.10 - this story)
- Epic 1 deliverable achieved: "Users can create, test, and save validated extraction templates"

### API Endpoints (Created in Story 1.3)
- **POST /api/templates** - Create new template (existing endpoint from Story 1.3)
- **GET /api/templates/:id** - Fetch template by ID (existing endpoint from Story 1.3)
- **PUT /api/templates/:id** - Update existing template (existing endpoint from Story 1.3)
- **GET /api/templates** - List all templates (existing endpoint from Story 1.3, used by template list page)

No new API endpoints needed - Story 1.3 already implemented complete CRUD API.

### Database Schema (Created in Story 1.3)
From Story 1.3, the database schema is already established:
- **templates table**: id, name, template_type, created_at, updated_at
- **template_fields table**: id, template_id (FK), field_name, field_type, is_header, display_order
- **template_prompts table**: id, template_id (FK), prompt_text, prompt_type ('custom')

No schema changes needed for Story 1.10.

### UI Component Architecture
- **New template page**: `/app/templates/new/page.tsx` (existing, modify to add save functionality)
- **Edit template page**: `/app/templates/[id]/edit/page.tsx` (new page, reuse template builder component)
- **Template list page**: `/app/templates/page.tsx` (existing, add edit link)

Recommend extracting template builder form into reusable component for better code organization:
- Create `/components/templates/TemplateBuilder.tsx` (optional refactor)
- Reuse in both /templates/new and /templates/[id]/edit pages
- Reduces code duplication and improves maintainability

### State Management for Save Operation
The template builder page (`app/templates/new/page.tsx`) currently has:
- templateName, templateType, fields, customPrompt, sampleDocument, testResults (from Stories 1.5-1.9)

Add for Story 1.10:
- isSaving: boolean (loading state during save)
- saveError: string | null (error message)
- isEditMode: boolean (false for new, true for edit)
- templateId: string | null (for edit mode)

### Template Builder State Transformation
Current UI state → API payload mapping:

```typescript
// UI State (React component)
{
  templateName: string,
  templateType: string, // 'invoice', 'estimate', etc.
  fields: Array<{
    name: string,
    type: 'text' | 'number' | 'date' | 'currency',
    category: 'header' | 'detail',
    order: number
  }>,
  customPrompt: string
}

// API Payload (POST /api/templates)
{
  name: templateName,
  template_type: templateType,
  fields: fields.map((f, index) => ({
    field_name: f.name,
    field_type: f.type,
    is_header: f.category === 'header',
    display_order: index
  })),
  custom_prompt: customPrompt
}
```

### Save Button Enable Logic
Enable "Save Template" button when:
- **New template mode**: templateName && templateType && fields.length > 0 && testResults !== null (test extraction succeeded)
- **Edit template mode**: templateName && templateType && fields.length > 0 (test not required for edit)

### Edit Mode Workflow Differences
| Aspect | New Template Mode | Edit Template Mode |
|--------|-------------------|-------------------|
| **Page Route** | `/templates/new` | `/templates/[id]/edit` |
| **Initial State** | Empty form | Loaded from API |
| **Save Button** | Enabled after test | Enabled immediately |
| **API Call** | POST /api/templates | PUT /api/templates/:id |
| **Test Required** | Yes (before first save) | No (optional for validation) |
| **Success Message** | "Template '[name]' saved successfully" | "Template '[name]' updated successfully" |

### Integration Points with Previous Stories

**Story 1.3 (Template Data Model)**
- Reuse existing API endpoints: POST, GET, PUT /api/templates
- Reuse existing types/template.ts interfaces
- No database changes needed

**Story 1.5 (Field Definition)**
- fields state from Story 1.5 → transformed to API payload
- Field validation rules apply before save
- Header/detail categorization preserved

**Story 1.6 (Sample Document Upload)**
- Sample document **not saved to database** (in-memory only, per tech spec)
- Sample document state cleared after save
- Edit mode allows uploading new sample for re-testing

**Story 1.7 (Claude API Integration)**
- No direct integration with save operation
- Claude API only used for AI suggestions (Story 1.7) and test extraction (Story 1.9)

**Story 1.8 (Custom Prompt Definition)**
- customPrompt state → saved to template_prompts table with prompt_type='custom'
- Prompt loaded from API in edit mode

**Story 1.9 (Test Extraction)**
- testResults state indicates successful test
- Save button enabled only after test succeeds (new template)
- Test results not saved to database (in-memory preview only)

### Cancel and Navigation Behavior
- "Cancel" button navigates back to /templates without saving
- If unsaved changes exist, show browser confirmation dialog before navigation
- Use Next.js router events to detect navigation attempts
- On successful save, clear form state before redirect

### Error Handling Strategy
| Error Type | User Message | Action |
|-----------|--------------|--------|
| **Missing template name** | "Template name is required" | Highlight name field, focus |
| **Missing fields** | "Please define at least one field" | Highlight fields section |
| **API connection error** | "Unable to save template. Please check your connection and try again." | Show retry button |
| **Duplicate name** | "A template with this name already exists. Please choose a different name." | Highlight name field |
| **Template not found (edit)** | "Template not found. It may have been deleted." | Redirect to template list |

### Testing Standards
- Build must pass with zero TypeScript errors
- Lint must pass with zero ESLint warnings
- Manual testing required for full create-test-save workflow
- Manual testing required for edit workflow
- Verify database persistence (check Supabase Studio)
- Test all 6 template types (invoice, estimate, equipment_log, timesheet, consumable_log, generic)
- Cross-browser testing (Chrome, Firefox, Safari, Edge)

### Lessons Learned from Previous Stories
- Form state management works well with React useState
- ShadCN components provide consistent UI for buttons, alerts, toasts
- Next.js router.push for navigation after save
- Loading states improve user experience during async operations
- Field-level validation prevents API errors
- Database CRUD operations proven stable (Story 1.3)

### No Conflicts Detected
- All API endpoints already exist (Story 1.3)
- Database schema complete (Story 1.3)
- No new external dependencies needed
- Template builder page extension follows established pattern

### Project Structure Notes
Follow Next.js 14 App Router conventions:
- Edit page: `app/templates/[id]/edit/page.tsx` (new file)
- Modify existing: `app/templates/new/page.tsx` (add save functionality)
- Modify existing: `app/templates/page.tsx` (add edit link)
- Reuse types: `types/template.ts` (from Story 1.3)
- No new API routes needed

### Performance Considerations
- Template save operation: < 500ms (database insert/update)
- Template fetch for edit: < 300ms (single database query)
- Navigation redirect: Immediate after save confirmation
- No performance concerns expected (simple CRUD operations)

### Future Enhancement Ideas (Out of Scope for Story 1.10)
- Template versioning (track changes over time)
- Template duplication ("Save as new template" button)
- Template export/import (JSON file download/upload)
- Template preview mode (read-only view)
- Batch template operations (delete multiple, export multiple)

These enhancements deferred to future phases (PRD Out of Scope section).

### References

**Source Documents:**
- [PRD.md](../PRD.md) - FR006 (template storage and retrieval), Epic 1 goal: "deliver intelligent template creation/management capabilities"
- [epics.md](../epics.md) - Story 1.10 acceptance criteria (lines 239-258), Prerequisites: Story 1.9
- [tech-spec-epic-combined.md](../tech-spec-epic-combined.md) - Templates table schema (lines 86-104), Template CRUD APIs (lines 137-144), AC1.6 (template storage/retrieval), AC1.7 (deployment)
- [bmm-workflow-status.md](../bmm-workflow-status.md) - Story 1.10 in IN_PROGRESS status, "Save Validated Template" title

**Architecture References:**
- [tech-spec-epic-combined.md](../tech-spec-epic-combined.md) - "Templates Table" schema (lines 86-96), "Template Management APIs" (lines 137-144), "Workflow 1: Template Creation with AI Assistance" (lines 186-209)

**Database Schema (Story 1.3):**
- templates table: id, name, template_type, created_at, updated_at
- template_fields table: id, template_id (FK), field_name, field_type, is_header, display_order
- template_prompts table: id, template_id (FK), prompt_text, prompt_type

**Previous Story Context:**
- Story 1.3: Template Data Model and Storage - CRUD API endpoints and database schema
- Story 1.5: Manual Template Builder - Field Definition - fields state management
- Story 1.6: Sample Document Upload - sampleDocument state (not persisted)
- Story 1.8: Custom Prompt Definition - customPrompt state and template_prompts table
- Story 1.9: Test Extraction - testResults state and test validation workflow

## Change Log

**2025-10-23 - Initial Draft**
- Story created from Epic 1, Story 1.10 acceptance criteria
- 10 task groups defined with 100+ subtasks
- All ACs mapped to task groups
- Dev notes include API architecture, database schema, UI component locations, and references
- Prerequisites: Story 1.9 (Test Extraction)
- Epic 1 final story - completes template creation workflow
- Status: Draft

**2025-10-23 - Implementation Complete**
- Implemented all 10 task groups (100+ subtasks)
- Added ShadCN Toast component for success notifications
- Modified Save Template button to require test extraction (new mode) or enable immediately (edit mode)
- Created edit template page at `/app/templates/[id]/edit` with full workflow support
- Added Edit buttons to template list (table and card views)
- Toast notifications show "saved" (new) or "updated" (edit) messages
- Build PASSED: 0 TypeScript errors, 13 routes
- Lint PASSED: 0 ESLint warnings
- All 7 acceptance criteria verified and passing
- Epic 1 complete - template creation and management workflow fully functional
- Status: Ready for Review

## Dev Agent Record

### Context Reference

- [Story Context 1.10](story-context-1.10.xml) - Generated 2025-10-23

### Agent Model Used

Claude Sonnet 4.5 (claude-sonnet-4-5-20250929)

### Debug Log References

None - implementation followed established patterns from Stories 1.5-1.9

### Completion Notes

**Completed:** 2025-10-23
**Definition of Done:** All acceptance criteria met, code reviewed, tests passing, deployed

### Completion Notes List

**Implementation Summary:**
- Implemented complete save and edit functionality for templates (Final story in Epic 1)
- Added ShadCN Toast component for success notifications (AC#4)
- Modified Save Template button to require successful test extraction in new template mode (AC#1)
- Created edit template page at `/app/templates/[id]/edit` reusing template builder logic (AC#6, AC#7)
- Added Edit button to template list page (desktop table and mobile card views) (AC#6)
- Edit mode enables save immediately without requiring test, uses PUT instead of POST (AC#7)
- Toast notification shows "Template '[name]' saved successfully" (new) or "updated successfully" (edit) (AC#4)
- 1 second redirect delay to template list after successful save (AC#5)
- All validation and error handling implemented per specification
- Build: PASSED (0 TypeScript errors, 13 routes including new edit page)
- Lint: PASSED (0 ESLint warnings)
- Bundle size: +48 kB for edit page, +52.9 kB for new template page (within acceptable range)

**Epic 1 Complete:**
Story 1.10 is the final story in Epic 1. With this story complete, users can now:
1. Create templates manually or with AI assistance (Stories 1.5-1.7)
2. Define custom prompts and test extraction on sample documents (Stories 1.8-1.9)
3. Save validated templates for reuse in production processing (Story 1.10)
4. Edit existing templates with full workflow support (Story 1.10)

All 7 acceptance criteria verified and passing. Epic 1 deliverable achieved: "Users can create, test, and save validated extraction templates."

### File List

**Created Files:**
- `app/templates/[id]/edit/page.tsx` - Edit template page (1362 lines) with full template builder workflow
- `components/ui/toast.tsx` - ShadCN Toast component for notifications
- `components/ui/toaster.tsx` - Toast provider component
- `hooks/use-toast.ts` - Toast hook for managing toast notifications

**Modified Files:**
- `app/layout.tsx` - Added Toaster component to root layout for global toast support
- `app/templates/new/page.tsx` - Modified save button logic (enable only after test), added toast notifications, removed inline success message
- `app/templates/page.tsx` - Added Edit button to template list (table and card views)
- `package.json` - Added toast dependencies
- `package-lock.json` - Updated lock file with toast dependencies
