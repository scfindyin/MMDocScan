# Technical Specification: MMDocScan Complete Solution - Template Management & Document Processing

Date: 2025-10-19
Author: Steve
Epic ID: EPIC-1-2
Status: Final (Open Questions Resolved)

---

## Overview

MMDocScan is a web-based document extraction tool designed for small company internal use, specifically targeting billing validation workflows. The system enables users to create reusable extraction templates, process documents of varying quality (clean PDFs, Word docs, scanned images), and export validated data to Excel with full source traceability. Built on Next.js with Claude Skills API integration, the solution prioritizes extraction accuracy and confidence transparency for financial decision-making.

This technical specification covers both foundational infrastructure (Epic 1) and production processing capabilities (Epic 2), delivering an end-to-end solution for template-driven AI document extraction.

## Objectives and Scope

### In Scope

**Epic 1: Template Management & Foundation**
- Next.js web application setup with Vercel deployment
- Supabase database configuration and schema
- Template builder UI with field definition (name, type, header vs. detail categorization)
- Sample document upload for AI-assisted field discovery
- Claude Skills API integration for template creation
- Custom prompt definition and testing during template creation
- Template storage and retrieval

**Epic 2: Production Document Processing**
- Production document upload interface (PDF, Word, text files)
- Template selection and application workflow
- AI extraction producing flat/denormalized output (header fields repeated per detail row)
- Results preview with confidence scoring and visual indicators
- Iterative prompt refinement and re-extraction
- Excel (.xlsx) export with metadata and confidence scores
- Complete upload-to-download user journey

### Out of Scope

- Database output (Excel-only for MVP)
- Batch processing (single document at a time)
- Template versioning and history
- User authentication and multi-user support
- Mobile phone UI (desktop/tablet only)
- Multi-language document support (English only)
- Real-time collaboration features

## System Architecture Alignment

**Architecture Pattern:** Monolithic Next.js application with serverless API routes and external services (Supabase, Claude Skills API)

**Core Components:**
- **Frontend:** Next.js 14 with React Server Components, ShadCN UI library, Tailwind CSS
- **Backend:** Next.js API routes for serverless functions
- **Database:** Supabase (PostgreSQL) for template storage only
- **AI Integration:** Claude Skills API for extraction and field suggestion
- **File Storage:** None - documents processed in-memory only (future: SharePoint/cloud integration)
- **Deployment:** Vercel for hosting and CI/CD

**Constraints:**
- Browser-based application (Chrome, Firefox, Safari, Edge latest versions)
- Level 2 project complexity: Simple architecture, minimal abstraction, prioritize speed to production
- No complex microservices or distributed systems architecture required
- **Cost Optimization:** Design must stay within Vercel and Supabase free tier limits as long as possible
  - Vercel Free: 100GB bandwidth/month, serverless function execution limits
  - Supabase Free: 500MB database, 2GB bandwidth/month
  - Minimize API calls, optimize database queries
- **Storage Strategy:** No document persistence - all processing in-memory during active session only

## Detailed Design

### Services and Modules

| Module | Responsibility | Technology | Owner |
|--------|---------------|------------|-------|
| **Template Management UI** | Template CRUD, field definition, sample upload, AI field suggestions | Next.js pages/components, ShadCN UI | Frontend |
| **Document Processing UI** | Production upload, template selection, results preview, refinement | Next.js pages/components, ShadCN UI | Frontend |
| **Template API** | Template storage/retrieval, validation | Next.js API routes | Backend |
| **Extraction API** | Document processing orchestration, Claude Skills integration, confidence scoring | Next.js API routes | Backend |
| **Excel Export Service** | Generate .xlsx files with metadata and confidence scores | Frontend (client-side) + ExcelJS library | Frontend |
| **Database Layer** | Template persistence only | Supabase PostgreSQL | Data |

### Data Models and Contracts

**Templates Table**
```sql
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  template_type VARCHAR(50) NOT NULL, -- 'invoice', 'estimate', 'equipment_log', 'timesheet', 'consumable_log', 'generic'
  fields JSONB NOT NULL, -- Array of {name, type, category: 'header'|'detail'}
  custom_prompt TEXT,
  sample_document_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Field structure in JSONB:
-- {
--   "name": "invoice_number",
--   "type": "string" | "number" | "date",
--   "category": "header" | "detail",
--   "description": "optional user description"
-- }
```

