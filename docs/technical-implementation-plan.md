# Technical Implementation Plan: Unified Batch Extraction

**Project:** MMDocScan - Batch Processing & Unified UI
**Version:** 1.0
**Date:** 2025-10-24
**Status:** Implementation Ready
**Timeline:** 8 Weeks
**Based on:** Requirements Document v1.2

---

## Executive Summary

This document provides the technical implementation roadmap for MMDocScan's batch extraction features. It translates requirements into actionable development tasks, technical decisions, and architecture specifications.

**Key Deliverables:**
- Unified single-page workflow (left/right panels)
- Batch processing with auto-detection (1-100 files)
- Static custom columns
- AI-assisted template creation
- Excel export with options
- Polished results table UX

**Timeline:** 8 weeks across 7 implementation phases
**Tech Stack:** Next.js 14, React 18, TypeScript, Supabase, Claude API
**Deployment:** Vercel (existing)

---

## 1. Technical Architecture

### 1.1 System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser (Client)                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │          Next.js 14 App Router                       │  │
│  │  ┌────────────────┐        ┌────────────────────┐   │  │
│  │  │ Page Component │───────▶│  Zustand Store     │   │  │
│  │  │  /extract      │        │  (Global State)    │   │  │
│  │  └────────────────┘        └────────────────────┘   │  │
│  │         │                            │               │  │
│  │         ▼                            ▼               │  │
│  │  ┌──────────────────────────────────────────────┐   │  │
│  │  │         Feature Components                   │   │  │
│  │  │  - TemplateBuilder                           │   │  │
│  │  │  - FileUploader                              │   │  │
│  │  │  - CustomColumnsPanel                        │   │  │
│  │  │  - ResultsTable (react-window)               │   │  │
│  │  │  - ResizablePanels (@react-resizable-panels)│   │  │
│  │  └──────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────┘
                            │ API Calls (fetch/axios)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Next.js API Routes (Serverless)                │
│  ┌────────────────────┐    ┌────────────────────────────┐  │
│  │  /api/templates    │    │  /api/extractions          │  │
│  │  - CRUD ops        │    │  - /batch (POST)           │  │
│  │  - AI inspect      │    │  - /:id/status (GET)       │  │
│  └────────────────────┘    │  - /:id/results (GET)      │  │
│                            │  - /:id/export (POST)       │  │
│                            └────────────────────────────┘  │
│                 │                        │                  │
│                 ▼                        ▼                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │            Service Layer                             │  │
│  │  - PDFParser (pdf-parse)                             │  │
│  │  - DocumentDetector (auto-detection logic)           │  │
│  │  - ExtractionService (Claude API client)             │  │
│  │  - ExcelExporter (exceljs)                           │  │
│  │  - BatchProcessor (queue management)                 │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  External Services                          │
│  ┌──────────────────┐  ┌──────────────────┐               │
│  │  Supabase DB     │  │  Anthropic API   │               │
│  │  - PostgreSQL    │  │  - Claude 3.5    │               │
│  │  - Auth          │  │  - Sonnet        │               │
│  └──────────────────┘  └──────────────────┘               │
└─────────────────────────────────────────────────────────────┘
```

---

### 1.2 Database Schema Updates

#### New Tables

```sql
-- Templates table (extend existing if present)
CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  fields JSONB NOT NULL, -- Array of {id, name, instructions, order}
  extraction_prompt TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, name)
);

CREATE INDEX idx_templates_user_id ON templates(user_id);

-- Extraction sessions table
CREATE TABLE extraction_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
  template_snapshot JSONB NOT NULL, -- Template state at extraction time
  files JSONB NOT NULL, -- Array of file metadata
  custom_columns JSONB, -- Array of custom column configs
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  error_message TEXT
);

CREATE INDEX idx_sessions_user_id ON extraction_sessions(user_id);
CREATE INDEX idx_sessions_status ON extraction_sessions(status);
CREATE INDEX idx_sessions_created_at ON extraction_sessions(created_at DESC);

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

CREATE INDEX idx_results_session_id ON extraction_results(session_id);
CREATE INDEX idx_results_source_file ON extraction_results(source_file);

-- User settings table (for retention settings)
CREATE TABLE IF NOT EXISTS user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  session_retention_days INTEGER DEFAULT 7,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### Row Level Security (RLS) Policies

```sql
-- Enable RLS
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE extraction_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE extraction_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Templates policies
CREATE POLICY "Users can view their own templates"
  ON templates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own templates"
  ON templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates"
  ON templates FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates"
  ON templates FOR DELETE
  USING (auth.uid() = user_id);

-- Sessions policies
CREATE POLICY "Users can view their own sessions"
  ON extraction_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions"
  ON extraction_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Results policies
CREATE POLICY "Users can view results from their sessions"
  ON extraction_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM extraction_sessions
      WHERE extraction_sessions.id = extraction_results.session_id
      AND extraction_sessions.user_id = auth.uid()
    )
  );

-- Settings policies
CREATE POLICY "Users can view their own settings"
  ON user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
  ON user_settings FOR UPDATE
  USING (auth.uid() = user_id);
```

---

### 1.3 Component Architecture

#### Page Structure

```
app/
├── extract/
│   └── page.tsx                 # Main extraction page
│       ├── layout: ResizablePanels
│       ├── left: ConfigurationPanel
│       └── right: ResultsPanel
```

#### Component Tree

