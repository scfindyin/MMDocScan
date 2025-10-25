# Story 3.5: Save Template Flow

Status: Done

## Story

As a user,
I want to save my template configuration,
so that I can reuse it for future extractions.

## Acceptance Criteria

1. "Save Template" button opens Save Template Modal
2. Modal shows: template name input, summary (X fields, prompt included/not)
3. For new template: Saves to database, shows success toast
4. For existing template (modified): Shows two options:
   - "Replace [Template Name]" (default)
   - "Save as new template" with name input
5. Change detection: Button shows dot indicator (•) when dirty
6. Button disabled when no changes detected
7. After save: Updates dropdown, switches mode to "Load existing"
8. Validation: Template name required, no duplicate names
9. Loading state during save
10. Error handling with user-friendly messages

## Tasks / Subtasks

- [ ] Create SaveTemplateModal component (AC: 1, 2)
  - [ ] Modal component with ShadCN Dialog
  - [ ] Template name input field with validation
  - [ ] Template summary display (field count, prompt status)
  - [ ] Responsive layout (desktop/tablet)

- [ ] Implement save flow for new templates (AC: 3, 8)
  - [ ] Component handles POST /api/templates endpoint call
  - [ ] Zod validation: name required, 1-100 chars
  - [ ] Client-side check for duplicate template names (UX optimization)
  - [ ] Handle 400 duplicate error from API (server-side constraint is source of truth)
  - [ ] Success toast notification with ShadCN Toast
  - [ ] Error handling with user-friendly messages

- [ ] Implement save flow for existing templates (AC: 4)
  - [ ] Detect if template is modified (dirty state)
  - [ ] Show two radio options: Replace vs. Save as new
  - [ ] Replace: Component calls PUT /api/templates/:id
  - [ ] Save as new: Component calls POST /api/templates with new name

- [ ] Add change detection to Save Template button (AC: 5, 6)
  - [ ] Track dirty state in Zustand store (simple approach: dirty on ANY change)
  - [ ] Add setDirty() and clearDirty() store actions
  - [ ] Show dot indicator (•) when dirty: "Save Template •"
  - [ ] Disable button when no changes detected

- [ ] Update UI after successful save (AC: 7)
  - [ ] Component refreshes templates dropdown with GET /api/templates
  - [ ] Switch template mode from "New" to "Load existing"
  - [ ] Select newly saved template in dropdown
  - [ ] Clear dirty state via store action

- [ ] Add loading states (AC: 9)
  - [ ] Show spinner in modal during save operation
  - [ ] Disable save button during save
  - [ ] Show "Saving..." text in button

- [ ] Write unit tests
  - [ ] SaveTemplateModal component rendering tests
  - [ ] Validation logic tests (name required, duplicates)
  - [ ] Dirty state detection tests
  - [ ] Modal interaction tests (open, close, submit)

- [ ] Write integration tests
  - [ ] End-to-end save flow (new template)
  - [ ] End-to-end save flow (replace existing)
  - [ ] End-to-end save flow (save as new)
  - [ ] Error handling scenarios (network errors, validation failures, 400 duplicate errors)

## Dev Notes

### Architecture Patterns and Constraints

**State Management:**
- Zustand store manages template state and dirty tracking
- Store actions for dirty state: `setDirty()`, `clearDirty()`
- Simple dirty state approach: Set dirty on ANY change, clear on save
- Store does NOT handle API calls - components handle API calls directly
- Add originalTemplateSnapshot to store only if needed later for advanced dirty detection

**API Integration:**
- Components handle API calls directly (follows existing pattern from TemplateSection.tsx lines 45-100)
- POST /api/templates for new templates
- PUT /api/templates/:id for updates
- GET /api/templates for refreshing dropdown
- Zod schemas for request/response validation
- Client-side duplicate name check is UX optimization only
- Server-side constraint (400 error) is source of truth for duplicate names
- Modal MUST handle 400 duplicate error from API

**UI Components:**
- ShadCN Dialog for modal wrapper
- ShadCN Input for template name field
- ShadCN RadioGroup for Replace vs. Save as new options
- ShadCN Toast for success/error notifications
- ShadCN Button with loading state

**Validation Rules:**
- Template name: Required, 1-100 characters, no duplicate names (validated via API)
- Fields: Minimum 1 field required (inherited from Story 3.2)
- Extraction prompt: Optional, 0-2000 characters (from tech spec)

