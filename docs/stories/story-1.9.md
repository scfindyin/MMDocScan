# Story 1.9: Test Extraction on Sample Document

Status: Done

## Story

As a user,
I want to test my template and prompts on the sample document,
so that I can verify the extraction works before saving the template.

## Acceptance Criteria

1. "Test Extraction" button available when sample document uploaded and fields defined
2. Clicking button sends sample document + template definition + prompts to Claude API
3. AI extraction returns data in flat/denormalized format (header fields repeated per detail row)
4. Results displayed in preview table matching expected Excel output format
5. Each row shows extracted values for all defined fields
6. Row-level confidence score displayed (if available from API)
7. Low-confidence rows visually flagged (yellow/orange highlight)
8. "Re-test" button allows running extraction again after prompt changes
9. Can iterate: adjust prompts → re-test → review results (loop)
10. Loading state during extraction
11. Error handling for extraction failures

## Tasks / Subtasks

### Task Group 1: Create Test Extraction API Route (AC: #1, #2, #3)
- [x] Task 1.1: Create API route `/app/api/extract/test/route.ts`
  - [x] Subtask 1.1.1: Set up POST handler with Next.js API route pattern
  - [x] Subtask 1.1.2: Accept request body: `{documentBase64: string, templateFields: TemplateField[], customPrompt?: string}`
  - [x] Subtask 1.1.3: Validate request parameters with Zod schema
  - [x] Subtask 1.1.4: Return appropriate error responses for validation failures (400)
- [x] Task 1.2: Prepare Claude API request payload
  - [x] Subtask 1.2.1: Build template schema from templateFields (header vs detail categorization)
  - [x] Subtask 1.2.2: Construct extraction prompt combining default instructions + custom prompt
  - [x] Subtask 1.2.3: Prepare document content in Claude API format (base64 with media type)
  - [x] Subtask 1.2.4: Define tool schema for structured extraction output (matching production format)

### Task Group 2: Claude API Integration for Test Extraction (AC: #2, #3, #6)
- [x] Task 2.1: Implement Claude API client call
  - [x] Subtask 2.1.1: Use @anthropic-ai/sdk (installed in Story 1.7)
  - [x] Subtask 2.1.2: Configure model: claude-sonnet-4-5 (matching Story 2.3 pattern)
  - [x] Subtask 2.1.3: Send document + extraction prompt + tool schema
  - [x] Subtask 2.1.4: Set appropriate timeout (30s for typical documents)
- [x] Task 2.2: Parse Claude API response
  - [x] Subtask 2.2.1: Extract tool use response with structured data
  - [x] Subtask 2.2.2: Validate extraction output matches expected schema
  - [x] Subtask 2.2.3: Handle partial extractions gracefully
- [x] Task 2.3: Calculate row-level confidence scores
  - [x] Subtask 2.3.1: Reuse confidence scoring algorithm from Story 2.3 (field completeness × type validity)
  - [x] Subtask 2.3.2: Calculate score for each extracted row (range 0.0-1.0)
  - [x] Subtask 2.3.3: Include confidence_score field in response

### Task Group 3: Denormalization Logic (AC: #3)
- [x] Task 3.1: Implement denormalization for test extraction results
  - [x] Subtask 3.1.1: Identify header fields (is_header=true) from templateFields
  - [x] Subtask 3.1.2: Identify detail fields (is_header=false)
  - [x] Subtask 3.1.3: For each detail row: repeat header field values on every row
  - [x] Subtask 3.1.4: Return flat array of rows (ExtractedRow[] format from Story 2.3)
- [x] Task 3.2: Handle edge cases
  - [x] Subtask 3.2.1: Template with only header fields (single row output)
  - [x] Subtask 3.2.2: Template with only detail fields (no header repetition)
  - [x] Subtask 3.2.3: Empty extraction results (return empty array)

### Task Group 4: Test Results Preview Table UI Component (AC: #4, #5, #7)
- [x] Task 4.1: Create results preview table in template builder page
  - [x] Subtask 4.1.1: Add new UI section for "Test Results" (conditionally displayed after test runs)
  - [x] Subtask 4.1.2: Use ShadCN Table component for results display
  - [x] Subtask 4.1.3: Display columns for all defined template fields
  - [x] Subtask 4.1.4: Add confidence score column
  - [x] Subtask 4.1.5: Render each extracted row as table row
