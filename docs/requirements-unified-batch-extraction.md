# Requirements: Unified Batch Extraction Workflow

**Project:** MMDocScan - Next Generation Features
**Version:** 1.2
**Date:** 2025-10-24
**Status:** Ready for Review
**Stakeholder:** Steve (Product Owner)
**Analyst:** Mary (Business Analyst)

---

## Executive Summary

This document defines requirements for two major enhancements to MMDocScan:

1. **Unified Single-Page Workflow**: Redesign multi-step extraction process into streamlined single-page experience
2. **Batch Processing**: Support processing multiple files with auto-detection of multiple documents per file
3. **Custom Columns**: Allow users to add static values and calculated fields to extraction results

**Business Value:**
- **Efficiency**: 97.5% reduction in clicks for batch processing (120 clicks → 3 clicks for 20 files)
- **User Experience**: Eliminate context-switching between pages
- **Analytical Power**: Custom columns enable in-app analysis without post-processing in Excel
- **Scalability**: Handle enterprise workloads (1-100+ files per batch)

---

## 1. Batch Processing Requirements

### 1.1 User Stories

**US-1: Multi-File Upload**
```
As a user
I want to upload multiple PDF files at once
So that I can process many documents in a single batch
```

**Acceptance Criteria:**
- ✅ Support drag-and-drop of 1 to 100 files
- ✅ Show file list with metadata (name, size, page count)
- ✅ Allow removal of files before processing
- ✅ Validate file types (PDF only for MVP)
- ✅ Show aggregate stats (total files, total pages)

---

**US-2: Auto-Detection of Multiple Documents**
```
As a user
I want the system to automatically detect when a PDF contains multiple invoices
So that I don't have to split files manually
```

**Acceptance Criteria:**
- ✅ Analyze each PDF for document boundaries (page breaks, headers, footers)
- ✅ Detect 1-N documents per file
- ✅ Show detection results: "File: batch1.pdf → Detected 3 invoices on pages 1, 3, 8"
- ✅ Handle single-document files (most common case)
- ✅ Process each detected document independently

**Technical Notes:**
- Detection algorithm needs PDF parsing (pdf-parse or pdf.js)
- **Strategy: Aggressive detection** (prefer extra breaks over missed breaks)
- **Key insight:** Document content won't switch mid-page, use page boundaries as primary indicator
- Heuristics (1+ indicator triggers split):
  1. Page boundary detection (new page = potential new document)
  2. Repeating header patterns (e.g., "INVOICE" at top)
  3. Invoice/document number sequences
  4. Date patterns near top of page
- Users can manually merge incorrectly split documents in results table (future feature)
- Fallback: If detection uncertain, still split (better to have false positives than miss documents)

---

**US-3: Unified Results Table**
```
As a user
I want to see all extracted data in one table
So that I can review and analyze all results together
```

**Acceptance Criteria:**
- ✅ One table with all extracted records (all files, all detected documents)
- ✅ Source column format: "File1-P1" (shows source file + page number)
- ✅ Hover on source shows full filename
- ✅ Template fields applied consistently across all rows
- ✅ Support 1000+ rows without performance degradation

---

**US-4: Excel Export with Options**
```
As a user
I want to choose how my batch results are exported
So that I can match my downstream workflow needs
```

**Acceptance Criteria:**
- ✅ Export dialog with two options:
  - Option A: "Separate sheets per source file" (default)
  - Option B: "Single combined sheet"
- ✅ Sheet names match source filenames (sanitized)
- ✅ Include all custom columns in export
- ✅ Preserve data types (dates, currency, numbers)
- ✅ Export button disabled until extraction complete

---

### 1.2 Functional Requirements

#### FR-1: File Upload Component
```
Component: Multi-File Upload Zone
Location: Left panel, section ②
```

**Requirements:**
- Support drag-and-drop multiple files
- Support click-to-browse file picker
- Show file list with:
  - File icon
  - Filename (truncate if >30 chars)
  - File size (KB/MB)
  - Page count (calculated after upload)
  - Remove button [×]
- "+ Add more files" button to append additional files
- Max total size: 100MB (configurable)
- Max files: 100 (configurable)

**File List Item Design:**
```
📄 invoices_batch1.pdf
   2.3 MB · 12 pages
   [Auto-detected: 3 invoices]    [×]
```

**States:**
- Empty: Show drop zone with instructions
- Uploading: Show progress bar per file
- Uploaded: Show file list with metadata
- Processing: Lock list (no removal), show status per file
- Complete: Unlock list, show detection results

---

#### FR-2: Batch Processing Engine

**Input:**
- Array of PDF files (File objects)
- Selected template (field definitions + prompt)
- Custom columns configuration

**Processing Steps:**
1. **PDF Analysis Phase** (per file)
   - Parse PDF structure
   - Detect document boundaries
   - Extract page count
   - Identify repeating patterns

2. **Extraction Phase** (per detected document)
   - Send page content to Claude API
   - Apply template fields + prompt
   - Parse JSON response
   - Associate with source file + page number

3. **Aggregation Phase**
   - Combine all extraction results
   - Apply custom column calculations
   - Generate unified dataset

4. **Output Phase**
   - Populate results table
   - Enable export functionality

**Error Handling:**
- If file parsing fails: Show error badge, continue with other files
- If extraction fails: Show error row in results, continue with other documents
- If API rate limit hit: Queue remaining, show progress
- Rollback: Allow re-processing of failed items

---

#### FR-3: Progress Tracking

**Requirements:**
- Overall progress bar: "Processing 67% (4/6 files)"
- Per-file status indicators:
  ```
  ✓ invoices_batch1.pdf (3 invoices extracted)
  ⟳ march_receipts.pdf (Extracting 1/2...)
  ⏸ april_invoices.pdf (Queued)
  ✗ corrupted.pdf (Failed: Unable to parse)
  ```
- Real-time updates (websocket or polling)
- Estimated time remaining (after first file completes)
- Ability to cancel batch (show confirmation dialog)

---

#### FR-4: Source Tracking

**Requirement:** Every extracted record must be traceable to source file + page number

**Data Model:**
```typescript
type ExtractionResult = {
  id: string
  sourceFile: string          // Original filename
  sourceFileId: string        // UUID for file
  pageNumber: number          // Page where document starts
  detectionConfidence: number // 0-1 score
  extractedData: Record<string, any>
  customColumns: Record<string, any>
  timestamp: Date
}
```

**UI Display:**
- Source column shows: "File1-P1" (abbreviated)
- Tooltip on hover: Full filename + "Page 1 of 12"
- Sortable by source file
- Filterable by source file (dropdown)

---

### 1.3 Non-Functional Requirements

**Performance:**
- Process 20 files (avg 5 pages each) in <2 minutes
- Display results table with 500 rows in <1 second
- Excel export generation in <5 seconds

**Scalability:**
- Support up to 100 files per batch
- Support up to 1000 total extracted records
- API rate limiting: Queue requests, don't fail

**Reliability:**
- 95% success rate on well-formed PDFs
- Graceful degradation on malformed files
- No data loss if browser tab closed (save session state)

**Usability:**
- Clear progress indicators
- Ability to cancel/pause batch
- Informative error messages

---

## 2. Unified UI Requirements

### 2.1 User Stories

**US-5: Single-Page Workflow**
```
As a user
I want to configure and execute extractions on one page
So that I don't lose context switching between steps
```

**Acceptance Criteria:**
- ✅ All configuration in left panel (fixed width)
- ✅ Results appear in right panel (fluid width)
- ✅ No page navigation required
- ✅ Configuration remains editable after extraction
- ✅ Can iterate without losing results

---

**US-6: Tag-Based Template Builder**
```
As a user
I want to define extraction fields as draggable tags
So that I can quickly see and reorder fields
```