**Error Handling:**
- Network errors: Show user-friendly message "Unable to save template. Please try again."
- Duplicate name (400 from API): Show "Template name already exists. Please choose a different name."
- Validation errors: Show inline validation messages
- API errors: Log to console, show generic error to user

### Source Tree Components to Touch

**New Files:**
- `app/extract/components/SaveTemplateModal.tsx` - Main modal component
- `app/extract/components/__tests__/SaveTemplateModal.test.tsx` - Unit tests

**Modified Files:**
- `stores/extractionStore.ts` - Add dirty tracking (setDirty, clearDirty actions)
- `app/extract/components/TemplateBuilder.tsx` - Add Save Template button with dirty indicator
- `app/extract/components/TemplateSection.tsx` - Handle mode switching after save

**API Routes (from Story 3.4):**
- `app/api/templates/route.ts` - POST, GET endpoints (already exists)
- `app/api/templates/[id]/route.ts` - PUT endpoint (already exists)

### Type System Alignment

**CRITICAL: Use TemplateField from @/types/template**
- Import TemplateField from @/types/template (single source of truth)
- Do NOT use ExtractionField in extractionStore.ts for template-related state
- Maintain type consistency across extraction and template UI
- ExtractionField is for runtime extraction state only
- TemplateField is for template configuration (fields, validation, etc.)

### Testing Standards Summary

**Unit Tests (Vitest):**
- Component rendering tests
- Validation logic tests (duplicate names, required fields)
- Dirty state computation tests
- User interaction tests (radio selection, button clicks)

**Integration Tests (Vitest + MSW):**
- Mock API responses for POST, PUT, GET
- Test successful save flows (new, replace, save as new)
- Test error scenarios (network failures, validation errors, 400 duplicate errors)
- Verify state updates after save

**Test Coverage Target:** 80% for SaveTemplateModal component and related store actions

**Test Execution:** Run via `npm test` (Vitest watch mode)

### Project Structure Notes

**Alignment with Unified Project Structure:**
- Modal components in `app/extract/components/` (follows Next.js App Router pattern)
- API routes in `app/api/templates/` (follows existing structure from Story 3.4)
- Zustand store in `stores/` (correct path for global state management)
- Tests co-located with components in `__tests__/` directories

**No Detected Conflicts:** Story 3.5 builds directly on Story 3.4 (API endpoints) and integrates cleanly with Story 3.2 (Template Builder UI).

### References

**Source Documents:**

1. **Acceptance Criteria:** [Source: docs/epics.md#Story 3.5: Save Template Flow, lines 577-596]
2. **Data Models:** [Source: docs/tech-spec-epic-3.md#Data Models and Contracts, lines 96-210]
   - Template interface (lines 99-107)
   - TemplateField interface (lines 109-114)
3. **API Contracts:** [Source: docs/tech-spec-epic-3.md#APIs and Interfaces, lines 272-298]
   - POST /api/templates (lines 280-283)
   - PUT /api/templates/:id (lines 285-288)
   - GET /api/templates (lines 275-278)
4. **Validation Rules:** [Source: docs/tech-spec-epic-3.md#APIs and Interfaces, line 282]
   - Zod schema: name 1-100 chars, min 1 field, prompt 0-2000 chars
5. **State Management:** [Source: docs/tech-spec-epic-3.md#Detailed Design, lines 180-210]
   - Zustand ExtractionStore interface (lines 181-210)
   - isDirty flag (line 187)
6. **Testing Standards:** [Source: docs/tech-spec-epic-3.md#Test Strategy Summary, lines 910-1053]
   - Unit tests: 60% coverage target (line 920)
   - Integration tests: 30% (line 949)
   - Vitest framework (line 932)
7. **UI Components:** [Source: docs/tech-spec-epic-3.md#System Architecture Alignment, lines 54-57]
   - ShadCN component library
   - Tailwind CSS

## Dev Agent Record

### Context Reference

- [Story Context XML](story-context-3.5.xml) - Generated 2025-10-25

### Agent Model Used

claude-sonnet-4-5-20250929

### Debug Log References

### Completion Notes List

**Completed:** 2025-10-25
**Definition of Done:** All acceptance criteria met, code reviewed, tests passing, deployed

### File List
