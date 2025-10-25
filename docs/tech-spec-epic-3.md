# Technical Specification: Unified Batch Extraction Workflow

Date: 2025-10-24
Author: Steve
Epic ID: 3
Status: Ready for Review
Version: 1.0

---

## Overview

This technical specification details the implementation of Epic 3: Unified Batch Extraction Workflow, which transforms MMDocScan from a single-file processing tool into an enterprise-grade batch extraction platform. Building on the foundation established in Epics 1 and 2 (19 stories complete), this epic delivers a unified single-page workflow enabling users to process 1-100 files simultaneously with automatic document detection, custom metadata columns, and polished results presentation. The implementation achieves a 97.5% reduction in clicks for batch processing (120 clicks → 3 clicks for 20 files) while maintaining system performance and data quality.

The epic consists of 30 stories organized across 7 implementation phases over 8 weeks, following a progressive enhancement strategy from basic infrastructure (resizable panels, tag-based template builder) through batch processing capabilities (multi-file upload, auto-detection algorithm, concurrent extraction queue) to advanced features (AI-assisted template creation, custom columns, Excel export options) and production polish (table virtualization, accessibility compliance, error handling).

## Objectives and Scope

**In Scope:**

- Single-page unified interface with resizable left (configuration) and right (results) panels
- Tag-based template builder with drag-and-drop field reordering using @dnd-kit
- Multi-file upload (1-100 PDFs) with aggregate statistics and file management
- PDF parsing service with pdf-parse library for text extraction and metadata
- Aggressive auto-detection algorithm to identify document boundaries within multi-document PDFs
- Batch extraction queue with p-limit rate limiting (max 5 concurrent Claude API calls)
- Real-time progress tracking with per-file status updates and polling UI
- Results table with source tracking (file + page number), sortable columns, and filtering
- Static custom columns for batch metadata (Batch ID, Department, etc.)
- AI-assisted template creation via Claude API with field suggestions from sample documents
- Excel export with two options: separate sheets per source file or single combined sheet
- Table virtualization with react-window for smooth rendering of 1000+ rows
- Frozen header row and always-visible horizontal scrollbar for UX optimization
- Panel maximize/minimize controls with localStorage persistence
- Comprehensive error handling for edge cases (large batches, malformed PDFs, API rate limits)
- Session persistence with user-configurable retention settings (0-365 days)
- Accessibility compliance (WCAG 2.1 AA) with keyboard navigation and screen reader support

**Out of Scope (Deferred to Phase 2.0):**

- Formula-based custom columns (only static values in MVP)
- Grouped/hierarchical extraction (Building → Unit → Room structure)
- Manual document merge/split UI for auto-detection refinement
- Template field presets library
- Template version history and rollback
- Real-time collaboration features
- Background job processing for batches >100 files

## System Architecture Alignment

This specification aligns with the technical implementation plan v1.0 and extends the existing MMDocScan architecture established in Epics 1-2:

**Component Integration:**
- Extends existing Next.js 14 App Router with new `/extract` route for unified workflow
- Reuses Supabase PostgreSQL database with three new tables: `extraction_sessions`, `extraction_results`, `user_settings`
- Leverages existing Claude API integration (Anthropic SDK) with enhanced batch processing logic
- Maintains existing authentication and RLS policies pattern from Epic 1

**New Architectural Components:**
- **State Management:** Zustand store replaces component-level state for global extraction workflow state
- **Resizable UI:** react-resizable-panels for draggable panel divider and maximize/minimize controls
- **Drag-and-Drop:** @dnd-kit/core for accessible field tag reordering
- **Table Virtualization:** react-window for performance with 1000+ result rows
- **PDF Processing:** pdf-parse service layer for text extraction and document detection
- **Batch Queue:** p-limit concurrency control for Claude API rate limiting
- **Excel Generation:** exceljs library for flexible export formats

**Constraints Respected:**
- Serverless deployment on Vercel (existing)
- API routes remain stateless; session state stored in Supabase
- Bundle size optimization via code splitting and tree shaking
- Performance targets: Page load <2s, table render <1s for 1000 rows, API P95 <3s
- Security: All database queries through RLS policies, no arbitrary code execution in formula evaluator (deferred feature)

## Detailed Design

### Services and Modules

| Module | Responsibility | Key Inputs | Key Outputs | Owner Phase |
|--------|---------------|------------|-------------|-------------|
| **PDFParser** | Extract text and metadata from PDF files | File (PDF Buffer) | { pages: Page[], metadata: { pageCount, title, author } } | Phase 2 (Story 3.9) |
| **DocumentDetector** | Identify document boundaries in multi-document PDFs using heuristics | pages: Page[] | DetectedDocument[] with startPage, endPage, confidence | Phase 2 (Story 3.10) |
| **BatchProcessor** | Orchestrate batch extraction workflow, manage session state | template, files[], customColumns | sessionId (UUID) | Phase 2 (Story 3.11) |
| **ExtractionQueue** | Rate-limited parallel extraction with p-limit | detectedDocuments[], template, prompt | ExtractedRow[] with confidence scores | Phase 2 (Story 3.12) |
| **ExcelExporter** | Generate .xlsx files with separate/combined sheet options | results: ExtractedRow[], template, customColumns, options | Excel Buffer (ArrayBuffer) | Phase 5 (Story 3.22) |
| **ExtractionStore (Zustand)** | Global state management for extraction workflow | User actions (addField, reorderFields, etc.) | React state updates | Phase 1 (Story 3.1) |
| **TemplateBuilder Component** | Tag-based UI for field definition with drag-and-drop | Field array, user interactions | Updated fields, prompt text | Phase 1 (Story 3.2-3.3) |
| **FileUploader Component** | Multi-file upload with react-dropzone | File objects from browser | UploadedFile[] with metadata | Phase 2 (Story 3.8) |
| **ResultsTable Component** | Virtualized table with react-window, frozen header, scrollbars | ExtractedRow[], customColumns | Rendered table with sorting/filtering | Phase 6 (Story 3.23-3.24) |
| **CustomColumnsPanel Component** | UI for adding static custom columns | Column configuration | CustomColumn[] stored in state | Phase 3 (Story 3.15) |
| **AIInspectModal Component** | Modal for AI field suggestions from sample document | Sample PDF, user selections | Suggested fields, prompt | Phase 4 (Story 3.19-3.20) |

