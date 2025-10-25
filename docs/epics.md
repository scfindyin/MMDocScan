# MMDocScan - Epic Breakdown

**Author:** Steve
**Date:** 2025-10-18
**Project Level:** 2
**Target Scale:** Small company internal tool

---

## Overview

This document provides the detailed epic breakdown for MMDocScan, expanding on the high-level epic list in the [PRD](./PRD.md).

Each epic includes:

- Expanded goal and value proposition
- Complete story breakdown with user stories
- Acceptance criteria for each story
- Story sequencing and dependencies

**Epic Sequencing Principles:**

- Epic 1 establishes foundational infrastructure and initial functionality
- Subsequent epics build progressively, each delivering significant end-to-end value
- Stories within epics are vertically sliced and sequentially ordered
- No forward dependencies - each story builds only on previous work

---

## Epic 1: Project Foundation & Template Management with AI-Assisted Creation

**Expanded Goal:**

Establish the technical foundation for MMDocScan and deliver intelligent template creation capabilities. Users will be able to create extraction templates with AI assistance—uploading sample documents to receive field suggestions, defining custom prompts, and testing extraction before saving templates for production use. This epic establishes the development infrastructure (Next.js, Vercel, Supabase, Claude API) and delivers a complete template management workflow that sets users up for success in Epic 2.

**Value Delivery:**

By the end of Epic 1, users can create, test, and save validated extraction templates. The AI-assisted workflow reduces guesswork and ensures templates work correctly before production use, establishing confidence in the system's capabilities.

### Stories

**Story 1.1: Project Infrastructure Setup**

As a developer,
I want a working Next.js application deployed to Vercel with basic routing,
So that I have a solid foundation for building MMDocScan features.

**Acceptance Criteria:**
1. Next.js 14+ project initialized with TypeScript
2. Tailwind CSS configured and working
3. ShadCN component library installed and verified
4. Basic application layout with navigation placeholder
5. Deployed to Vercel with automatic deployments on commit
6. Homepage displays "MMDocScan" title and basic navigation structure
7. Development environment runs locally without errors

**Prerequisites:** None

---

**Story 1.2: Database Setup and Connection**

As a developer,
I want Supabase PostgreSQL database configured and connected to the Next.js application,
So that I can store and retrieve application data.

**Acceptance Criteria:**
1. Supabase project created and configured
2. Database connection established from Next.js (using Supabase client)
3. Environment variables configured for database credentials
4. Database connection verified with test query
5. Basic error handling for database connection failures
6. Connection works in both local development and Vercel deployment

**Prerequisites:** Story 1.1

---

**Story 1.3: Template Data Model and Storage**

As a developer,
I want a database schema for storing extraction templates,
So that templates can be persisted and retrieved.

**Acceptance Criteria:**
1. `templates` table created with fields:
   - id (UUID, primary key)
   - name (text)
   - template_type (text - invoice, estimate, equipment_log, timesheet, consumable_log, generic)
   - created_at, updated_at (timestamps)
2. `template_fields` table created with fields:
   - id (UUID, primary key)
   - template_id (foreign key)
   - field_name (text)
   - field_type (text - text, number, date, etc.)
   - is_header (boolean - header vs. detail)
   - display_order (integer)
3. `template_prompts` table created with fields:
   - id (UUID, primary key)
   - template_id (foreign key)
   - prompt_text (text)
   - prompt_type (text - global, field-specific)
4. Database migrations created and applied
5. Basic CRUD functions implemented for templates

**Prerequisites:** Story 1.2

---

**Story 1.4: Template List and Management UI**

As a user,
I want to view a list of my saved templates and navigate to create new ones,
So that I can manage my extraction templates.

**Acceptance Criteria:**
1. Template list page displays all saved templates in a table/card layout
2. Each template shows: name, type, created date, field count
3. "Create New Template" button navigates to template builder
4. Empty state message shown when no templates exist
5. Templates can be selected to view/edit (navigation only - editing in later story)
6. Basic responsive layout works on desktop and tablet
7. Uses ShadCN components for consistent UI

**Prerequisites:** Story 1.3

---

**Story 1.5: Manual Template Builder - Field Definition**

As a user,
I want to manually define fields for my template without AI assistance,
So that I can create templates when I know exactly what fields I need.

**Acceptance Criteria:**
1. Template builder page with form for template name and type selection
2. "Add Field" button to add new field definitions
3. For each field, user can specify:
   - Field name
   - Data type (text, number, date, currency)
   - Header vs. Detail categorization (radio buttons)
4. Fields can be reordered (drag-and-drop or up/down buttons)
5. Fields can be removed
6. "Save Template" saves template to database
7. Validation: Template name required, at least 1 field required
8. Success message and redirect to template list on save
9. Can cancel and return to template list without saving

**Prerequisites:** Story 1.4

---

**Story 1.6: Sample Document Upload for Template Creation**

As a user,
I want to upload a sample document when creating a template,
So that the AI can suggest fields and I can test my extraction prompts.

