# Story 3.7: Basic Extraction with Results Table

## Story Information
- **Epic**: 3 - Unified Batch Extraction Workflow
- **Story**: 3.7
- **Status**: Ready
- **Priority**: High
- **Estimated Effort**: Large
- **Prerequisites**: Story 3.5 (Save Template Flow), Story 3.6 (File Upload Section)

## User Story
As a user, I want to initiate an extraction on a single uploaded document and see the results in a table format, so that I can verify the extracted data and proceed with corrections if needed.

## Acceptance Criteria

### AC1: Extract Button Triggers Single File Extraction
**Given** a user has uploaded a single file and selected a template
**When** the user clicks the "Extract" button
**Then** the system should send a POST request to `/api/extractions/single` with the file and template ID

### AC2: API Endpoint Processes Single File
**Given** the API receives a POST request to `/api/extractions/single`
**When** the request includes a valid file and template ID
**Then** the system should process the extraction and return structured results

### AC3: Results Display in Table Format
**Given** the extraction has completed successfully
**When** the results are returned from the API
**Then** the system should display the extracted data in a table with columns matching the template fields

### AC4: Table Shows Field Names and Values
**Given** extraction results are displayed in the table
**When** the user views the table
**Then** each row should show the field name and its extracted value

### AC5: Empty Results Handling
**Given** the extraction completes but no data is extracted
**When** the results are empty
**Then** the system should display the table structure with empty values and inform the user

### AC6: Loading State During Extraction
**Given** the user initiates an extraction
**When** the extraction is in progress
**Then** the system should display a loading indicator and disable the Extract button

### AC7: Error Handling for Failed Extractions
**Given** the extraction process encounters an error
**When** the API returns an error response
**Then** the system should display a user-friendly error message and allow retry

### AC8: Results Section Initially Hidden
**Given** the user is on the extraction page
**When** no extraction has been initiated
**Then** the results table section should be hidden or show a placeholder message

### AC9: Results Replace Previous Extraction
**Given** the user has completed one extraction
**When** the user initiates a new extraction on a different file
**Then** the previous results should be cleared and replaced with the new results

### AC10: Extract Button Disabled Without Required Data
**Given** the user is on the extraction page
**When** either the file or template is not selected
**Then** the Extract button should be disabled with a tooltip explaining the requirement

## Tasks and Subtasks

### Task 1: Backend - Create Single Extraction API Endpoint
**Estimated Effort**: Medium
**Dependencies**: None

#### Subtask 1.1: Create API Route
- [ ] Create POST endpoint `/api/extractions/single` in backend
- [ ] Set up route handler in appropriate controller/router file
- [ ] Configure request validation middleware

#### Subtask 1.2: Implement Request Processing
- [ ] Parse multipart form data (file + template ID)
- [ ] Validate file format and size
- [ ] Validate template ID exists in database
- [ ] Load template configuration from database

#### Subtask 1.3: Integrate Document Processing
- [ ] Call document processing service with uploaded file
- [ ] Extract text/data from document using appropriate parser
- [ ] Apply template field extraction logic
- [ ] Format results according to template structure

#### Subtask 1.4: Implement Response Formatting
- [ ] Structure response with extracted field names and values
- [ ] Include metadata (filename, timestamp, template info)
- [ ] Handle empty/null extraction results
- [ ] Return appropriate HTTP status codes

#### Subtask 1.5: Add Error Handling
- [ ] Handle file processing errors
- [ ] Handle template not found errors
- [ ] Handle extraction service failures
- [ ] Return structured error responses with clear messages

### Task 2: Frontend - Create Results Table Component
**Estimated Effort**: Medium
**Dependencies**: None

#### Subtask 2.1: Create ResultsTable Component
- [ ] Create `ResultsTable.tsx` component in appropriate directory
- [ ] Define props interface (data, loading, error states)
- [ ] Set up basic table structure using UI library
- [ ] Add responsive table styling

#### Subtask 2.2: Implement Table Rendering Logic
- [ ] Map extraction results to table rows
- [ ] Display field names in first column
- [ ] Display extracted values in second column
- [ ] Handle different data types (text, numbers, dates)

#### Subtask 2.3: Add Empty State Handling
- [ ] Create empty state component/message
- [ ] Display when no results are available
- [ ] Show appropriate messaging for different scenarios

#### Subtask 2.4: Implement Loading State
- [ ] Add loading skeleton or spinner for table
- [ ] Disable table interactions during loading
- [ ] Show loading message

#### Subtask 2.5: Add Error State Display
- [ ] Create error message component
- [ ] Display user-friendly error messages
- [ ] Add retry action button

