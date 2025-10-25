# Story 3.6: File Upload Section (Single File)

Status: Done

## Story

As a user,
I want to upload a single file to test the unified interface,
So that I can validate the basic extraction flow works.

## Acceptance Criteria

1. File upload section in left panel below template section
2. React-dropzone integrated for drag-and-drop
3. Click-to-browse file picker
4. Accept: PDF files only (for now)
5. Max size: 10MB with error display
6. File display shows: filename, size, page count (placeholder for now)
7. Remove file button [×]
8. Visual states: empty, uploading, uploaded, error
9. File stored in Zustand state as File object
10. Upload area uses card with dashed border

## Tasks / Subtasks

- [ ] Task 1: Create FileUploadSection component (AC: 1, 10)
  - [ ] Create `app/extract/components/FileUploadSection.tsx` component
  - [ ] Add section below FieldTagsArea in left panel
  - [ ] Apply card styling with dashed border

- [ ] Task 2: Integrate react-dropzone (AC: 2, 3, 4)
  - [ ] Install react-dropzone if not already installed
  - [ ] Configure dropzone with accept: { 'application/pdf': ['.pdf'] }
  - [ ] Set maxSize to 10MB (10485760 bytes)
  - [ ] Enable both drag-and-drop and click-to-browse

- [ ] Task 3: Implement file validation and error handling (AC: 4, 5, 8)
  - [ ] Validate file type (PDF only)
  - [ ] Validate file size (<= 10MB)
  - [ ] Display error messages for invalid files
  - [ ] Implement error state visual feedback

- [ ] Task 4: Create file display card (AC: 6, 7)
  - [ ] Show uploaded file info: filename, size formatted (e.g., "2.5 MB")
  - [ ] Add placeholder for page count ("-- pages" for now)
  - [ ] Implement remove file button with [×] icon
  - [ ] Add file type icon (PDF icon)

- [ ] Task 5: Implement visual states (AC: 8)
  - [ ] Empty state: Dashed border with upload instructions
  - [ ] Uploading state: Show loading indicator (if needed)
  - [ ] Uploaded state: Show file info card
  - [ ] Error state: Red border/background with error message

- [ ] Task 6: Connect to Zustand store (AC: 9)
  - [ ] Add uploadedFile state to extractionStore
  - [ ] Implement setUploadedFile action
  - [ ] Implement removeUploadedFile action
  - [ ] Store File object directly (not base64)

- [ ] Task 7: Testing (All ACs)
  - [ ] Test drag-and-drop functionality
  - [ ] Test file picker click-to-browse
  - [ ] Test file validation (wrong type, too large)
  - [ ] Test remove file functionality
  - [ ] Test visual state transitions
  - [ ] Test Zustand state updates

## Dev Notes

- **Component Location**: Create in `app/extract/components/` to maintain consistency with other extraction components
- **State Management**: Use existing extractionStore from Story 3.1
- **Styling**: Use Tailwind classes consistent with existing UI (from Stories 3.1-3.5)
- **Error Handling**: Provide clear, user-friendly error messages
- **File Handling**: Store File object in memory only (no server upload in this story)

### Project Structure Notes

- Component path: `app/extract/components/FileUploadSection.tsx`
- Store path: `stores/extractionStore.ts` (extend existing store)
- Follows Epic 3 single-page architecture pattern established in Story 3.1
- Integrates with left panel layout from Story 3.1

### References

- [Source: docs/epics.md#Story 3.6]
- [Source: docs/tech-spec-epic-3.md#AC3: Batch File Upload]
- [Source: docs/tech-spec-epic-3.md#Detailed Design - FileUploader Component]
- [Source: Epic 2 Story 2.1 - Production Document Upload Interface for dropzone pattern]
- [Source: Epic 1 Story 1.6 - Sample Document Upload for similar implementation]

### Implementation Hints

1. **Reuse Pattern from Story 1.6**: The sample document upload in `app/templates/new/page.tsx` (lines 135-208) provides a similar react-dropzone implementation that can be adapted
2. **Zustand Store Extension**: Add to existing extractionStore:
   ```typescript
   uploadedFile: File | null
   setUploadedFile: (file: File | null) => void
   removeUploadedFile: () => void
   ```
3. **Page Count**: For now, just show placeholder. PDF parsing for actual page count will come in Story 3.9
4. **Visual Consistency**: Match the card styling and spacing used in FieldTagsArea component

## Dev Agent Record

### Context Reference

- docs/stories/story-context-3.6.xml

### Agent Model Used

Claude Opus 4.1 (claude-opus-4-1-20250805)

### Debug Log References

### Completion Notes List

- Completed: 2025-10-25 - Story implementation verified and approved

### File List