**Acceptance Criteria:**
1. Template builder includes "Upload Sample Document" section (optional)
2. Drag-and-drop file upload or file picker
3. Accepts PDF, Word (.doc, .docx), and text files
4. File size limit: 10MB (displays error if exceeded)
5. Uploaded file displayed with filename and file type
6. Can remove uploaded file and upload different one
7. Sample document stored temporarily (client-side or temp server storage)
8. "Skip - Define Fields Manually" option allows bypassing upload
9. Clear visual indication of optional vs required steps

**Prerequisites:** Story 1.5

---

**Story 1.7: Claude API Integration and AI Field Suggestion**

As a user,
I want the AI to analyze my sample document and suggest extractable fields,
So that I don't have to guess what data can be extracted.

**Acceptance Criteria:**
1. Claude Skills API configured with API key (environment variable)
2. When sample document uploaded, "Get AI Field Suggestions" button appears
3. Clicking button sends document to Claude with prompt: "Analyze this document and suggest extractable fields with data types"
4. AI response parsed and displayed as suggested fields list
5. Each suggested field shows: field name, data type, suggested header/detail categorization
6. User can select which suggestions to include in template (checkboxes)
7. Selected suggestions populate the field definition form
8. User can still add manual fields after accepting suggestions
9. Loading state shown during API call
10. Error handling for API failures with user-friendly message
11. API call works with PDF, Word, and text file formats

**Prerequisites:** Story 1.6

---

**Story 1.8: Custom Prompt Definition**

As a user,
I want to add custom AI prompts to my template,
So that I can guide the extraction with specific instructions and examples.

**Acceptance Criteria:**
1. Template builder includes "Custom AI Prompts" section
2. Text area for entering prompt instructions
3. Placeholder text with example: "Extract all line items as separate rows. Format dates as YYYY-MM-DD."
4. Character count display (no hard limit, but show count)
5. Optional "Prompt Tips" expandable section with guidance
6. Prompt saved with template
7. Can edit prompt text before testing or saving

**Prerequisites:** Story 1.5

---

**Story 1.9: Test Extraction on Sample Document**

As a user,
I want to test my template and prompts on the sample document,
So that I can verify the extraction works before saving the template.

**Acceptance Criteria:**
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

**Prerequisites:** Story 1.7, Story 1.8

---

**Story 1.10: Save Validated Template**

As a user,
I want to save my template after successful testing,
So that I can reuse it for production document processing.

**Acceptance Criteria:**
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

**Prerequisites:** Story 1.9

---

## Epic 2: Production Document Processing & Excel Export

**Expanded Goal:**

Deliver the complete production workflow that enables users to process real billing documents using their saved templates. Users upload production documents, select templates, run AI extraction, review results with confidence scoring, iteratively refine prompts if needed, and export clean data to Excel with full source traceability. This epic completes the end-to-end value proposition of MMDocScan.

**Value Delivery:**

By the end of Epic 2, users can process production documents end-to-end: upload → extract → review → refine → export to Excel. The workflow delivers accurate tabular data ready for billing validation, with confidence scores and source metadata ensuring data quality and traceability.

### Stories

**Story 2.1: Production Document Upload Interface**

As a user,
I want to upload production documents for extraction,
So that I can process real billing documents using my saved templates.

**Acceptance Criteria:**
1. "Process Documents" navigation option from main menu
2. Document processing page with file upload interface
3. Drag-and-drop file upload or file picker
4. Accepts PDF, Word (.doc, .docx), and text files
5. File size limit: 10MB (displays error if exceeded)
6. Uploaded document displayed with filename, file type, and file size
7. Can remove uploaded document and upload different one
8. Clear distinction from template creation workflow (different page/context)
9. "Next: Select Template" button enabled after upload

**Prerequisites:** Epic 1 complete (Story 1.10)

---

**Story 2.2: Template Selection for Production Processing**

As a user,
I want to select which saved template to apply to my production document,
So that the extraction uses the correct field definitions and prompts.

**Acceptance Criteria:**
1. After document upload, template selection interface appears
2. Displays list of all saved templates (from template management)
3. Each template shows: name, type, field count, last used date
4. User can select one template (radio selection or cards)
5. "Preview Template" option shows template fields and prompts before applying
6. Selected template highlighted/indicated clearly
7. "Apply Template & Extract" button enabled after template selection
8. Can go back to change uploaded document if needed

**Prerequisites:** Story 2.1

---

**Story 2.3: Production Document Extraction**

As a user,
I want to run AI extraction on my production document using the selected template,
So that I can extract structured data from my billing document.

**Acceptance Criteria:**
1. "Apply Template & Extract" button triggers extraction
2. System sends production document + selected template + prompts to Claude API
3. Loading state with progress indicator during extraction
4. API returns extracted data in flat/denormalized format (header fields repeated per detail row)
5. Extraction results stored temporarily for preview
6. Row-level confidence scores calculated
7. Source metadata captured (filename, page numbers, extraction timestamp)
8. Error handling for API failures with actionable error messages
9. Success message: "Extraction complete - X rows extracted"
10. Automatic transition to results preview