**Acceptance Criteria:**
- ✅ Fields displayed as horizontal chip/tags
- ✅ Drag-and-drop to reorder
- ✅ Visual indicator (📝) if field has notes
- ✅ Click tag to edit name + instructions
- ✅ Delete tag with [×] button
- ✅ "+ Add field" button to create new tags

---

**US-7: AI-Assisted Template Creation**
```
As a user
I want to upload a sample document and get AI-suggested fields
So that I can quickly create templates for new document types
```

**Acceptance Criteria:**
- ✅ "AI Inspect File" button in template section
- ✅ Upload sample PDF (single file)
- ✅ AI analyzes and suggests fields with descriptions
- ✅ Modal shows suggestions with checkboxes (all checked by default)
- ✅ AI generates suggested extraction prompt
- ✅ User can accept/reject individual suggestions
- ✅ Suggestions merge into current template

---

### 2.2 Layout Specification

**Page Structure:**
```
┌──────────────────────────────────────────────────────────────┐
│ Header: MMDocScan        [Templates] [History] [Help]       │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌───────────────┐ ┊ ┌──────────────────────────────────┐   │
│ │ LEFT PANEL    │ ┊ │ RIGHT PANEL                      │   │
│ │ (Resizable)   │ ┊ │ (Resizable)                      │   │
│ │ Default 300px │ ┊ │ Fluid, min 600px                 │   │
│ │               │ ┊ │                                  │   │
│ │ ① Template    │ ┊ │ [Empty State]                    │   │
│ │ ② Files       │ ┊ │      or                          │   │
│ │ ③ Custom Cols │ ┊ │ [Processing]                     │   │
│ │ ④ Export      │ ┊ │      or                          │   │
│ │               │ ┊ │ [Results Table - Frozen header]  │   │
│ │ [Extract Btn] │ ┊ │ [Scrollbar always visible]       │   │
│ │               │ ┊ │                                  │   │
│ │ [◀ Maximize]  │ ┊ │                      [Maximize ▶]│   │
│ └───────────────┘ ┊ └──────────────────────────────────┘   │
│                   ↕ Draggable divider                       │
└──────────────────────────────────────────────────────────────┘
```

**Panel Interaction:**
- **Draggable Divider (┊)**: User can drag left/right to resize panels
- **Minimize/Maximize**:
  - Click "◀ Maximize" on left panel → Right panel minimizes to thin vertical bar
  - Click "Maximize ▶" on right panel → Left panel minimizes to thin vertical bar
  - Click minimized bar → Restore panel to previous size
- **Default State**: Left 300px, Right fluid (remaining width)
- **Min Widths**: Left 250px, Right 600px (prevents unusable layouts)

**Responsive Breakpoints:**
- Desktop (>1200px): Side-by-side as shown with full resize functionality
- Tablet (768-1200px): Left panel collapsible, no resize (stacked on demand)
- Mobile (<768px): Single column, accordion sections

---

### 2.3 Template Section Detailed Spec

**Component: Template Builder**
**Location:** Left panel, section ①

#### Sub-Component A: Template Mode Toggle
```
○ New template  ● Load existing
  └─ [⌄ Invoice Template (8 fields)]
```

**Behavior:**
- Default: "New template" selected
- Click "Load existing" → Reveals dropdown
- Dropdown populated from /api/templates
- On select: Load fields + prompt into UI
- Show "Unsaved changes" indicator if dirty

---

#### Sub-Component B: AI Inspect Button
```
┌─────────────────────────────────────┐
│ [↯] AI Inspect File                 │
└─────────────────────────────────────┘
```

**Interaction Flow:**
1. Click button → Opens file picker (PDF only)
2. User selects sample file
3. Button changes to: `[↯] Analyzing...` (disabled)
4. API call: `POST /api/ai-inspect` with file
5. Response: Suggested fields + prompt
6. Opens AI Suggestions Modal (see section 2.4)

**Error Handling:**
- File too large: "File must be <10MB"
- Invalid format: "Only PDF files supported"
- API error: "Analysis failed. Try again or add fields manually"

---

#### Sub-Component C: Field Tags Area
```
Fields to extract:
┌─────────────────────────────────────┐
│ ⠿ Invoice # 📝  [x]                 │
│ ⠿ Date         [x]                  │
│ ⠿ Amount       [x]                  │
│ ⠿ Vendor 📝     [x]                 │
│                                     │
│ [+ Add field]                       │
└─────────────────────────────────────┘
```

**Field Tag Structure:**
```
⠿ Invoice # 📝  [x]
│ │         │    └─ Delete (hover only)
│ │         └────── Note indicator (if instructions exist)
│ └──────────────── Field name (clickable)
└────────────────── Drag handle
```

**Interactions:**
- **Click tag** → Opens Field Edit Modal
- **Drag tag** → Reorder (visual drop zones appear)
- **Click [×]** → Remove field (no confirmation for <10 fields)
- **Click [+ Add field]** → Creates new tag "New Field", opens modal immediately

**Drag-and-Drop:**
- Library: @dnd-kit/core (React)
- Visual feedback: Dragged tag lifts (shadow), others show drop zones
- Keyboard: Arrow up/down while focused on tag
- Accessibility: Full keyboard support

**Validation:**
- Min 1 field required
- Max 50 fields (prevent API payload issues)
- No duplicate field names
- Field name: 1-50 characters

---

#### Sub-Component D: Extraction Instructions
```
Extraction instructions:
┌─────────────────────────────────────┐
│ Look for invoice number at top      │
│ right. Date format: MM/DD/YYYY.     │
│ Amount should include currency.     │
│                                     │
└─────────────────────────────────────┘
⚙ Show system instructions
```

**Specifications:**
- Textarea: 4 rows default, auto-expand to 8 rows max
- Character limit: 2000 characters
- Placeholder: "Add instructions for how to extract these fields (optional)"
- Persistent: Saves with template
- Combines with system prompt additively

**Advanced View Toggle:**
```
⚙ Show system instructions
```
- Click → Expands collapsible panel
- Shows read-only system prompt
- Shows how fields + user prompt combine
- Educational: Helps users understand what AI sees

---

#### Sub-Component E: Save Template Button
```
[ Save Template ]
```

**Context-Aware Behavior:**

**Case 1: New Template (Unsaved)**
- Button text: "Save Template"
- Click → Opens Save Template Dialog (name input)
- Saves fields + prompt to database
- Updates dropdown, switches to "Load existing" mode

**Case 2: Existing Template (Loaded, No Changes)**
- Button text: "Save Template" (disabled)
- No changes detected, button grayed out

**Case 3: Existing Template (Modified)**
- Button text: "• Save Template" (dot indicator)
- Click → Opens Update Template Dialog
- Options: "Replace [Name]" or "Save as new"

---

### 2.4 AI Suggestions Modal

**Trigger:** User clicks "AI Inspect File" and uploads sample

**Modal Layout:**
```
╔═══════════════════════════════════════════╗
║  AI Suggested Fields                  [×] ║
╠═══════════════════════════════════════════╣
║                                           ║
║  Based on the sample document, we found:  ║
║                                           ║
║  [✓] Invoice Number                       ║
║      "Found as 'INV-' prefix"             ║
║                                           ║
║  [✓] Invoice Date                         ║
║      "Located in top right corner"        ║
║                                           ║
║  [✓] Total Amount                         ║
║      "With currency symbol"               ║
║                                           ║
║  [✓] Vendor Name                          ║
║      "Company letterhead"                 ║
║                                           ║
║  [ ] Line Items                           ║
║      "Table format detected"              ║
║                                           ║
║  [ ] Tax Amount                           ║
║      "Separate line before total"         ║
║                                           ║
║  ─────────────────────────────────────    ║
║                                           ║
║  Suggested prompt:                        ║
║  ┌─────────────────────────────────────┐ ║
║  │ Invoice numbers have 'INV-' prefix. │ ║
║  │ Date format is MM/DD/YYYY. Look for │ ║
║  │ total after 'Amount Due' label.     │ ║
║  └─────────────────────────────────────┘ ║
║                                           ║
╠═══════════════════════════════════════════╣
║                 [Cancel] [Add Selected]   ║
╚═══════════════════════════════════════════╝
```