**In-Memory Session State** (React state only - no persistence)
```typescript
// Active extraction state (held in React component state during session)
interface ActiveExtractionState {
  uploadedFile: File | null; // Browser File object (in memory)
  templateId: string | null;
  extractedData: ExtractedRow[] | null;
  customPrompt?: string;
}
```

**Note:** No document persistence - files held in browser memory only during active session. If user refreshes page or closes browser, they must re-upload documents.

**Extracted Data Structure** (in-memory/JSONB)
```typescript
interface ExtractedRow {
  rowId: string;
  confidence: number; // 0.0 - 1.0
  fields: Record<string, any>; // Header + detail fields (header repeated per row)
  sourceMetadata: {
    filename: string;
    pageNumber?: number;
    extractedAt: string;
  };
}
```

### APIs and Interfaces

**Template Management APIs**

| Endpoint | Method | Request | Response | Purpose |
|----------|--------|---------|----------|---------|
| `/api/templates` | GET | - | `Template[]` | List all templates |
| `/api/templates` | POST | `{name, type, fields, prompt}` | `Template` | Create template |
| `/api/templates/:id` | GET | - | `Template` | Get template by ID |
| `/api/templates/:id` | PUT | `{name, fields, prompt}` | `Template` | Update template |
| `/api/templates/:id` | DELETE | - | `{success: boolean}` | Delete template |

**Document Processing APIs**

| Endpoint | Method | Request | Response | Purpose |
|----------|--------|---------|----------|---------|
| `/api/extract/suggest-fields` | POST | `{base64Document, documentType, templateType}` | `{suggestedFields: Field[]}` | AI field discovery from sample |
| `/api/extract/test` | POST | `{base64Document, templateId, promptOverride?}` | `{extractedData: ExtractedRow[]}` | Test extraction during template creation |
| `/api/extract/production` | POST | `{base64Document, templateId, promptOverride?}` | `{extractedData: ExtractedRow[]}` | Production extraction |

**Note:**
- Files read from user's file picker, converted to base64 in browser, sent to API
- No file persistence - documents held in memory only during active session
- Excel export handled client-side (ExcelJS in browser)
- If user refreshes page, they must re-upload document

**Claude Skills API Integration**

```typescript
// Internal service wrapper
interface ClaudeSkillsService {
  suggestFields(documentContent: string, documentType: string): Promise<Field[]>;
  extractData(documentContent: string, template: Template, customPrompt?: string): Promise<ExtractedRow[]>;
}

// Request format to Claude Skills API
{
  model: "claude-3-5-sonnet-20241022",
  messages: [{
    role: "user",
    content: [
      {type: "document", source: {type: "base64", media_type: "application/pdf", data: "..."}},
      {type: "text", text: "Extract data according to template: [template JSON]"}
    ]
  }],
  tools: [{name: "extract_data", input_schema: {...}}] // Structured output
}
```

### Workflows and Sequencing

**Workflow 1: Template Creation with AI Assistance**

```
User → Template Builder UI
  ↓
  1. Enter template name and type
  ↓
  2. Select sample document from file picker (held in memory)
  ↓
  3. Read file, encode to base64
  ↓
  4. AI field suggestion → /api/extract/suggest-fields (with base64 doc) → Claude Skills API
  ↓
  5. Review suggested fields, add/edit/remove fields
  ↓
  6. Define custom prompt
  ↓
  7. Test extraction → /api/extract/test (with base64 doc from memory) → Claude Skills API
  ↓
  8. Review test results, iterate on prompt if needed
  ↓
  9. Save template → /api/templates (POST)
  ↓
Template stored in Supabase (document discarded from memory)
```

**Workflow 2: Production Document Extraction**

```
User → Document Processing UI
  ↓
  1. Select template → /api/templates (GET)
  ↓
  2. Select production document from file picker (held in memory)
  ↓
  3. Read file, encode to base64 (held in React state)
  ↓
  4. Optionally add prompt override
  ↓
  5. Trigger extraction → /api/extract/production (with base64 doc) → Claude Skills API
  ↓
  6. Display results preview (table with confidence indicators)
  ↓
  7. If unsatisfied: adjust prompt, re-send base64 from memory, goto step 5
  ↓
  8. Export to Excel → Client-side ExcelJS processing
  ↓
  9. Download .xlsx file (document cleared from memory)
  ↓
User proceeds with billing validation
```

**Key Sequence: AI Extraction Flow**