**Prerequisites:** Story 2.2

---

**Story 2.4: Extraction Results Preview Table**

As a user,
I want to preview the extracted data in a table format,
So that I can review the results before exporting to Excel.

**Acceptance Criteria:**
1. Results displayed in table matching expected Excel output format
2. All defined template fields shown as columns
3. Each row displays extracted values for all fields
4. Row-level confidence score displayed in dedicated column
5. Low-confidence rows visually flagged (yellow/orange background)
6. Source metadata columns included (filename, page number)
7. Table supports basic sorting by any column
8. Table supports basic filtering (e.g., show only low-confidence rows)
9. Row count summary displayed: "Showing X rows"
10. Scrollable table for long result sets
11. Responsive table layout for tablet view

**Prerequisites:** Story 2.3

---

**Story 2.5: Review Low-Confidence Extractions**

As a user,
I want to easily identify and review low-confidence extractions,
So that I can assess data quality before export.

**Acceptance Criteria:**
1. "Show Low-Confidence Only" filter toggle
2. Confidence score threshold indicator (e.g., < 70% = low confidence)
3. Low-confidence rows visually distinct from high-confidence rows
4. Confidence score tooltip explains scoring (hover for details)
5. Can sort by confidence score (lowest first)
6. Summary stats displayed: "X high-confidence, Y low-confidence rows"
7. Clear indication when no low-confidence rows exist ("All extractions high-confidence")

**Prerequisites:** Story 2.4

---

**Story 2.6: Iterative Prompt Refinement**

As a user,
I want to adjust extraction prompts and re-run extraction if results aren't satisfactory,
So that I can improve extraction accuracy without starting over.

**Acceptance Criteria:**
1. "Adjust Prompts" button available in results preview
2. Clicking button reveals prompt editing interface
3. Current prompts pre-populated in text area
4. User can modify prompt instructions
5. "Re-extract" button triggers new extraction with updated prompts
6. Original document and template preserved during re-extraction
7. New results replace previous results in preview table
8. Can iterate multiple times (adjust → re-extract → review loop)
9. Option to "Update Template" saves refined prompts to original template
10. Option to "Save as New Template" creates new template with refined prompts

**Prerequisites:** Story 2.4

---

**Story 2.7: Excel File Generation**

As a developer,
I want to generate Excel (.xlsx) files from extracted data,
So that users can export their results in the required format.

**Acceptance Criteria:**
1. Excel generation library integrated (e.g., ExcelJS, xlsx)
2. Function to convert extraction results to Excel format
3. Excel file structure:
   - Single worksheet with extracted data
   - Column headers match template field names
   - Header fields repeated on each detail row (flat/denormalized)
   - Confidence score column included
   - Source metadata columns included (filename, page number, extraction timestamp)
4. Data types preserved (text, numbers, dates formatted correctly)
5. Auto-sized columns for readability
6. Header row formatted (bold, background color)
7. Low-confidence rows highlighted in Excel (conditional formatting)
8. File generated in-memory (server-side or client-side)

**Prerequisites:** Story 2.4

---

**Story 2.8: Excel Export and Download**

As a user,
I want to download my extraction results as an Excel file,
So that I can use the data for billing validation in my existing workflows.

**Acceptance Criteria:**
1. "Export to Excel" button prominently displayed in results preview
2. Clicking button generates Excel file (uses Story 2.7 functionality)
3. File download initiated automatically with suggested filename format: `[template-name]_[document-name]_[date].xlsx`
4. User can customize filename before download
5. Success message: "Excel file downloaded successfully"
6. Downloaded file opens correctly in Excel/Google Sheets
7. All data, confidence scores, and metadata present in Excel file
8. Formatting preserved (headers, highlighting, data types)
9. After export, option to "Process Another Document" or "Return to Templates"

**Prerequisites:** Story 2.7

---

**Story 2.9: Extraction Session Management**

As a user,
I want to return to my recent extractions without re-uploading documents,
So that I can re-export or review previous results.

**Acceptance Criteria:**
1. Extraction results saved temporarily (session storage or database)
2. "Recent Extractions" list accessible from main navigation
3. Each recent extraction shows: document name, template used, extraction date, row count
4. Clicking recent extraction loads results preview
5. Can re-export to Excel from saved extraction
6. Recent extractions persist for current session (minimum)
7. Limit: Keep 10 most recent extractions
8. "Clear History" option to remove old extractions
9. Extractions auto-expire after 7 days (or configurable period)

**Prerequisites:** Story 2.8

---

## Epic 3: Unified Batch Extraction Workflow

**Expanded Goal:**

Transform MMDocScan from single-file processing to an enterprise-grade batch extraction platform. Deliver a unified single-page workflow where users can process 1-100 files simultaneously with automatic document detection, custom columns for analysis, and a polished results experience. This epic eliminates context-switching, delivers massive efficiency gains (97.5% reduction in clicks for batch processing), and establishes MMDocScan as a scalable solution for high-volume document processing workflows.