### Data Models and Contracts

**Core Types (TypeScript):**

```typescript
// Template Models
interface Template {
  id: string
  name: string
  fields: TemplateField[]
  extraction_prompt: string
  user_id: string
  created_at: Date
  updated_at: Date
}

interface TemplateField {
  id: string
  name: string
  instructions?: string
  order: number
}

// File Upload Models
interface UploadedFile {
  id: string
  file: File
  filename: string
  size: number
  pageCount?: number
  detectedDocuments?: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  errorMessage?: string
}

// Custom Columns Models
interface CustomColumn {
  id: string
  name: string
  type: 'static'  // 'formula' deferred to Phase 2.0
  value: string
  order: number
}

// Extraction Session Models
interface ExtractionSession {
  id: string
  user_id: string
  template_id?: string
  template_snapshot: Template  // Template state at extraction time
  files: UploadedFile[]
  custom_columns: CustomColumn[]
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number  // 0-100
  created_at: Date
  completed_at?: Date
  error_message?: string
}

// Extraction Results Models
interface ExtractionResult {
  id: string
  session_id: string
  file_id: string
  source_file: string
  page_number: number
  detection_confidence: number  // 0.0-1.0
  extracted_data: Record<string, any>
  raw_api_response?: string
  created_at: Date
}

// PDF Processing Models
interface Page {
  pageNumber: number
  text: string
  height: number
  width: number
}

interface DetectedDocument {
  startPage: number
  endPage: number
  pageCount: number
  confidence: number  // 0.0-1.0
}

// UI State Model (Zustand Store)
interface ExtractionStore {
  // Template State
  templateMode: 'new' | 'existing'
  selectedTemplate: Template | null
  fields: TemplateField[]
  extractionPrompt: string
  isDirty: boolean

  // File State
  uploadedFiles: UploadedFile[]

  // Custom Columns State
  customColumns: CustomColumn[]

  // Session State
  currentSession: ExtractionSession | null
  results: ExtractionResult[]

  // UI State
  leftPanelSize: number
  rightPanelSize: number
  isProcessing: boolean

  // Actions (method signatures)
  addField: (field: Omit<TemplateField, 'id' | 'order'>) => void
  reorderFields: (startIndex: number, endIndex: number) => void
  startExtraction: () => Promise<void>
  // ... (30+ action methods)
}
```

**Database Schemas (Supabase PostgreSQL):**

```sql
-- Templates table (extends Epic 1 schema)
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  fields JSONB NOT NULL,  -- Array of TemplateField
  extraction_prompt TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Extraction sessions table
CREATE TABLE extraction_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
  template_snapshot JSONB NOT NULL,
  files JSONB NOT NULL,
  custom_columns JSONB,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  error_message TEXT
);

-- Extraction results table
CREATE TABLE extraction_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES extraction_sessions(id) ON DELETE CASCADE,
  file_id VARCHAR(255) NOT NULL,
  source_file VARCHAR(255) NOT NULL,
  page_number INTEGER NOT NULL,
  detection_confidence DECIMAL(3,2),
  extracted_data JSONB NOT NULL,
  raw_api_response TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User settings table
CREATE TABLE user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  session_retention_days INTEGER DEFAULT 7,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_sessions_user_id ON extraction_sessions(user_id);
CREATE INDEX idx_sessions_status ON extraction_sessions(status);
CREATE INDEX idx_sessions_created_at ON extraction_sessions(created_at DESC);
CREATE INDEX idx_results_session_id ON extraction_results(session_id);
CREATE INDEX idx_results_source_file ON extraction_results(source_file);
```

### APIs and Interfaces

**Template APIs (Extended from Epic 1):**

```
GET    /api/templates
       Response: Template[]
       Description: List user's saved templates
       Auth: Required (RLS enforced)

POST   /api/templates
       Request: { name: string, fields: TemplateField[], extraction_prompt: string }
       Response: Template
       Validation: Zod schema (name 1-100 chars, min 1 field, prompt 0-2000 chars)

PUT    /api/templates/:id
       Request: Partial<{ name, fields, extraction_prompt }>
       Response: Template
       Validation: Same as POST

DELETE /api/templates/:id
       Response: { success: boolean }

POST   /api/templates/ai-inspect
       Request: FormData (file: PDF)
       Response: { suggestedFields: Field[], suggestedPrompt: string }
       Description: AI analyzes sample document and suggests extractable fields
       Constraints: File <10MB, PDF only, timeout 30s
```

**Extraction APIs (New in Epic 3):**

```
POST   /api/extractions/batch
       Request: {
         template: Template,
         files: File[],  // Base64 encoded
         customColumns: CustomColumn[]
       }
       Response: { sessionId: string }
       Description: Start batch extraction, creates session
       Processing: Async background processing with progress updates
       Errors: 400 (validation), 413 (file size), 500 (server error)

GET    /api/extractions/:sessionId/status
       Response: {
         status: 'pending' | 'processing' | 'completed' | 'failed',
         progress: number,  // 0-100
         filesProcessed: number,
         totalFiles: number,
         perFileStatus: FileStatus[]
       }
       Description: Poll extraction progress
       Polling: Frontend polls every 2 seconds until completed/failed

GET    /api/extractions/:sessionId/results
       Response: ExtractionResult[]
       Description: Fetch all extraction results for session
       Constraints: Session must be 'completed' status

POST   /api/extractions/:sessionId/export
       Request: { format: 'separate' | 'combined' }
       Response: File (Excel .xlsx)
       Headers: Content-Disposition, Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
       Description: Generate and download Excel file
```

**Settings APIs (New in Epic 3):**

```
GET    /api/settings
       Response: { session_retention_days: number }
       Description: Get user settings

PUT    /api/settings
       Request: { session_retention_days: number }
       Response: { success: boolean }
       Validation: 0-365 days
```

### Workflows and Sequencing

**Primary Workflow: Batch Extraction (Stories 3.1-3.14, 3.21-3.22)**

