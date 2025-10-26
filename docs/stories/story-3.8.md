# Story 3.8: Multi-File Upload UI

## Story Information
- **Epic**: 3 - Unified Batch Extraction Workflow
- **Story**: 3.8
- **Status**: Ready
- **Priority**: High
- **Estimated Effort**: Medium
- **Prerequisites**: Story 3.7 (Basic Extraction with Results Table)
- **Architect Approved**: 2025-10-25
- **Revision Notes**: Added nanoid dependency, file status state machine, error recovery, debouncing for race conditions

## User Story
As a user, I want to upload multiple PDF files at once, so that I can process entire batches efficiently.

## Acceptance Criteria

### AC1: Multi-File Selection Enabled
**Given** the user is on the extraction page
**When** the user clicks the file upload area or uses drag-and-drop
**Then** the file picker should allow multiple file selection (not restricted to single file)

### AC2: File List Display with Metadata
**Given** the user has selected multiple files for upload
**When** the files are added to the upload queue
**Then** the system should display a list showing all uploaded files with their metadata (filename, size, page count, status)

### AC3: Individual File Information
**Given** multiple files are uploaded
**When** the user views the file list
**Then** each file should display: filename, file size (in MB), page count (if available), and status indicator

### AC4: Remove Individual Files
**Given** multiple files are in the upload list
**When** the user clicks the remove button [×] for a specific file
**Then** that file should be removed from the list without affecting other files

### AC5: Add More Files Capability
**Given** the user has already uploaded some files
**When** the user clicks the "+ Add more files" button
**Then** the file picker should open allowing additional files to be appended to the existing list

### AC6: Aggregate Statistics Display
**Given** multiple files are uploaded
**When** the user views the file upload section
**Then** the system should display aggregate stats: "X files, Y total pages, Z MB total"

### AC7: Maximum File Count Validation
**Given** the user attempts to upload files
**When** the total number of files exceeds 100
**Then** the system should display an error message and prevent adding more files

### AC8: Total Size Limit Validation
**Given** the user uploads multiple files
**When** the combined size exceeds 100MB
**Then** the system should display an error message about the size limit

### AC9: Zustand State Management
**Given** files are uploaded or removed
**When** the file list changes
**Then** the files should be properly stored and managed in Zustand state as an array

### AC10: Scrollable File List
**Given** the user uploads more than 5 files
**When** viewing the file upload section
**Then** the file list should become scrollable with a fixed height container

## Tasks and Subtasks

### Task 1: Setup Dependencies and Utilities
**Estimated Effort**: Small
**Dependencies**: None

#### Subtask 1.1: Install Required Dependencies
- [ ] Install nanoid for unique ID generation: `npm install nanoid`
- [ ] Add @types/nanoid if needed for TypeScript
- [ ] Update package.json with new dependency

#### Subtask 1.2: Create File Utility Functions
- [ ] Create utility function for generating unique file IDs
- [ ] Create file status state machine helper
- [ ] Create file size formatter utility (bytes to MB/KB)
- [ ] Add debounce utility for rapid file additions

### Task 2: Update FileUploadSection Component for Multi-File Support
**Estimated Effort**: Small
**Dependencies**: Task 1

#### Subtask 2.1: Enable Multiple File Selection
- [ ] Remove `multiple: false` configuration from react-dropzone
- [ ] Update dropzone accept configuration to handle multiple files
- [ ] Ensure drag-and-drop works with multiple files

#### Subtask 2.2: Update File Validation Logic
- [ ] Modify validation to check total file count (max 100)
- [ ] Implement cumulative size validation (max 100MB total)
- [ ] Update error messages for multi-file context
- [ ] Add error recovery for validation failures

#### Subtask 2.3: Implement File Array Handling
- [ ] Change file state from single File to File[] array
- [ ] Update file processing logic to handle arrays
- [ ] Ensure proper array manipulation (add, remove)
- [ ] Add debouncing for rapid file additions to prevent race conditions

### Task 3: Create File List Display Component
**Estimated Effort**: Medium
**Dependencies**: Task 1, Task 2

#### Subtask 3.1: Create FileListItem Component
- [ ] Create component for individual file display
- [ ] Display filename with proper truncation for long names
- [ ] Show file size formatted in MB/KB
- [ ] Add placeholder for page count showing "N/A" (will be populated in Story 3.9)
- [ ] Add status indicator component with clear state transitions