**Value Delivery:**

By the end of Epic 3, users can upload multiple files, have the system automatically detect and extract data from dozens of documents in minutes, add custom metadata columns, and export results to Excel with flexible options. The unified interface keeps everything in view, resizable panels adapt to user workflow, and the virtualized results table handles thousands of rows smoothly.

**Technical Foundation:**

- Single-page architecture with resizable panels
- Zustand state management
- Tag-based template builder with drag-and-drop
- PDF parsing with auto-detection algorithm
- Batch processing queue with rate limiting
- React-window virtualization for performance
- Excel export with multiple sheet options

### Phase 1: Foundation (Weeks 1-2) - Stories 3.1-3.7

**Story 3.1: Unified Page Layout with Resizable Panels**

As a user,
I want a single-page interface with resizable left and right panels,
So that I can configure extraction settings and view results without losing context.

**Acceptance Criteria:**
1. New `/extract` route created with App Router
2. Page layout with left panel (configuration) and right panel (results)
3. Panels resizable via draggable divider using react-resizable-panels
4. Default: Left panel 300px, right panel fluid
5. Min widths: Left 250px, Right 600px
6. Panel sizes persist to localStorage
7. Maximize button on left panel → right minimizes to thin bar
8. Maximize button on right panel → left minimizes to thin bar
9. Click minimized bar to restore panel
10. Smooth resize animations

**Prerequisites:** Stories 2.1-2.9 (Epics 1-2 complete)

---

**Story 3.2: Tag-Based Template Builder UI**

As a user,
I want to define extraction fields as draggable tags,
So that I can quickly create and visualize my template structure.

**Acceptance Criteria:**
1. Template section in left panel with mode toggle (New/Load existing)
2. "Load existing" shows dropdown populated from /api/templates
3. Field tags area showing fields as horizontal chips
4. Each tag shows: field name, notes indicator (📝 if instructions exist), delete button [×]
5. "+ Add field" button creates new field tag
6. Click tag opens Field Edit Modal
7. Field Edit Modal shows: field name input, instructions textarea (0-500 chars)
8. Visual styling: tags with 4px vertical gap, drag handle icon, hover states
9. "Save Template" button (context-aware: "Save" or "Update")
10. Extraction instructions textarea (0-2000 chars) with character count

**Prerequisites:** Story 3.1

---

**Story 3.3: Drag-and-Drop Field Reordering**

As a user,
I want to reorder extraction fields by dragging them,
So that I can organize fields in a logical sequence.

**Acceptance Criteria:**
1. @dnd-kit/core installed and configured
2. Field tags draggable with visual drag handle (⠿)
3. Dragging shows drop zones between other tags
4. Tags reorder on drop
5. Order persisted in template data structure
6. Keyboard navigation: Arrow up/down to reorder focused tag
7. Screen reader announces: "Drag to reorder, press enter to edit"
8. Smooth animation when reordering
9. Drag works on desktop and touch devices

**Prerequisites:** Story 3.2

---

**Story 3.4: Template CRUD API Endpoints**

As a developer,
I want complete API endpoints for template management,
So that the frontend can save, load, update, and delete templates.

**Acceptance Criteria:**
1. `GET /api/templates` - List user's templates (with RLS)
2. `POST /api/templates` - Create template (body: name, fields, extraction_prompt)
3. `GET /api/templates/:id` - Get single template
4. `PUT /api/templates/:id` - Update template
5. `DELETE /api/templates/:id` - Delete template
6. Zod schemas for validation
7. Database schema updated: templates table with fields JSONB column
8. RLS policies ensure users only access their own templates
9. Error handling: 400 for validation, 404 for not found, 500 for server errors
10. Unit tests for all endpoints

**Prerequisites:** Story 3.2

---

**Story 3.5: Save Template Flow**

As a user,
I want to save my template configuration,
So that I can reuse it for future extractions.

**Acceptance Criteria:**
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

**Prerequisites:** Story 3.4

---

**Story 3.6: File Upload Section (Single File)**

As a user,
I want to upload a single file to test the unified interface,
So that I can validate the basic extraction flow works.

**Acceptance Criteria:**
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

**Prerequisites:** Story 3.1

---

**Story 3.7: Basic Extraction with Results Table**

As a user,
I want to extract data from my uploaded file and see results,
So that I can validate the end-to-end flow works in the new interface.

**Acceptance Criteria:**
1. "Start Extraction" button in left panel (enabled when template + file present)
2. Button calls `POST /api/extractions/single` endpoint
3. Backend: Parse PDF with pdf-parse, extract text
4. Backend: Call Claude API with template fields + prompt
5. Backend: Return extracted data as JSON
6. Right panel shows processing state (spinner + "Processing...")
7. On complete: Right panel shows results table (basic, no virtualization yet)
8. Table shows: extracted fields as columns, one row of data
9. Empty state when no results
10. Error state with message if extraction fails