### Task 3: Frontend - Implement Extraction Flow
**Estimated Effort**: Medium
**Dependencies**: Task 2

#### Subtask 3.1: Update Page State Management
- [ ] Add extraction results state to page component
- [ ] Add loading state for extraction process
- [ ] Add error state for failed extractions
- [ ] Implement state reset logic

#### Subtask 3.2: Create Extract Button Handler
- [ ] Implement onClick handler for Extract button
- [ ] Validate file and template selection before API call
- [ ] Prepare request payload (FormData with file + template ID)
- [ ] Set loading state during API call

#### Subtask 3.3: Implement API Integration
- [ ] Create API service function for single extraction
- [ ] Configure fetch/axios call to POST `/api/extractions/single`
- [ ] Handle multipart/form-data content type
- [ ] Parse API response

#### Subtask 3.4: Update UI with Results
- [ ] Update results state with API response data
- [ ] Show/unhide results table section
- [ ] Clear loading state
- [ ] Scroll to results section if needed

#### Subtask 3.5: Implement Error Handling
- [ ] Catch API errors
- [ ] Update error state with error messages
- [ ] Display error notification/toast
- [ ] Clear loading state on error

### Task 4: Frontend - Enhance Extract Button Logic
**Estimated Effort**: Small
**Dependencies**: Task 3

#### Subtask 4.1: Implement Button Disabled State
- [ ] Add disabled prop logic based on file and template selection
- [ ] Update button styling for disabled state
- [ ] Add cursor and opacity changes

#### Subtask 4.2: Add Tooltip/Helper Text
- [ ] Add tooltip component to Extract button
- [ ] Show requirement message when disabled
- [ ] Display tooltip on hover

#### Subtask 4.3: Update Button During Loading
- [ ] Disable button during extraction process
- [ ] Show loading spinner inside button
- [ ] Change button text to "Extracting..."

### Task 5: Frontend - Integrate Results Section into Page
**Estimated Effort**: Small
**Dependencies**: Task 2, Task 3

#### Subtask 5.1: Add Results Section to Page Layout
- [ ] Add results section container below file upload
- [ ] Implement conditional rendering (hidden by default)
- [ ] Add section header/title
- [ ] Add proper spacing and layout

#### Subtask 5.2: Implement Results Replacement Logic
- [ ] Clear previous results when new extraction starts
- [ ] Reset error states on new extraction
- [ ] Ensure table updates with new data

#### Subtask 5.3: Add Visual Feedback
- [ ] Add success notification when extraction completes
- [ ] Add smooth transition when results appear
- [ ] Highlight newly extracted data

### Task 6: Testing - Unit Tests
**Estimated Effort**: Medium
**Dependencies**: Task 1, Task 2, Task 3

#### Subtask 6.1: Backend API Tests
- [ ] Test successful extraction with valid file and template
- [ ] Test invalid file format handling
- [ ] Test missing template ID error
- [ ] Test template not found error
- [ ] Test empty extraction results
- [ ] Test extraction service failures

#### Subtask 6.2: Frontend Component Tests
- [ ] Test ResultsTable renders with valid data
- [ ] Test ResultsTable shows loading state
- [ ] Test ResultsTable shows error state
- [ ] Test ResultsTable shows empty state
- [ ] Test table row rendering with different data types

#### Subtask 6.3: Frontend Integration Tests
- [ ] Test Extract button disabled without file/template
- [ ] Test Extract button triggers API call
- [ ] Test results display after successful extraction
- [ ] Test error display after failed extraction
- [ ] Test results replacement on new extraction

### Task 7: Testing - E2E Tests
**Estimated Effort**: Small
**Dependencies**: Task 6

#### Subtask 7.1: Create E2E Test Scenarios
- [ ] Test complete flow: upload file, select template, extract, view results
- [ ] Test extraction with different file types
- [ ] Test extraction error scenarios
- [ ] Test multiple consecutive extractions
- [ ] Test button states throughout the flow

### Task 8: Documentation and Polish
**Estimated Effort**: Small
**Dependencies**: All previous tasks

#### Subtask 8.1: Update Technical Documentation
- [ ] Document API endpoint in API documentation
- [ ] Document request/response formats
- [ ] Add examples of extraction results structure
- [ ] Document error codes and messages

#### Subtask 8.2: Add Code Comments
- [ ] Comment complex extraction logic
- [ ] Document component props and state
- [ ] Add JSDoc comments to API functions

#### Subtask 8.3: Accessibility Review
- [ ] Ensure table has proper ARIA labels
- [ ] Test keyboard navigation
- [ ] Verify screen reader compatibility
- [ ] Check color contrast for error/success states