```
ExtractPage
├── Header
│   ├── Logo
│   ├── TemplatesLink
│   ├── HistoryLink
│   └── HelpLink
│
├── ResizablePanels (@react-resizable-panels)
│   │
│   ├── ConfigurationPanel (Left)
│   │   ├── TemplateSection
│   │   │   ├── TemplateModeToggle
│   │   │   ├── TemplateDropdown
│   │   │   ├── AIInspectButton
│   │   │   ├── FieldTagsArea (@dnd-kit)
│   │   │   │   └── FieldTag[] (draggable)
│   │   │   ├── ExtractionInstructionsTextarea
│   │   │   ├── SystemInstructionsToggle
│   │   │   └── SaveTemplateButton
│   │   │
│   │   ├── FileUploadSection
│   │   │   ├── DropZone (react-dropzone)
│   │   │   └── FileList
│   │   │       └── FileListItem[]
│   │   │
│   │   ├── CustomColumnsSection
│   │   │   ├── CustomColumnsList
│   │   │   │   └── CustomColumnItem[]
│   │   │   └── AddColumnButton
│   │   │
│   │   ├── ExportOptionsSection
│   │   │   └── RadioGroup (separate/combined)
│   │   │
│   │   ├── ExtractButton (primary CTA)
│   │   └── MaximizeButton
│   │
│   └── ResultsPanel (Right)
│       ├── EmptyState (initial)
│       ├── ProcessingState
│       │   ├── ProgressBar
│       │   └── FileStatusList
│       ├── ResultsTable (react-window)
│       │   ├── FrozenHeader (sticky)
│       │   ├── VirtualizedRows
│       │   └── AlwaysVisibleScrollbar
│       ├── ExportButton
│       └── MaximizeButton
│
└── Modals
    ├── AIInspectModal
    ├── FieldEditModal
    ├── CustomColumnModal
    ├── SaveTemplateModal
    └── ExportOptionsModal
```

---

### 1.4 State Management (Zustand)

#### Store Structure

```typescript
// stores/extractionStore.ts
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

interface Template {
  id: string
  name: string
  fields: TemplateField[]
  extraction_prompt: string
}

interface TemplateField {
  id: string
  name: string
  instructions?: string
  order: number
}

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

interface CustomColumn {
  id: string
  name: string
  type: 'static'
  value: string
  order: number
}

interface ExtractionSession {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  filesProcessed: number
  totalFiles: number
  documentsExtracted: number
}

interface ExtractionResult {
  id: string
  sourceFile: string
  pageNumber: number
  extractedData: Record<string, any>
}

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

  // Template Actions
  setTemplateMode: (mode: 'new' | 'existing') => void
  loadTemplate: (id: string) => Promise<void>
  addField: (field: Omit<TemplateField, 'id' | 'order'>) => void
  updateField: (id: string, updates: Partial<TemplateField>) => void
  removeField: (id: string) => void
  reorderFields: (startIndex: number, endIndex: number) => void
  setExtractionPrompt: (prompt: string) => void
  saveTemplate: (name: string) => Promise<void>
  updateTemplate: (id: string) => Promise<void>

  // File Actions
  addFiles: (files: File[]) => void
  removeFile: (id: string) => void
  clearFiles: () => void

  // Custom Column Actions
  addCustomColumn: (column: Omit<CustomColumn, 'id' | 'order'>) => void
  updateCustomColumn: (id: string, updates: Partial<CustomColumn>) => void
  removeCustomColumn: (id: string) => void
  reorderCustomColumns: (startIndex: number, endIndex: number) => void

  // Extraction Actions
  startExtraction: () => Promise<void>
  pollProgress: () => Promise<void>
  loadResults: () => Promise<void>
  exportToExcel: (options: ExportOptions) => Promise<void>

  // Panel Actions
  setLeftPanelSize: (size: number) => void
  setRightPanelSize: (size: number) => void

  // Reset
  reset: () => void
}

export const useExtractionStore = create<ExtractionStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial State
        templateMode: 'new',
        selectedTemplate: null,
        fields: [],
        extractionPrompt: '',
        isDirty: false,
        uploadedFiles: [],
        customColumns: [],
        currentSession: null,
        results: [],
        leftPanelSize: 300,
        rightPanelSize: 0,
        isProcessing: false,

        // Actions implementation...
        // (detailed in Phase 1 implementation)
      }),
      {
        name: 'extraction-storage',
        partialize: (state) => ({
          // Only persist UI preferences
          leftPanelSize: state.leftPanelSize,
          rightPanelSize: state.rightPanelSize,
        }),
      }
    )
  )
)
```

---

### 1.5 API Routes Structure

```
app/api/
├── templates/
│   ├── route.ts                 # GET (list), POST (create)
│   ├── [id]/
│   │   └── route.ts            # GET, PUT, DELETE
│   └── ai-inspect/
│       └── route.ts            # POST (AI file analysis)
│
├── extractions/
│   ├── batch/
│   │   └── route.ts            # POST (start batch)
│   ├── [sessionId]/
│   │   ├── status/
│   │   │   └── route.ts        # GET (poll progress)
│   │   ├── results/
│   │   │   └── route.ts        # GET (fetch results)
│   │   └── export/
│   │       └── route.ts        # POST (generate Excel)
│
└── settings/
    └── route.ts                 # GET, PUT (user settings)
```

---

## 2. Tech Stack & Libraries

### 2.1 Core Dependencies

```json
{
  "dependencies": {
    // Framework
    "next": "14.2.0",
    "react": "18.3.0",
    "react-dom": "18.3.0",
    "typescript": "5.4.0",

    // UI Components & Styling
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-radio-group": "^1.1.3",
    "@radix-ui/react-toast": "^1.1.5",
    "tailwindcss": "^3.4.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0",

    // Resizable Panels
    "react-resizable-panels": "^2.0.0",

    // Drag and Drop (for field tags)
    "@dnd-kit/core": "^6.1.0",
    "@dnd-kit/sortable": "^8.0.0",
    "@dnd-kit/utilities": "^3.2.2",

    // File Upload
    "react-dropzone": "^14.2.3",

    // Table Virtualization
    "react-window": "^1.8.10",
    "@types/react-window": "^1.8.8",

    // State Management
    "zustand": "^4.5.0",

    // Forms & Validation
    "react-hook-form": "^7.50.0",
    "zod": "^3.22.4",
    "@hookform/resolvers": "^3.3.4",

    // API Client
    "axios": "^1.6.7",
    "swr": "^2.2.5",

    // PDF Parsing
    "pdf-parse": "^1.1.1",
    "@types/pdf-parse": "^1.1.4",

    // Excel Export
    "exceljs": "^4.4.0",

    // Database
    "@supabase/supabase-js": "^2.39.0",

    // AI
    "@anthropic-ai/sdk": "^0.17.0",

    // Date Handling
    "date-fns": "^3.3.0",

    // Utilities
    "nanoid": "^5.0.5",
    "p-limit": "^5.0.0"
  },
  "devDependencies": {
    // TypeScript
    "@types/node": "^20.11.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",

    // Testing
    "@playwright/test": "^1.41.0",
    "@testing-library/react": "^14.2.0",
    "@testing-library/jest-dom": "^6.3.0",
    "vitest": "^1.2.0",

    // Linting & Formatting
    "eslint": "^8.56.0",
    "eslint-config-next": "14.2.0",
    "prettier": "^3.2.0",
    "prettier-plugin-tailwindcss": "^0.5.11"
  }
}
```