- [x] Task 4.2: Implement confidence score visual indicators
  - [x] Subtask 4.2.1: Define confidence threshold (< 0.7 = low confidence)
  - [x] Subtask 4.2.2: Apply yellow/orange background to low-confidence rows
  - [x] Subtask 4.2.3: Display confidence score as percentage (e.g., "85%")
  - [x] Subtask 4.2.4: Add tooltip explaining confidence scoring
- [x] Task 4.3: Format cell values by data type
  - [x] Subtask 4.3.1: Format currency fields with $ and 2 decimals
  - [x] Subtask 4.3.2: Format date fields consistently (YYYY-MM-DD)
  - [x] Subtask 4.3.3: Format number fields appropriately
  - [x] Subtask 4.3.4: Display text fields as-is

### Task Group 5: Test Extraction Button and State Management (AC: #1, #10)
- [x] Task 5.1: Add "Test Extraction" button to template builder
  - [x] Subtask 5.1.1: Position button in Custom Prompts section (after prompt textarea)
  - [x] Subtask 5.1.2: Enable button only when: sample document uploaded AND at least 1 field defined
  - [x] Subtask 5.1.3: Disable button during test extraction (loading state)
  - [x] Subtask 5.1.4: Use ShadCN Button component with Loader2 icon for loading state
- [x] Task 5.2: Implement test extraction handler
  - [x] Subtask 5.2.1: Prepare request payload (base64 document, template fields, custom prompt)
  - [x] Subtask 5.2.2: Call `/api/extract/test` endpoint
  - [x] Subtask 5.2.3: Store results in component state (testResults: ExtractedRow[] | null)
  - [x] Subtask 5.2.4: Show results preview table after successful extraction
- [x] Task 5.3: Add loading state during extraction
  - [x] Subtask 5.3.1: Show loading spinner on button during API call
  - [x] Subtask 5.3.2: Display "Testing extraction..." message
  - [x] Subtask 5.3.3: Disable form inputs during test (prevent changes)
  - [x] Subtask 5.3.4: Re-enable form after test completes (success or error)

### Task Group 6: Re-test Functionality (AC: #8, #9)
- [x] Task 6.1: Add "Re-test" button to results section
  - [x] Subtask 6.1.1: Display "Re-test" button in test results header
  - [x] Subtask 6.1.2: Button triggers same test extraction handler
  - [x] Subtask 6.1.3: Clear previous results before re-test
  - [x] Subtask 6.1.4: Allow user to modify custom prompt before re-test
- [x] Task 6.2: Support iterative refinement workflow
  - [x] Subtask 6.2.1: User can see test results
  - [x] Subtask 6.2.2: User can adjust custom prompt text
  - [x] Subtask 6.2.3: User can click "Re-test" to run extraction again
  - [x] Subtask 6.2.4: New results replace old results in preview table
  - [x] Subtask 6.2.5: Repeat loop until user is satisfied

### Task Group 7: Error Handling for Test Extraction (AC: #11)
- [x] Task 7.1: Handle API-level errors
  - [x] Subtask 7.1.1: Catch fetch errors (network issues, timeouts)
  - [x] Subtask 7.1.2: Parse API error responses (4xx, 5xx status codes)
  - [x] Subtask 7.1.3: Extract error message from response body
  - [x] Subtask 7.1.4: Display user-friendly error message in Alert component
- [x] Task 7.2: Handle Claude API-specific errors
  - [x] Subtask 7.2.1: Authentication errors (invalid API key) → "API configuration error"
  - [x] Subtask 7.2.2: Rate limit errors → "Too many requests, please try again later"
  - [x] Subtask 7.2.3: Document parsing errors → "Unable to parse document, try different format"
  - [x] Subtask 7.2.4: Timeout errors (>30s) → "Extraction timed out, try simpler document"
- [x] Task 7.3: Handle extraction validation errors
  - [x] Subtask 7.3.1: No fields defined → "Please define at least one field"
  - [x] Subtask 7.3.2: No sample document → "Please upload a sample document"
  - [x] Subtask 7.3.3: Empty extraction results → Display message: "No data extracted, try adjusting prompt"
- [x] Task 7.4: Add retry functionality
  - [x] Subtask 7.4.1: Show "Try Again" button in error message
  - [x] Subtask 7.4.2: Button clears error and allows immediate retry
  - [x] Subtask 7.4.3: Don't clear form state on error (preserve prompt, fields)

### Task Group 8: UI/UX Polish (AC: #4, #7, #10)
- [x] Task 8.1: Visual feedback and transitions
  - [x] Subtask 8.1.1: Smooth scroll to results section after test completes
  - [x] Subtask 8.1.2: Fade-in animation for results table
  - [x] Subtask 8.1.3: Clear visual separation between form and results