```
Frontend
  ↓
  1. User selects document from file picker
  ↓
  2. File read and converted to base64 (stored in React state)
  ↓
  3. User triggers extraction
  ↓
  4. Fetch template from API → /api/templates/:id
  ↓
  5. Call extraction API with base64 document from state
  ↓
API Route (/api/extract/production)
  ↓
  6. Receive base64 document and templateId
  ↓
  7. Build Claude Skills API request with template schema
  ↓
  8. Call Claude Skills API (structured output)
  ↓
  9. Parse response, calculate confidence scores
  ↓
  10. Denormalize data (repeat header fields per detail row)
  ↓
  11. Return ExtractedRow[] with confidence + metadata
  ↓
Frontend
  ↓
  12. Display results in preview table (held in React state)
  ↓
  13. User exports → ExcelJS generates .xlsx client-side
  ↓
  14. Document and results cleared from state after export
```

## Non-Functional Requirements

### Performance

**Response Time Targets:**
- Template CRUD operations: < 500ms (database queries optimized with indexes)
- Document upload: < 2s for files up to 10MB
- AI field suggestion: < 15s (Claude Skills API dependent)
- Production extraction: < 30s for typical 1-5 page documents (Claude Skills API dependent)
- Excel export generation: < 3s for up to 500 rows
- Page load (initial): < 2s on broadband connection

**Throughput:**
- Single-user operation (no concurrent processing requirements for MVP)
- Document processing queue: Sequential processing (one document at a time)

**Resource Optimization for Free Tier:**
- Implement file size limits: 10MB max per document upload
- No storage costs (documents processed in-memory only)
- Minimize Claude Skills API calls through prompt caching where possible
- Optimize Next.js bundle size to reduce Vercel bandwidth consumption
- Memory management: Clear document from state after export to free browser memory

**Source:** PRD NFR001 (Browser Compatibility), NFR002 (Extraction Accuracy)

### Security

**Data Handling:**
- Documents held in browser memory only during active session (no persistence)
- No sensitive data logging in application logs
- API routes validate file types before processing (PDF, DOCX, TXT only)
- Maximum file size enforcement (10MB) to prevent abuse

**Authentication/Authorization:**
- MVP: No authentication required (single-user internal tool)
- Future Phase 2: Add basic auth for multi-user support

**API Security:**
- Claude Skills API key stored in Vercel environment variables
- Supabase connection credentials in environment variables
- No client-side exposure of API keys
- CORS configuration for Next.js API routes (same-origin only for MVP)

**Threat Mitigation:**
- File type validation on upload (prevent execution of malicious files)
- Input sanitization for template names and custom prompts
- Rate limiting on API routes (Vercel built-in protection)

**Source:** Industry best practices for API security, PRD context (billing validation data requires basic protection)

### Reliability/Availability

**Availability:**
- Target: 99% uptime (Vercel and Supabase SLA dependent)
- Graceful degradation: Display user-friendly error messages for API failures
- No real-time requirements (asynchronous processing acceptable)

**Error Handling:**
- Claude Skills API failures: Retry once, then display error with option to retry manually
- Upload failures: Clear error messages with file size/type guidance
- Database connection errors: User-facing error message with support contact
- Excel export errors: Fallback to JSON download if Excel generation fails

**Data Recovery:**
- No extraction session persistence - users must complete workflow in single session
- Template backup: Manual export feature (future enhancement)
- No document recovery needed (documents not stored)

**Degradation Behavior:**
- If Claude Skills API unavailable: Display maintenance message, allow template browsing only
- No dependency on external storage services

**Source:** PRD NFR003 (Usability), general Level 2 reliability expectations

### Observability

**Logging:**
- Server-side logs for API route execution (Vercel logs)
- Claude Skills API request/response logging (sanitized, no document content)
- Error logging with stack traces for debugging
- Upload events with file metadata (size, type, timestamp)

**Metrics:**
- Vercel Analytics: Page views, API route performance
- Custom metrics (optional): Extraction success rate, average confidence scores
- Free tier monitoring: Track Vercel bandwidth consumption only

**Tracing:**
- Basic request tracing through Vercel logs
- Claude Skills API correlation IDs for support issues
- Extraction workflow tracking via session IDs

**Monitoring Signals:**
- Vercel deployment health checks
- Supabase database connection status
- Claude Skills API response times and error rates
- Alert on repeated extraction failures (manual monitoring for MVP)