#### Subtask 3.2: Implement Remove Functionality
- [ ] Add remove button (×) to each file item
- [ ] Implement click handler to remove specific file
- [ ] Update Zustand state when file is removed
- [ ] Add confirmation for large files (optional)

#### Subtask 2.3: Style File List Item
- [ ] Apply consistent styling with existing UI
- [ ] Add hover states for interactive elements
- [ ] Implement file type icon (PDF icon)
- [ ] Add proper spacing and padding

### Task 3: Implement File List Container
**Estimated Effort**: Small
**Dependencies**: Task 2

#### Subtask 3.1: Create Scrollable Container
- [ ] Set fixed height for file list container
- [ ] Implement scrollable overflow for >5 files
- [ ] Add smooth scrolling behavior
- [ ] Style scrollbar to match UI theme

#### Subtask 3.2: Handle Empty State
- [ ] Show appropriate message when no files uploaded
- [ ] Maintain consistent height to prevent layout shift
- [ ] Add visual indicator for drop zone

### Task 4: Add "Add More Files" Feature
**Estimated Effort**: Small
**Dependencies**: Task 1

#### Subtask 4.1: Create Add More Button
- [ ] Add "+ Add more files" button below file list
- [ ] Style button as secondary action
- [ ] Position appropriately in layout

#### Subtask 4.2: Implement Append Logic
- [ ] Open file picker on button click
- [ ] Append new files to existing array
- [ ] Validate combined count and size
- [ ] Prevent duplicates (same filename)

### Task 5: Implement Aggregate Statistics
**Estimated Effort**: Small
**Dependencies**: Task 1, Task 2

#### Subtask 5.1: Calculate Statistics
- [ ] Count total number of files
- [ ] Sum total file sizes
- [ ] Calculate total pages (when available)
- [ ] Format statistics for display

#### Subtask 5.2: Create Statistics Display Component
- [ ] Create component for aggregate stats
- [ ] Display: "X files, Y total pages, Z MB"
- [ ] Update in real-time as files are added/removed
- [ ] Style to be visually distinct but not prominent

### Task 6: Integrate with Zustand Store
**Estimated Effort**: Medium
**Dependencies**: Task 1

#### Subtask 6.1: Update Store Schema
- [ ] Change uploadedFile to uploadedFiles array
- [ ] Add actions for addFiles, removeFile, clearFiles
- [ ] Ensure proper TypeScript typing

#### Subtask 6.2: Connect Components to Store
- [ ] Connect FileUploadSection to Zustand
- [ ] Implement file array updates
- [ ] Ensure state persistence across component renders
- [ ] Add computed properties for statistics

### Task 7: Update Existing Integration Points
**Estimated Effort**: Small
**Dependencies**: All previous tasks

#### Subtask 7.1: Update Extract Button Logic
- [ ] Modify to handle multiple files
- [ ] Update validation for multi-file context
- [ ] Ensure extraction works with file array

#### Subtask 7.2: Update Results Display
- [ ] Prepare for multi-file results (future story)
- [ ] Add file identification in results
- [ ] Update loading states for batch processing

### Task 8: Testing
**Estimated Effort**: Medium
**Dependencies**: All implementation tasks

#### Subtask 8.1: Unit Tests
- [ ] Test file count validation (0-100 files)
- [ ] Test size validation (cumulative)
- [ ] Test file addition/removal from array
- [ ] Test statistics calculation
- [ ] Test duplicate prevention

#### Subtask 8.2: Integration Tests
- [ ] Test drag-and-drop with multiple files
- [ ] Test file picker with multiple selection
- [ ] Test add more files workflow
- [ ] Test Zustand state updates
- [ ] Test validation error displays

#### Subtask 8.3: E2E Tests
- [ ] Test complete multi-file upload flow
- [ ] Test file removal and re-adding
- [ ] Test validation limits (100 files, 100MB)
- [ ] Test scrollable list behavior
- [ ] Test with various file combinations

### Task 9: Documentation and Polish
**Estimated Effort**: Small
**Dependencies**: All previous tasks

#### Subtask 9.1: Update Component Documentation
- [ ] Document multi-file handling approach
- [ ] Update prop types and interfaces
- [ ] Add JSDoc comments for new functions