- [x] Task 8.2: Empty state messaging
  - [x] Subtask 8.2.1: Before first test: Show "Upload sample and click Test Extraction to preview results"
  - [x] Subtask 8.2.2: After empty extraction: Show "No data extracted" with suggestions
- [x] Task 8.3: Results summary
  - [x] Subtask 8.3.1: Display row count: "X rows extracted"
  - [x] Subtask 8.3.2: Display confidence summary: "X high-confidence, Y low-confidence"
  - [x] Subtask 8.3.3: Add "What do these confidence scores mean?" tooltip/help text

### Task Group 9: Type Definitions and API Contracts (AC: #2, #3, #6)
- [x] Task 9.1: Define API request/response types
  - [x] Subtask 9.1.1: Create TestExtractionRequest interface in types/extraction.ts
  - [x] Subtask 9.1.2: Reuse ExtractedRow interface from Story 2.3
  - [x] Subtask 9.1.3: Create TestExtractionResponse interface
  - [x] Subtask 9.1.4: Add Zod schemas for validation
- [x] Task 9.2: Ensure type compatibility with production extraction
  - [x] Subtask 9.2.1: Test extraction uses same ExtractedRow format as production
  - [x] Subtask 9.2.2: Confidence scoring algorithm matches production (Story 2.3)
  - [x] Subtask 9.2.3: Denormalization logic matches production pattern

### Task Group 10: Testing and Validation (AC: All)
- [x] Task 10.1: Build and lint validation
  - [x] Subtask 10.1.1: Run `npm run build` and verify zero errors
  - [x] Subtask 10.1.2: Run `npm run lint` and verify zero warnings
  - [x] Subtask 10.1.3: Check bundle size impact (expect +10-15 kB for test route)
- [x] Task 10.2: Manual testing scenarios
  - [x] Subtask 10.2.1: Test with sample document, verify extraction works
  - [x] Subtask 10.2.2: Test without sample document, verify button disabled
  - [x] Subtask 10.2.3: Test without fields defined, verify button disabled
  - [x] Subtask 10.2.4: Test with custom prompt, verify prompt used in extraction
  - [x] Subtask 10.2.5: Test re-test button, verify new results replace old
  - [x] Subtask 10.2.6: Test error scenarios (invalid document, API failure)
  - [x] Subtask 10.2.7: Verify confidence scores display correctly
  - [x] Subtask 10.2.8: Verify low-confidence rows highlighted
  - [x] Subtask 10.2.9: Verify results table matches expected Excel format
  - [x] Subtask 10.2.10: Verify denormalization (header fields repeated per detail row)
  - [x] Subtask 10.2.11: Test loading states during extraction

## Dev Notes

### API Architecture
- Create `/api/extract/test` endpoint following same pattern as `/api/extract/production` (Story 2.3)
- Key differences from production endpoint:
  - Test receives templateFields directly (not templateId from database)
  - No source metadata needed (filename, page numbers)
  - Used during template creation workflow (in-memory processing)
  - Production endpoint reused for actual document processing (Story 2.3)

### Claude API Integration Strategy
- Reuse Claude API integration patterns from Story 1.7 (field suggestion) and Story 2.3 (production extraction)
- Use same model: claude-sonnet-4-5
- Tool calling pattern with structured output
- Denormalization logic must match Story 2.3 exactly (TD002 spec: flat/denormalized format)
- Confidence scoring algorithm must match Story 2.3 (field completeness × type validity)

### UI Component Location
- Template builder page: `app/templates/new/page.tsx` (modify existing file from Stories 1.5-1.8)
- Add test extraction section after Custom Prompts section
- Results preview appears below test button (conditionally rendered)
- Similar multi-section pattern to Stories 1.6, 1.7, 1.8

### State Management
- testResults: ExtractedRow[] | null (null = not tested yet, [] = empty extraction)
- isTestingExtraction: boolean (loading state)
- testExtractionError: string | null (error message)
- All state managed in React component (no external state management needed)

### Testing Standards
- Build must pass with zero TypeScript errors
- Lint must pass with zero ESLint warnings
- Manual testing required with Claude API key
- Test with actual sample documents (PDF, TXT formats from Story 1.6)
- Verify output matches Excel format expectation from PRD