**Source:** Level 2 project observability needs, free tier limitations

## Dependencies and Integrations

### External Services

| Service | Purpose | Constraint | Configuration |
|---------|---------|------------|---------------|
| **Vercel** | Application hosting, serverless functions, CI/CD | Free tier: 100GB bandwidth/month | Auto-deploy from Git repository |
| **Supabase** | PostgreSQL database (templates only) | Free tier: 500MB DB, 2GB bandwidth/month | Environment variables: `SUPABASE_URL`, `SUPABASE_ANON_KEY` |
| **Claude Skills API** | AI-powered document extraction and field suggestion | Pay-per-use (Anthropic pricing) | Environment variable: `ANTHROPIC_API_KEY` |

### Frontend Dependencies

| Package | Version | Purpose | Notes |
|---------|---------|---------|-------|
| **next** | ^14.0.0 | React framework with SSR, API routes | Core framework |
| **react** | ^18.2.0 | UI library | Peer dependency of Next.js |
| **react-dom** | ^18.2.0 | React DOM renderer | Peer dependency of Next.js |
| **@radix-ui/react-*** | Latest | Headless UI primitives for ShadCN | Multiple packages (dialog, dropdown, etc.) |
| **tailwindcss** | ^3.4.0 | Utility-first CSS framework | Styling system |
| **class-variance-authority** | Latest | Component variant management | ShadCN dependency |
| **clsx** | Latest | Conditional className utility | ShadCN dependency |
| **tailwind-merge** | Latest | Tailwind class merging | ShadCN dependency |
| **lucide-react** | Latest | Icon library | UI icons |
| **react-dropzone** | Latest | Drag-and-drop file upload | Document upload UI |
| **@tanstack/react-table** | ^8.0.0 | Table component for results preview | Extraction results display |
| **exceljs** | ^4.4.0 | Excel file generation (browser-compatible) | .xlsx export in browser |

### Backend Dependencies

| Package | Version | Purpose | Notes |
|---------|---------|---------|-------|
| **@supabase/supabase-js** | ^2.38.0 | Supabase client SDK | Database operations only (templates) |
| **@anthropic-ai/sdk** | ^0.9.0 | Claude Skills API client | AI extraction integration |
| **zod** | ^3.22.0 | Schema validation | API request/response validation |

### Development Dependencies

| Package | Version | Purpose | Notes |
|---------|---------|---------|-------|
| **typescript** | ^5.3.0 | Type safety | Language |
| **@types/node** | ^20.0.0 | Node.js type definitions | TypeScript support |
| **@types/react** | ^18.2.0 | React type definitions | TypeScript support |
| **@types/react-dom** | ^18.2.0 | React DOM type definitions | TypeScript support |
| **eslint** | ^8.0.0 | Code linting | Code quality |
| **eslint-config-next** | ^14.0.0 | Next.js ESLint configuration | Next.js best practices |
| **prettier** | ^3.1.0 | Code formatting | Consistent formatting |
| **postcss** | ^8.4.0 | CSS processing | Tailwind dependency |
| **autoprefixer** | ^10.4.0 | CSS vendor prefixing | Tailwind dependency |

### Integration Points

**1. Claude Skills API**
- **Protocol:** HTTPS REST API
- **Authentication:** API key in request headers (`x-api-key`)
- **Data Flow:** Document (base64) + template schema → Structured extraction results
- **Rate Limits:** Per Anthropic account limits (monitor usage)
- **Error Handling:** Retry on 5xx errors, fail gracefully on 4xx errors

**2. Supabase Database**
- **Protocol:** PostgreSQL over HTTPS (REST API or direct connection)
- **Authentication:** Service role key for server-side, anon key for client-side
- **Data Flow:** Template CRUD operations only
- **Connection Pooling:** Handled by Supabase
- **Migrations:** Manual SQL scripts or Supabase Studio UI

### Version Constraints

- **Node.js:** >= 18.17.0 (Vercel runtime compatibility)
- **npm/pnpm/yarn:** Latest stable (package manager agnostic)
- **Browser Support:** Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

### Third-Party Library Decisions

**Excel Generation: ExcelJS vs alternatives**
- **Choice:** ExcelJS (browser-compatible build)
- **Rationale:** Pure JavaScript, works in browser and serverless, no native dependencies, comprehensive .xlsx support
- **Alternatives Considered:** xlsx (less feature-rich), SheetJS (commercial licensing)

