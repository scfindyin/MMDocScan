# MMDocScan Product Requirements Document (PRD)

**Author:** Steve
**Date:** 2025-10-18
**Project Level:** 2
**Target Scale:** Small company internal tool

---

## Goals and Background Context

### Goals

- Achieve maximum extraction accuracy to support reliable billing validation and financial decision-making
- Provide confidence transparency through scoring and low-confidence alerts to enable informed data quality assessment
- Eliminate manual data extraction errors and bottlenecks in billing validation workflows

### Background Context

Project billing validation currently requires manual extraction of data from vendor invoices, estimates, equipment logs, timesheets, and consumable logs. Documents arrive in multiple formats (clean PDFs, Word docs, text files, and scanned images), creating labor-intensive manual data entry workflows that introduce accuracy risks and create bottlenecks. Without systematic error detection, inaccuracies can compromise billing decisions and impact project profitability.

MMDocScan addresses this critical operational need by leveraging AI-powered extraction with a template-driven approach. Built on Claude Skills technology, the tool enables small company employees to create reusable extraction templates, process documents of varying quality, and export validated data to Excel with full source traceability. The solution focuses on accuracy-first design specifically for financial validation use cases where precision is paramount.

---

## Requirements

### Functional Requirements

**Template Management:**
- FR001: System shall provide a UI-based template builder for creating extraction templates
- FR002: System shall allow users to upload a sample document and receive AI-generated field suggestions for template creation
- FR003: System shall allow users to define field names, data types, and field categorization (header vs. detail) within templates
- FR004: System shall allow users to save custom AI prompts and instructions with templates
- FR005: System shall allow users to test extraction with current prompts on sample documents during template creation
- FR006: System shall support storage and retrieval of templates for reuse
- FR007: System shall support 6 template types: Invoices, Estimates, Equipment Logs, Timesheets, Consumable Logs, and Generic Documents

**Document Processing:**
- FR008: System shall provide a file upload interface accepting PDF, Word (.doc, .docx), and text file formats
- FR009: System shall process both clean and scanned documents
- FR010: System shall allow users to select and apply a saved template to uploaded documents
- FR011: System shall allow users to add or override custom prompts per extraction run

**AI Extraction:**
- FR012: System shall integrate with Claude Skills API for AI-powered data extraction
- FR013: System shall extract data in flat/denormalized format with header fields repeated on each detail row
- FR014: System shall generate confidence scores for extracted data rows
- FR015: System shall flag low-confidence rows for user review
- FR016: System shall capture source document metadata (filename, page numbers, extraction timestamp) for each extracted data point

**Results Management:**
- FR017: System shall provide preview of extraction results before finalization
- FR018: System shall allow users to adjust prompts and rerun extraction iteratively until results are satisfactory

**Output Generation:**
- FR019: System shall generate Excel (.xlsx) files containing extracted tabular data
- FR020: System shall repeat header information for each detail row in the Excel output
- FR021: System shall include source document metadata (filename, page numbers) and confidence indicators in the Excel output

### Non-Functional Requirements

- NFR001: **Browser Compatibility** - System shall support latest versions of Chrome, Firefox, Safari, and Edge browsers on desktop and tablet devices
- NFR002: **Extraction Accuracy** - System shall achieve sufficient AI extraction accuracy for billing validation use cases, with confidence scoring to flag uncertain extractions
- NFR003: **Usability** - System shall provide an intuitive interface suitable for non-technical users comfortable with standard business software (Excel, file management)

---

## User Journeys

**User Journey: Document Extraction Workflow (Primary Use Case)**

**Actor:** Small company employee performing billing validation

**Scenario:** User needs to extract line item data from a vendor invoice for project billing validation

**Journey Steps:**

1. **Create/Select Template**
   - User navigates to template management
   - User either selects existing "Invoice" template or creates a new one
   - If creating new: defines fields (invoice number, date, vendor, line items with SKU/description/qty/amount)
   - If creating new: marks header fields (invoice metadata) vs. detail fields (line items)
   - User adds custom AI prompt instructions (e.g., "Extract all line items as separate rows")
   - User saves template for reuse

2. **Upload Document**
   - User selects the saved template
   - User uploads vendor invoice PDF (clean or scanned)
   - System accepts the file and prepares for extraction

3. **Run Extraction**
   - User clicks "Extract Data" to begin AI processing
   - System sends document and template to Claude Skills API
   - System displays processing status

4. **Review Results**
   - System presents extracted data in preview table
   - Header fields (invoice number, date, vendor) appear on each row
   - Detail fields (line items) populate individual rows
   - Each row displays a confidence score
   - Low-confidence rows flagged with visual indicator (e.g., yellow/orange highlight)

5. **Refine (if needed)**
   - User notices low-confidence rows or formatting issues
   - User adjusts AI prompt instructions (e.g., adds example format)
   - User clicks "Re-extract" to reprocess
   - System shows updated results