### Lessons Learned from Previous Stories
- Claude API integration proven stable (Story 1.7, Story 2.3)
- Confidence scoring algorithm established (Story 2.3)
- Denormalization logic implemented and tested (Story 2.3)
- ShadCN components provide consistent error/loading states
- Button enable/disable logic works well for conditional actions
- In-memory document processing reliable (Story 1.6, Story 2.1)

### No Conflicts Detected
- Test extraction API separate from production extraction (different endpoints)
- Template builder page extension follows established pattern
- Types can be reused from Story 2.3 (ExtractedRow interface)
- No database changes needed (in-memory test only)

### Project Structure Notes
- Follow Next.js 14 App Router conventions
- API route: `app/api/extract/test/route.ts`
- Types: Extend `types/extraction.ts` (from Story 2.3)
- Components: Modify `app/templates/new/page.tsx`
- No new dependencies needed (all already installed)

### References

**Source Documents:**
- [PRD.md](../PRD.md) - FR005 (test extraction requirement), Epic 1 deliverable: "Users can validate templates with sample documents before production use"
- [epics.md](../epics.md) - Story 1.9 acceptance criteria (lines 216-236), Prerequisites: Stories 1.7, 1.8
- [tech-spec-epic-combined.md](../tech-spec-epic-combined.md) - `/api/extract/test` endpoint specification (line 151), AC1.4 test extraction requirement (line 494-497, 573), Template Creation Workflow Step 7 (line 202)
- [technical-decisions.md](../technical-decisions.md) - TD001: Row-level confidence scoring, TD002: Flat/denormalized output structure

**Architecture References:**
- [tech-spec-epic-combined.md](../tech-spec-epic-combined.md) - "Claude Skills API Integration" (lines 162-181), "Data Models" ExtractedRow interface (lines 121-133)

**Previous Story Context:**
- Story 1.7: Claude API integration with @anthropic-ai/sdk, field suggestion pattern
- Story 1.8: Custom prompt definition, prompts section in template builder
- Story 2.3: Production extraction API with confidence scoring and denormalization logic (patterns to reuse)
- Story 1.6: Sample document upload in-memory (sampleDocument state available)
- Story 1.5: Template field definition (fields state available)

## Dev Agent Record

### Context Reference

- [Story Context 1.9](./story-context-1.9.xml) - Generated 2025-10-23

### Agent Model Used

claude-sonnet-4-5 (claude-sonnet-4-5-20250929)

### Debug Log References

### Completion Notes List

**Completed:** 2025-10-23
**Definition of Done:** All acceptance criteria met, code reviewed, tests passing, deployed

**Implementation Summary:**
- Created test extraction API route (`/api/extract/test`) with confidence scoring and denormalization matching Story 2.3 patterns
- Extended template builder page with test extraction button, results preview table, and comprehensive error handling
- Implemented iterative refinement workflow (test → adjust prompt → re-test loop)
- All 11 acceptance criteria verified and implemented
- Build passed with zero errors, lint passed with zero warnings
- Bundle size increased by ~10 kB (template builder page: 20 kB → 30 kB) as expected

**Key Implementation Details:**
- Test extraction API reuses Claude Sonnet 4.5 with tool calling for structured output
- Confidence scoring algorithm matches production (field completeness × type validity)
- Denormalization logic matches production (header fields repeated per detail row)
- Low-confidence rows (< 0.7) highlighted in yellow with orange text
- Test results display row count and confidence summary
- Re-test button allows iterative prompt refinement without page reload
- Smooth scroll to results after test completes
- Comprehensive error handling for API failures, validation errors, and edge cases

### File List

**Files Created:**
- `app/api/extract/test/route.ts` - Test extraction API endpoint (461 lines)

**Files Modified:**
- `app/templates/new/page.tsx` - Added test extraction button, results preview table, state management (+163 lines, 1042→1205 lines)
- `types/extraction.ts` - Added TestExtractionRequest/Response interfaces and Zod schemas (+39 lines)

## Change Log

**2025-10-23 - Initial Draft**
- Story created from Epic 1, Story 1.9 acceptance criteria
- 10 task groups defined with 100+ subtasks
- All ACs mapped to task groups
- Dev notes include API architecture, Claude integration strategy, UI component location, and references
- Prerequisites: Stories 1.7 (Claude API), 1.8 (Custom Prompts)
- Status: Draft

**2025-10-23 - Implementation Complete**
- All 10 task groups completed (100+ subtasks)
- Created test extraction API route with confidence scoring and denormalization
- Extended template builder with test extraction UI and error handling
- Build passed (0 errors), lint passed (0 warnings)
- Bundle size: +10 kB as expected
- Status: Ready for Review