**Functionality:**
- All fields checked by default
- User can uncheck unwanted suggestions
- Field names editable (double-click inline)
- AI explanation helps user understand detection
- Suggested prompt editable
- "Add Selected" button shows count: "Add Selected (4)"

**Integration:**
- On "Add Selected" → Fields merge into current template
- If template already has fields → Append new ones
- If prompt already exists → Show Prompt Merge Dialog:
  ```
  You have existing instructions. Would you like to:
  ○ Replace with AI suggestions
  ○ Append AI suggestions
  ○ Keep existing only

  [Cancel] [Apply]
  ```

---

### 2.5 Field Edit Modal

**Trigger:** User clicks a field tag

**Modal Layout:**
```
╔═══════════════════════════════════════════╗
║  Edit Field                           [×] ║
╠═══════════════════════════════════════════╣
║                                           ║
║  Field name:                              ║
║  ┌─────────────────────────────────────┐ ║
║  │ Invoice Number                      │ ║
║  └─────────────────────────────────────┘ ║
║                                           ║
║  Instructions (optional):                 ║
║  ┌─────────────────────────────────────┐ ║
║  │ This field might be labeled as      │ ║
║  │ "Invoice #" or "INV Number".        │ ║
║  │ Usually appears in top right        │ ║
║  │ corner of document.                 │ ║
║  │                                     │ ║
║  └─────────────────────────────────────┘ ║
║  0/500 characters                         ║
║                                           ║
║  💡 Tip: Add notes about variations,      ║
║     locations, or formats to help AI.     ║
║                                           ║
╠═══════════════════════════════════════════╣
║                    [Cancel] [Save Field]  ║
╚═══════════════════════════════════════════╝
```

**Specifications:**
- Field name: Required, 1-50 chars, no duplicates
- Instructions: Optional, 0-500 chars
- Auto-focus on field name input
- Keyboard shortcuts: Enter (save), Esc (cancel)

**Validation:**
- Empty field name: "Field name required"
- Duplicate name: "Field name already exists"
- No validation on instructions (optional)

---

### 2.6 Save Template Dialogs

#### Dialog 1: Save New Template
```
╔═══════════════════════════════════════════╗
║  Save Template                        [×] ║
╠═══════════════════════════════════════════╣
║                                           ║
║  Template name:                           ║
║  ┌─────────────────────────────────────┐ ║
║  │ Standard Invoice                    │ ║
║  └─────────────────────────────────────┘ ║
║                                           ║
║  This template will save:                 ║
║  • 4 extraction fields                    ║
║  • Custom extraction instructions         ║
║                                           ║
║  You can load this template anytime from  ║
║  the "Load existing" dropdown.            ║
║                                           ║
╠═══════════════════════════════════════════╣
║                       [Cancel] [Save]     ║
╚═══════════════════════════════════════════╝
```

---

#### Dialog 2: Update Existing Template
```
╔═══════════════════════════════════════════╗
║  Save Template Changes                [×] ║
╠═══════════════════════════════════════════╣
║                                           ║
║  You've modified: Invoice Template        ║
║                                           ║
║  Changes:                                 ║
║  • 2 fields added                         ║
║  • Instructions updated                   ║
║                                           ║
║  ● Replace "Invoice Template"             ║
║     Updates existing template             ║
║                                           ║
║  ○ Save as new template                   ║
║     ┌─────────────────────────────────┐  ║
║     │ Invoice Template (Copy)         │  ║
║     └─────────────────────────────────┘  ║
║                                           ║
╠═══════════════════════════════════════════╣
║                       [Cancel] [Save]     ║
╚═══════════════════════════════════════════╝
```

**Change Detection:**
- Compare current state to loaded template
- Show summary: fields added/removed, prompt changed
- Default: Replace (most common use case)
- "Save as new" reveals name input, pre-fills with "(Copy)"

---

## 3. Custom Columns Requirements

### 3.1 User Stories

**US-8: Static Custom Columns (Day 1 Priority)**
```
As a user
I want to add static value columns to my extraction results
So that I can include batch metadata (Batch ID, Department, etc.)
```

**Acceptance Criteria:**
- ✅ Add custom column with name + static value
- ✅ Value applies to all rows in batch
- ✅ Show in results table
- ✅ Include in Excel export
- ✅ Save custom columns with session (not template)

**Example Use Cases:**
- Batch ID: "Q1-2024"
- Department: "Finance"
- Processor: "Steve"
- Project Code: "PROJ-123"

---

**US-9: Formula Custom Columns (Important)**
```
As a user
I want to create calculated columns using formulas
So that I can derive insights without post-processing in Excel
```

**Acceptance Criteria:**
- ✅ Add custom column with name + formula
- ✅ Formula references extracted field names
- ✅ Support basic math operators (+, -, *, /)
- ✅ Calculate dynamically per row
- ✅ Show in results table
- ✅ Include in Excel export

**Example Use Cases:**
- Net Amount: `=Amount-Tax`
- Days Overdue: `=TODAY()-Date+30`
- Markup: `=(Amount-Cost)/Cost`

---

### 3.2 Functional Requirements

#### FR-5: Custom Columns UI Component

**Location:** Left panel, section ③

**Layout:**
```
③ CUSTOM COLUMNS (Optional)

Batch ID          [Static ⌄]
└─ "March2024"         [×]

Net Amount      [Formula ⌄]
└─ =Amount-Tax         [×]

+ Add Column
```

**Add Column Button:**
- Click → Opens Custom Column Modal
- Modal has two tabs: "Static Value" and "Formula" (Phase 2)

---

#### FR-6: Custom Column Modal (Static Values)

**Phase 1: Static Values Only**

```
╔═══════════════════════════════════════════╗
║  Add Custom Column                    [×] ║
╠═══════════════════════════════════════════╣
║                                           ║
║ Column Type: ● Static Value  ○ Formula   ║
║                                           ║
║ Column name:                              ║
║ ┌─────────────────────────────────────┐  ║
║ │ Batch ID                            │  ║
║ └─────────────────────────────────────┘  ║
║                                           ║
║ Value:                                    ║
║ ┌─────────────────────────────────────┐  ║
║ │ Q1-2024                             │  ║
║ └─────────────────────────────────────┘  ║
║                                           ║
║ This value will be applied to all rows.  ║
║                                           ║
╠═══════════════════════════════════════════╣
║                    [Cancel] [Add Column]  ║
╚═══════════════════════════════════════════╝
```

---

#### FR-7: Custom Column Modal (Formulas)

**Phase 2: Formula Builder**

```
╔═══════════════════════════════════════════╗
║  Add Custom Column                    [×] ║
╠═══════════════════════════════════════════╣
║                                           ║
║ Column Type: ○ Static Value  ● Formula   ║
║                                           ║
║ Column name:                              ║
║ ┌─────────────────────────────────────┐  ║
║ │ Net Amount                          │  ║
║ └─────────────────────────────────────┘  ║
║                                           ║
║ Formula:                                  ║
║ ┌─────────────────────────────────────┐  ║
║ │ =Amount-Tax                         │  ║
║ └─────────────────────────────────────┘  ║
║                                           ║
║ Available fields:                         ║
║ • Invoice #, Date, Amount, Tax, Vendor    ║
║                                           ║
║ Operators: +, -, *, /, ()                 ║
║ Functions: TODAY(), SUM(), AVG() (future) ║
║                                           ║
║ Preview: $1,041.67                        ║
║                                           ║
╠═══════════════════════════════════════════╣
║                    [Cancel] [Add Column]  ║
╚═══════════════════════════════════════════╝
```