6. **Export to Excel**
   - User satisfied with extraction accuracy
   - User clicks "Export to Excel"
   - System generates .xlsx file with:
     - Extracted data in tabular format
     - Source metadata (filename, page numbers)
     - Row-level confidence scores
   - User downloads file
   - User proceeds with billing validation in Excel

**Decision Points:**
- Template exists vs. needs creation
- Extraction quality acceptable vs. needs refinement
- Confidence scores high vs. flagged for review

**Success Outcome:** User has accurate tabular data extracted from unstructured document, ready for billing validation, with confidence in data quality and full source traceability.

---

## UX Design Principles

1. **Clarity Over Complexity** - Interface should be immediately understandable without training. Clear labels, obvious actions, minimal cognitive load.

2. **Progressive Disclosure** - Show essential information first, reveal advanced options (custom prompts, refinement) when needed. Don't overwhelm users upfront.

3. **Trust Through Transparency** - Always show confidence scores and source traceability. Users need to trust the AI extraction for financial data.

4. **Forgiving Workflow** - Support iteration and refinement. Users can preview, adjust, and re-extract without penalty. No destructive actions without confirmation.

---

## User Interface Design Goals

**Platform & Screens:**
- **Platform:** Web application (desktop and tablet browsers)
- **Core Screens:**
  - Template Management (list, create/edit template)
  - Document Processing (upload, template selection, extraction)
  - Results Preview (flat table view with header fields repeated per detail row)
  - Export (download configuration)

**Key Interaction Patterns:**
- **Wizard-style flow** for first-time template creation (guided field definition)
- **Flat table preview** showing denormalized output (header info repeated on each detail row, ready for Excel)
- **Sortable/filterable columns** for reviewing extracted data
- **Inline editing capability** for prompt refinement without leaving preview
- **Visual confidence indicators** (color-coded rows: green=high, yellow=medium, orange=low)
- **Drag-and-drop file upload** with clear file type/size feedback

**Design Constraints:**
- Must work in latest versions of Chrome, Firefox, Safari, Edge
- ShadCN component library for consistent, accessible UI components
- Tailwind CSS for responsive layouts
- No mobile phone support required (desktop/tablet only)
- Standard browser accessibility (no specific WCAG compliance for MVP)

---

## Epic List

**Epic 1: Project Foundation & Template Management with AI-Assisted Creation**
- **Goal:** Establish development infrastructure and deliver intelligent template creation/management capabilities with AI field discovery and prompt testing
- **Estimated Stories:** 9-10 stories
- **Delivers:**
  - Working Next.js application deployed to Vercel
  - Supabase database configured and connected
  - Claude Skills API integration for template creation features
  - Template builder UI with AI-assisted field discovery
  - Sample document upload and AI field suggestion
  - Prompt testing capability during template creation
  - Template storage and retrieval functionality
  - Users can define fields, set header vs. detail categorization, add custom AI prompts
  - Users can validate templates with sample documents before production use
  - Foundation for Epic 2 (infrastructure, database, UI framework, AI integration established)

**Epic 2: Production Document Processing & Excel Export**
- **Goal:** Deliver complete production document-to-Excel extraction workflow with iterative refinement
- **Estimated Stories:** 8-9 stories
- **Delivers:**
  - Production document upload interface (PDF, Word, text files)
  - Template selection and application to production documents
  - AI extraction engine producing flat/denormalized output
  - Results preview table with confidence scoring
  - Iterative refinement workflow (adjust prompts, re-extract)
  - Excel (.xlsx) export with metadata and confidence scores
  - Complete end-to-end user journey from upload to Excel download

**Total Estimated Stories:** 17-19 stories

> **Note:** Detailed epic breakdown with full story specifications is available in [epics.md](./epics.md)

---

## Out of Scope

**Features Deferred to Future Phases:**

- **Database output** - Excel-only export for MVP; direct database integration planned for Phase 2
- **Batch processing** - Multiple file upload and processing deferred to Phase 2
- **Template versioning and history** - Template change tracking deferred to Phase 2
- **Advanced validation rules** - Beyond confidence scoring; custom cross-field validation for Phase 2
- **User authentication and multi-user support** - Single-user tool for MVP; multi-user planned for Phase 2
- **Template sharing/export/import** - Template portability features deferred
- **Advanced error handling and retry mechanisms** - Basic error handling only for MVP
- **Reporting and analytics dashboards** - Usage analytics and extraction quality reporting deferred
- **Email integration** - Automated document ingestion from email systems (long-term vision)
- **API integration** - Programmatic access to extraction capabilities (long-term vision)

**Platform Limitations:**

- **Mobile phone support** - Desktop and tablet only; mobile UI not required
- **Multi-language support** - English documents only for MVP
- **Offline capability** - Cloud-based processing only; no offline mode

**Scope Boundaries:**

- **Document types beyond 6 categories** - MVP supports Invoices, Estimates, Equipment Logs, Timesheets, Consumable Logs, and Generic Documents only
- **Real-time collaboration** - Single-user editing only; concurrent editing deferred
- **Advanced AI model selection** - Claude Skills API only; no model switching or custom model support