```
Actor: User
Actor: Frontend (React/Zustand)
Actor: API Routes (Next.js)
Actor: Services (PDFParser, DocumentDetector, ExtractionQueue)
Actor: Claude API
Actor: Database (Supabase)

1. User navigates to /extract page
   → Frontend: Loads ExtractPage with ResizablePanels
   → Frontend: Initializes Zustand store (loads panel sizes from localStorage)

2. User configures template
   2a. User selects "New template" mode
   → Frontend: Shows FieldTagsArea with "+ Add field" button

   2b. User adds fields via tags
   → User clicks "+ Add field" → FieldEditModal opens
   → User enters field name, optional instructions → Saves
   → Frontend: Updates fields array in Zustand (addField action)

   2c. User reorders fields via drag-and-drop
   → User drags field tag with @dnd-kit
   → Frontend: Updates field order in Zustand (reorderFields action)

   2d. User enters extraction instructions
   → User types in ExtractionInstructionsTextarea
   → Frontend: Updates extractionPrompt in Zustand

3. User uploads files
   → User drags 20 PDF files into FileUploader dropzone
   → Frontend: Validates file types, sizes (react-dropzone)
   → Frontend: Stores files in Zustand (addFiles action)
   → Frontend: Displays file list with metadata placeholders

4. User adds custom columns (optional)
   → User clicks "+ Add Column" in CustomColumnsPanel
   → CustomColumnModal opens with "Static Value" type
   → User enters name="Batch ID", value="Q1-2024"
   → Frontend: Updates customColumns in Zustand (addCustomColumn action)

5. User starts extraction
   → User clicks "Start Extraction" button
   → Frontend: Calls startExtraction() Zustand action
   → Frontend → API: POST /api/extractions/batch with { template, files, customColumns }

   5a. API processes request
   → API: Creates extraction_session in Database (status='pending')
   → API: Returns { sessionId } immediately
   → API: Spawns background processing

   5b. Background processing (async)
   → Services/PDFParser: Parses all 20 PDFs in parallel
   → Services/PDFParser: Extracts pages, text, metadata
   → Services/DocumentDetector: Runs auto-detection on each file
   → Services/DocumentDetector: Identifies 47 total documents across 20 files
   → API: Updates session progress=10%, files JSONB with detection results

   5c. Extraction queue processing
   → Services/ExtractionQueue: Creates 47 extraction tasks
   → Services/ExtractionQueue: Uses p-limit (max 5 concurrent)
   → For each detected document:
     → Services/ExtractionQueue: Extracts page text
     → Services/ExtractionQueue → Claude API: Sends template + prompt + text
     → Claude API: Returns structured JSON with field values
     → Services/ExtractionQueue: Calculates confidence score
     → Services/ExtractionQueue: Stores in extraction_results table
     → API: Updates session progress incrementally
   → Services/ExtractionQueue: Applies customColumns to each result row
   → API: Updates session status='completed', progress=100%

6. Frontend displays progress
   → Frontend: Polls GET /api/extractions/:sessionId/status every 2s
   → Frontend: Updates ProgressUI with overall progress bar
   → Frontend: Shows per-file status list with detection results
   → Frontend: When status='completed', stops polling

7. Frontend loads results
   → Frontend: Calls GET /api/extractions/:sessionId/results
   → API → Database: Fetches all extraction_results for session
   → API: Returns ExtractedRow[] (47 rows)
   → Frontend: Updates results in Zustand
   → Frontend: Renders ResultsTable in right panel

8. User reviews results
   → User scrolls through virtualized table (react-window)
   → User sorts by "Amount" column (descending)
   → User filters to "Show Low-Confidence Only"
   → User reviews 3 low-confidence rows (<0.7)

9. User exports to Excel
   → User clicks "Export to Excel" button
   → ExportOptionsModal opens with radio buttons
   → User selects "Separate sheets per source file"
   → User clicks "Export"
   → Frontend → API: POST /api/extractions/:sessionId/export with { format: 'separate' }
   → API → Services/ExcelExporter: Calls generateExcelFile()
   → Services/ExcelExporter: Groups results by source_file (20 sheets)
   → Services/ExcelExporter: Generates Excel with exceljs
   → Services/ExcelExporter: Returns Buffer
   → API: Returns file with Content-Disposition header
   → Frontend: Triggers browser download
   → User: Opens Excel file, verifies data

10. Session cleanup (background, periodic)
    → Database: Cron job runs daily
    → Database: Deletes extraction_sessions where created_at < (now() - retention_days)
    → Database: CASCADE deletes extraction_results via foreign key
```

**Secondary Workflow: AI-Assisted Template Creation (Stories 3.18-3.20)**

```
1. User clicks "AI Inspect File" button in template section
2. File picker opens (PDF only, <10MB)
3. User selects sample invoice PDF
4. Frontend shows "Analyzing..." loading state
5. Frontend → API: POST /api/templates/ai-inspect with FormData
6. API → Services/PDFParser: Extracts first page text
7. API → Claude API: Sends prompt "Analyze this document and suggest extractable fields"
8. Claude API: Returns { suggestedFields, suggestedPrompt }
9. API: Returns suggestions to frontend
10. AIInspectModal opens with:
    - Suggested fields list with checkboxes (all checked)
    - Field names editable inline (double-click)
    - AI explanations per field
    - Suggested prompt in editable textarea
11. User unchecks "Tax Amount" (not needed)
12. User edits field name "Invoice #" → "Invoice Number"
13. User clicks "Add Selected (4)"
14. Frontend: Checks if user already has prompt
15. Frontend: Shows PromptMergeDialog (existing prompt detected)
16. User selects "Append AI suggestions"
17. Frontend: Appends AI prompt to existing prompt
18. Frontend: Adds 4 selected fields to fields array (no duplicates)
19. Frontend: Updates Zustand state
20. Frontend: Closes modal, user sees updated fields and prompt
```

## Non-Functional Requirements

### Performance

**Target Metrics (Per Requirements v1.2, Technical Plan v1.0):**

| Metric | Target | Measurement Method | Story |
|--------|--------|-------------------|-------|
| Page Load Time | <2 seconds | Lighthouse Performance, Core Web Vitals (LCP) | 3.30 |
| Template Switch | <500ms | Performance.now() measurement | 3.2 |
| File Upload Feedback | <100ms | React state update timing | 3.8 |
| API Response Time (P95) | <3 seconds | Vercel Analytics, custom middleware | 3.11-3.12 |
| Batch Processing (20 files, 100 pages) | <3 minutes | End-to-end timing (upload → results) | 3.12-3.14 |
| Results Table Initial Render (1000 rows) | <1 second | React DevTools Profiler | 3.23 |
| Table Scroll Performance | 60fps | Chrome DevTools Performance tab | 3.23 |
| Excel Export Generation (1000 rows) | <5 seconds | API route timing | 3.22 |