**Prerequisites:** Stories 3.5, 3.6

---

### Phase 2: Batch Processing (Weeks 3-4) - Stories 3.8-3.14

**Story 3.8: Multi-File Upload UI**

As a user,
I want to upload multiple PDF files at once,
So that I can process entire batches efficiently.

**Acceptance Criteria:**
1. File upload accepts multiple files (remove `multiple: false` from dropzone)
2. File list shows all uploaded files with metadata
3. Each file shows: filename, size, page count, status indicator
4. Remove button [×] per file
5. "+ Add more files" button to append additional files
6. Aggregate stats: "X files, Y total pages, Z MB"
7. Max 100 files with validation error if exceeded
8. Max total size 100MB with error if exceeded
9. Files stored in Zustand as array
10. Visual: Scrollable list if >5 files

**Prerequisites:** Story 3.7

---

**Story 3.9: PDF Parsing Service**

As a developer,
I want a reliable PDF parsing service,
So that I can extract text and metadata from uploaded files.

**Acceptance Criteria:**
1. PDFParser service class created (`services/PDFParser.ts`)
2. Uses pdf-parse library
3. Methods: `parsePDF(file: File)` returns `{ pages: Page[], metadata: Metadata }`
4. Each Page includes: pageNumber, text, height, width
5. Metadata includes: pageCount, title, author, createdDate
6. Error handling for corrupted/unreadable PDFs
7. Unit tests with sample PDFs (valid, corrupted, multi-page)
8. Performance: Parse 100-page PDF in <5 seconds
9. Memory efficient: Streaming approach, don't load entire file
10. Logging for debugging

**Prerequisites:** Story 3.8

---

**Story 3.10: Auto-Detection Algorithm**

As a developer,
I want an algorithm that automatically detects document boundaries in multi-document PDFs,
So that users don't have to manually split files.

**Acceptance Criteria:**
1. DocumentDetector service class created (`services/DocumentDetector.ts`)
2. Method: `detect(pages: Page[])` returns `DetectedDocument[]`
3. DetectedDocument includes: startPage, endPage, pageCount, confidence (0-1)
4. Detection strategy: AGGRESSIVE (prefer false positives over missed documents)
5. Heuristics (1+ indicator triggers split):
   - Page boundary (each page = potential new document)
   - Invoice/receipt/bill keyword in first 200 chars
   - Number pattern: INV-, #, No. followed by digits
   - Date pattern near top: MM/DD/YYYY or DD-MM-YYYY
6. Fallback: If no indicators, treat entire file as single document
7. Unit tests with edge cases: single doc, 3 docs, ambiguous cases
8. Test data: Invoice keyword present → split
9. Test data: No keywords → single document
10. Performance: Analyze 100 pages in <1 second

**Prerequisites:** Story 3.9

---

**Story 3.11: Batch Extraction API**

As a developer,
I want an API endpoint that orchestrates batch extraction,
So that multiple files can be processed in one request.

**Acceptance Criteria:**
1. `POST /api/extractions/batch` endpoint created
2. Request body: `{ template, files (base64[]), customColumns }`
3. Creates extraction_session in database (status: 'pending')
4. Returns: `{ sessionId }`
5. Background processing: Parse all PDFs in parallel
6. Background processing: Run auto-detection on each file
7. Background processing: Queue extraction tasks
8. Updates session progress incrementally
9. Error handling: If file parsing fails, mark file as failed, continue with others
10. Session persists for 7 days (default retention)

**Prerequisites:** Story 3.10

---

**Story 3.12: Extraction Queue with Concurrency Control**

As a developer,
I want rate-limited extraction processing,
So that we don't hit Claude API limits or overwhelm the system.

**Acceptance Criteria:**
1. ExtractionQueue service class created (`services/ExtractionQueue.ts`)
2. Uses p-limit library with max 5 concurrent requests
3. For each detected document: Extract text, call Claude API, parse response
4. Claude API call includes: template fields, extraction prompt, document text
5. Parse JSON response, store in extraction_results table
6. Update session progress after each document: `progress = (completed / total) * 100`
7. Retry logic: Exponential backoff on 429 (rate limit) errors
8. Error handling: Save failed extractions with error message
9. Performance: Process 20 files (50 detected documents) in <3 minutes
10. Unit tests with mocked API responses

**Prerequisites:** Story 3.11

---

**Story 3.13: Progress Tracking UI**

As a user,
I want to see real-time progress while my batch processes,
So that I know the system is working and can estimate completion time.

**Acceptance Criteria:**
1. Right panel shows "Processing" state when extraction starts
2. Overall progress bar: "Processing 67% (4/6 files)"
3. Per-file status list showing:
   - ✓ File1.pdf (3 documents detected, complete)
   - ⟳ File2.pdf (Detecting documents...)
   - ⏸ File3.pdf (Queued)