---

### 2.2 Library Justifications

**react-resizable-panels**
- Mature, well-maintained
- Built-in persist support
- Smooth animations
- Keyboard accessible
- Lightweight (15KB)

**@dnd-kit**
- Modern, performant drag-and-drop
- Full keyboard support (accessibility)
- Touch-friendly
- Tree-shakeable
- Better than react-beautiful-dnd (unmaintained)

**react-dropzone**
- Industry standard for file uploads
- Drag-and-drop + click-to-browse
- File validation
- Multiple file support
- 10KB gzipped

**react-window**
- Best-in-class virtualization
- Handles 10,000+ rows smoothly
- 60fps scrolling
- Smaller than react-virtualized
- Active maintenance

**Zustand**
- Simpler than Redux
- No boilerplate
- TypeScript-first
- DevTools support
- Middleware ecosystem

**pdf-parse**
- Reliable PDF text extraction
- Works server-side (Next.js API routes)
- Handles complex PDFs
- Active maintenance

**exceljs**
- Full-featured Excel generation
- Styling support (bold headers, colors)
- Multiple sheets
- Auto-size columns
- Formula support (future)

---

## 3. Phase-by-Phase Implementation

### Phase 1: Foundation (Weeks 1-2)

#### Milestone: Basic unified UI with single-file extraction

#### Tasks

**1.1 Project Setup & Configuration**
- [ ] Install new dependencies (react-resizable-panels, @dnd-kit, etc.)
- [ ] Configure Zustand store
- [ ] Set up database migrations (create tables)
- [ ] Configure environment variables
- **Time:** 4 hours
- **Assignee:** Lead Dev

**1.2 Page Layout & Resizable Panels**
- [ ] Create `/app/extract/page.tsx`
- [ ] Implement ResizablePanels component
- [ ] Add maximize/minimize buttons
- [ ] Persist panel sizes to localStorage
- [ ] Add draggable divider styling
- **Time:** 8 hours
- **Assignee:** Frontend Dev
- **Dependencies:** 1.1

**1.3 Template Section (Basic)**
- [ ] Create TemplateSection component
- [ ] Implement template mode toggle (new/existing)
- [ ] Create FieldTagsArea component
- [ ] Implement "+ Add field" button
- [ ] Create FieldEditModal component
- [ ] Style field tags (drag handles, delete buttons)
- **Time:** 12 hours
- **Assignee:** Frontend Dev
- **Dependencies:** 1.2

**1.4 Drag-and-Drop Field Reordering**
- [ ] Integrate @dnd-kit with FieldTagsArea
- [ ] Implement drag handles
- [ ] Add visual drop zones
- [ ] Update Zustand store on reorder
- [ ] Test keyboard navigation
- **Time:** 8 hours
- **Assignee:** Frontend Dev
- **Dependencies:** 1.3

**1.5 Extraction Instructions**
- [ ] Create ExtractionInstructionsTextarea component
- [ ] Add character count (0/2000)
- [ ] Implement "Show system instructions" toggle
- [ ] Create collapsible system prompt panel
- **Time:** 4 hours
- **Assignee:** Frontend Dev
- **Dependencies:** 1.3

**1.6 Template API Endpoints**
- [ ] Implement `GET /api/templates` (list)
- [ ] Implement `POST /api/templates` (create)
- [ ] Implement `GET /api/templates/[id]` (get)
- [ ] Implement `PUT /api/templates/[id]` (update)
- [ ] Implement `DELETE /api/templates/[id]` (delete)
- [ ] Add validation with Zod schemas
- **Time:** 8 hours
- **Assignee:** Backend Dev
- **Dependencies:** 1.1

**1.7 Save Template Flow**
- [ ] Create SaveTemplateModal component
- [ ] Handle "new template" save flow
- [ ] Handle "update existing" flow (replace vs. save as new)
- [ ] Show change detection
- [ ] Connect to API endpoints
- [ ] Update Zustand store
- **Time:** 6 hours
- **Assignee:** Frontend Dev
- **Dependencies:** 1.6

**1.8 Single File Upload (Basic)**
- [ ] Create FileUploadSection component
- [ ] Integrate react-dropzone
- [ ] Show file metadata (name, size)
- [ ] Add remove file button
- [ ] Style upload zone
- **Time:** 6 hours
- **Assignee:** Frontend Dev
- **Dependencies:** 1.2

**1.9 Basic Extraction (Single File)**
- [ ] Create ExtractButton component
- [ ] Implement `POST /api/extractions/single` endpoint
- [ ] Connect to Claude API
- [ ] Parse PDF with pdf-parse
- [ ] Return extracted data
- [ ] Handle errors
- **Time:** 10 hours
- **Assignee:** Backend Dev
- **Dependencies:** 1.6, 1.8

**1.10 Results Table (Basic)**
- [ ] Create ResultsTable component (no virtualization yet)
- [ ] Display extracted data in table
- [ ] Show empty state
- [ ] Show processing state
- [ ] Basic styling
- **Time:** 8 hours
- **Assignee:** Frontend Dev
- **Dependencies:** 1.9

**Phase 1 Testing**
- [ ] E2E test: Create template with 3 fields
- [ ] E2E test: Save template
- [ ] E2E test: Load existing template
- [ ] E2E test: Upload single file and extract
- [ ] E2E test: View results in table
- **Time:** 6 hours
- **Assignee:** QA/Dev

**Phase 1 Total:** ~80 hours (2 weeks with 2 devs)

---

### Phase 2: Batch Processing (Weeks 3-4)

#### Milestone: Multi-file upload with auto-detection

#### Tasks

**2.1 Multi-File Upload UI**
- [ ] Update FileUploadSection to accept multiple files
- [ ] Show file list with metadata
- [ ] Add "+ Add more files" button
- [ ] Show aggregate stats (total files, total size)
- [ ] Handle file removal
- **Time:** 6 hours
- **Assignee:** Frontend Dev