**Formula Syntax:**
- Field references: Use field names directly (e.g., `Amount`, `Tax`)
- Math operators: `+`, `-`, `*`, `/`, `()`
- Functions (Phase 2): `TODAY()`, `SUM()`, `AVG()`, etc.
- Validation: Real-time syntax checking
- Preview: Calculate on sample data if available

---

#### FR-8: Custom Columns Data Model

```typescript
type CustomColumn = {
  id: string
  name: string
  type: 'static' | 'formula'
  value?: string           // For static columns
  formula?: string         // For formula columns
  order: number
}

type CustomColumnValue = {
  columnId: string
  rowId: string
  calculatedValue: any     // Result of formula or static value
}
```

**Storage:**
- Custom columns NOT saved with templates (template = extraction definition only)
- Custom columns saved with extraction session
- Can be persisted in browser localStorage for convenience
- Future: Save as "preset" for reuse

---

#### FR-9: Formula Evaluation Engine

**Phase 2 Implementation:**

**Parser:**
- Tokenize formula string
- Identify field references
- Validate syntax
- Build expression tree

**Evaluator:**
- For each row in results:
  - Replace field names with actual values
  - Evaluate expression
  - Handle errors (divide by zero, null values)
  - Return calculated value

**Error Handling:**
- Syntax error: "Invalid formula: Unexpected token"
- Missing field: "Field 'Tax' not found in extraction"
- Runtime error: Show "Error" in cell, tooltip with details

**Performance:**
- Evaluate lazily (only visible rows initially)
- Cache results
- Re-evaluate on data change

---

### 3.3 Integration with Results Table

**Results Table Structure:**
```
┌──┬────────┬──────────┬──────┬────────┬──────────┬──────────┐
│✓ │Source  │Invoice # │Date  │Amount  │Batch ID  │Net Amt   │
│  │        │          │      │        │[CUSTOM]  │[CUSTOM]  │
├──┼────────┼──────────┼──────┼────────┼──────────┼──────────┤
│□ │File1-P1│INV-001   │3/1   │$1,250  │March2024 │$1,041.67 │
│□ │File1-P3│INV-002   │3/5   │$890    │March2024 │$741.67   │
└──┴────────┴──────────┴──────┴────────┴──────────┴──────────┘
```

**Visual Differentiation:**
- Custom columns have badge/icon in header: [CUSTOM]
- Or: Different background color (subtle)
- Or: Grouped at end of table (all custom columns together)

**Column Management:**
- Custom columns sortable/filterable like normal columns
- Can be hidden via column visibility menu
- Order in table matches order in config panel

---

### 3.4 Results Table UI Requirements

**Critical UX Features:**

#### Frozen Header Row
```
┌─────────────────────────────────────────────────────┐
│ ✓ │Source │Invoice #│Date │Amount│Batch ID│ (FROZEN)
├─────────────────────────────────────────────────────┤
│ □ │File1  │INV-001  │3/1  │$1,250│March   │
│ □ │File1  │INV-002  │3/5  │$890  │March   │
│ ...thousands of rows scroll here...
│ □ │File20 │INV-999  │3/30 │$450  │March   │
└─────────────────────────────────────────────────────┘
```

**Specification:**
- Header row remains fixed at top while data rows scroll
- Header always visible regardless of vertical scroll position
- Implemented via `position: sticky` or table virtualization library
- Sortable column headers remain clickable while frozen

---

#### Always-Visible Horizontal Scrollbar

**Problem:** With thousands of rows, user must scroll down to reach scrollbar to scroll horizontally

**Solution:** Horizontal scrollbar pinned to bottom of viewport, always visible

```
┌──────────────────────────────────────────────────┐
│ Results table (first page view)                  │
│ Rows 1-50 visible                                │
│                                                  │
│ [Horizontal scrollbar HERE - no vertical scroll  │
│  needed to access]                               │
└──────────────────────────────────────────────────┘
```

**Specification:**
- Horizontal scrollbar fixed to bottom of table container
- Scrollbar visible on first page load (no need to scroll down)
- Syncs with table horizontal scroll
- Implementation options:
  - Dual scrollbars (one at top, one at bottom)
  - Fixed scrollbar at bottom of viewport
  - Custom scrollbar component

**Library Recommendation:** react-window or react-virtualized (supports fixed scrollbar positioning)

---

#### Table Virtualization (Performance)

**Requirement:** Render 1000+ rows without performance degradation

**Approach:**
- Use virtual scrolling (only render visible rows + buffer)
- Libraries: react-window (lightweight) or react-virtualized (full-featured)
- Render ~50 rows at a time
- Buffer: 10 rows above/below viewport
- Total DOM nodes: ~70 rows regardless of dataset size

**Performance Targets:**
- Initial render: <1 second for any dataset size
- Scroll: 60fps smooth scrolling
- Sort/filter: <500ms for 1000 rows

---

## 4. Technical Architecture

### 4.1 System Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Frontend (Next.js)                │
│                                                     │
│  ┌─────────────────┐         ┌──────────────────┐ │
│  │  UI Components  │────────▶│  State Manager   │ │
│  │  - Template     │         │  (Zustand/Redux) │ │
│  │  - File Upload  │         └──────────────────┘ │
│  │  - Results      │                │             │
│  └─────────────────┘                │             │
│                                     ▼             │
│                          ┌──────────────────────┐ │
│                          │   API Client Layer   │ │
│                          └──────────────────────┘ │
└──────────────────────────────────┬───────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────┐
│              Backend (Next.js API Routes)        │
│                                                  │
│  ┌────────────────┐      ┌───────────────────┐ │
│  │ Template API   │      │ Extraction API    │ │
│  │ - CRUD         │      │ - Batch processor │ │
│  │ - AI Inspect   │      │ - PDF parser      │ │
│  └────────────────┘      └───────────────────┘ │
│                                │                │
│                                ▼                │
│  ┌─────────────────────────────────────────┐   │
│  │       External Services                 │   │
│  │  - Anthropic Claude API                 │   │
│  │  - PDF Parser (pdf-parse/pdf.js)        │   │
│  └─────────────────────────────────────────┘   │
└──────────────────────┬───────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────┐
│              Database (Supabase)                │
│  - templates                                    │
│  - extraction_sessions                          │
│  - extraction_results                           │
└─────────────────────────────────────────────────┘
```

---

### 4.2 Data Models

#### Template Model
```typescript
type Template = {
  id: string
  name: string
  user_id: string
  fields: TemplateField[]
  extraction_prompt: string
  created_at: Date
  updated_at: Date
}

type TemplateField = {
  id: string
  name: string
  instructions?: string
  order: number
}
```

**Database Schema:**
```sql
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  fields JSONB NOT NULL,           -- Array of TemplateField
  extraction_prompt TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

#### Extraction Session Model
```typescript
type ExtractionSession = {
  id: string
  user_id: string
  template_id?: string              // Optional: if using saved template
  template_snapshot: Template       // Save template state at time of extraction
  files: UploadedFile[]
  custom_columns: CustomColumn[]
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number                  // 0-100
  created_at: Date
  completed_at?: Date
}

type UploadedFile = {
  id: string
  filename: string
  size: number
  page_count: number
  detected_documents: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  error_message?: string
}
```

**Database Schema:**
```sql
CREATE TABLE extraction_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  template_id UUID REFERENCES templates(id),
  template_snapshot JSONB NOT NULL,
  files JSONB NOT NULL,
  custom_columns JSONB,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);
```

---