#### Subtask 9.2: Performance Optimization
- [ ] Optimize rendering for large file lists
- [ ] Implement virtualization if needed (>20 files)
- [ ] Optimize file size calculations
- [ ] Consider lazy loading for file metadata

#### Subtask 9.3: Accessibility
- [ ] Ensure keyboard navigation for file list
- [ ] Add ARIA labels for file actions
- [ ] Test screen reader compatibility
- [ ] Verify focus management

## Technical Notes

### Component Structure Changes
```typescript
// Before (single file)
interface FileUploadState {
  uploadedFile: File | null;
}

// After (multiple files)
interface FileUploadState {
  uploadedFiles: UploadedFile[];
}

interface UploadedFile {
  id: string; // unique identifier using nanoid
  file: File;
  filename: string;
  size: number; // in bytes
  pageCount?: number; // "N/A" until Story 3.9 implementation
  status: FileStatus;
  errorMessage?: string; // populated on error
}

// File Status State Machine
type FileStatus = 'pending' | 'validating' | 'ready' | 'error';

// Status Transitions:
// pending → validating (on file add)
// validating → ready (validation passed)
// validating → error (validation failed)
// ready → pending (on retry)
// error → pending (on retry)
```

### Zustand Store Actions
```typescript
interface ExtractStore {
  uploadedFiles: UploadedFile[];
  isAddingFiles: boolean; // Prevent race conditions

  // Actions (with debouncing)
  addFiles: (files: File[]) => void; // Debounced internally
  removeFile: (fileId: string) => void;
  clearFiles: () => void;
  updateFileStatus: (fileId: string, status: FileStatus, errorMessage?: string) => void;
  retryFile: (fileId: string) => void;

  // Computed
  getTotalSize: () => number;
  getTotalPageCount: () => number;
  getFileCount: () => number;
}
```

### Validation Constants
```typescript
const FILE_UPLOAD_LIMITS = {
  MAX_FILES: 100,
  MAX_TOTAL_SIZE_MB: 100,
  MAX_TOTAL_SIZE_BYTES: 100 * 1024 * 1024,
  SCROLLABLE_THRESHOLD: 5
};
```

## Dev Notes

### Implementation Guidance

1. **File Management**:
   - Use unique IDs (nanoid or uuid) for each file
   - Maintain file order as user adds them
   - Handle duplicate filenames gracefully
   - Consider file type validation (PDF only for now)

2. **Performance Considerations**:
   - For >20 files, consider react-window for virtualization
   - Debounce statistics calculations
   - Optimize re-renders with React.memo
   - Use lazy evaluation for expensive computations

3. **User Experience**:
   - Show upload progress for large batches
   - Provide clear feedback on validation errors
   - Allow drag-and-drop reordering (future enhancement)
   - Consider batch actions (remove all, select multiple)

4. **Error Handling**:
   - Handle file read errors gracefully
   - Validate files before adding to state
   - Provide specific error messages
   - Allow retry for failed files

5. **Integration Points**:
   - Ensure compatibility with Story 3.7 (extraction)
   - Prepare for Story 3.9 (PDF parsing)
   - Consider Story 3.10 (auto-detection) requirements
   - Plan for Story 3.11 (batch extraction API)

## Related Files
- `/app/extract/components/FileUploadSection.tsx` - Component to modify
- `/stores/extractionStore.ts` - Zustand store to update
- `/app/extract/ExtractPageClient.tsx` - Parent component
- `/docs/tech-spec-epic-3.md` - Technical specification
- `/docs/stories/story-3.7.md` - Previous story (single file)
- `/docs/stories/story-3.9.md` - Next story (PDF parsing)

## Definition of Done
- [ ] All acceptance criteria are met
- [ ] All tasks and subtasks are completed
- [ ] Unit tests written and passing (>80% coverage)
- [ ] Integration tests passing
- [ ] Code reviewed and approved
- [ ] No console errors or warnings
- [ ] Performance acceptable (<100ms for file operations)
- [ ] Accessibility requirements met
- [ ] Works in all supported browsers
- [ ] Documentation updated
- [ ] Build passes with no errors

## Notes
- This story is critical for batch processing functionality
- Focus on robust file management and validation
- UI should feel responsive even with many files
- Consider future requirements when designing data structures
- This enables Stories 3.9-3.14 (batch processing pipeline)