**2.2 PDF Parsing Service**
- [ ] Create PDFParser service class
- [ ] Extract text per page
- [ ] Extract metadata (page count)
- [ ] Handle PDF parsing errors
- [ ] Add unit tests
- **Time:** 8 hours
- **Assignee:** Backend Dev

**2.3 Auto-Detection Algorithm**
- [ ] Create DocumentDetector service class
- [ ] Implement detection heuristics:
  - Page boundary detection
  - Invoice keyword detection
  - Number pattern detection
  - Date pattern detection
- [ ] Require 1+ indicator for split (aggressive)
- [ ] Return document boundaries (startPage, endPage)
- [ ] Add confidence scores
- [ ] Add unit tests with sample PDFs
- **Time:** 12 hours
- **Assignee:** Backend Dev
- **Dependencies:** 2.2

**2.4 Batch Extraction API**
- [ ] Create BatchProcessor service class
- [ ] Implement `POST /api/extractions/batch` endpoint
- [ ] Parse all PDFs in parallel
- [ ] Run auto-detection on each file
- [ ] Create extraction session in DB
- [ ] Queue extraction tasks
- [ ] Return session ID
- **Time:** 10 hours
- **Assignee:** Backend Dev
- **Dependencies:** 2.2, 2.3

**2.5 Extraction Queue with Concurrency Control**
- [ ] Implement p-limit for rate limiting (max 5 concurrent)
- [ ] Process each detected document
- [ ] Call Claude API per document
- [ ] Save results to database
- [ ] Update session progress
- [ ] Handle API errors (retry logic)
- **Time:** 12 hours
- **Assignee:** Backend Dev
- **Dependencies:** 2.4

**2.6 Progress Tracking API**
- [ ] Implement `GET /api/extractions/[id]/status` endpoint
- [ ] Return session status, progress %, files processed
- [ ] Return per-file status (pending/processing/completed/failed)
- [ ] Return detection results (documents per file)
- **Time:** 4 hours
- **Assignee:** Backend Dev
- **Dependencies:** 2.5

**2.7 Progress UI**
- [ ] Create ProcessingState component
- [ ] Show overall progress bar
- [ ] Show per-file status list
- [ ] Poll progress every 2 seconds
- [ ] Show detection results ("Detected 3 invoices")
- [ ] Show errors per file
- [ ] Add cancel button (future)
- **Time:** 8 hours
- **Assignee:** Frontend Dev
- **Dependencies:** 2.6

**2.8 Results API**
- [ ] Implement `GET /api/extractions/[id]/results` endpoint
- [ ] Fetch all results for session
- [ ] Include source file + page number
- [ ] Return as JSON array
- **Time:** 4 hours
- **Assignee:** Backend Dev
- **Dependencies:** 2.5

**2.9 Results Table with Source Tracking**
- [ ] Update ResultsTable to show source column
- [ ] Format source as "File1-P1"
- [ ] Add tooltip with full filename
- [ ] Handle multiple files in table
- [ ] Show document count ("5 documents extracted")
- **Time:** 6 hours
- **Assignee:** Frontend Dev
- **Dependencies:** 2.8

**Phase 2 Testing**
- [ ] E2E test: Upload 5 files
- [ ] E2E test: Auto-detection finds multiple docs per file
- [ ] E2E test: Progress updates in real-time
- [ ] E2E test: Results table shows all documents
- [ ] Unit test: Auto-detection algorithm with edge cases
- [ ] Load test: 20 files (100 pages)
- **Time:** 8 hours
- **Assignee:** QA/Dev

**Phase 2 Total:** ~78 hours (2 weeks with 2 devs)

---

### Phase 3: Custom Columns (Static) (Week 5)

#### Milestone: Static custom columns in results

#### Tasks

**3.1 Custom Columns UI**
- [ ] Create CustomColumnsSection component
- [ ] Show list of custom columns
- [ ] Add "+ Add Column" button
- [ ] Show column type badge (Static)
- [ ] Add remove button per column
- **Time:** 4 hours
- **Assignee:** Frontend Dev

**3.2 Custom Column Modal**
- [ ] Create CustomColumnModal component
- [ ] Add form fields: name, type (static only), value
- [ ] Add validation (no duplicate names)
- [ ] Show preview: "This value will be applied to all rows"
- [ ] Connect to Zustand store
- **Time:** 6 hours
- **Assignee:** Frontend Dev
- **Dependencies:** 3.1

**3.3 Custom Columns in Results Table**
- [ ] Update ResultsTable to include custom columns
- [ ] Show [CUSTOM] badge in header
- [ ] Apply static values to all rows
- [ ] Handle column visibility toggle
- [ ] Update Zustand store structure
- **Time:** 6 hours
- **Assignee:** Frontend Dev
- **Dependencies:** 3.2

**3.4 Custom Columns in Database**
- [ ] Update extraction_sessions table to store custom_columns
- [ ] Save custom columns with session
- [ ] Load custom columns with results
- **Time:** 2 hours
- **Assignee:** Backend Dev

**3.5 Custom Columns in Excel Export**
- [ ] Update Excel export to include custom columns
- [ ] Add headers for custom columns
- [ ] Apply values in export
- [ ] Test with multiple custom columns
- **Time:** 4 hours
- **Assignee:** Backend Dev
- **Dependencies:** 3.4

**Phase 3 Testing**
- [ ] E2E test: Add custom column "Batch ID" with value
- [ ] E2E test: Value appears in all result rows
- [ ] E2E test: Custom column exports to Excel correctly
- [ ] E2E test: Multiple custom columns work
- **Time:** 4 hours
- **Assignee:** QA/Dev

**Phase 3 Total:** ~26 hours (1 week with 2 devs)

---

### Phase 4: AI Features (Week 6)

#### Milestone: AI-assisted template creation

#### Tasks

**4.1 AI Inspect API**
- [ ] Implement `POST /api/templates/ai-inspect` endpoint
- [ ] Accept file upload (PDF)
- [ ] Extract first page content
- [ ] Create Claude API prompt for field suggestion
- [ ] Parse response (suggested fields + prompt)
- [ ] Return structured JSON
- [ ] Add error handling
- **Time:** 8 hours
- **Assignee:** Backend Dev