#### Extraction Result Model
```typescript
type ExtractionResult = {
  id: string
  session_id: string
  file_id: string
  source_file: string
  page_number: number
  detection_confidence: number
  extracted_data: Record<string, any>
  raw_api_response?: string
  created_at: Date
}
```

**Database Schema:**
```sql
CREATE TABLE extraction_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES extraction_sessions(id),
  file_id VARCHAR(255) NOT NULL,
  source_file VARCHAR(255) NOT NULL,
  page_number INTEGER NOT NULL,
  detection_confidence DECIMAL(3,2),
  extracted_data JSONB NOT NULL,
  raw_api_response TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

### 4.3 API Endpoints

#### Template APIs
```
GET    /api/templates
       Returns: Template[]
       Description: List user's saved templates

GET    /api/templates/:id
       Returns: Template
       Description: Get template details

POST   /api/templates
       Body: { name, fields, extraction_prompt }
       Returns: Template
       Description: Create new template

PUT    /api/templates/:id
       Body: { name?, fields?, extraction_prompt? }
       Returns: Template
       Description: Update existing template

DELETE /api/templates/:id
       Returns: { success: boolean }
       Description: Delete template

POST   /api/templates/ai-inspect
       Body: FormData (file)
       Returns: { suggested_fields, suggested_prompt }
       Description: AI analyzes sample document
```

---

#### Extraction APIs
```
POST   /api/extractions/batch
       Body: {
         template: Template,
         files: File[],
         custom_columns: CustomColumn[]
       }
       Returns: { session_id: string }
       Description: Start batch extraction

GET    /api/extractions/:session_id/status
       Returns: {
         status: string,
         progress: number,
         files: FileStatus[],
         results_count: number
       }
       Description: Get extraction progress

GET    /api/extractions/:session_id/results
       Returns: ExtractionResult[]
       Description: Get extraction results

POST   /api/extractions/:session_id/export
       Body: { format: 'excel', options: ExportOptions }
       Returns: File (Excel)
       Description: Export results to Excel
```

---

### 4.4 PDF Parsing Strategy

**Library Options:**

**Option 1: pdf-parse (Node.js)**
- Pros: Full-featured, reliable, text + metadata extraction
- Cons: Server-side only, 3MB package size
- Use case: Best for detailed parsing

**Option 2: pdf.js (Mozilla)**
- Pros: Client & server, well-maintained, page-by-page control
- Cons: Larger API surface, more complex
- Use case: Best for granular control

**Recommendation:** Start with pdf-parse, migrate to pdf.js if needed

---

**Parsing Logic:**

```typescript
async function parseAndDetectDocuments(file: File): Promise<DetectedDocument[]> {
  // Step 1: Extract text from PDF
  const pdf = await parsePDF(file)
  const pages = pdf.pages

  // Step 2: Analyze for document boundaries
  const documentBoundaries = []

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i]

    // Heuristics for document start:
    // 1. Check for "invoice" keyword in first 200 chars
    // 2. Look for invoice number pattern (INV-, #, etc.)
    // 3. Detect repeated header structure
    // 4. Check for date near top

    if (isDocumentStart(page)) {
      documentBoundaries.push(i)
    }
  }

  // Step 3: Create document segments
  const documents = []
  for (let i = 0; i < documentBoundaries.length; i++) {
    const startPage = documentBoundaries[i]
    const endPage = documentBoundaries[i + 1] || pages.length

    documents.push({
      startPage,
      endPage,
      pageCount: endPage - startPage,
      confidence: calculateConfidence(pages.slice(startPage, endPage))
    })
  }

  // Fallback: If no boundaries detected, treat as single document
  if (documents.length === 0) {
    documents.push({
      startPage: 0,
      endPage: pages.length,
      pageCount: pages.length,
      confidence: 1.0
    })
  }

  return documents
}

function isDocumentStart(page: Page): boolean {
  const firstChars = page.text.substring(0, 200).toLowerCase()

  // Check for invoice indicators
  const hasInvoiceKeyword = /invoice|receipt|bill/.test(firstChars)
  const hasNumberPattern = /\b(inv|#|no\.?)\s*[:\-]?\s*\d+/i.test(firstChars)
  const hasDatePattern = /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(firstChars)

  // Require 2+ indicators for high confidence
  const score = [hasInvoiceKeyword, hasNumberPattern, hasDatePattern]
    .filter(Boolean).length

  return score >= 2
}
```

**Configuration:**
- Detection thresholds configurable
- User can disable auto-detection (treat all as single-page)
- Manual override option (future: UI to split/merge detected docs)

---

### 4.5 Batch Processing Pipeline

**Architecture:**

```
┌────────────────────────────────────────────────────┐
│              Batch Processing Queue                │
│                                                    │
│  1. File Upload                                    │
│     ├─ Validate files                              │
│     ├─ Save to temp storage                        │
│     └─ Create extraction session                   │
│                                                    │
│  2. PDF Analysis (parallel)                        │
│     ├─ Parse each PDF                              │
│     ├─ Detect document boundaries                  │
│     └─ Update session with detection results       │
│                                                    │
│  3. Extraction (parallel, rate-limited)            │
│     ├─ For each detected document:                 │
│     │   ├─ Extract page content                    │
│     │   ├─ Call Claude API                         │
│     │   ├─ Parse response                          │
│     │   └─ Save result                             │
│     └─ Update progress                             │
│                                                    │
│  4. Aggregation                                    │
│     ├─ Combine all results                         │
│     ├─ Apply custom columns                        │
│     └─ Mark session complete                       │
│                                                    │
└────────────────────────────────────────────────────┘
```

**Parallelization Strategy:**
- PDF parsing: All files in parallel (CPU-bound)
- Extraction: Max 5 concurrent API calls (rate limit)
- Queue remaining extractions
- Use p-limit or similar for concurrency control

**Progress Tracking:**
```typescript
type Progress = {
  total_files: number
  processed_files: number
  total_documents: number      // After detection
  processed_documents: number
  current_file: string
  percentage: number           // 0-100
}
```

**Real-Time Updates:**
- Option A: Server-Sent Events (SSE)
- Option B: Polling every 2 seconds
- Recommendation: SSE for better UX, fallback to polling

---

### 4.6 State Management (Frontend)

**Library:** Zustand (lightweight, simple)

**Store Structure:**
```typescript
type AppState = {
  // Template
  templateMode: 'new' | 'existing'
  selectedTemplate: Template | null
  fields: TemplateField[]
  extractionPrompt: string
  isDirty: boolean

  // Files
  uploadedFiles: UploadedFile[]

  // Custom Columns
  customColumns: CustomColumn[]

  // Extraction Session
  currentSession: ExtractionSession | null
  results: ExtractionResult[]
  progress: Progress | null

  // UI State
  isProcessing: boolean
  showAIModal: boolean
  showFieldModal: boolean
  editingField: TemplateField | null

  // Actions
  loadTemplate: (id: string) => Promise<void>
  addField: (field: TemplateField) => void
  removeField: (id: string) => void
  reorderFields: (startIndex: number, endIndex: number) => void
  updatePrompt: (prompt: string) => void

  addFile: (file: File) => void
  removeFile: (id: string) => void

  addCustomColumn: (column: CustomColumn) => void
  removeCustomColumn: (id: string) => void

  startExtraction: () => Promise<void>
  pollProgress: () => Promise<void>
  loadResults: () => Promise<void>
  exportToExcel: (options: ExportOptions) => Promise<void>
}
```

---

### 4.7 Excel Export Implementation

**Library:** exceljs (full-featured, well-maintained)

**Export Function:**
```typescript
async function exportToExcel(
  results: ExtractionResult[],
  template: Template,
  customColumns: CustomColumn[],
  options: ExportOptions
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()

  if (options.format === 'separate_sheets') {
    // Group results by source file
    const grouped = groupBy(results, r => r.source_file)

    for (const [filename, rows] of Object.entries(grouped)) {
      const sheet = workbook.addWorksheet(sanitizeSheetName(filename))
      addDataToSheet(sheet, rows, template, customColumns)
    }
  } else {
    // Single sheet with all data
    const sheet = workbook.addWorksheet('Extraction Results')
    addDataToSheet(sheet, results, template, customColumns)
  }

  return await workbook.xlsx.writeBuffer()
}

function addDataToSheet(
  sheet: ExcelJS.Worksheet,
  rows: ExtractionResult[],
  template: Template,
  customColumns: CustomColumn[]
) {
  // Header row
  const headers = [
    'Source',
    'Page',
    ...template.fields.map(f => f.name),
    ...customColumns.map(c => c.name)
  ]
  sheet.addRow(headers)

  // Style header
  sheet.getRow(1).font = { bold: true }
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  }

  // Data rows
  for (const result of rows) {
    const row = [
      result.source_file,
      result.page_number,
      ...template.fields.map(f => result.extracted_data[f.name] || ''),
      ...customColumns.map(c => calculateCustomColumn(c, result))
    ]
    sheet.addRow(row)
  }

  // Auto-size columns
  sheet.columns.forEach(column => {
    column.width = Math.min(column.header.length + 5, 30)
  })
}