**Performance Strategies:**

- **Code Splitting:** Dynamic imports for heavy components (ExcelExporter, PDFParser)
- **Tree Shaking:** ES6 modules, eliminate unused code from react-window, @dnd-kit
- **Bundle Optimization:** Next.js automatic code splitting per route, minimal JavaScript for /extract
- **Virtualization:** react-window renders only visible rows (~70 DOM nodes for 1000+ rows)
- **Lazy Loading:** Images with Next.js Image component, defer non-critical assets
- **Caching:** API responses cached where appropriate (templates list with SWR)
- **Parallel Processing:** PDF parsing uses Promise.all for concurrent file processing
- **Rate Limiting:** p-limit (max 5 concurrent Claude API calls) prevents system overload
- **Database Indexing:** Indexes on user_id, session_id, status, created_at for fast queries

**Performance Testing (Story 3.30):**

- Load test: 100 concurrent users with k6 or Artillery
- Stress test: 100 files in single batch, measure degradation
- Table rendering: 10,000 rows, verify 60fps scroll
- Excel export: 10,000 rows, verify <10s generation

### Security

**Authentication & Authorization (Inherited from Epics 1-2):**

- Supabase Auth integration with JWT tokens
- Row Level Security (RLS) policies enforce user_id isolation
- All API routes validate auth.uid() via Supabase client
- Session hijacking prevention: HTTPOnly cookies, CSRF tokens

**Data Protection:**

- **Extraction Data:** Stored in extraction_results.extracted_data JSONB column, protected by RLS
- **File Uploads:** Client-side only during upload, not persisted to disk, Base64 encoded for API transmission
- **Template Data:** templates table with RLS policies, unique constraint on (user_id, name)
- **Session Data:** extraction_sessions protected by RLS, CASCADE DELETE on user deletion
- **Sensitive Fields:** No PII logged to console or monitoring services

**Input Validation:**

- Zod schemas for all API request bodies (templates, extractions, settings)
- File type validation: MIME type checking, magic number verification
- File size limits: 10MB per file, 100MB total batch size
- SQL Injection: Parameterized queries via Supabase client, no raw SQL
- XSS Prevention: React auto-escapes JSX, DOMPurify for any dangerouslySetInnerHTML

**API Security:**

- Rate Limiting: Vercel Edge Middleware, per-IP throttling for /api/templates/ai-inspect
- CORS: Strict origin validation, no wildcard allowed
- Error Handling: Generic error messages to clients, detailed logs to monitoring
- Secrets Management: Environment variables for API keys, never committed to repo

**Third-Party API Security:**

- Claude API Key: Stored in ANTHROPIC_API_KEY env var, server-side only
- API calls: Always from API routes (server-side), never from client
- Error messages: Sanitize Claude API responses, remove sensitive prompts from logs

**Threat Mitigation:**

| Threat | Mitigation | Story |
|--------|-----------|-------|
| Malicious PDF upload | File type validation, size limits, sandboxed parsing | 3.9 |
| Formula injection (future) | Safe expression evaluator, no eval(), whitelist functions | Deferred |
| Rate limit abuse | p-limit queue, exponential backoff, user quotas | 3.12 |
| Data exfiltration | RLS policies, audit logs, session expiry | 3.28 |

### Reliability/Availability

**Availability Target:** 99.5% uptime (inherited from Vercel SLA)

**Error Handling Strategies (Story 3.27):**

- **Malformed PDFs:** Graceful degradation, continue with other files, show error badge
- **Claude API Failures:** Retry logic with exponential backoff (3 attempts), queue remaining
- **Network Errors:** Retry with jittered backoff, fallback to error state, allow re-extraction
- **Database Errors:** Connection pooling, transaction rollback, user-friendly error messages
- **Browser Tab Close:** Save session ID to localStorage, resume on return

**Degradation Behavior:**

- **Auto-Detection Failures:** Fallback to single-document mode, show warning
- **API Rate Limits:** Pause processing, show ETA message, resume automatically
- **Low Disk Space:** N/A (serverless, no persistent storage)
- **Memory Limits:** Streaming PDF parsing, limit batch size to 100 files

**Recovery Mechanisms:**

- **Session Recovery:** localStorage stores sessionId, user can resume extraction
- **Partial Results:** Save completed extractions even if batch fails mid-processing
- **Re-extraction:** User can adjust prompts and re-run extraction on same files
- **Manual Cleanup:** User settings page allows deleting old sessions

**Data Integrity:**

- **Atomic Operations:** Database transactions for session creation + results insertion
- **Confidence Scores:** Track extraction quality, flag low-confidence rows
- **Source Traceability:** Every result links to source_file + page_number
- **Template Snapshots:** template_snapshot JSONB preserves template state at extraction time

**Monitoring & Alerts (Story 3.30):**

- **Error Rate:** Alert if API error rate >5% in 5-minute window
- **Batch Failures:** Alert if batch processing failure rate >10%
- **API Response Time:** Alert if P95 latency >5 seconds
- **Database Connections:** Alert on connection pool exhaustion

### Observability

**Logging Requirements:**

- **Structured Logs:** JSON format with timestamp, level, message, context
- **Log Levels:** DEBUG (development), INFO (production), WARN (degradation), ERROR (failures)
- **Correlation IDs:** sessionId for batch processing, requestId for API calls
- **Sensitive Data:** Redact extracted_data from logs, log only field names + types

**Logging Targets (Story 3.30):**

- **Development:** Console.log with colors, verbose debugging
- **Production:** Winston or Pino, structured JSON logs to Vercel/Sentry

**Key Log Points:**

| Event | Level | Context | Story |
|-------|-------|---------|-------|
| Batch extraction started | INFO | sessionId, fileCount, templateId | 3.11 |
| PDF parsing error | WARN | sessionId, filename, error | 3.9 |
| Auto-detection completed | INFO | sessionId, filename, documentCount, confidence | 3.10 |
| Claude API call | DEBUG | sessionId, documentId, prompt_length, response_time | 3.12 |
| Claude API error | ERROR | sessionId, documentId, error, retry_count | 3.12 |
| Extraction completed | INFO | sessionId, totalRows, processingTime | 3.12 |
| Excel export generated | INFO | sessionId, format, rowCount, fileSize | 3.22 |
| Session cleanup | INFO | deletedSessions, retentionDays | 3.28 |