**4.2 AI Inspect Button & Flow**
- [ ] Add "AI Inspect File" button to template section
- [ ] Implement file picker (single PDF, <10MB)
- [ ] Show loading state ("Analyzing...")
- [ ] Call AI inspect API
- [ ] Open AI Suggestions Modal with results
- **Time:** 4 hours
- **Assignee:** Frontend Dev
- **Dependencies:** 4.1

**4.3 AI Suggestions Modal**
- [ ] Create AIInspectModal component
- [ ] Show suggested fields with checkboxes (all checked by default)
- [ ] Show AI explanations per field
- [ ] Show suggested prompt (editable)
- [ ] Allow field name inline editing (double-click)
- [ ] Show "Add Selected (N)" button with count
- **Time:** 8 hours
- **Assignee:** Frontend Dev
- **Dependencies:** 4.2

**4.4 Prompt Merge Logic**
- [ ] Check if user already has prompt
- [ ] If yes, show merge dialog: Replace / Append / Keep existing
- [ ] If no, use AI prompt directly
- [ ] Update Zustand store
- **Time:** 4 hours
- **Assignee:** Frontend Dev
- **Dependencies:** 4.3

**4.5 Field Merging**
- [ ] Append AI-suggested fields to existing fields
- [ ] Avoid duplicates (by name)
- [ ] Preserve field order
- [ ] Update UI with new fields
- **Time:** 2 hours
- **Assignee:** Frontend Dev
- **Dependencies:** 4.3

**Phase 4 Testing**
- [ ] E2E test: AI inspect suggests relevant fields
- [ ] E2E test: User accepts some suggestions
- [ ] E2E test: Prompt merge works (replace/append)
- [ ] E2E test: AI suggestions with existing fields
- [ ] Manual test: AI accuracy on 10 sample invoices
- **Time:** 4 hours
- **Assignee:** QA/Dev

**Phase 4 Total:** ~30 hours (1 week with 2 devs)

---

### Phase 5: Excel Export Options (Week 6)

#### Milestone: Separate vs. combined sheet export

#### Tasks

**5.1 Export Dialog UI**
- [ ] Create ExportOptionsModal component
- [ ] Add radio buttons: Separate sheets / Combined sheet
- [ ] Show preview text for each option
- [ ] Default to "Separate sheets"
- [ ] Add "Export" and "Cancel" buttons
- **Time:** 4 hours
- **Assignee:** Frontend Dev

**5.2 Export API Endpoint**
- [ ] Implement `POST /api/extractions/[id]/export` endpoint
- [ ] Accept options: format (separate/combined)
- [ ] Fetch session results
- [ ] Call Excel generation service
- [ ] Return file buffer
- [ ] Set headers for download
- **Time:** 4 hours
- **Assignee:** Backend Dev

**5.3 Excel Generation Service**
- [ ] Create ExcelExporter service class
- [ ] Implement separate sheets logic
  - Group results by source file
  - Create one sheet per file
  - Sanitize sheet names
- [ ] Implement combined sheet logic
  - Single sheet with all data
  - Name: "Extraction Results"
- [ ] Style headers (bold, background color)
- [ ] Auto-size columns
- [ ] Add unit tests
- **Time:** 10 hours
- **Assignee:** Backend Dev
- **Dependencies:** 5.2

**5.4 Export Button & Flow**
- [ ] Add "Export to Excel" button to results panel
- [ ] Disable when no results
- [ ] Open ExportOptionsModal on click
- [ ] Call export API with selected option
- [ ] Show loading state
- [ ] Trigger browser download
- [ ] Show success toast
- **Time:** 4 hours
- **Assignee:** Frontend Dev
- **Dependencies:** 5.1, 5.3

**Phase 5 Testing**
- [ ] E2E test: Export with separate sheets option
- [ ] E2E test: Export with combined sheet option
- [ ] E2E test: Verify Excel file structure
- [ ] E2E test: Verify data integrity in Excel
- [ ] Manual test: Open Excel files in MS Excel / Google Sheets
- **Time:** 4 hours
- **Assignee:** QA/Dev

**Phase 5 Total:** ~26 hours (1 week with 2 devs, parallel with Phase 4)

---

### Phase 6: Results Table UI + Panel Resizing (Week 6)

#### Milestone: Polished results experience

#### Tasks

**6.1 Table Virtualization**
- [ ] Install react-window
- [ ] Replace basic table with FixedSizeList
- [ ] Implement row renderer
- [ ] Configure row height (40px)
- [ ] Test with 1000+ rows
- [ ] Ensure 60fps scrolling
- **Time:** 8 hours
- **Assignee:** Frontend Dev

**6.2 Frozen Header Row**
- [ ] Implement sticky header with position: sticky
- [ ] Ensure header stays on top during scroll
- [ ] Keep header clickable (sortable columns)
- [ ] Match header width with table body
- [ ] Test with horizontal scroll
- **Time:** 4 hours
- **Assignee:** Frontend Dev
- **Dependencies:** 6.1

**6.3 Always-Visible Horizontal Scrollbar**
- [ ] Create custom scrollbar component
- [ ] Pin to bottom of results panel
- [ ] Sync with table horizontal scroll
- [ ] Show immediately (no vertical scroll needed)
- [ ] Test with many columns
- **Time:** 6 hours
- **Assignee:** Frontend Dev
- **Dependencies:** 6.1

**6.4 Panel Maximize/Minimize**
- [ ] Add maximize button to left panel
- [ ] Add maximize button to right panel
- [ ] Implement maximize logic (minimize other panel)
- [ ] Show thin vertical bar when minimized
- [ ] Click bar to restore
- [ ] Persist state to localStorage
- **Time:** 6 hours
- **Assignee:** Frontend Dev

**6.5 Responsive Panel Behavior**
- [ ] Test on tablet (768-1200px)
- [ ] Make left panel collapsible on tablet
- [ ] Test on mobile (<768px)
- [ ] Stack panels vertically on mobile
- [ ] Use accordion sections on mobile
- **Time:** 4 hours
- **Assignee:** Frontend Dev
- **Dependencies:** 6.4

**Phase 6 Testing**
- [ ] E2E test: Table renders 1000 rows smoothly
- [ ] E2E test: Header stays frozen while scrolling
- [ ] E2E test: Horizontal scrollbar accessible immediately
- [ ] E2E test: Panel maximize/minimize works
- [ ] E2E test: Responsive behavior on tablet/mobile
- [ ] Performance test: FPS during scroll
- **Time:** 4 hours
- **Assignee:** QA/Dev