**Document Processing: In-memory vs persistent storage**
- **Choice:** In-memory processing only (no persistence)
- **Rationale:** Simplest architecture, no storage limits, no cleanup needed, fits single-session workflow
- **Alternatives Considered:** IndexedDB (unnecessary complexity for single-session workflow), Supabase Storage (adds cost), localStorage (size limits)

**File Handling: Client-side base64 vs server parsing**
- **Choice:** Client-side file reading, base64 encoding, send to Claude API
- **Rationale:** Claude API handles PDF/Word/text parsing natively, no server-side parsing libraries needed, reduces dependencies
- **Alternatives Considered:** pdf-parse + mammoth server-side (adds complexity, unnecessary with Claude's native support)

**UI Components: ShadCN vs alternatives**
- **Choice:** ShadCN (Radix UI + Tailwind)
- **Rationale:** Copy-paste components (not npm dependency bloat), accessible by default, highly customizable
- **Alternatives Considered:** Material-UI (heavier), Chakra UI (more opinionated)

### Dependency Management Strategy

- **Lock Files:** Commit `package-lock.json` or `pnpm-lock.yaml` for reproducible builds
- **Updates:** Monthly review of security updates, quarterly review of feature updates
- **Security:** Enable Dependabot alerts, use `npm audit` in CI/CD
- **Bundle Size:** Monitor with Next.js bundle analyzer, lazy-load heavy dependencies where possible

## Acceptance Criteria (Authoritative)

### Epic 1: Template Management & Foundation

**AC1.1** - User can create a new template with name, type (6 supported types), and field definitions
- **Given** user navigates to template builder
- **When** user enters template name, selects type, and defines fields with name/type/category
- **Then** template is saved to database and appears in template list

**AC1.2** - User can upload a sample document and receive AI-generated field suggestions
- **Given** user is creating a new template
- **When** user uploads a sample PDF/Word/text document
- **Then** system calls Claude Skills API and returns suggested fields based on document content

**AC1.3** - User can define custom AI prompts and instructions for templates
- **Given** user is creating/editing a template
- **When** user enters custom prompt text in prompt field
- **Then** prompt is saved with template and used during extraction

**AC1.4** - User can test extraction with sample document during template creation
- **Given** user has defined fields and uploaded sample document
- **When** user clicks "Test Extraction"
- **Then** system performs extraction and displays results with confidence scores

**AC1.5** - User can mark fields as header vs. detail categorization
- **Given** user is defining template fields
- **When** user selects field category (header or detail)
- **Then** category is saved and determines field repetition in output (header fields repeat per row)

**AC1.6** - System stores and retrieves templates for reuse
- **Given** templates exist in database
- **When** user navigates to template list
- **Then** all saved templates are displayed with name, type, and field count

**AC1.7** - Application deploys successfully to Vercel with Supabase connection
- **Given** code is pushed to Git repository
- **When** Vercel deployment triggers
- **Then** application is accessible via URL and can connect to Supabase database

### Epic 2: Production Document Processing

**AC2.1** - User can upload production documents in supported formats (PDF, Word, text)
- **Given** user is on document processing page
- **When** user uploads a file with supported format and < 10MB size
- **Then** file is loaded into browser memory for processing

**AC2.2** - User can select an existing template for document processing
- **Given** templates exist in system
- **When** user accesses template selection dropdown
- **Then** all available templates are listed with type indicator

**AC2.3** - System extracts data in flat/denormalized format with header fields repeated per detail row
- **Given** user has uploaded document and selected template
- **When** extraction completes
- **Then** results show header fields repeated on each detail row (flat structure)

**AC2.4** - System generates confidence scores for extracted data rows
- **Given** extraction has completed
- **When** results are displayed
- **Then** each row shows a confidence score between 0.0 and 1.0

**AC2.5** - System flags low-confidence rows with visual indicators
- **Given** extraction results contain rows with confidence < 0.7
- **When** results are displayed in preview table
- **Then** low-confidence rows are highlighted (yellow/orange visual indicator)

**AC2.6** - User can adjust prompts and rerun extraction iteratively
- **Given** user has viewed extraction results
- **When** user modifies custom prompt and clicks "Re-extract"
- **Then** system performs new extraction with updated prompt and displays updated results

**AC2.7** - System generates Excel (.xlsx) files with extracted data
- **Given** user is satisfied with extraction results
- **When** user clicks "Export to Excel"
- **Then** system generates .xlsx file with tabular data

**AC2.8** - Excel export includes source metadata (filename, page numbers) and confidence scores
- **Given** Excel file is generated
- **When** user opens the file
- **Then** file contains data columns plus metadata columns (source filename, confidence score, extraction timestamp)

**AC2.9** - User can preview extraction results before export
- **Given** extraction has completed
- **When** results are displayed
- **Then** user sees sortable/filterable table with all extracted data before export decision

**AC2.10** - System processes both clean and scanned documents
- **Given** user uploads scanned image-based PDF
- **When** extraction runs
- **Then** Claude Skills API processes document and returns extracted data (OCR handled by Claude)

## Traceability Mapping

| AC ID | PRD Requirement | Spec Section(s) | Component(s)/API(s) | Test Approach |
|-------|----------------|-----------------|---------------------|---------------|
| **AC1.1** | FR001, FR003 | Data Models (Templates Table), APIs (/api/templates POST) | Template API, Template Management UI | Unit: API validation, Integration: Full template creation flow |
| **AC1.2** | FR002 | APIs (/api/extract/suggest-fields), Workflows (Template Creation) | Extraction API, Claude Skills Service | Integration: Upload + AI suggestion flow with real Claude API |
| **AC1.3** | FR004 | Data Models (custom_prompt field), APIs (/api/templates) | Template API | Unit: Prompt storage/retrieval |
| **AC1.4** | FR005 | APIs (/api/extract/test), Workflows (Template Creation step 6) | Extraction API, Claude Skills Service | Integration: Test extraction with sample document |
| **AC1.5** | FR003 | Data Models (field category), Detailed Design (denormalization logic) | Extraction API (denormalization step) | Unit: Field categorization logic, Integration: Output format validation |
| **AC1.6** | FR006 | Data Models (Templates Table), APIs (/api/templates GET) | Template API, Database Layer | Integration: CRUD operations |
| **AC1.7** | N/A (Infrastructure) | System Architecture Alignment | Vercel, Supabase | Manual: Deployment verification, Smoke test |
| **AC2.1** | FR008 | File Upload Handler | File Upload Handler (in-memory) | Unit: File validation, Integration: In-memory file processing |
| **AC2.2** | FR010 | APIs (/api/templates GET), Workflows (Production step 1) | Template API, Document Processing UI | Integration: Template selection flow |
| **AC2.3** | FR013 | Detailed Design (denormalization step 7), Workflows (AI Extraction Flow) | Extraction API | Unit: Denormalization logic, Integration: End-to-end extraction |
| **AC2.4** | FR014 | Data Models (ExtractedRow confidence), APIs (/api/extract/production) | Extraction API | Unit: Confidence calculation, Integration: Full extraction |
| **AC2.5** | FR015 | NFR (Performance/UI), Workflows (Production step 5) | Document Processing UI (results preview) | UI: Visual indicator rendering |
| **AC2.6** | FR018 | Workflows (Production step 6), APIs (/api/extract/production) | Extraction API, Document Processing UI | Integration: Iterative refinement flow |
| **AC2.7** | FR019 | APIs (/api/export/excel), Excel Export Service | Excel Export Service | Unit: Excel generation, Integration: Full export flow |
| **AC2.8** | FR016, FR021 | Data Models (sourceMetadata), APIs (/api/export/excel) | Excel Export Service | Unit: Metadata inclusion validation |
| **AC2.9** | FR017 | Workflows (Production step 5), Document Processing UI | Document Processing UI (results table) | UI: Table rendering with sorting/filtering |
| **AC2.10** | FR009 | Claude Skills API Integration, Workflows (AI Extraction Flow) | Claude Skills Service | Integration: Scanned document processing with real Claude API |

## Risks, Assumptions, Open Questions

### Risks

**RISK-1: Claude Skills API Extraction Accuracy**
- **Type:** Technical
- **Impact:** High - Inaccurate extractions undermine core value proposition for billing validation
- **Probability:** Medium
- **Mitigation:**
  - Implement confidence scoring to flag uncertain extractions
  - Provide iterative prompt refinement workflow
  - Test with real billing documents during development
  - Set user expectations through transparency (confidence scores visible)
- **Contingency:** If accuracy insufficient, explore alternative prompting strategies or consider hybrid human-in-loop validation

**RISK-2: Page Refresh Loses Work**
- **Type:** User Experience
- **Impact:** Low - Users must re-upload document if they refresh page before export
- **Probability:** Low (typical workflow is upload → extract → export without refresh)
- **Mitigation:**
  - Clear user messaging: "Upload and extract in one session"
  - Warn before page navigation if extraction results exist
  - Document the single-session workflow clearly
  - Fast extraction times reduce risk of abandonment
- **Contingency:** If users frequently lose work, add session persistence (localStorage or IndexedDB)

**RISK-3: Document Format Variability**
- **Type:** Technical
- **Impact:** Medium - Some document formats may not parse correctly
- **Probability:** Medium (real-world documents vary widely)
- **Mitigation:**
  - Test with diverse document samples (clean PDFs, scanned PDFs, Word docs)
  - Implement robust error handling with clear error messages
  - Allow manual retry with different prompts
  - Document supported format specifications
- **Contingency:** Provide fallback to manual data entry or preprocessing tools

**RISK-4: Vercel Serverless Function Timeout**
- **Type:** Technical
- **Impact:** Medium - Large documents may timeout during extraction
- **Probability:** Low-Medium (depends on document size)
- **Mitigation:**
  - Enforce 10MB file size limit
  - Optimize Claude API payload (compress images if needed)
  - Set realistic timeout expectations (30s target for typical documents)
- **Contingency:** Implement async processing with polling if timeouts occur frequently

**RISK-5: Client-Side Data Security**
- **Type:** Security
- **Impact:** Low - Documents held in memory only during active session
- **Probability:** Very Low (internal tool, controlled access)
- **Mitigation:**
  - Documents never persisted - only in memory during session
  - Cleared from memory after export or page close
  - No server-side storage of document contents
  - API receives base64 but doesn't store it
  - Recommend users close browser tab after sensitive work
- **Contingency:** If security concerns arise, add server-side encryption for in-transit documents

### Assumptions

**ASSUMPTION-1:** Claude Skills API will maintain consistent availability and performance
- **Validation:** Monitor API status during development, establish baseline performance metrics

**ASSUMPTION-2:** Single-user operation is sufficient for MVP (no concurrent users)
- **Validation:** Confirm with stakeholder, document multi-user as Phase 2 feature

**ASSUMPTION-3:** 10MB file size limit covers 95%+ of typical billing documents
- **Validation:** Sample existing billing documents to confirm size distribution

**ASSUMPTION-4:** English-language documents only for MVP
- **Validation:** Confirm with stakeholder, verify Claude API English performance

**ASSUMPTION-5:** Users are comfortable with web-based tools and basic file management
- **Validation:** PRD specifies "non-technical users comfortable with Excel" - UI testing will validate

**ASSUMPTION-6:** Users can complete extraction workflow in single session without needing document persistence
- **Validation:** Typical workflow estimated at < 5 minutes. User feedback will validate if session persistence is needed.

**ASSUMPTION-7:** Excel export is the primary output format (no immediate need for database/API integration)
- **Validation:** Confirmed in PRD scope - database output deferred to Phase 2

### Open Questions (RESOLVED)

**QUESTION-1:** What is the expected confidence score threshold for acceptable vs. flagged extractions?
- **Impact:** Affects UI visual indicators and user experience
- **Resolution:** ✅ 0.7 threshold (< 0.7 = flagged)
- **Status:** RESOLVED

**QUESTION-2:** Should extraction sessions be persisted in the database for history/audit?
- **Impact:** Affects database schema and storage usage
- **Resolution:** ✅ NO - Not for MVP. Session persistence deferred to future versions.
- **Status:** RESOLVED

**QUESTION-3:** What is the storage mechanism for uploaded documents?
- **Impact:** Affects architecture, storage strategy, and dependencies
- **Resolution:** ✅ NO STORAGE - In-memory processing only. Documents processed and discarded. SharePoint or cloud storage in future versions.
- **Status:** RESOLVED - Maximum simplification for MVP

**QUESTION-4:** Should the system support batch processing (multiple files) in MVP?
- **Impact:** Affects UI design and API implementation
- **Resolution:** ✅ Single file at a time for MVP
- **Status:** RESOLVED

**QUESTION-5:** What error recovery mechanism is needed if extraction fails mid-process?
- **Impact:** Affects error handling and UX
- **Resolution:** ✅ Display error message with retry button, log error for debugging
- **Status:** RESOLVED

## Test Strategy Summary

### Test Levels

**1. Unit Testing**
- **Scope:** Individual functions, API route handlers, data transformations
- **Framework:** Jest + React Testing Library
- **Coverage Target:** 70%+ for critical paths (API routes, data models, extraction logic)
- **Key Areas:**
  - Template CRUD operations
  - Field denormalization logic (header repetition)
  - Confidence score calculation
  - Excel file generation
  - File type validation
  - Input sanitization

**2. Integration Testing**
- **Scope:** Multi-component workflows, external service integration
- **Framework:** Jest with real external services
- **Key Scenarios:**
  - Template creation workflow (upload to memory → AI suggestion → save template to DB)
  - Production extraction workflow (upload to memory → extraction → export)
  - Supabase database operations (CRUD with dedicated test database)
  - Claude Skills API integration (real API calls with test documents)
  - File reading and base64 encoding (in-memory operations)

**3. UI/Component Testing**
- **Scope:** React components, user interactions
- **Framework:** React Testing Library + Playwright for E2E
- **Key Components:**
  - Template builder form
  - File upload (drag-and-drop)
  - Results preview table (sorting, filtering, confidence indicators)
  - Excel export download flow

**4. End-to-End Testing**
- **Scope:** Complete user journeys
- **Framework:** Playwright
- **Critical Paths:**
  - Full template creation with AI assistance
  - Production document extraction and Excel export
  - Iterative prompt refinement workflow
- **Execution:** Manual testing for MVP, automated E2E tests as time permits

**5. Manual/Exploratory Testing**
- **Scope:** Real-world document testing, edge cases, UX validation
- **Approach:**
  - Test with actual billing documents (invoices, estimates, logs)
  - Test scanned vs. clean documents
  - Test edge cases (corrupted files, oversized files, unusual formats)
  - Validate confidence score accuracy against human review
  - Cross-browser testing (Chrome, Firefox, Safari, Edge)

### Test Data Strategy

**Templates:**
- Create 6 test templates (one for each document type)
- Include edge cases: minimal fields, maximal fields, header-only, detail-only

**Documents:**
- Sample invoice PDFs (clean and scanned)
- Sample Word documents (estimates)
- Sample text files (equipment logs)
- Edge cases: empty documents, corrupted files, oversized files (>10MB)

**Real Test Data:**
- Test documents with known expected outputs for validation
- Documents designed to produce varying confidence scores
- Documents with different structures (simple, complex, edge cases)
- Test error conditions with real malformed documents

### Acceptance Criteria Coverage

Each of the 17 acceptance criteria (AC1.1 - AC2.10) will be validated through:
- **Unit/Integration tests:** Automated validation of technical functionality
- **UI tests:** Automated validation of user-facing interactions
- **Manual testing:** Validation of end-to-end user journeys and edge cases

**Traceability:** Test cases will reference AC IDs for full traceability from requirements → tests

### Test Environments

- **Local:** Developer machines for unit/integration testing
- **CI/CD:** GitHub Actions (or similar) for automated test execution on PR/merge
- **Staging:** Vercel preview deployments for integration/E2E testing with real Supabase instance
- **Production:** Vercel production deployment (manual smoke testing post-deployment)

### Edge Cases and Boundary Conditions

- File size: 0 bytes, 1KB, 9.9MB, 10MB, 10.1MB (should reject)
- File types: Valid (PDF, DOCX, TXT), invalid (JPG, EXE, ZIP)
- Templates: 0 fields, 1 field, 50 fields, 100 fields
- Confidence scores: 0.0, 0.5, 0.69, 0.7, 1.0
- Document pages: 1 page, 5 pages, 50+ pages
- Extraction results: 0 rows, 1 row, 100 rows, 1000 rows
- Network conditions: API timeouts, connection failures, slow responses

### Testing Tools

| Tool | Purpose |
|------|---------|
| **Jest** | Unit and integration testing framework |
| **React Testing Library** | React component testing |
| **Playwright** | End-to-end browser testing |
| **Supabase Test Database** | Isolated database for integration tests |
| **Claude Skills API (Test Account)** | Real API calls with dedicated test API key |
| **Next.js Test Environment** | API route testing utilities |

### Success Metrics

- All 17 acceptance criteria validated (automated + manual)
- 70%+ code coverage on critical paths
- Zero critical bugs in production deployment
- Successful end-to-end test with real billing documents
- Cross-browser compatibility verified (4 browsers)
- Performance targets met (defined in NFR Performance section)