function sanitizeSheetName(filename: string): string {
  // Excel sheet names: max 31 chars, no special chars
  return filename
    .replace(/\.pdf$/i, '')
    .replace(/[:\\\/?*\[\]]/g, '_')
    .substring(0, 31)
}
```

---

## 5. Success Criteria & Validation

### 5.1 Functional Success Criteria

**Template Management:**
- ✅ Create new template with AI assistance in <60 seconds
- ✅ Load existing template in <2 seconds
- ✅ Drag-and-drop field reordering works intuitively
- ✅ Field instructions persist and display correctly
- ✅ Save/update template with clear feedback

**Batch Processing:**
- ✅ Upload 20 files in <10 seconds
- ✅ Process 20 files (100 pages total) in <3 minutes
- ✅ Auto-detection accuracy >80% on standard invoices
- ✅ Progress updates every 2 seconds
- ✅ Graceful error handling (partial success OK)

**Custom Columns:**
- ✅ Add static column in <10 seconds
- ✅ Static values apply to all rows correctly
- ✅ Custom columns appear in results and export
- ⏸️ Formula columns deferred to Phase 2.0 (Future Enhancement)

**Results & Export:**
- ✅ Results table renders 500 rows in <1 second
- ✅ Excel export generates in <5 seconds
- ✅ Export preserves data types (dates, currency, numbers)
- ✅ Both export options (separate/combined sheets) work correctly

---

### 5.2 Non-Functional Success Criteria

**Performance:**
- Page load: <2 seconds
- Template switch: <500ms
- File upload feedback: Immediate (<100ms)
- API response time: <3 seconds (P95)
- Excel download: <5 seconds for 1000 rows

**Reliability:**
- Uptime: 99.5%
- Extraction success rate: 95%+ on valid PDFs
- No data loss on browser refresh (session persistence)
- Error recovery: Clear error messages, actionable

**Usability:**
- First-time user can complete extraction in <5 minutes (with guidance)
- Expert user can process batch in <2 minutes
- Zero-state provides clear next steps
- All actions reversible (undo/cancel)

**Accessibility:**
- WCAG 2.1 AA compliance
- Full keyboard navigation
- Screen reader compatible
- High contrast mode support

---

### 5.3 Edge Cases & Error Handling

#### Edge Case 1: Large Batch (100 files)
**Scenario:** User uploads 100 PDFs (1000 pages total)

**Handling:**
- Show warning: "Large batch detected. Processing may take 15+ minutes."
- Allow cancellation at any time
- Save partial results (process completed files)
- Resume capability if interrupted

---

#### Edge Case 2: Malformed PDF
**Scenario:** PDF is corrupted or unreadable

**Handling:**
- Show error badge on file: "Failed: Unable to parse PDF"
- Continue processing other files
- Provide download option for error log
- Suggest: "Try re-saving PDF or converting to PDF/A format"

---

#### Edge Case 3: No Documents Detected
**Scenario:** Auto-detection finds 0 documents in file

**Handling:**
- Fallback: Treat entire file as single document
- Show warning: "No document boundaries detected. Processing as single document."
- User can disable auto-detection in settings

---

#### Edge Case 4: Extraction Returns Invalid JSON
**Scenario:** Claude API returns malformed JSON

**Handling:**
- Retry once with stricter prompt
- If still fails: Show error row with "Failed: Invalid API response"
- Log raw response for debugging
- Allow manual data entry (future feature)

---

#### Edge Case 5: Duplicate Field Names
**Scenario:** User tries to create field with existing name

**Handling:**
- Validation: "Field name 'Amount' already exists"
- Suggest alternatives: "Amount2", "Total Amount"
- Prevent saving until resolved

---

#### Edge Case 6: Formula References Missing Field
**Scenario:** Formula uses field that doesn't exist in template

**Handling:**
- Validation on formula save: "Field 'Tax' not found in template"
- Show available fields in error message
- Disable "Add Column" until fixed

---

#### Edge Case 7: Session Timeout During Processing
**Scenario:** User's auth token expires mid-batch

**Handling:**
- Save progress to database
- Prompt re-authentication
- Resume from last completed document

---

#### Edge Case 8: Browser Tab Closed During Processing
**Scenario:** User closes browser while extraction running

**Handling:**
- Server continues processing
- Save session ID in localStorage
- On return: "You have an in-progress extraction. Continue?"
- Load results if completed, or resume if still processing

---

### 5.4 Testing Strategy

#### Unit Tests
- Template CRUD operations
- Field validation logic
- Formula parser and evaluator
- PDF detection heuristics
- Custom column calculations

#### Integration Tests
- Full extraction workflow (template → upload → process → results)
- AI inspection flow
- Excel export with all options
- Template save/load with session state

#### E2E Tests (Playwright)
- User creates template with AI assistance
- User uploads 5 files, processes batch
- User adds custom columns, exports to Excel
- User loads existing template, modifies, saves as new

#### Performance Tests
- Load test: 100 concurrent users
- Stress test: 100 files in single batch
- Table rendering: 1000+ rows
- Excel export: 10,000+ rows

#### Accessibility Tests
- Keyboard navigation audit
- Screen reader testing (NVDA, JAWS)
- Color contrast validation
- Focus management

---

## 6. Implementation Phases

### Phase 1: Foundation (Weeks 1-2)
**Scope:** Core infrastructure + basic unified UI

**Deliverables:**
- [ ] New page layout (left panel + right panel)
- [ ] Basic template section (no AI, manual fields only)
- [ ] Tag-based field UI with drag-and-drop
- [ ] Single file upload (no batch yet)
- [ ] Basic extraction with new layout
- [ ] Database schema updates

**Success Criteria:**
- Can create template with tags
- Can extract single file
- Results show in right panel

---

### Phase 2: Batch Processing (Weeks 3-4)
**Scope:** Multi-file upload + auto-detection + aggregation

**Deliverables:**
- [ ] Multi-file upload UI
- [ ] PDF parsing integration (pdf-parse)
- [ ] Auto-detection algorithm
- [ ] Batch processing queue
- [ ] Progress tracking UI
- [ ] Combined results table with source tracking

**Success Criteria:**
- Can upload 20 files
- Auto-detection finds multiple documents per file
- All results aggregated in one table
- Progress updates in real-time

---

### Phase 3: Custom Columns (Static) (Week 5)
**Scope:** Static value custom columns only

**Deliverables:**
- [ ] Custom columns UI component
- [ ] Add/edit/remove custom columns
- [ ] Static values in results table
- [ ] Static values in Excel export

**Success Criteria:**
- Can add "Batch ID" column with value
- Value appears in all result rows
- Exported to Excel correctly

---

### Phase 4: AI Features (Week 6)
**Scope:** AI-assisted template creation

**Deliverables:**
- [ ] AI Inspect button and flow
- [ ] Sample file upload
- [ ] Claude API integration for inspection
- [ ] AI Suggestions Modal
- [ ] Prompt merge logic

**Success Criteria:**
- Upload sample, get field suggestions
- Suggestions accurate (>80% useful fields)
- Can accept/reject suggestions
- Suggested prompt integrates smoothly

---

### Phase 5: Excel Export Options (Week 7)
**Scope:** Separate vs. combined sheet export

**Deliverables:**
- [ ] Export dialog with options
- [ ] Separate sheets logic (one per file)
- [ ] Sheet naming (sanitized filenames)
- [ ] Combined sheet option (all in one)

**Success Criteria:**
- Both export options work
- Sheet names readable
- Data preserves types (dates, currency)

---

### Phase 6: Results Table UI + Panel Resizing (Week 6)
**Scope:** Polish results experience with frozen headers, scrollbars, and panel controls

**Deliverables:**
- [ ] Frozen header row implementation
- [ ] Always-visible horizontal scrollbar
- [ ] Table virtualization for performance (react-window)
- [ ] Resizable panel divider (draggable boundary)
- [ ] Panel maximize/minimize controls
- [ ] Responsive panel behavior

**Success Criteria:**
- Header remains visible while scrolling data
- Horizontal scrollbar accessible without vertical scroll
- Table renders 1000+ rows at 60fps
- Panels resize smoothly via drag
- Maximize/minimize works intuitively

---

### Phase 7: Polish & Edge Cases (Weeks 7-8)
**Scope:** Error handling, edge cases, accessibility

**Deliverables:**
- [ ] Comprehensive error handling
- [ ] Edge case fixes (large batches, malformed PDFs)
- [ ] Accessibility audit and fixes
- [ ] Performance optimization
- [ ] User testing and refinements
- [ ] Header navigation (Templates, History links)

**Success Criteria:**
- All edge cases handled gracefully
- WCAG 2.1 AA compliant
- User testing feedback incorporated
- Performance targets met

---

## 7. Open Questions & Decisions Needed

### Q1: PDF Auto-Detection Algorithm
**Question:** How aggressive should auto-detection be?

**Options:**
- Conservative: Only split when very confident (fewer false positives)
- Aggressive: Split on any hint (catch more cases, more false positives)
- User-controlled: Setting to adjust sensitivity

**Recommendation:** Start conservative, add user setting later

**Decision:** ✅ **AGGRESSIVE** - Prefer extra breaks over missed breaks. Content won't switch mid-page, so use page boundaries as primary detection. Users can manually merge false positives.

---

### Q2: Template vs. Session Scope
**Question:** Should custom columns be saved with templates or sessions?

**Current Approach:** Sessions only (custom columns are batch-specific metadata)

**Alternative:** Allow saving "template + columns" as preset

**Trade-off:** Simplicity vs. convenience

**Decision:** Session-only for MVP, preset feature in Phase 8+

---

### Q3: Formula Language
**Question:** What formula syntax to support?

**Options:**
- Excel-like: `=Amount-Tax` (familiar to users)
- JavaScript: `Amount - Tax` (easier to implement)
- Custom DSL: `SUBTRACT(Amount, Tax)` (explicit, safe)

**Recommendation:** JavaScript syntax (simple, flexible)

**Decision:** ✅ **EXCEL-STYLE** - Use `=Amount-Tax` syntax. Users are familiar with Excel formulas. Parser will handle `=` prefix and standard math operators.

---

### Q4: Rate Limiting Strategy
**Question:** How to handle Anthropic API rate limits?

**Options:**
- Queue all requests, process sequentially (slow but reliable)
- Parallel with p-limit=5 (fast, might hit limits)
- Adaptive: Start parallel, throttle on 429 errors (complex but optimal)

**Recommendation:** Parallel with p-limit=5, exponential backoff on errors

**Decision:** Implement adaptive throttling

---

### Q5: Session Persistence
**Question:** How long to keep extraction sessions?

**Options:**
- 7 days (balance storage vs. convenience)
- 30 days (better user experience)
- User-configurable (max flexibility)

**Recommendation:** 7 days default, user can delete manually

**Decision:** ✅ **USER-CONFIGURABLE** - Add retention setting with options: Immediate deletion (0 days), 7 days, 30 days, 90 days, Custom. Default: 7 days. User can opt for no retention if storage not a concern.

---

## 8. Risks & Mitigation

### Risk 1: Auto-Detection Inaccuracy
**Impact:** High - core feature, affects user trust

**Likelihood:** Medium - depends on document variety

**Mitigation:**
- Extensive testing on real invoices
- User feedback loop (report bad detection)
- Manual override option
- Clear confidence scores
- Fallback to single-document mode

---

### Risk 2: Claude API Rate Limits
**Impact:** High - blocks batch processing

**Likelihood:** Medium - depends on usage volume

**Mitigation:**
- Implement request queuing
- Exponential backoff on 429 errors
- Show clear messaging: "Rate limit reached. Pausing for 60 seconds..."
- Consider upgrading to higher tier
- Cache similar extractions (future)

---

### Risk 3: Large File Performance
**Impact:** Medium - slow processing frustrates users

**Likelihood:** High - some users will upload large batches

**Mitigation:**
- Streaming PDF parsing (don't load entire file in memory)
- Chunk processing (process in batches of 10 files)
- Progress indicators
- Cancel/pause functionality
- Set expectations: "Large batch, estimated 20 minutes"

---

### Risk 4: Formula Evaluation Security
**Impact:** High - code injection vulnerability

**Likelihood:** Low - mitigated by parser

**Mitigation:**
- Use safe expression evaluator (math.js or similar)
- No arbitrary code execution
- Whitelist allowed functions
- Sandbox evaluation
- Input validation

---

### Risk 5: Browser Compatibility
**Impact:** Medium - limits user base

**Likelihood:** Low - modern browsers well-supported

**Mitigation:**
- Target: Chrome, Firefox, Safari, Edge (latest 2 versions)
- Polyfills for older browsers
- Feature detection, graceful degradation
- Clear browser requirements in docs

---

## 9. Success Metrics & KPIs

### Usage Metrics
- **Batch adoption rate:** % of extractions using 2+ files
  - Target: 60% within 3 months
- **Avg files per batch:** Mean number of files uploaded
  - Target: 8 files per batch
- **Custom column usage:** % of extractions with custom columns
  - Target: 40% within 2 months

### Performance Metrics
- **Time to first result:** From upload to first row in table
  - Target: <30 seconds for single file
- **Batch processing time:** Total time for 20-file batch
  - Target: <3 minutes
- **Error rate:** % of extractions that fail
  - Target: <5%

### User Satisfaction
- **Net Promoter Score (NPS):** User likelihood to recommend
  - Target: >50
- **Feature satisfaction:** Rating of batch processing feature
  - Target: 4.5/5
- **Support ticket reduction:** Compared to pre-batch version
  - Target: 30% reduction in "how to process multiple files" tickets

---

## 10. Future Enhancements (Phase 2.0+)

### 10.1 Grouped/Hierarchical Extraction

**Scope:** Support for documents with repeating groups (e.g., estimates with Building → Unit → Room structure)

**Requirements:**
- **Template Definition:** Distinguish between header fields, group fields, and detail fields
- **Data Model:** Hierarchical structure (one header, many groups, many details per group)
- **Results Output:** Denormalized flat table with repeated header info per row
- **Example Structure:**
  ```
  Header: Estimate #, Date, Customer
  Groups: Building Name, Unit #, Room Type, SF Walls (with photo)
  Details: Line items per room
  ```

**Implementation Strategy:**
- All data flattened for simplicity (denormalized)
- Each detail row repeats header + group information
- Excel export as flat table (same structure)

**Priority:** Deferred to Phase 2.0 after invoice batch processing proven successful

**Estimated Effort:** +4-6 weeks

**Use Cases:**
- Construction estimates with building/unit/room groupings
- Work orders with location hierarchies
- Any multi-level structured documents

---

### 10.2 Session Retention Settings

**Requirement:** User-configurable session retention period

**UI Location:** Settings/Preferences page

**Settings Panel:**
```
┌──────────────────────────────────────┐
│ Extraction Session Retention         │
├──────────────────────────────────────┤
│                                      │
│ Keep extraction results for:         │
│                                      │
│ ○ Immediate deletion (0 days)        │
│ ● 7 days (recommended)               │
│ ○ 30 days                            │
│ ○ 90 days                            │
│ ○ Custom: [___] days                 │
│                                      │
│ Note: Longer retention uses more     │
│ storage. You can always manually     │
│ delete sessions.                     │
│                                      │
│ [ Manual Cleanup ]                   │
│ └─ View and delete old sessions      │
│                                      │
└──────────────────────────────────────┘
```

**Behavior:**
- Default: 7 days
- User can set to 0 days for immediate deletion after export
- User can set custom value up to 365 days
- Cron job runs daily to clean up expired sessions
- Manual cleanup page shows all sessions with delete option

**Database:**
```sql
ALTER TABLE users ADD COLUMN session_retention_days INTEGER DEFAULT 7;
```

**Implementation:** Phase 1 (Foundation) - add setting, Phase 7 (Polish) - implement cleanup

---

### 10.3 Manual Document Merge/Split

**Requirement:** UI to manually adjust auto-detection results

**Use Case:** When auto-detection creates false positives (splits single document incorrectly)

**UI Mockup:**
```
Results Table with source grouping:
┌────────────────────────────────────┐
│ File: batch1.pdf (3 detected)      │
│ [☐] Page 1 (Invoice #001)         │
│ [☐] Page 3 (Invoice #002)         │
│ [☐] Page 5 (Invoice #003)         │
│                                    │
│ Actions:                           │
│ • Merge selected documents         │
│ • Split document at page...        │
└────────────────────────────────────┘
```

**Priority:** Phase 7 (Polish) or Phase 2.0

---

### 10.4 Formula Custom Columns

**Scope:** Calculated custom columns using Excel-style formulas (**DEFERRED TO PHASE 2.0**)

**Current Plan:** MVP includes static custom columns only. Formula support added after core features proven.

**Requirements:**
- **Formula Syntax:** Excel-style (`=Amount-Tax`, `=(Amount-Cost)/Cost`)
- **Parser:** Handle `=` prefix, standard math operators (+, -, *, /, ())
- **Evaluator:** Calculate per row, handle errors gracefully
- **UI Components:**
  - Formula input field with syntax highlighting
  - Real-time preview on sample data
  - Field reference helper (show available fields)
  - Error validation before save

**Example Formulas:**
```
=Amount-Tax              (Net amount)
=(Amount-Cost)/Cost      (Markup percentage)
=Amount*0.13             (Calculate tax if missing)
```

**Advanced Functions (Future):**
- Date functions: `=DATEDIFF(DueDate, TODAY(), "days")`
- Conditional: `=IF(Amount>1000, "Large", "Small")`
- String functions: `=CONCATENATE(Vendor, "-", Invoice#)`
- Aggregate: `=SUM()`, `=AVG()` (across rows)

**Implementation Estimate:** +2 weeks

**Priority:** Phase 2.0 (after MVP validated)

**Rationale for Deferral:**
- Focus on core batch processing first
- Static columns cover 80% of use cases
- Formula complexity could delay MVP
- Results table UX more critical initially

---

### 10.5 Template Field Presets

**Requirement:** Library of common fields for quick template creation

**Common Presets:**
- Invoice fields: Invoice #, Date, Amount, Tax, Vendor, Due Date
- Receipt fields: Merchant, Date, Total, Payment Method
- Work Order fields: WO #, Date, Location, Description, Status

**UI:**
```
Template section:
[+ Add field from preset ▼]
  ├─ Invoice fields
  ├─ Receipt fields
  ├─ Work Order fields
  └─ Custom...
```

**Priority:** Phase 2.0+ - integrate with AI suggestions

---

### 10.6 Template Version History

**Requirement:** Track changes to templates over time, allow rollback

**Features:**
- Auto-save on template update
- Show diff of changes
- Rollback to previous version
- Useful for troubleshooting extraction issues

**Priority:** Phase 2.0+

---

## 11. Appendix

### A. Glossary

**Batch Processing:** Processing multiple files in a single extraction session

**Auto-Detection:** Automatic identification of multiple documents within a single PDF file

**Template:** Configuration defining which fields to extract and how

**Custom Column:** User-defined column (static value or formula) added to results

**Extraction Session:** Single instance of batch processing from upload to results

**Source Tracking:** Associating each extracted row with originating file and page

---

### B. References

**Technical Documentation:**
- Next.js 14 API Routes: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
- Anthropic Claude API: https://docs.anthropic.com/claude/reference
- pdf-parse: https://www.npmjs.com/package/pdf-parse
- exceljs: https://github.com/exceljs/exceljs
- @dnd-kit: https://docs.dndkit.com/

**Design Resources:**
- UX Design Document (this project)
- Current MMDocScan UI (reference)
- Figma mockups (to be created)

---

### C. Change Log

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-10-24 | 1.0 | Initial requirements document | Mary |
| 2025-10-24 | 1.1 | Updated with stakeholder decisions: Q1 (Aggressive auto-detection), Q3 (Excel-style formulas), Q5 (User-configurable retention). Added Future Enhancements section including grouped/hierarchical extraction (deferred to Phase 2.0). | Mary |
| 2025-10-24 | 1.2 | Major UX updates per stakeholder feedback: (1) Header updated with Templates and History links, (2) Resizable panels with maximize/minimize controls, (3) Results table frozen header and always-visible horizontal scrollbar, (4) Formula columns DEFERRED to Phase 2.0 - only static custom columns in MVP, (5) Phases reorganized: removed Phase 6 (Formulas), added Phase 6 (Results Table UI + Panel Resizing), timeline reduced from 10 weeks to 8 weeks. | Mary |

---

**End of Requirements Document**

**Next Steps:**
1. ✅ Stakeholder review with Steve - COMPLETE
2. ✅ Open questions answered (Q1, Q3, Q5) - COMPLETE
3. Create technical specifications for each phase
4. Set up project board with tasks
5. Begin Phase 1 implementation

---

**Key Stakeholder Decisions Made:**
1. ✅ Auto-detection: Aggressive strategy (prefer extra breaks over missed)
2. ✅ Formula syntax: Excel-style (=Amount-Tax) - **DEFERRED TO PHASE 2.0**
3. ✅ Session retention: User-configurable (0-365 days, default 7)
4. ✅ Grouped extraction: Deferred to Phase 2.0, flatten data when implemented
5. ✅ Custom columns: Static values ONLY in MVP (no formulas in current plan)
6. ✅ Results table: Frozen header row + always-visible horizontal scrollbar
7. ✅ Panels: Resizable with draggable divider + maximize/minimize controls
8. ✅ Header: Add Templates and History links
9. ✅ Timeline: 8 weeks (reduced from 10 - formula phase removed)

**Ready for:** Technical implementation planning