**Metrics (Vercel Analytics + Custom):**

- **Performance Metrics:** Page load time, API latency (P50, P95, P99), table render time
- **Business Metrics:** Extractions per day, files per batch (avg/max), success rate
- **Resource Metrics:** API call count, database query count, memory usage
- **User Metrics:** Active users, templates created, sessions per user

**Tracing:**

- **Frontend:** React DevTools, Zustand DevTools for state inspection
- **Backend:** Request tracing with unique requestId, Supabase query logging
- **Claude API:** Log request/response metadata (not full content for privacy)

**Error Tracking (Sentry Integration):**

- React error boundaries capture UI errors
- API route errors logged with stack traces
- User context attached to error reports (user_id, sessionId)
- Source maps for production debugging

## Dependencies and Integrations

**New Dependencies for Epic 3 (from Technical Plan v1.0):**

| Package | Version | Purpose | Story | Bundle Impact |
|---------|---------|---------|-------|---------------|
| `react-resizable-panels` | ^2.0.0 | Draggable panel divider, maximize/minimize | 3.1 | +15KB |
| `@dnd-kit/core` | ^6.1.0 | Accessible drag-and-drop for field tags | 3.3 | +25KB |
| `@dnd-kit/sortable` | ^8.0.0 | Sortable list integration with @dnd-kit | 3.3 | +10KB |
| `@dnd-kit/utilities` | ^3.2.2 | Helper utilities for @dnd-kit | 3.3 | +5KB |
| `zustand` | ^4.5.0 | Global state management | 3.1 | +8KB |
| `pdf-parse` | ^1.1.1 | PDF text extraction (server-side) | 3.9 | N/A (server) |
| `@types/pdf-parse` | ^1.1.4 | TypeScript types for pdf-parse | 3.9 | Dev only |
| `p-limit` | ^5.0.0 | Concurrency control for Claude API | 3.12 | +2KB |
| `react-window` | ^1.8.10 | Table virtualization for performance | 3.23 | +12KB |
| `@types/react-window` | ^1.8.8 | TypeScript types for react-window | 3.23 | Dev only |

**Existing Dependencies (from Epics 1-2, Reused in Epic 3):**

| Package | Version | Epic 3 Usage |
|---------|---------|-------------|
| `next` | ^14.2.0 | App Router for /extract page |
| `react` | ^18.2.0 | Component framework |
| `@supabase/supabase-js` | ^2.75.1 | Database client for new tables |
| `@anthropic-ai/sdk` | ^0.67.0 | Claude API for batch extraction |
| `react-dropzone` | ^14.3.8 | Multi-file upload UI |
| `exceljs` | ^4.4.0 | Excel export generation |
| `zod` | ^4.1.12 | API request validation |
| `@radix-ui/*` | Various | ShadCN components (dialogs, radio, etc.) |

**External Integrations:**

| Service | Integration Point | Authentication | Rate Limits | Story |
|---------|------------------|----------------|-------------|-------|
| **Anthropic Claude API** | POST https://api.anthropic.com/v1/messages | API Key (server-side) | Tier-dependent, mitigated with p-limit | 3.12 |
| **Supabase Database** | PostgreSQL via @supabase/supabase-js | JWT tokens, RLS policies | Connection pooling managed by Supabase | 3.11 |
| **Vercel Platform** | Serverless deployment | N/A | Function execution timeout: 10s (hobby), 60s (pro) | All |

**Bundle Size Analysis (from Technical Plan):**

- **Total Bundle Size Target:** <200KB gzipped for /extract route
- **Code Splitting:** Heavy libraries (exceljs, pdf-parse) loaded dynamically
- **Tree Shaking:** ES6 imports ensure unused code eliminated
- **Lighthouse Budget:** First Load JS <170KB

**Version Constraints:**

- **Next.js:** ^14.2.0 (App Router required)
- **React:** ^18.2.0 (Concurrent features for react-window)
- **Node.js:** >=18.0.0 (Vercel runtime)
- **TypeScript:** ^5.3.0 (Strict mode enabled)

**Breaking Changes from Epic 2:**

- None (Epic 3 is additive, no breaking changes to Epic 1-2 functionality)

## Acceptance Criteria (Authoritative)

**Consolidated from Requirements v1.2 and Epic 3 breakdown (30 stories):**

### AC1: Unified Page Layout (Story 3.1)
1.1. New `/extract` route with left (configuration) and right (results) panels
1.2. Panels resizable via draggable divider (react-resizable-panels)
1.3. Default: Left 300px, right fluid; Min widths: Left 250px, Right 600px
1.4. Panel sizes persist to localStorage
1.5. Maximize buttons: Left "◀" minimizes right, Right "▶" minimizes left
1.6. Click minimized bar restores panel to previous size

### AC2: Tag-Based Template Builder (Stories 3.2-3.3)
2.1. Template section shows mode toggle (New/Load existing)
2.2. Fields displayed as horizontal chip tags with drag handles (⠿)
2.3. Each tag shows: field name, notes indicator (📝 if instructions exist), delete [×]
2.4. Drag-and-drop field reordering with @dnd-kit (visual drop zones, smooth animation)
2.5. Click tag opens Field Edit Modal (name input, instructions textarea 0-500 chars)
2.6. Keyboard navigation: Arrow up/down to reorder focused tag
2.7. "Save Template" button context-aware (Save/Update with • dirty indicator)

### AC3: Batch File Upload (Stories 3.6, 3.8)
3.1. Multi-file upload accepts 1-100 PDF files via drag-and-drop or click-to-browse
3.2. File list shows: filename, size, page count, status indicator
3.3. Remove button [×] per file
3.4. "+ Add more files" button to append additional files
3.5. Aggregate stats displayed: "X files, Y total pages, Z MB"
3.6. Max 100 files with validation error if exceeded
3.7. Max total size 100MB with validation error if exceeded

### AC4: PDF Parsing and Auto-Detection (Stories 3.9-3.10)
4.1. PDFParser service extracts text, metadata (pageCount, title) from PDFs
4.2. DocumentDetector identifies document boundaries using AGGRESSIVE strategy
4.3. Heuristics: 1+ indicator triggers split (page boundary, invoice keyword, number pattern, date pattern)
4.4. Returns DetectedDocument[] with startPage, endPage, confidence (0.0-1.0)
4.5. Fallback: If no indicators, treat entire file as single document
4.6. Performance: Parse 100 pages in <5 seconds
4.7. Error handling: Corrupted PDFs show error badge, continue with other files