4. Frontend polls `GET /api/extractions/:sessionId/status` every 2 seconds
5. Status endpoint returns: `{ status, progress, filesProcessed, totalFiles, perFileStatus[] }`
6. Detection results shown: "Detected 3 invoices on pages 1, 4, 7"
7. Errors displayed per file: "Failed: Unable to parse PDF"
8. Cancel button (future - placeholder with TODO for now)
9. Estimated time remaining (after first file completes)
10. Auto-stop polling when status = 'completed' or 'failed'

**Prerequisites:** Story 3.12

---

**Story 3.14: Results Table with Source Tracking**

As a user,
I want to see all extracted data in one table with source file information,
So that I can review results from multiple documents together.

**Acceptance Criteria:**
1. Results table shows data from all detected documents
2. Source column format: "File1-P1" (file abbreviation + page number)
3. Tooltip on source cell shows full filename: "invoices_batch1.pdf - Page 1 of 12"
4. All template fields shown as columns
5. Row count displayed: "5 documents extracted from 2 files"
6. Sortable columns (click header to sort)
7. Filterable by source file (dropdown)
8. Table handles 100+ rows smoothly (no virtualization yet - Story 3.23)
9. Empty state if no results
10. Export button shown (disabled - functionality in Story 3.21)

**Prerequisites:** Story 3.13

---

### Phase 3: Custom Columns (Week 5) - Stories 3.15-3.17

**Story 3.15: Custom Columns UI (Static Values Only)**

As a user,
I want to add custom columns with static values to my results,
So that I can include batch metadata like Batch ID or Department.

**Acceptance Criteria:**
1. Custom Columns section in left panel below File Upload
2. "+ Add Column" button opens Custom Column Modal
3. Modal shows: Column name input, Column type (Static Value - only option for now)
4. Static value input: "This value will be applied to all rows"
5. Column list shows added columns with name and value preview
6. Remove button [×] per column
7. Columns stored in Zustand state: `customColumns: { id, name, type: 'static', value }[]`
8. Max 10 custom columns with validation
9. Validation: No duplicate column names
10. Visual badge: [CUSTOM] in UI to distinguish from template fields

**Prerequisites:** Story 3.14

---

**Story 3.16: Custom Columns in Results Table**

As a user,
I want to see my custom columns in the results table,
So that I can verify the values are correct.

**Acceptance Criteria:**
1. Custom columns appear in results table after template field columns
2. Header shows: Column name with [CUSTOM] badge or subtle background color
3. Static values applied to all rows
4. Custom columns sortable like regular columns
5. Custom columns included in column visibility toggle (future - placeholder for now)
6. Column order matches order in custom columns list
7. Works with 1-10 custom columns
8. Performance: No degradation with custom columns added
9. Custom columns persist with session
10. Custom columns included in export (Story 3.17)

**Prerequisites:** Story 3.15

---

**Story 3.17: Custom Columns in Excel Export**

As a user,
I want my custom columns included in Excel exports,
So that downstream analysis includes my batch metadata.

**Acceptance Criteria:**
1. Excel export includes custom column headers
2. Custom column values populated in all rows
3. Custom columns positioned after template field columns
4. Column width auto-sized to fit content
5. Custom columns work with both export options (separate/combined sheets)
6. Works with 1-10 custom columns
7. No formatting issues (dates, text, numbers)
8. Custom column names displayed correctly (no encoding issues)
9. Test: Export with 3 custom columns, 50 rows - verify Excel file
10. Test: Reimport to Excel, verify data integrity

**Prerequisites:** Story 3.16

---

### Phase 4: AI Features (Week 6) - Stories 3.18-3.20

**Story 3.18: AI Inspect API for Field Suggestions**

As a developer,
I want an API that analyzes sample documents and suggests extraction fields,
So that users can quickly bootstrap templates.