#### Subtask 8.4: Performance Optimization
- [ ] Review and optimize extraction processing time
- [ ] Implement request timeout handling
- [ ] Add loading progress indicator if extraction is slow
- [ ] Consider caching strategies for repeated extractions

## Technical Notes

### API Endpoint Design
```
POST /api/extractions/single
Content-Type: multipart/form-data

Request:
- file: File (document to extract from)
- template_id: string (UUID of template)

Response:
{
  "success": true,
  "extraction_id": "uuid",
  "filename": "document.pdf",
  "template_id": "uuid",
  "template_name": "Invoice Template",
  "timestamp": "2025-10-25T10:30:00Z",
  "results": [
    {
      "field_name": "Invoice Number",
      "field_type": "text",
      "extracted_value": "INV-12345"
    },
    {
      "field_name": "Total Amount",
      "field_type": "number",
      "extracted_value": "1250.00"
    }
  ]
}
```

### Frontend State Management
```typescript
interface ExtractionState {
  isLoading: boolean;
  error: string | null;
  results: ExtractionResult | null;
}

interface ExtractionResult {
  extractionId: string;
  filename: string;
  templateId: string;
  templateName: string;
  timestamp: string;
  results: FieldResult[];
}

interface FieldResult {
  fieldName: string;
  fieldType: string;
  extractedValue: any;
}
```

### Component Structure
```
src/components/extraction/
  - ResultsTable.tsx (main results display)
  - ResultsTableRow.tsx (individual row component)
  - EmptyResults.tsx (empty state component)
  - ExtractionError.tsx (error display component)
```

## Dev Notes

### Implementation Hints

1. **API Implementation**:
   - Use existing document processing service/library for text extraction
   - Consider using a queue system if extraction is slow (future enhancement)
   - Store extraction results in database for audit trail
   - Implement request timeout (e.g., 30 seconds)

2. **Frontend Implementation**:
   - Use FormData API to send file with template ID
   - Consider using React Query or SWR for API call management
   - Implement optimistic UI updates where appropriate
   - Use table component from existing UI library (shadcn/ui, MUI, etc.)

3. **Error Handling**:
   - Backend: Return 400 for validation errors, 404 for template not found, 500 for processing errors
   - Frontend: Display specific error messages based on error codes
   - Implement retry logic with exponential backoff for transient failures

4. **Data Validation**:
   - Validate file size limits (e.g., max 10MB for single file)
   - Validate file types (PDF, images, etc.)
   - Sanitize extracted data before display
   - Validate template exists and is active

5. **UI/UX Considerations**:
   - Show extraction progress if processing takes >2 seconds
   - Add animation when results appear
   - Make table scrollable if many fields
   - Consider pagination for large result sets (future enhancement)
   - Add copy-to-clipboard functionality for individual values

6. **Performance**:
   - Optimize document parsing for common formats
   - Consider lazy loading results table if very large
   - Implement debouncing if Extract button can be spammed
   - Cache template configuration during extraction

7. **Testing Strategy**:
   - Mock document processing service in unit tests
   - Use sample documents with known content for E2E tests
   - Test with various file sizes and formats
   - Test edge cases: empty documents, corrupted files, etc.

8. **Security Considerations**:
   - Validate file types on both client and server
   - Scan uploaded files for malware (if not already implemented)
   - Implement rate limiting on extraction endpoint
   - Sanitize extracted data to prevent XSS

## Related Files
- `/docs/epics.md` - Epic 3 definition and story breakdown
- `/docs/tech-spec-epic-3.md` - Technical specification for Epic 3
- `/docs/stories/story-3.5.md` - Save Template Flow (prerequisite)
- `/docs/stories/story-3.6.md` - File Upload Section (prerequisite)

## Definition of Done
- [ ] All acceptance criteria are met
- [ ] All tasks and subtasks are completed
- [ ] Unit tests written and passing (>80% coverage)
- [ ] E2E tests written and passing
- [ ] Code reviewed and approved
- [ ] API endpoint documented
- [ ] No critical or high-priority bugs
- [ ] Accessibility requirements met (WCAG 2.1 Level AA)
- [ ] Performance benchmarks met (extraction < 10s for typical documents)
- [ ] Works on all supported browsers (Chrome, Firefox, Safari, Edge)
- [ ] Mobile responsive design verified
- [ ] Documentation updated

## Notes
- This story represents the first complete extraction workflow
- Focus on single file extraction; batch processing comes in Story 3.8
- Keep UI simple and intuitive; advanced features in later stories
- Ensure results table is reusable for future stories (corrections, batch, etc.)
- Consider user feedback on results display format before Story 3.8