### AC5: Batch Extraction API (Stories 3.11-3.12)
5.1. `POST /api/extractions/batch` creates extraction_session, returns { sessionId }
5.2. Background processing: Parse all PDFs in parallel, run auto-detection
5.3. ExtractionQueue uses p-limit (max 5 concurrent Claude API calls)
5.4. For each detected document: Extract text → Call Claude API → Store result
5.5. Calculate confidence score per row (field completeness × type validity)
5.6. Update session progress incrementally (0-100%)
5.7. Handle errors: Retry logic with exponential backoff (3 attempts), continue with remaining
5.8. Performance: Process 20 files (50 documents) in <3 minutes

### AC6: Progress Tracking UI (Story 3.13)
6.1. Right panel shows "Processing" state during extraction
6.2. Overall progress bar: "Processing 67% (4/6 files)"
6.3. Per-file status list: ✓ (complete), ⟳ (processing), ⏸ (queued), ✗ (failed)
6.4. Detection results shown: "Detected 3 invoices on pages 1, 4, 7"
6.5. Frontend polls `GET /api/extractions/:sessionId/status` every 2 seconds
6.6. Status endpoint returns: status, progress, filesProcessed, totalFiles, perFileStatus[]
6.7. Auto-stop polling when status='completed' or 'failed'

### AC7: Results Table with Source Tracking (Story 3.14)
7.1. Results table shows data from all detected documents in unified view
7.2. Source column format: "File1-P1" (file abbreviation + page number)
7.3. Tooltip on source cell shows full filename: "invoices_batch1.pdf - Page 1 of 12"
7.4. All template fields shown as columns, sortable by clicking header
7.5. Filter by source file via dropdown
7.6. Row count displayed: "47 documents extracted from 20 files"

### AC8: Custom Columns (Stories 3.15-3.17)
8.1. CustomColumnsPanel in left panel with "+ Add Column" button
8.2. CustomColumnModal: Column name input, type="Static Value", value input
8.3. Static values applied to all rows
8.4. Custom columns appear in results table with [CUSTOM] badge in header
8.5. Custom columns included in Excel export with proper formatting
8.6. Max 10 custom columns with validation, no duplicate names

### AC9: AI-Assisted Template Creation (Stories 3.18-3.20)
9.1. "AI Inspect File" button opens file picker (PDF only, <10MB)
9.2. `POST /api/templates/ai-inspect` analyzes first page, returns { suggestedFields, suggestedPrompt }
9.3. AIInspectModal shows suggested fields with checkboxes (all checked by default)
9.4. Field names editable inline (double-click), AI explanations displayed
9.5. Suggested prompt editable in textarea
9.6. "Add Selected (N)" button with count
9.7. Prompt merge logic: If existing prompt, show dialog (Replace/Append/Keep)
9.8. Fields merged with no duplicates by name

### AC10: Excel Export Options (Stories 3.21-3.22)
10.1. "Export to Excel" button opens ExportOptionsModal
10.2. Two radio options: "Separate sheets per source file" (default), "Single combined sheet"
10.3. Separate sheets: Groups results by source_file, one sheet per file (max 31 char names)
10.4. Combined sheet: One sheet named "Extraction Results", all data rows
10.5. Both options: Header row styled (bold, light gray background), columns auto-sized
10.6. Include all template fields + custom columns
10.7. Performance: Generate 1000 rows in <5 seconds

### AC11: Table Virtualization and UI Polish (Stories 3.23-3.25)
11.1. ResultsTable uses react-window FixedSizeList (only ~70 DOM nodes for 1000+ rows)
11.2. Header row frozen (position: sticky), remains visible while data scrolls
11.3. Horizontal scrollbar pinned to bottom of results panel, visible immediately
11.4. Scrolling smooth at 60fps
11.5. Initial render <1 second for any dataset size
11.6. Panel maximize/minimize controls work with smooth animation (300ms)

### AC12: Error Handling and Edge Cases (Story 3.27)
12.1. Large batch (100 files): Show warning, allow cancellation
12.2. Malformed PDF: Show error badge per file, continue with others
12.3. Claude API rate limits: Exponential backoff, clear messaging
12.4. Browser tab closed: Save sessionId to localStorage, resume on return
12.5. Network errors: Retry logic (3 attempts), fallback to error state

### AC13: Session Persistence (Story 3.28)
13.1. User settings page at /settings with retention options (0/7/30/90/Custom days)
13.2. Default: 7 days retention
13.3. Cron job deletes expired sessions daily
13.4. Manual cleanup page lists sessions with [Delete] button
13.5. `GET /api/settings`, `PUT /api/settings` endpoints

### AC14: Accessibility (Story 3.29)
14.1. Keyboard navigation: Tab through all interactive elements
14.2. Focus indicators visible (2px blue outline) on all focusable elements
14.3. Screen reader compatible: ARIA labels on icons/buttons, ARIA live regions for progress
14.4. Color contrast ratio ≥4.5:1 for all text (WCAG AA)
14.5. Lighthouse accessibility score ≥95

### AC15: Performance Optimization (Story 3.30)
15.1. Bundle size optimized: Code splitting, tree shaking
15.2. Lighthouse Performance score ≥90
15.3. Load test: 100 concurrent users
15.4. Stress test: 100 files in single batch
15.5. Full regression test suite passing (E2E + integration)

## Traceability Mapping

**Maps Acceptance Criteria → Spec Sections → Components/APIs → Test Strategy**