**Acceptance Criteria:**
1. `POST /api/templates/ai-inspect` endpoint created
2. Request: FormData with single PDF file (<10MB)
3. Backend: Extract first page text from PDF
4. Backend: Call Claude API with prompt: "Analyze this document and suggest data fields to extract"
5. Response: `{ suggestedFields: Field[], suggestedPrompt: string }`
6. Each Field includes: name, description (AI's explanation)
7. AI suggestions optimized for invoices, receipts, work orders
8. Error handling: File too large, invalid format, API errors
9. Timeout: 30 seconds max
10. Unit tests with sample invoice PDF

**Prerequisites:** Story 3.5

---

**Story 3.19: AI Suggestions Modal**

As a user,
I want to see AI-suggested fields in an interactive modal,
So that I can quickly accept or reject suggestions.

**Acceptance Criteria:**
1. "AI Inspect File" button in template section (dashed border, secondary style)
2. Click opens file picker (PDF only, <10MB)
3. Loading state: "Analyzing..." with spinner
4. AI Suggestions Modal opens with results
5. Modal shows: List of suggested fields with checkboxes (all checked by default)
6. Each suggestion shows: Field name (editable via double-click), AI explanation
7. Suggested extraction prompt shown in editable textarea
8. "Add Selected (N)" button with count
9. Field names editable inline before adding
10. Cancel button closes modal without changes

**Prerequisites:** Story 3.18

---

**Story 3.20: Prompt Merge Logic**

As a user,
I want intelligent merging when AI suggests a prompt and I already have one,
So that I don't lose my existing work.

**Acceptance Criteria:**
1. When clicking "Add Selected" in AI modal, check if user already has prompt
2. If no existing prompt: Use AI suggested prompt directly
3. If existing prompt: Show Prompt Merge Dialog
4. Merge dialog options:
   - ○ Replace with AI suggestions
   - ○ Append AI suggestions
   - ○ Keep existing only
5. Radio button selection persists choice for session
6. "Apply" button executes selected merge strategy
7. Replace: Overwrites existing prompt
8. Append: Adds AI prompt after existing (with line break)
9. Keep: Ignores AI prompt, only adds fields
10. Fields always appended to existing fields (no duplicates by name)

**Prerequisites:** Story 3.19

---

### Phase 5: Excel Export Options (Week 6) - Stories 3.21-3.22

**Story 3.21: Export Dialog with Sheet Options**

As a user,
I want to choose how my results are organized in Excel,
So that I can match my downstream workflow needs.

**Acceptance Criteria:**
1. "Export to Excel" button in results panel (enabled after extraction complete)
2. Click opens Export Options Modal
3. Modal shows two radio options:
   - ● Separate sheets per source file (default)
     Description: "Creates one sheet for each file. Good for separate processing."
   - ○ Single combined sheet
     Description: "All data in one sheet. Good for unified analysis."
4. Preview text updates based on selection
5. "Export" button triggers download
6. "Cancel" button closes modal
7. Loading state during export generation: "Generating Excel file..."
8. Success: Browser downloads file with timestamped name
9. Error handling: "Export failed. Please try again."
10. Modal remembers last selection for session

**Prerequisites:** Story 3.17

---

**Story 3.22: Excel Generation Service (Separate/Combined Sheets)**

As a developer,
I want a robust Excel generation service that supports multiple sheet formats,
So that users can export results flexibly.

**Acceptance Criteria:**
1. ExcelExporter service class created (`services/ExcelExporter.ts`)
2. Uses exceljs library
3. Method: `exportToExcel(results, template, customColumns, options)`
4. Separate sheets option:
   - Groups results by source_file
   - Creates one sheet per file
   - Sheet names: Sanitized filename (max 31 chars, no special chars)
5. Combined sheet option:
   - One sheet named "Extraction Results"
   - All data rows in single sheet
6. Both options: Header row styled (bold, light gray background)
7. Both options: Columns auto-sized to fit content
8. Both options: Include all template fields + custom columns
9. Returns: Excel file buffer for download
10. Unit tests with 3 files, 50 rows, 5 custom columns

**Prerequisites:** Story 3.21

---

### Phase 6: Results Table UI Polish (Week 6) - Stories 3.23-3.25

**Story 3.23: Table Virtualization with react-window**

As a developer,
I want virtualized table rendering,
So that the interface stays smooth with 1000+ rows.

**Acceptance Criteria:**
1. react-window library installed
2. ResultsTable component refactored to use FixedSizeList
3. Only visible rows + buffer rendered (~70 DOM nodes total)
4. Row height: 40px
5. Buffer: 10 rows above and below viewport
6. Scrolling smooth at 60fps
7. Table works with 1000+ rows
8. Performance: Initial render <1 second for any dataset size
9. Performance: Scroll performance <100ms (60fps maintained)
10. All existing functionality works (sort, filter, source tracking)

**Prerequisites:** Story 3.22

---

**Story 3.24: Frozen Header and Always-Visible Scrollbar**

As a user,
I want the table header to stay visible and the horizontal scrollbar accessible immediately,
So that I can navigate results efficiently without scrolling frustration.

**Acceptance Criteria:**
1. Header row remains fixed at top of results panel while data scrolls (position: sticky)
2. Header always visible regardless of vertical scroll
3. Sortable column headers remain clickable while frozen
4. Horizontal scrollbar pinned to bottom of results panel viewport
5. Horizontal scrollbar visible on first page load (no vertical scroll needed)
6. Scrollbar syncs with table horizontal scroll
7. Works with 10+ columns requiring horizontal scroll
8. Frozen header works with table virtualization (Story 3.23)
9. Performance: No layout thrashing or scroll jank
10. Cross-browser tested: Chrome, Firefox, Safari, Edge

**Prerequisites:** Story 3.23

---

**Story 3.25: Panel Maximize/Minimize Controls**

As a user,
I want to maximize panels to focus on configuration or results,
So that I can optimize screen space for my current task.

**Acceptance Criteria:**
1. "◀ Maximize" button in left panel footer
2. "Maximize ▶" button in right panel footer
3. Click left maximize: Right panel minimizes to thin vertical bar (~20px)
4. Click right maximize: Left panel minimizes to thin vertical bar (~20px)
5. Click minimized bar: Restore panel to previous size
6. Maximized state persists to localStorage
7. Smooth animation on maximize/minimize (300ms transition)
8. Keyboard shortcut: Ctrl+[ for left, Ctrl+] for right (optional)
9. Icon changes: Maximize → Restore when panel maximized
10. Works with resizable panels (Story 3.1)

**Prerequisites:** Story 3.24

---

### Phase 7: Polish & Production Ready (Weeks 7-8) - Stories 3.26-3.30

**Story 3.26: Header Navigation Links**

As a user,
I want quick access to templates and extraction history from the header,
So that I can navigate efficiently.

**Acceptance Criteria:**
1. App header updated with navigation links
2. Links: [Templates] [History] [Help]
3. Templates link → /templates page (existing from Epic 1)
4. History link → /history page (new placeholder page)
5. Help link → Opens help modal or links to docs
6. Active state styling for current page
7. Responsive: Links collapse to hamburger menu on mobile
8. Header consistent across all pages
9. User avatar/profile shown (if auth present)
10. Logout option in profile dropdown

**Prerequisites:** Story 3.25

---

**Story 3.27: Error Handling & Edge Cases**

As a developer,
I want comprehensive error handling for edge cases,
So that the system degrades gracefully under stress.

**Acceptance Criteria:**
1. Large batch (100 files): Show warning, allow cancellation
2. Malformed PDF: Show error badge per file, continue with others
3. Claude API rate limits: Exponential backoff, show clear messaging
4. Browser tab closed during processing: Save session ID, resume on return
5. Network errors: Retry logic (3 attempts), fallback to error state
6. Session timeout: Prompt re-authentication, resume extraction
7. Error boundaries: Catch React errors, show friendly message
8. API errors: Log to monitoring service, show user-friendly messages
9. Edge case tests: Corrupted PDF, empty file, 100MB batch, API 500 errors
10. Performance under stress: 100 concurrent extractions

**Prerequisites:** Story 3.26

---

**Story 3.28: Session Persistence & Retention Settings**

As a user,
I want control over how long my extraction results are saved,
So that I can manage storage according to my needs.

**Acceptance Criteria:**
1. User settings page created: /settings
2. Session retention setting with options:
   - ○ Immediate deletion (0 days)
   - ● 7 days (default)
   - ○ 30 days
   - ○ 90 days
   - ○ Custom: [___] days
3. Setting saved in user_settings table
4. Cron job deletes expired sessions daily
5. Manual cleanup page: "View and delete old sessions"
6. Cleanup page lists sessions with: date, files processed, row count, [Delete] button
7. Delete button confirms before deletion
8. Session retention respected on save
9. API: `GET /api/settings`, `PUT /api/settings`
10. Settings accessible from profile dropdown

**Prerequisites:** Story 3.26

---

**Story 3.29: Accessibility Audit & Fixes**

As a developer,
I want WCAG 2.1 AA compliance,
So that the application is accessible to all users.

**Acceptance Criteria:**
1. Keyboard navigation tested: Tab through all interactive elements
2. Focus indicators visible on all focusable elements (2px blue outline)
3. Screen reader tested: NVDA on Windows, VoiceOver on Mac
4. ARIA labels added to all icons, buttons without text
5. ARIA live regions for dynamic content (progress updates)
6. Color contrast ratio ≥4.5:1 for all text (WCAG AA)
7. Alt text for all images/icons
8. Form labels associated with inputs
9. Skip to content link for keyboard users
10. Lighthouse accessibility score ≥95

**Prerequisites:** Story 3.28

---

**Story 3.30: Performance Optimization & Final QA**

As a developer,
I want to optimize performance and complete final QA,
So that the application is production-ready.

**Acceptance Criteria:**
1. Bundle size optimized: Code splitting, tree shaking
2. Images optimized: Next.js Image component, lazy loading
3. API responses cached where appropriate
4. Lighthouse Performance score ≥90
5. Load test: 100 concurrent users
6. Stress test: 100 files in single batch
7. Full regression test suite passing (E2E + integration)
8. Critical bugs fixed (P0/P1)
9. User testing with 3-5 users completed
10. Production deployment checklist complete

**Prerequisites:** Story 3.29

---

## Story Guidelines Reference

**Story Format:**

```
**Story [EPIC.N]: [Story Title]**

As a [user type],
I want [goal/desire],
So that [benefit/value].

**Acceptance Criteria:**
1. [Specific testable criterion]
2. [Another specific criterion]
3. [etc.]

**Prerequisites:** [Dependencies on previous stories, if any]
```

**Story Requirements:**

- **Vertical slices** - Complete, testable functionality delivery
- **Sequential ordering** - Logical progression within epic
- **No forward dependencies** - Only depend on previous work
- **AI-agent sized** - Completable in 2-4 hour focused session
- **Value-focused** - Integrate technical enablers into value-delivering stories

---

**For implementation:** Use the `create-story` workflow to generate individual story implementation plans from this epic breakdown.