**Phase 6 Total:** ~32 hours (1 week with 2 devs, parallel with Phases 4-5)

---

### Phase 7: Polish & Edge Cases (Weeks 7-8)

#### Milestone: Production-ready application

#### Tasks

**7.1 Header Navigation**
- [ ] Update app header
- [ ] Add "Templates" link → /templates page
- [ ] Add "History" link → /history page
- [ ] Add "Help" link → help modal or docs
- [ ] Style active states
- **Time:** 4 hours
- **Assignee:** Frontend Dev

**7.2 Error Handling**
- [ ] Add error boundaries
- [ ] Handle API errors gracefully
- [ ] Show user-friendly error messages
- [ ] Add retry mechanisms
- [ ] Log errors to monitoring service
- **Time:** 8 hours
- **Assignee:** Backend Dev

**7.3 Edge Cases**
- [ ] Handle large batches (100 files)
  - Show warning
  - Allow cancellation
- [ ] Handle malformed PDFs
  - Show error badge per file
  - Continue processing others
- [ ] Handle API rate limits
  - Implement exponential backoff
  - Show clear messaging
- [ ] Handle browser tab close
  - Save session ID to localStorage
  - Resume on return
- **Time:** 12 hours
- **Assignee:** Backend Dev

**7.4 Session Persistence**
- [ ] Implement session cleanup cron job
- [ ] Add user settings UI for retention period
- [ ] Create /api/settings endpoints
- [ ] Update user_settings table
- [ ] Add manual cleanup page
- **Time:** 8 hours
- **Assignee:** Backend Dev

**7.5 Loading States & Feedback**
- [ ] Add skeleton loaders
- [ ] Add progress indicators
- [ ] Add success/error toasts
- [ ] Add confirmation dialogs (delete, etc.)
- [ ] Polish animations
- **Time:** 6 hours
- **Assignee:** Frontend Dev

**7.6 Accessibility Audit**
- [ ] Test keyboard navigation
- [ ] Test screen readers (NVDA, JAWS)
- [ ] Check color contrast (WCAG AA)
- [ ] Add ARIA labels
- [ ] Test focus management
- [ ] Fix accessibility issues
- **Time:** 8 hours
- **Assignee:** Frontend Dev

**7.7 Performance Optimization**
- [ ] Optimize bundle size
- [ ] Implement code splitting
- [ ] Add image optimization
- [ ] Optimize API responses
- [ ] Add caching headers
- [ ] Run Lighthouse audit
- **Time:** 8 hours
- **Assignee:** Full Stack Dev

**7.8 User Testing**
- [ ] Recruit 3-5 users
- [ ] Conduct usability sessions
- [ ] Collect feedback
- [ ] Prioritize and implement fixes
- [ ] Re-test with users
- **Time:** 16 hours
- **Assignee:** PM + Dev

**7.9 Documentation**
- [ ] Write user guide
- [ ] Create help tooltips
- [ ] Document API endpoints
- [ ] Write deployment guide
- [ ] Create troubleshooting guide
- **Time:** 8 hours
- **Assignee:** Tech Writer / Dev

**7.10 Final QA & Bug Fixes**
- [ ] Run full regression test suite
- [ ] Fix critical bugs
- [ ] Fix high-priority bugs
- [ ] Triage low-priority bugs
- [ ] Smoke test on staging
- **Time:** 16 hours
- **Assignee:** QA + Dev

**Phase 7 Total:** ~94 hours (2 weeks with 2-3 devs)

---

## 4. Testing Strategy

### 4.1 Test Pyramid

```
                  ┌─────────────┐
                  │  E2E Tests  │  (10%)
                  │  Playwright │
                  └─────────────┘
                ┌───────────────────┐
                │ Integration Tests │  (30%)
                │  Vitest + MSW     │
                └───────────────────┘
            ┌─────────────────────────────┐
            │      Unit Tests             │  (60%)
            │  Vitest + Testing Library   │
            └─────────────────────────────┘
```

---

### 4.2 Unit Tests

**Target:** 80% code coverage

**Test Files:**
```
src/
├── services/
│   ├── PDFParser.test.ts
│   ├── DocumentDetector.test.ts
│   ├── ExcelExporter.test.ts
│   └── BatchProcessor.test.ts
├── lib/
│   ├── validation.test.ts
│   └── utils.test.ts
└── components/
    ├── FieldTag.test.tsx
    ├── ResultsTable.test.tsx
    └── FileUploadSection.test.tsx
```

**Example Unit Test:**

```typescript
// services/DocumentDetector.test.ts
import { describe, it, expect } from 'vitest'
import { DocumentDetector } from './DocumentDetector'
import { mockPDFPages } from '../__mocks__/pdf'

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

  it('handles single document correctly', () => {
    const detector = new DocumentDetector()
    const pages = mockPDFPages.singleInvoice

    const documents = detector.detect(pages)

    expect(documents).toHaveLength(1)
    expect(documents[0].startPage).toBe(0)
    expect(documents[0].endPage).toBe(pages.length)
  })

  it('uses aggressive detection strategy', () => {
    const detector = new DocumentDetector()
    const pages = mockPDFPages.ambiguous // Borderline case

    const documents = detector.detect(pages)

    // Should split on 1+ indicator (aggressive)
    expect(documents.length).toBeGreaterThan(1)
  })
})
```

---

### 4.3 Integration Tests

**Target:** Critical user flows

**Test Files:**
```
tests/integration/
├── template-crud.test.ts
├── batch-extraction.test.ts
├── excel-export.test.ts
└── ai-inspect.test.ts
```

**Example Integration Test:**

```typescript
// tests/integration/batch-extraction.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { createMockSupabaseClient } from '../__mocks__/supabase'
import { batchExtractionHandler } from '@/app/api/extractions/batch/route'

describe('Batch Extraction API', () => {
  beforeEach(() => {
    // Reset mocks
  })

  it('processes multiple files and stores results', async () => {
    const mockFiles = [
      createMockFile('invoice1.pdf', 3),
      createMockFile('invoice2.pdf', 2),
    ]

    const response = await batchExtractionHandler({
      template: mockTemplate,
      files: mockFiles,
      customColumns: [],
    })

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.sessionId).toBeDefined()

    // Check session created in DB
    const session = await supabase
      .from('extraction_sessions')
      .select()
      .eq('id', data.sessionId)
      .single()

    expect(session.data.status).toBe('processing')
  })
})
```