| AC | Spec Section(s) | Component(s) / API(s) | Test Idea |
|----|----------------|----------------------|-----------|
| **AC1** | System Architecture Alignment → Resizable UI | ExtractPage, ResizablePanels, localStorage | E2E: Drag divider, verify panel sizes persist |
| **AC2** | Detailed Design → TemplateBuilder Component | FieldTag, FieldEditModal, @dnd-kit integration | E2E: Add 5 fields, drag to reorder, verify order in state |
| **AC3** | Detailed Design → FileUploader Component | FileUploadSection, react-dropzone, validation | Unit: Test file size/type validation; E2E: Upload 20 files |
| **AC4** | Detailed Design → Services (PDFParser, DocumentDetector) | PDFParser.ts, DocumentDetector.ts | Unit: Test detection heuristics with sample PDFs (1 doc, 3 docs, edge cases) |
| **AC5** | APIs → POST /api/extractions/batch, Services → ExtractionQueue | BatchProcessor.ts, ExtractionQueue.ts, p-limit | Integration: Mock Claude API, verify session creation + queue processing |
| **AC6** | Workflows → Primary Workflow step 6, APIs → GET /api/extractions/:sessionId/status | ProgressUI, polling logic in Zustand | E2E: Start extraction, verify progress updates every 2s |
| **AC7** | Detailed Design → ResultsTable Component, Data Models → ExtractionResult | ResultsTable.tsx, source tracking logic | E2E: Verify source format "File1-P1", tooltip shows full name |
| **AC8** | Detailed Design → CustomColumnsPanel Component, Data Models → CustomColumn | CustomColumnsPanel.tsx, CustomColumnModal.tsx | E2E: Add column "Batch ID"="Q1-2024", verify in table + Excel |
| **AC9** | Workflows → Secondary Workflow, APIs → POST /api/templates/ai-inspect | AIInspectModal.tsx, PromptMergeDialog | Integration: Mock Claude API, verify field suggestions + merge logic |
| **AC10** | APIs → POST /api/extractions/:sessionId/export, Services → ExcelExporter | ExcelExporter.ts, ExportOptionsModal.tsx | Integration: Generate Excel with both options, verify sheet structure |
| **AC11** | NFR → Performance, Detailed Design → ResultsTable (react-window) | ResultsTable with FixedSizeList, frozen header CSS | Performance: Render 10,000 rows, measure FPS with Chrome DevTools |
| **AC12** | NFR → Reliability/Availability, Workflows → Error handling | Error boundaries, retry logic in ExtractionQueue | E2E: Simulate API 500 error, verify retry + graceful degradation |
| **AC13** | Data Models → user_settings, APIs → /api/settings | Settings page, cron job for cleanup | E2E: Set retention to 0 days, verify sessions deleted |
| **AC14** | NFR → Accessibility, Detailed Design → All components | ARIA attributes, keyboard handlers | Accessibility: NVDA screen reader test, keyboard-only navigation |
| **AC15** | NFR → Performance, Detailed Design → Bundle optimization | Dynamic imports, Lighthouse audit | Performance: Load test with k6, bundle size analysis |

## Risks, Assumptions, Open Questions

### Risks

