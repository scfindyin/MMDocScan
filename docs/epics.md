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