---

### 4.4 E2E Tests (Playwright)

**Target:** Critical user journeys

**Test Files:**
```
e2e/
├── create-template.spec.ts
├── batch-extraction.spec.ts
├── ai-inspect.spec.ts
└── excel-export.spec.ts
```

**Example E2E Test:**

```typescript
// e2e/batch-extraction.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Batch Extraction', () => {
  test('complete batch extraction flow', async ({ page }) => {
    await page.goto('/extract')

    // Create template
    await page.click('text=New template')
    await page.click('text=+ Add field')
    await page.fill('input[name="fieldName"]', 'Invoice Number')
    await page.click('text=Save Field')

    await page.click('text=+ Add field')
    await page.fill('input[name="fieldName"]', 'Amount')
    await page.click('text=Save Field')

    // Upload files
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles([
      'tests/fixtures/invoice1.pdf',
      'tests/fixtures/invoice2.pdf',
    ])

    // Wait for files to appear
    await expect(page.locator('text=invoice1.pdf')).toBeVisible()
    await expect(page.locator('text=invoice2.pdf')).toBeVisible()

    // Start extraction
    await page.click('text=Start Extraction')

    // Wait for processing
    await expect(page.locator('text=Processing')).toBeVisible()

    // Wait for results (with timeout)
    await expect(page.locator('text=EXTRACTED DATA')).toBeVisible({
      timeout: 60000,
    })

    // Verify results table
    const rows = page.locator('table tbody tr')
    await expect(rows).toHaveCount(2) // 2 documents detected

    // Check data
    await expect(page.locator('text=INV-001')).toBeVisible()
    await expect(page.locator('text=$1,250')).toBeVisible()

    // Export to Excel
    await page.click('text=Export to Excel')
    await page.click('text=Separate sheets')

    const downloadPromise = page.waitForEvent('download')
    await page.click('text=Export')
    const download = await downloadPromise

    expect(download.suggestedFilename()).toContain('.xlsx')
  })
})
```

---

### 4.5 Performance Tests

**Tools:** Playwright + Lighthouse

**Metrics:**
- Page load: <2 seconds
- Table render (1000 rows): <1 second
- API response: <3 seconds (P95)
- Batch processing: <3 minutes for 20 files

**Test Script:**

```typescript
// e2e/performance.spec.ts
import { test, expect } from '@playwright/test'

test('results table performance with 1000 rows', async ({ page }) => {
  await page.goto('/extract')

  // Mock API to return 1000 results
  await page.route('**/api/extractions/*/results', (route) => {
    route.fulfill({
      body: JSON.stringify(generate1000Results()),
    })
  })

  // Trigger results load
  await page.click('text=Load Results')

  // Measure render time
  const startTime = Date.now()
  await expect(page.locator('table tbody tr').first()).toBeVisible()
  const renderTime = Date.now() - startTime

  expect(renderTime).toBeLessThan(1000) // <1 second

  // Test scroll performance
  const scrollStartTime = Date.now()
  await page.evaluate(() => {
    const table = document.querySelector('[data-testid="results-table"]')
    table?.scrollTo(0, 10000) // Scroll to bottom
  })
  const scrollTime = Date.now() - scrollStartTime

  expect(scrollTime).toBeLessThan(100) // Smooth 60fps
})
```

---

## 5. Deployment & DevOps

### 5.1 Environments

**Development**
- Local: `http://localhost:3000`
- Database: Local Supabase or dev instance
- API Keys: Development keys

**Staging**
- URL: `https://mmdocscan-staging.vercel.app`
- Database: Supabase staging project
- API Keys: Staging keys
- Purpose: QA testing, stakeholder demos

**Production**
- URL: `https://app.mmdocscan.com` (existing)
- Database: Supabase production
- API Keys: Production keys
- Purpose: Live users

---

### 5.2 CI/CD Pipeline

**GitHub Actions Workflow:**

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run linter
        run: npm run lint

      - name: Run type check
        run: npm run type-check

      - name: Run unit tests
        run: npm run test:unit

      - name: Run integration tests
        run: npm run test:integration
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_TEST_URL }}
          SUPABASE_KEY: ${{ secrets.SUPABASE_TEST_KEY }}

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_TEST_URL }}
          SUPABASE_KEY: ${{ secrets.SUPABASE_TEST_KEY }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_TEST_KEY }}

  deploy-staging:
    needs: test
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Vercel (Staging)
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
          scope: staging

  deploy-production:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Vercel (Production)
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

---

### 5.3 Database Migrations

**Migration Strategy:**

1. **Development:** Apply migrations to local DB
2. **Staging:** Apply migrations via Supabase CLI
3. **Production:** Apply migrations during maintenance window (or use zero-downtime approach)

**Migration Files:**

```
supabase/migrations/
├── 20250124_create_templates_table.sql
├── 20250124_create_sessions_table.sql
├── 20250124_create_results_table.sql
├── 20250124_create_user_settings_table.sql
└── 20250124_add_rls_policies.sql
```

**Rollback Plan:**
- Keep migration rollback scripts
- Test rollback in staging first
- Have DB backup before production migrations

---

### 5.4 Monitoring & Logging

**Tools:**
- **Vercel Analytics:** Performance monitoring
- **Sentry:** Error tracking
- **Supabase Logs:** Database queries
- **Custom Logging:** Winston or Pino for API logs

**Key Metrics to Monitor:**
- API response times (P50, P95, P99)
- Error rates
- Batch processing success rate
- PDF parsing failures
- Claude API rate limit hits
- Database query performance

**Alerts:**
- API error rate >5%
- Batch processing failure rate >10%
- API response time >5 seconds (P95)
- Database connection errors

---

## 6. Risk Management

### 6.1 Technical Risks

**Risk 1: Claude API Rate Limits**
- **Likelihood:** Medium
- **Impact:** High (blocks batch processing)
- **Mitigation:**
  - Implement p-limit with max 5 concurrent requests
  - Add exponential backoff on 429 errors
  - Queue remaining requests
  - Show clear user messaging
  - Consider upgrading API tier