| ID | Risk | Impact | Likelihood | Mitigation | Owner |
|----|------|--------|-----------|-----------|-------|
| **R1** | Claude API Rate Limits | High (blocks batch processing) | Medium | p-limit (max 5 concurrent), exponential backoff on 429 errors, show clear messaging to user | Story 3.12 |
| **R2** | Auto-Detection Inaccuracy | Medium (user frustration, false positives) | Medium-High | AGGRESSIVE strategy (prefer false positives), show confidence scores, allow manual merge/split in Phase 2.0 | Story 3.10 |
| **R3** | PDF Parsing Failures | Medium (some files won't process) | Medium | Test with diverse PDFs, handle errors gracefully (continue with other files), suggest re-saving as PDF/A | Story 3.9 |
| **R4** | Performance Degradation (Large Batches) | Medium (slow processing frustrates users) | Low-Medium | Set expectations (show estimated time), streaming PDF parsing, optimize API payloads, consider background jobs for >50 files | Story 3.12 |
| **R5** | State Management Complexity | Medium (bugs, difficult maintenance) | Low | Zustand with TypeScript (type safety), keep state flat, DevTools for debugging, integration tests for state changes | Story 3.1 |
| **R6** | Scope Creep | High (delays, budget overrun) | Medium | Strict adherence to requirements v1.2, defer enhancements to Phase 2.0, regular stakeholder check-ins, change request process | All |
| **R7** | Resource Availability | High (delays) | Low | 2 developers minimum, cross-train team members, document everything, pair programming for critical features | All |
| **R8** | Third-Party API Changes | Medium (breaking changes) | Low | Pin SDK versions (@anthropic-ai/sdk ^0.67.0), monitor changelog, have fallback to older API version, add integration tests | Story 3.12 |

### Assumptions

| ID | Assumption | Validation | Story |
|----|-----------|-----------|-------|
| **A1** | Users have PDFs <10MB per file, <100MB total batch | User testing, monitoring | 3.8 |
| **A2** | Auto-detection >80% accurate on standard invoices | Test with 50 sample invoices from diverse sources | 3.10 |
| **A3** | Vercel serverless function timeout (60s pro tier) sufficient for batch processing | Background processing model: API returns sessionId immediately, processes async | 3.11 |
| **A4** | Supabase connection pooling handles 100 concurrent users | Load testing with k6 or Artillery | 3.30 |
| **A5** | react-window virtualization handles 10,000+ rows smoothly | Performance testing with mock data | 3.23 |
| **A6** | Static custom columns cover 80% of use cases (formulas deferred) | User interviews, requirements validation | 3.15 |
| **A7** | Zustand state management scales to Epic 3 complexity | Prototype with simplified workflow, validate before Story 3.1 | 3.1 |
| **A8** | pdf-parse library supports majority of PDF formats in the wild | Test with 20 diverse PDFs (scanned, multi-page, encrypted) | 3.9 |

### Open Questions

| ID | Question | Options | Recommendation | Story | Status |
|----|----------|---------|----------------|-------|--------|
| **Q1** | How aggressive should auto-detection be? | Conservative (fewer false positives) vs. Aggressive (catch more cases) | **RESOLVED:** Aggressive - prefer extra breaks over missed breaks. Content won't switch mid-page, use page boundaries as primary indicator. Users can manually merge false positives. | 3.10 | ✅ Resolved (Requirements v1.2) |
| **Q2** | Should custom columns be saved with templates or sessions? | Templates (reusable) vs. Sessions (batch-specific) | **RESOLVED:** Session-only for MVP, preset feature in Phase 2.0. Simplicity over convenience. | 3.15 | ✅ Resolved (Requirements v1.2) |
| **Q3** | What formula syntax to support? (Deferred to Phase 2.0) | Excel-like (=Amount-Tax) vs. JavaScript (Amount - Tax) vs. Custom DSL | **RESOLVED:** Excel-style (=Amount-Tax) - users are familiar with Excel formulas. | Deferred | ✅ Resolved (Requirements v1.2) |
| **Q4** | How to handle Claude API rate limits? | Sequential queue vs. Parallel with p-limit=5 vs. Adaptive throttling | **RESOLVED:** Parallel with p-limit=5, exponential backoff on 429 errors. Fast but controlled. | 3.12 | ✅ Resolved (Technical Plan v1.0) |
| **Q5** | How long to keep extraction sessions? | 7 days (default) vs. 30 days vs. User-configurable | **RESOLVED:** User-configurable (0-365 days, default 7). Max flexibility. | 3.28 | ✅ Resolved (Requirements v1.2) |
| **Q6** | Should we support Word (.docx) in addition to PDF? | PDF only (simpler) vs. PDF + Word (broader support) | **OPEN:** PDF only for MVP (Epic 3). Word support in Phase 2.0 if demand exists. Risk: Word parsing complexity. | 3.9 | 🟡 Deferred to Phase 2.0 |
| **Q7** | Should panel sizes be per-user (database) or per-browser (localStorage)? | localStorage (simple, no DB) vs. Database (cross-device sync) | **OPEN:** localStorage for MVP. Database sync in Phase 2.0 if users request cross-device consistency. Risk: Low user impact. | 3.1 | 🟡 Deferred to Phase 2.0 |

## Test Strategy Summary

**Testing Pyramid (from Technical Plan v1.0):**

```
              E2E Tests (10%)
           Integration Tests (30%)
        Unit Tests (60%)
```

### Unit Tests (60% Coverage Target)

**Test Files:**
- `services/PDFParser.test.ts` - PDF text extraction, metadata parsing
- `services/DocumentDetector.test.ts` - Detection heuristics (1 doc, 3 docs, ambiguous cases)
- `services/ExtractionQueue.test.ts` - p-limit concurrency, retry logic
- `services/ExcelExporter.test.ts` - Separate/combined sheets, formatting
- `lib/validation.test.ts` - Zod schemas, file size/type validation
- `components/FieldTag.test.tsx` - Drag-and-drop, edit modal
- `components/ResultsTable.test.tsx` - Sorting, filtering, virtualization

**Test Framework:** Vitest (fast, Vite-based)

**Example Unit Test Pattern:**
```typescript
describe('DocumentDetector', () => {
  it('detects multiple invoices in single PDF', () => {
    const detector = new DocumentDetector()
    const pages = mockPDFPages.multipleInvoices // 3 invoices
    const documents = detector.detect(pages)
    expect(documents).toHaveLength(3)
    expect(documents[0].startPage).toBe(0)
    expect(documents[1].startPage).toBe(2)
    expect(documents[2].startPage).toBe(5)
  })
})
```

### Integration Tests (30%)

**Test Scenarios:**
- Template CRUD workflow (create → save → load → update)
- Batch extraction flow (upload → parse → detect → extract → results)
- AI inspection integration (sample → Claude API → suggestions → merge)
- Excel export generation (results → ExcelExporter → file download)

**Test Framework:** Vitest + MSW (Mock Service Worker for API mocking)

**Example Integration Test Pattern:**
```typescript
describe('Batch Extraction API', () => {
  it('processes multiple files and stores results', async () => {
    const mockFiles = [createMockFile('invoice1.pdf', 3), createMockFile('invoice2.pdf', 2)]
    const response = await batchExtractionHandler({ template: mockTemplate, files: mockFiles, customColumns: [] })
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.sessionId).toBeDefined()
    // Verify session created in DB
    const session = await supabase.from('extraction_sessions').select().eq('id', data.sessionId).single()
    expect(session.data.status).toBe('processing')
  })
})
```

### E2E Tests (10% - Critical User Journeys)

**Test Scenarios:**
- Complete batch extraction flow (template → upload 5 files → extract → results → export)
- AI-assisted template creation (inspect sample → accept suggestions → save)
- Custom columns workflow (add "Batch ID" → extract → verify in table + Excel)
- Panel resizing and persistence (drag divider → maximize → refresh → verify sizes)

**Test Framework:** Playwright

**Example E2E Test Pattern:**
```typescript
test('complete batch extraction flow', async ({ page }) => {
  await page.goto('/extract')
  // Create template
  await page.click('text=+ Add field')
  await page.fill('input[name="fieldName"]', 'Invoice Number')
  await page.click('text=Save Field')
  // Upload files
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles(['tests/fixtures/invoice1.pdf', 'tests/fixtures/invoice2.pdf'])
  // Start extraction
  await page.click('text=Start Extraction')
  // Wait for results
  await expect(page.locator('text=EXTRACTED DATA')).toBeVisible({ timeout: 60000 })
  // Verify results table
  const rows = page.locator('table tbody tr')
  await expect(rows).toHaveCount(2)
})
```

### Performance Tests

**Metrics:**
- Page load: <2 seconds (Lighthouse)
- Table render (1000 rows): <1 second (React DevTools Profiler)
- API response: <3 seconds P95 (Vercel Analytics)
- Batch processing (20 files): <3 minutes (End-to-end timing)

**Tools:** Playwright + Lighthouse, k6 for load testing

### Accessibility Tests

**Checklist:**
- ✅ Keyboard navigation (Tab through all elements)
- ✅ Screen reader compatibility (NVDA on Windows, VoiceOver on Mac)
- ✅ Color contrast (WCAG AA: ≥4.5:1)
- ✅ ARIA labels (icons, buttons, live regions)
- ✅ Focus management (visible 2px outline)

**Tools:** Lighthouse Accessibility, axe DevTools

### Test Execution Strategy

**Phase 1-2 (Weeks 1-4):**
- Unit tests written alongside implementation
- Integration tests for completed API endpoints
- Manual smoke testing after each story

**Phase 3-6 (Weeks 5-6):**
- E2E tests for critical flows
- Performance baseline measurements
- Accessibility audit begins

**Phase 7 (Weeks 7-8):**
- Full regression test suite
- Load testing (100 concurrent users)
- Stress testing (100 files batch)
- User acceptance testing (3-5 users)
- Final QA and bug fixes

**Definition of Done (Per Story):**
- ✅ All acceptance criteria met
- ✅ Unit tests written and passing
- ✅ Integration tests passing (if applicable)
- ✅ Build passes (zero errors)
- ✅ Lint passes (zero warnings)
- ✅ Manual testing completed
- ✅ Code reviewed and approved