- **Contingency:** Pause processing, show ETA to user

**Risk 2: Auto-Detection Inaccuracy**
- **Likelihood:** Medium-High
- **Impact:** Medium (user frustration, false positives)
- **Mitigation:**
  - Use aggressive strategy (prefer false positives)
  - Show confidence scores
  - Add manual merge/split UI (Phase 7)
  - Collect user feedback on accuracy
  - Iterate on detection algorithm
- **Contingency:** Allow user to disable auto-detection

**Risk 3: PDF Parsing Failures**
- **Likelihood:** Medium
- **Impact:** Medium (some files won't process)
- **Mitigation:**
  - Test with diverse PDF samples
  - Handle errors gracefully (continue with other files)
  - Suggest re-saving as PDF/A
  - Log failures for analysis
- **Contingency:** Provide manual data entry option (future)

**Risk 4: Performance Degradation (Large Batches)**
- **Likelihood:** Low-Medium
- **Impact:** Medium (slow processing frustrates users)
- **Mitigation:**
  - Set expectations (show estimated time)
  - Stream parsing (don't load entire file in memory)
  - Optimize API payloads
  - Consider background jobs for >50 files
- **Contingency:** Add batch size limits

**Risk 5: State Management Complexity**
- **Likelihood:** Low
- **Impact:** Medium (bugs, difficult maintenance)
- **Mitigation:**
  - Use Zustand with TypeScript (type safety)
  - Keep state flat (avoid deep nesting)
  - Add DevTools for debugging
  - Write integration tests for state changes
- **Contingency:** Refactor to simpler state structure if needed

---

### 6.2 Project Risks

**Risk 1: Scope Creep**
- **Likelihood:** Medium
- **Impact:** High (delays, budget overrun)
- **Mitigation:**
  - Strict scope adherence (requirements v1.2)
  - Defer enhancements to Phase 2.0
  - Regular stakeholder check-ins
  - Change request process
- **Contingency:** Re-prioritize features, extend timeline

**Risk 2: Resource Availability**
- **Likelihood:** Low
- **Impact:** High (delays)
- **Mitigation:**
  - 2 developers minimum
  - Cross-train team members
  - Document everything
  - Use pair programming for critical features
- **Contingency:** Hire contractor or reduce scope

**Risk 3: Third-Party API Changes**
- **Likelihood:** Low
- **Impact:** Medium (breaking changes)
- **Mitigation:**
  - Pin SDK versions
  - Monitor Anthropic API changelog
  - Have fallback to older API version
  - Add integration tests
- **Contingency:** Update SDK, adjust code

---

## 7. Success Criteria

### 7.1 Functional Success

- [ ] User can create template with AI assistance in <60 seconds
- [ ] User can upload and process 20 files in <3 minutes
- [ ] Auto-detection accuracy >80% on standard invoices
- [ ] Results table renders 1000 rows smoothly (60fps)
- [ ] Excel export works with both options (separate/combined)
- [ ] Static custom columns work correctly
- [ ] Panels resize smoothly with draggable divider
- [ ] Header remains frozen while scrolling
- [ ] Horizontal scrollbar visible immediately

### 7.2 Performance Success

- [ ] Page load <2 seconds
- [ ] Template switch <500ms
- [ ] File upload feedback immediate (<100ms)
- [ ] API response time <3 seconds (P95)
- [ ] Batch processing: 20 files (100 pages) <3 minutes
- [ ] Excel export generation <5 seconds for 1000 rows
- [ ] Table scroll: 60fps with 1000+ rows

### 7.3 Quality Success

- [ ] 0 critical bugs in production
- [ ] <5 high-priority bugs in first month
- [ ] 80% unit test coverage
- [ ] 100% E2E test coverage for critical flows
- [ ] WCAG 2.1 AA accessibility compliance
- [ ] Lighthouse score >90 (Performance, Accessibility)

### 7.4 User Success

- [ ] First-time user completes extraction in <5 minutes
- [ ] Expert user processes batch in <2 minutes
- [ ] User satisfaction >4.5/5
- [ ] Net Promoter Score (NPS) >50
- [ ] <5% support ticket rate (issues per extraction)

---

## 8. Timeline Summary

```
Week 1-2:  Phase 1 - Foundation
Week 3-4:  Phase 2 - Batch Processing
Week 5:    Phase 3 - Custom Columns (Static)
Week 6:    Phase 4, 5, 6 - AI Features + Export + Results UI (parallel)
Week 7-8:  Phase 7 - Polish & Edge Cases

Total: 8 Weeks
```

**Critical Path:**
1. Phase 1 (Foundation) → Phase 2 (Batch Processing)
2. Phase 2 → Phase 3, 4, 5, 6 (parallel)
3. All phases → Phase 7 (Polish)

**Milestones:**
- Week 2: Basic extraction working (demo to stakeholder)
- Week 4: Batch processing functional (internal testing)
- Week 6: All features complete (QA testing)
- Week 8: Production ready (go-live)

---

## 9. Team Structure

**Recommended Team:**
- **1 Tech Lead / Senior Full-Stack Dev** (100%)
- **1 Frontend Dev** (100%)
- **1 Backend Dev** (100% weeks 1-4, 50% weeks 5-8)
- **1 QA Engineer** (50% weeks 3-8)
- **1 Product Manager** (25% - oversight)

**Total Effort:** ~450 developer hours over 8 weeks

---

## 10. Next Steps

1. **Stakeholder Sign-Off**
   - Review this implementation plan
   - Confirm timeline and resource allocation
   - Approve budget

2. **Team Kickoff**
   - Assemble development team
   - Review requirements and plan
   - Set up development environment
   - Create project board (GitHub Projects or Jira)

3. **Sprint 0 (Pre-Development)**
   - Set up CI/CD pipeline
   - Create database migrations
   - Install dependencies
   - Configure monitoring tools
   - Create test fixtures

4. **Begin Phase 1** (Week 1)
   - Start with task 1.1 (Project Setup)
   - Daily standups
   - Weekly demos to stakeholder

---

**Document Status:** Ready for Implementation
**Approval Required:** Tech Lead, Product Owner
**Next Review:** After Phase 1 completion (Week 2)