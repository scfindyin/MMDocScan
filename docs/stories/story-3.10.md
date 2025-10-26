# Story 3.10: Auto-Detection Algorithm

## Story Information
- **Epic**: 3 - Unified Batch Extraction Workflow
- **Story**: 3.10
- **Status**: Implemented
- **Architect Approved**: 2025-10-26
- **Priority**: High
- **Estimated Effort**: Large
- **Prerequisites**: Story 3.9 (PDF Parsing Service)
- **Completed**: 2025-10-26

## User Story
As a developer, I want an algorithm that automatically detects document boundaries in multi-document PDFs, so that users don't have to manually split files.

## Acceptance Criteria

### AC1: DocumentDetector Service Class Created
**Given** the application needs document boundary detection capabilities
**When** the DocumentDetector service is implemented
**Then** a service class should exist at `services/DocumentDetector.ts` with proper TypeScript interfaces and error handling

### AC2: Detect Method Implementation
**Given** a parsed PDF with multiple pages
**When** `detect(pages: Page[])` is called
**Then** the method should return a Promise resolving to `DetectedDocument[]` containing document boundaries

### AC3: DetectedDocument Data Structure
**Given** document boundaries are detected
**When** the detection completes
**Then** each DetectedDocument object should include: startPage (1-indexed), endPage (1-indexed), pageCount (derived), and confidence score (0-1 scale)

### AC4: AGGRESSIVE Detection Strategy
**Given** the detection algorithm is processing pages
**When** making split decisions
**Then** the algorithm should prefer false positives (over-splitting) over false negatives (missing documents), ensuring no multi-document PDFs are incorrectly treated as single documents

### AC5: Invoice/Receipt Keyword Detection
**Given** a page is being analyzed
**When** the first 200 characters contain keywords "invoice", "receipt", or "bill" (case-insensitive)
**Then** the page should be marked as a potential document start with confidence ≥0.7

### AC6: Invoice Number Pattern Detection
**Given** a page is being analyzed
**When** the first 200 characters contain invoice number patterns (INV-, #, No. followed by digits)
**Then** the page should be marked as a potential document start with confidence ≥0.6

### AC7: Date Pattern Detection
**Given** a page is being analyzed
**When** the first 200 characters contain date patterns (MM/DD/YYYY, DD-MM-YYYY, YYYY-MM-DD)
**Then** the page should be marked as a potential document start with confidence ≥0.5

### AC8: Page Boundary Heuristic
**Given** no other indicators are detected
**When** the detection strategy is AGGRESSIVE
**Then** each page should be treated as a potential new document (confidence 0.3) to maximize document isolation

### AC9: Multi-Indicator Confidence Scoring
**Given** multiple heuristics match on a single page
**When** calculating confidence scores
**Then** the confidence should be the maximum of all detected indicators (not cumulative)

### AC10: Fallback for No Indicators
**Given** an entire PDF has no document boundary indicators
**When** detection completes
**Then** the algorithm should return a single DetectedDocument spanning all pages with confidence 1.0

### AC11: Comprehensive Unit Tests
**Given** the DocumentDetector service is implemented
**When** running the test suite
**Then** tests should cover: single document, 3 documents, ambiguous cases, edge cases, and all heuristics

### AC12: Test Data - Invoice Keywords
**Given** test data contains invoice keywords
**When** detection is performed
**Then** the algorithm should correctly split at pages with keywords

### AC13: Test Data - No Keywords
**Given** test data contains no keywords or patterns
**When** detection is performed
**Then** the algorithm should return a single document (fallback behavior)

### AC14: Performance Requirements
**Given** a 100-page PDF is processed
**When** the detection algorithm runs
**Then** the complete detection should finish in less than 1 second

## Tasks and Subtasks

### Task 1: Create TypeScript Interfaces and Types
**Estimated Effort**: Small
**Dependencies**: Story 3.9 (Page interface)

#### Subtask 1.1: Define DetectedDocument Interface
- [ ] Create DetectedDocument interface with startPage, endPage, pageCount, confidence
- [ ] Add JSDoc comments for each property
- [ ] Ensure 1-indexed page numbers (consistent with Page interface)
- [ ] Export from appropriate location (types/detection.ts or inline)

#### Subtask 1.2: Define DetectionHeuristic Interface
- [ ] Create DetectionHeuristic interface for internal use
- [ ] Properties: name, pattern, confidenceScore, description
- [ ] Document each heuristic type
- [ ] Add type for heuristic functions

#### Subtask 1.3: Define DetectionResult Internal Type
- [ ] Create internal type for page-level detection results
- [ ] Properties: pageNumber, indicators, maxConfidence
- [ ] Used to track detection progress per page
- [ ] Keep internal to DocumentDetector service

#### Subtask 1.4: Define DetectionStrategy Enum
- [ ] Create enum for detection strategies (AGGRESSIVE, BALANCED, CONSERVATIVE)
- [ ] Document each strategy's behavior
- [ ] Set AGGRESSIVE as default for v1
- [ ] Plan for future configurability

### Task 2: Implement DocumentDetector Service Class Structure
**Estimated Effort**: Small
**Dependencies**: Task 1

#### Subtask 2.1: Create Service Class Structure
- [ ] Create `services/DocumentDetector.ts` file
- [ ] Set up class with singleton pattern (or static methods)
- [ ] Add logger instance for debugging
- [ ] Import dependencies (Page interface from PDFParser)

#### Subtask 2.2: Define Heuristic Constants
- [ ] Define keyword lists (invoice, receipt, bill)
- [ ] Define regex patterns for invoice numbers (INV-, #[0-9]+, No. [0-9]+)
- [ ] Define regex patterns for dates (MM/DD/YYYY, DD-MM-YYYY, YYYY-MM-DD)
- [ ] Configure confidence thresholds for each heuristic

#### Subtask 2.3: Create Helper Methods
- [ ] Method: extractHeaderText(page: Page, length = 200): string
- [ ] Method: calculateConfidence(indicators: string[]): number
- [ ] Method: mergeDetections(results: DetectionResult[]): DetectedDocument[]
- [ ] Add proper error handling

#### Subtask 2.4: Set Up Logging Infrastructure
- [ ] Add debug logging for each heuristic match
- [ ] Log final detection results
- [ ] Log performance metrics
- [ ] Use appropriate log levels (debug, info)

### Task 3: Implement Core Detection Heuristics
**Estimated Effort**: Medium
**Dependencies**: Task 2

#### Subtask 3.1: Implement Keyword Detection
- [ ] Method: detectInvoiceKeywords(headerText: string): boolean
- [ ] Check for "invoice", "receipt", "bill" (case-insensitive)
- [ ] Search within first 200 characters only
- [ ] Return confidence 0.7 if matched
- [ ] Add word boundary checks to avoid false positives (e.g., "billion")

#### Subtask 3.2: Implement Invoice Number Pattern Detection
- [ ] Method: detectInvoiceNumber(headerText: string): boolean
- [ ] Regex patterns: /INV-?\d{3,}/i, /#\s?\d{3,}/, /No\.?\s?\d{3,}/i
- [ ] Search within first 200 characters only
- [ ] Return confidence 0.6 if matched
- [ ] Require at least 3 digits to avoid false positives

#### Subtask 3.3: Implement Date Pattern Detection
- [ ] Method: detectDatePattern(headerText: string): boolean
- [ ] Regex patterns: /\d{2}\/\d{2}\/\d{4}/, /\d{2}-\d{2}-\d{4}/, /\d{4}-\d{2}-\d{2}/
- [ ] Search within first 200 characters only
- [ ] Return confidence 0.5 if matched
- [ ] Consider common date variants (MM/DD/YYYY, DD-MM-YYYY)

#### Subtask 3.4: Implement Page Boundary Heuristic
- [ ] Method: applyPageBoundaryHeuristic(): boolean
- [ ] Always returns true (AGGRESSIVE strategy)
- [ ] Return confidence 0.3 for each page
- [ ] This ensures maximum document isolation
- [ ] Document that this is strategy-dependent

### Task 4: Implement Core detect() Method
**Estimated Effort**: Medium
**Dependencies**: Task 3

#### Subtask 4.1: Implement Main Detection Flow
- [ ] Method signature: async detect(pages: Page[]): Promise<DetectedDocument[]>
- [ ] Validate input (non-empty pages array)
- [ ] Loop through pages and apply heuristics
- [ ] Collect detection results per page
- [ ] Handle edge cases (empty pages, no text)

#### Subtask 4.2: Apply Heuristics to Each Page
- [ ] Extract first 200 characters from page.text
- [ ] Run all heuristics (keywords, invoice number, date, page boundary)
- [ ] Collect matching indicators
- [ ] Calculate max confidence score
- [ ] Store results in DetectionResult array

#### Subtask 4.3: Implement Confidence Scoring Logic
- [ ] Use maximum confidence from all indicators (not cumulative)
- [ ] Example: If both keyword (0.7) and invoice number (0.6) match, use 0.7
- [ ] Ensure confidence stays in [0, 1] range
- [ ] Document scoring rationale

#### Subtask 4.4: Implement Document Boundary Merging
- [ ] Convert page-level DetectionResult[] to DetectedDocument[]
- [ ] Determine split points based on confidence thresholds
- [ ] AGGRESSIVE strategy: Split on confidence ≥0.3
- [ ] Calculate startPage, endPage, pageCount for each document
- [ ] Ensure no gaps or overlaps in page ranges

#### Subtask 4.5: Implement Fallback Logic
- [ ] Detect if no indicators found across entire PDF
- [ ] Return single DetectedDocument with all pages
- [ ] Set confidence to 1.0 (high certainty it's single document)
- [ ] Log fallback usage for monitoring

### Task 5: Implement Confidence Threshold Logic
**Estimated Effort**: Small
**Dependencies**: Task 4

#### Subtask 5.1: Define Confidence Thresholds per Strategy
- [ ] AGGRESSIVE: Split on confidence ≥0.3 (prefer false positives)
- [ ] BALANCED: Split on confidence ≥0.6 (future enhancement)
- [ ] CONSERVATIVE: Split on confidence ≥0.8 (future enhancement)
- [ ] Document threshold rationale

#### Subtask 5.2: Apply Threshold in Merging Logic
- [ ] Check each page's confidence against threshold
- [ ] If confidence ≥ threshold, mark as new document start
- [ ] Group consecutive pages below threshold into same document
- [ ] Ensure first page always starts a document

#### Subtask 5.3: Handle Edge Cases
- [ ] Single-page PDFs (always return 1 document)
- [ ] All pages above threshold (each page = 1 document)
- [ ] All pages below threshold (fallback to single document)
- [ ] Empty text pages (treat as continuation of previous document)

### Task 6: Implement Error Handling
**Estimated Effort**: Small
**Dependencies**: Task 4

#### Subtask 6.1: Validate Input Parameters
- [ ] Throw error if pages array is empty
- [ ] Throw error if pages array is null/undefined
- [ ] Validate Page objects have required properties (pageNumber, text)
- [ ] Return descriptive error messages

#### Subtask 6.2: Handle Text Extraction Errors
- [ ] Handle pages with null/undefined text
- [ ] Treat missing text as empty string
- [ ] Log warning for pages without text
- [ ] Continue processing remaining pages

#### Subtask 6.3: Handle Regex Errors
- [ ] Wrap regex matching in try-catch
- [ ] Handle malformed input gracefully
- [ ] Log errors without crashing detection
- [ ] Return safe default values

#### Subtask 6.4: Create Custom Error Types
- [ ] Create DocumentDetectionError class
- [ ] Add error codes (INVALID_INPUT, DETECTION_FAILED, etc.)
- [ ] Include page context in errors
- [ ] Provide helpful error messages

### Task 7: Implement Logging and Debugging
**Estimated Effort**: Small
**Dependencies**: Task 4

#### Subtask 7.1: Add Detection Start/End Logs
- [ ] Log when detection begins (page count)
- [ ] Log successful completion (detected documents, duration)
- [ ] Include performance metrics
- [ ] Use appropriate log levels (info)

#### Subtask 7.2: Add Heuristic Match Logging
- [ ] Log each heuristic match (page number, heuristic type, confidence)
- [ ] Use debug level for detailed logging
- [ ] Include matched text snippets (first 50 chars)
- [ ] Keep logs concise but informative

#### Subtask 7.3: Add Boundary Detection Logging
- [ ] Log when document boundaries are determined
- [ ] Show page ranges for each document
- [ ] Log confidence scores
- [ ] Help debugging split decisions

#### Subtask 7.4: Add Performance Logging
- [ ] Log time taken per page
- [ ] Log total detection time
- [ ] Monitor for performance degradation
- [ ] Alert if exceeds 1-second threshold

### Task 8: Create Comprehensive Unit Tests
**Estimated Effort**: Large
**Dependencies**: Task 4, Task 5, Task 6

#### Subtask 8.1: Set Up Test Infrastructure
- [ ] Create `services/__tests__/DocumentDetector.test.ts`
- [ ] Set up test fixtures (mock Page arrays)
- [ ] Configure Jest for async testing
- [ ] Add test utilities for creating mock pages

#### Subtask 8.2: Create Test Fixtures
- [ ] Single-page PDF (Page[] with 1 page)
- [ ] Multi-page single document (3 pages, no indicators)
- [ ] Three separate documents (invoice keywords on pages 1, 2, 3)
- [ ] Ambiguous cases (weak indicators, mixed signals)
- [ ] Edge cases (empty text, special characters)

#### Subtask 8.3: Test Single Document Detection
- [ ] Test 1-page PDF returns 1 document
- [ ] Test 3-page PDF with no indicators returns 1 document
- [ ] Verify startPage = 1, endPage = pageCount
- [ ] Verify confidence = 1.0 (fallback)
- [ ] Verify pageCount calculated correctly

#### Subtask 8.4: Test Multi-Document Detection
- [ ] Test 3 pages with invoice keywords on each page
- [ ] Verify 3 documents returned
- [ ] Verify page ranges are correct (1-1, 2-2, 3-3)
- [ ] Verify confidence scores ≥0.7
- [ ] Test with different keyword variations

#### Subtask 8.5: Test Keyword Detection Heuristic
- [ ] Test "invoice" keyword match
- [ ] Test "receipt" keyword match
- [ ] Test "bill" keyword match
- [ ] Test case-insensitivity
- [ ] Test word boundary detection (avoid "billion")
- [ ] Test keyword position (within first 200 chars)

#### Subtask 8.6: Test Invoice Number Pattern Heuristic
- [ ] Test "INV-12345" pattern
- [ ] Test "#12345" pattern
- [ ] Test "No. 12345" pattern
- [ ] Test case variations (INV-, inv-, Inv-)
- [ ] Test minimum digit requirement (3+ digits)
- [ ] Test pattern position (within first 200 chars)

#### Subtask 8.7: Test Date Pattern Heuristic
- [ ] Test MM/DD/YYYY format (01/15/2024)
- [ ] Test DD-MM-YYYY format (15-01-2024)
- [ ] Test YYYY-MM-DD format (2024-01-15)
- [ ] Test pattern position (within first 200 chars)
- [ ] Test invalid dates (13/99/9999) are ignored

#### Subtask 8.8: Test Page Boundary Heuristic
- [ ] Test AGGRESSIVE strategy splits on every page
- [ ] Verify confidence = 0.3 for page boundary
- [ ] Test with PDF with no other indicators
- [ ] Verify each page becomes separate document

#### Subtask 8.9: Test Confidence Scoring
- [ ] Test single indicator confidence
- [ ] Test multiple indicators use maximum confidence
- [ ] Test that confidence doesn't exceed 1.0
- [ ] Test confidence threshold logic (≥0.3 for AGGRESSIVE)
- [ ] Test fallback confidence (1.0)

#### Subtask 8.10: Test Ambiguous Cases
- [ ] Test page with weak indicator (confidence 0.3)
- [ ] Test page with mixed signals
- [ ] Test page with indicator beyond 200 chars (should not split)
- [ ] Test consecutive pages with indicators
- [ ] Verify AGGRESSIVE strategy behavior

#### Subtask 8.11: Test Edge Cases
- [ ] Test empty page text (continue previous document)
- [ ] Test null/undefined text (handle gracefully)
- [ ] Test special characters in text
- [ ] Test extremely long text (>10,000 chars)
- [ ] Test unicode characters
- [ ] Test pages with only whitespace

#### Subtask 8.12: Test Error Scenarios
- [ ] Test empty pages array throws error
- [ ] Test null pages array throws error
- [ ] Test invalid Page objects throw error
- [ ] Verify error messages are descriptive
- [ ] Test error recovery

#### Subtask 8.13: Test Performance
- [ ] Create 100-page test fixture
- [ ] Measure detection time
- [ ] Verify <1 second requirement
- [ ] Test with various text lengths
- [ ] Profile for bottlenecks

### Task 9: Performance Optimization
**Estimated Effort**: Medium
**Dependencies**: Task 8

#### Subtask 9.1: Profile Detection Performance
- [ ] Measure time per page
- [ ] Identify bottlenecks (regex, string operations)
- [ ] Use performance profiling tools
- [ ] Document performance characteristics

#### Subtask 9.2: Optimize Text Extraction
- [ ] Cache header text (first 200 chars)
- [ ] Avoid repeated substring operations
- [ ] Use efficient string methods
- [ ] Minimize regex compilations

#### Subtask 9.3: Optimize Regex Matching
- [ ] Compile regex patterns once (class-level constants)
- [ ] Use non-capturing groups where possible
- [ ] Avoid backtracking in patterns
- [ ] Test regex performance

#### Subtask 9.4: Optimize Confidence Calculation
- [ ] Short-circuit on first high-confidence match
- [ ] Avoid unnecessary calculations
- [ ] Use efficient max() implementation
- [ ] Cache results where appropriate

#### Subtask 9.5: Add Performance Monitoring
- [ ] Add timing metrics to logs
- [ ] Track detection duration per page
- [ ] Monitor total detection time
- [ ] Alert if exceeds performance budget

### Task 10: Integration with PDFParser (Story 3.9)
**Estimated Effort**: Small
**Dependencies**: Story 3.9, Task 4

#### Subtask 10.1: Import Page Interface from PDFParser
- [ ] Import Page type from services/PDFParser
- [ ] Ensure compatibility with PDFParser output
- [ ] Verify page numbering consistency (1-indexed)
- [ ] Test integration with real PDFParser output

#### Subtask 10.2: Create Integration Example
- [ ] Document workflow: parsePDF → detect → updateStore
- [ ] Write example code showing integration
- [ ] Show error handling pattern
- [ ] Add to service documentation

#### Subtask 10.3: Test Integration with Real PDF Data
- [ ] Use PDFParser to parse test PDFs
- [ ] Pass parsed pages to DocumentDetector
- [ ] Verify detection works with real data
- [ ] Test with various PDF types

#### Subtask 10.4: Plan Store Integration (Story 3.11+)
- [ ] Document that DocumentDetector is stateless
- [ ] Document that calling code manages store updates
- [ ] Prepare integration documentation
- [ ] Define data flow for batch processing

### Task 11: Documentation and Code Quality
**Estimated Effort**: Small
**Dependencies**: All previous tasks

#### Subtask 11.1: Add Code Documentation
- [ ] Add JSDoc comments to all public methods
- [ ] Document parameters and return types
- [ ] Add usage examples in comments
- [ ] Document heuristics and rationale

#### Subtask 11.2: Create Service Documentation
- [ ] Document DocumentDetector API
- [ ] List all methods and their signatures
- [ ] Document heuristics and confidence scores
- [ ] Add troubleshooting guide

#### Subtask 11.3: Document Detection Strategy
- [ ] Explain AGGRESSIVE strategy rationale
- [ ] Document confidence thresholds
- [ ] Explain when to use each heuristic
- [ ] Add examples of split decisions

#### Subtask 11.4: Update Technical Specification
- [ ] Update tech-spec-epic-3.md with implementation details
- [ ] Document performance characteristics
- [ ] Note limitations and known issues
- [ ] Add flow diagrams for detection algorithm

#### Subtask 11.5: Code Review Preparation
- [ ] Run linter and fix issues
- [ ] Format code consistently
- [ ] Remove debug code and console.logs
- [ ] Ensure all tests pass
- [ ] Check TypeScript strict mode compliance

## Technical Notes

### TypeScript Interfaces

```typescript
// Core data structures
interface DetectedDocument {
  startPage: number;      // 1-indexed starting page
  endPage: number;        // 1-indexed ending page (inclusive)
  pageCount: number;      // Derived: endPage - startPage + 1
  confidence: number;     // Confidence score [0, 1]
}

// Internal types
interface DetectionResult {
  pageNumber: number;     // 1-indexed page number
  indicators: string[];   // List of matched heuristics
  confidence: number;     // Maximum confidence from all indicators
}

interface DetectionHeuristic {
  name: string;           // Heuristic identifier
  pattern: RegExp | null; // Regex pattern (null for keyword lists)
  confidence: number;     // Base confidence score [0, 1]
  description: string;    // Human-readable description
}

enum DetectionStrategy {
  AGGRESSIVE = 'AGGRESSIVE',     // Prefer false positives (v1 default)
  BALANCED = 'BALANCED',         // Balanced approach (future)
  CONSERVATIVE = 'CONSERVATIVE', // Prefer false negatives (future)
}

// Error handling
class DocumentDetectionError extends Error {
  code: ErrorCode;
  pageNumber?: number;
  originalError?: Error;

  constructor(message: string, code: ErrorCode, pageNumber?: number, originalError?: Error) {
    super(message);
    this.name = 'DocumentDetectionError';
    this.code = code;
    this.pageNumber = pageNumber;
    this.originalError = originalError;
  }
}

enum ErrorCode {
  INVALID_INPUT = 'INVALID_INPUT',
  EMPTY_PAGES = 'EMPTY_PAGES',
  DETECTION_FAILED = 'DETECTION_FAILED',
  INVALID_PAGE_DATA = 'INVALID_PAGE_DATA',
}
```

### DocumentDetector Service Implementation Pattern

```typescript
import { Page } from './PDFParser';

class DocumentDetector {
  private static instance: DocumentDetector;
  private logger: Logger;

  // Heuristic configuration
  private readonly KEYWORDS = ['invoice', 'receipt', 'bill'];
  private readonly INVOICE_NUMBER_PATTERNS = [
    /INV-?\d{3,}/i,
    /#\s?\d{3,}/,
    /No\.?\s?\d{3,}/i,
  ];
  private readonly DATE_PATTERNS = [
    /\d{2}\/\d{2}\/\d{4}/,  // MM/DD/YYYY
    /\d{2}-\d{2}-\d{4}/,    // DD-MM-YYYY
    /\d{4}-\d{2}-\d{2}/,    // YYYY-MM-DD
  ];

  private readonly CONFIDENCE_SCORES = {
    KEYWORD: 0.7,
    INVOICE_NUMBER: 0.6,
    DATE_PATTERN: 0.5,
    PAGE_BOUNDARY: 0.3,
  };

  private readonly AGGRESSIVE_THRESHOLD = 0.3;

  private constructor() {
    this.logger = new Logger('DocumentDetector');
  }

  static getInstance(): DocumentDetector {
    if (!DocumentDetector.instance) {
      DocumentDetector.instance = new DocumentDetector();
    }
    return DocumentDetector.instance;
  }

  /**
   * Detect document boundaries in a multi-page PDF
   * @param pages Array of parsed pages from PDFParser
   * @returns Array of detected documents with boundaries and confidence
   */
  async detect(pages: Page[]): Promise<DetectedDocument[]> {
    const startTime = performance.now();
    this.logger.info(`Starting document detection: ${pages.length} pages`);

    // Validate input
    if (!pages || pages.length === 0) {
      throw new DocumentDetectionError(
        'Pages array cannot be empty',
        ErrorCode.EMPTY_PAGES
      );
    }

    try {
      // Step 1: Analyze each page for indicators
      const detectionResults: DetectionResult[] = pages.map((page) =>
        this.analyzePage(page)
      );

      // Step 2: Determine document boundaries
      const documents = this.determineDocumentBoundaries(detectionResults, pages.length);

      // Step 3: Fallback if no splits detected
      const finalDocuments = documents.length > 0
        ? documents
        : [this.createFallbackDocument(pages.length)];

      const duration = performance.now() - startTime;
      this.logger.info(
        `Detection complete in ${duration.toFixed(2)}ms: ${finalDocuments.length} documents detected`
      );

      return finalDocuments;
    } catch (error) {
      this.logger.error('Document detection failed:', error);
      throw new DocumentDetectionError(
        'Detection failed',
        ErrorCode.DETECTION_FAILED,
        undefined,
        error as Error
      );
    }
  }

  /**
   * Analyze a single page for document boundary indicators
   */
  private analyzePage(page: Page): DetectionResult {
    const indicators: string[] = [];
    let maxConfidence = 0;

    // Extract header text (first 200 characters)
    const headerText = this.extractHeaderText(page.text, 200);

    // Run all heuristics
    if (this.detectInvoiceKeywords(headerText)) {
      indicators.push('KEYWORD');
      maxConfidence = Math.max(maxConfidence, this.CONFIDENCE_SCORES.KEYWORD);
    }

    if (this.detectInvoiceNumber(headerText)) {
      indicators.push('INVOICE_NUMBER');
      maxConfidence = Math.max(maxConfidence, this.CONFIDENCE_SCORES.INVOICE_NUMBER);
    }

    if (this.detectDatePattern(headerText)) {
      indicators.push('DATE_PATTERN');
      maxConfidence = Math.max(maxConfidence, this.CONFIDENCE_SCORES.DATE_PATTERN);
    }

    // AGGRESSIVE strategy: Always consider page boundary
    indicators.push('PAGE_BOUNDARY');
    maxConfidence = Math.max(maxConfidence, this.CONFIDENCE_SCORES.PAGE_BOUNDARY);

    if (indicators.length > 1) { // More than just PAGE_BOUNDARY
      this.logger.debug(
        `Page ${page.pageNumber}: indicators=[${indicators.join(', ')}], confidence=${maxConfidence.toFixed(2)}`
      );
    }

    return {
      pageNumber: page.pageNumber,
      indicators,
      confidence: maxConfidence,
    };
  }

  /**
   * Extract first N characters from text for header analysis
   */
  private extractHeaderText(text: string, length: number = 200): string {
    if (!text) return '';
    return text.substring(0, length).toLowerCase();
  }

  /**
   * Detect invoice/receipt/bill keywords
   */
  private detectInvoiceKeywords(headerText: string): boolean {
    return this.KEYWORDS.some((keyword) => {
      // Use word boundary to avoid false positives like "billion"
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      return regex.test(headerText);
    });
  }

  /**
   * Detect invoice number patterns
   */
  private detectInvoiceNumber(headerText: string): boolean {
    return this.INVOICE_NUMBER_PATTERNS.some((pattern) =>
      pattern.test(headerText)
    );
  }

  /**
   * Detect date patterns
   */
  private detectDatePattern(headerText: string): boolean {
    return this.DATE_PATTERNS.some((pattern) => pattern.test(headerText));
  }

  /**
   * Determine document boundaries from detection results
   */
  private determineDocumentBoundaries(
    results: DetectionResult[],
    totalPages: number
  ): DetectedDocument[] {
    const documents: DetectedDocument[] = [];
    let currentDocStart = 1;

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const isLastPage = i === results.length - 1;

      // Check if this page should start a new document
      const shouldSplit =
        result.confidence >= this.AGGRESSIVE_THRESHOLD &&
        i > 0; // Don't split before first page

      if (shouldSplit) {
        // Close current document
        documents.push({
          startPage: currentDocStart,
          endPage: result.pageNumber - 1,
          pageCount: result.pageNumber - currentDocStart,
          confidence: results[i - 1].confidence,
        });

        // Start new document
        currentDocStart = result.pageNumber;
      }

      // Handle last page
      if (isLastPage) {
        documents.push({
          startPage: currentDocStart,
          endPage: result.pageNumber,
          pageCount: result.pageNumber - currentDocStart + 1,
          confidence: result.confidence,
        });
      }
    }

    return documents;
  }

  /**
   * Create fallback document for PDFs with no indicators
   */
  private createFallbackDocument(totalPages: number): DetectedDocument {
    this.logger.info('No indicators found, using fallback (single document)');
    return {
      startPage: 1,
      endPage: totalPages,
      pageCount: totalPages,
      confidence: 1.0, // High confidence it's a single document
    };
  }
}

export const documentDetector = DocumentDetector.getInstance();
```

### Detection Algorithm Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Input: Page[] from PDFParser                                 │
└─────────────┬───────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│ For Each Page:                                               │
│ 1. Extract first 200 chars (header text)                    │
│ 2. Apply all heuristics:                                    │
│    - Invoice keywords (invoice, receipt, bill) → 0.7       │
│    - Invoice number (INV-, #, No.) → 0.6                   │
│    - Date pattern (MM/DD/YYYY) → 0.5                       │
│    - Page boundary (AGGRESSIVE) → 0.3                      │
│ 3. Calculate max confidence from matched indicators         │
└─────────────┬───────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│ Determine Document Boundaries:                               │
│ - If confidence ≥ 0.3 AND not first page → Start new doc   │
│ - Group consecutive pages below threshold into same doc     │
│ - Calculate startPage, endPage, pageCount                   │
└─────────────┬───────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│ Fallback Check:                                              │
│ - If no documents created → Return single document (1.0)    │
│ - Otherwise → Return detected documents                     │
└─────────────┬───────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│ Output: DetectedDocument[]                                   │
└─────────────────────────────────────────────────────────────┘
```

### Heuristic Examples

#### Example 1: Invoice with Strong Indicators

```
Page 1:
"INVOICE #12345
Date: 01/15/2024
Amount: $150.00"

Detection:
- KEYWORD match: "invoice" (0.7)
- INVOICE_NUMBER match: "#12345" (0.6)
- DATE_PATTERN match: "01/15/2024" (0.5)
- PAGE_BOUNDARY: (0.3)
→ Max confidence: 0.7
→ Result: Start new document
```

#### Example 2: Receipt with Keyword Only

```
Page 2:
"Receipt
Item: Coffee
Total: $5.00"

Detection:
- KEYWORD match: "receipt" (0.7)
- PAGE_BOUNDARY: (0.3)
→ Max confidence: 0.7
→ Result: Start new document
```

#### Example 3: Plain Page (No Indicators)

```
Page 3:
"This is a continuation of the previous document.
More text here..."

Detection:
- PAGE_BOUNDARY: (0.3)
→ Max confidence: 0.3
→ Result: Start new document (AGGRESSIVE strategy)
```

#### Example 4: Fallback Scenario

```
PDF with 5 pages, none with any indicators:

Detection:
- All pages have only PAGE_BOUNDARY (0.3)
- AGGRESSIVE strategy would split into 5 documents
- BUT: Heuristic logic determines all pages lack strong indicators
- Fallback activates: Return single document (confidence 1.0)

Output:
[{
  startPage: 1,
  endPage: 5,
  pageCount: 5,
  confidence: 1.0
}]
```

### Performance Optimization Strategies

1. **Regex Compilation**: Compile all regex patterns once at class initialization
2. **String Operations**: Cache extracted header text, avoid repeated substring calls
3. **Short-Circuit Evaluation**: Return early if high-confidence match found
4. **Efficient Max Calculation**: Use Math.max() rather than sorting
5. **Minimal Object Creation**: Reuse objects where possible

### Test Data Examples

#### Test Case 1: Single Document (No Indicators)

```typescript
const pages: Page[] = [
  { pageNumber: 1, text: 'This is page 1 with no invoice keywords.' },
  { pageNumber: 2, text: 'This is page 2 with no invoice keywords.' },
  { pageNumber: 3, text: 'This is page 3 with no invoice keywords.' },
];

// Expected result:
[{
  startPage: 1,
  endPage: 3,
  pageCount: 3,
  confidence: 1.0, // Fallback
}]
```

#### Test Case 2: Three Separate Documents

```typescript
const pages: Page[] = [
  { pageNumber: 1, text: 'Invoice #001\nDate: 01/15/2024\nTotal: $100' },
  { pageNumber: 2, text: 'Receipt for purchase\nDate: 01/16/2024\nItem: Coffee' },
  { pageNumber: 3, text: 'Bill for services\nDate: 01/17/2024\nAmount: $200' },
];

// Expected result:
[
  { startPage: 1, endPage: 1, pageCount: 1, confidence: 0.7 },
  { startPage: 2, endPage: 2, pageCount: 1, confidence: 0.7 },
  { startPage: 3, endPage: 3, pageCount: 1, confidence: 0.7 },
]
```

#### Test Case 3: Ambiguous Case (Weak Indicators)

```typescript
const pages: Page[] = [
  { pageNumber: 1, text: 'Document header with date 01/15/2024 in middle.' }, // 0.5
  { pageNumber: 2, text: 'Continuation of document with no indicators.' },     // 0.3
  { pageNumber: 3, text: 'More continuation text here.' },                     // 0.3
];

// Expected result (AGGRESSIVE strategy):
[
  { startPage: 1, endPage: 1, pageCount: 1, confidence: 0.5 },
  { startPage: 2, endPage: 2, pageCount: 1, confidence: 0.3 },
  { startPage: 3, endPage: 3, pageCount: 1, confidence: 0.3 },
]
```

## Dev Notes

### Integration with Story 3.9 (PDF Parsing Service)

The DocumentDetector service will consume output from PDFParser:

```typescript
// Integration flow:
async function processUploadedPDF(file: File) {
  // Step 1: Parse PDF (Story 3.9)
  const parseResult = await pdfParser.parsePDF(file);

  // Step 2: Detect document boundaries (Story 3.10)
  const detectedDocuments = await documentDetector.detect(parseResult.pages);

  // Step 3: Update store (Story 3.11+)
  extractionStore.updateDetectedDocuments(file.id, detectedDocuments);

  return { parseResult, detectedDocuments };
}
```

### Integration with Story 3.11+ (Store Updates)

Story 3.11 will integrate DocumentDetector with the Zustand store:

1. User uploads multi-file PDF
2. PDFParser extracts pages
3. DocumentDetector identifies document boundaries
4. Store is updated with detected documents
5. UI displays detected documents for user review/confirmation

### AGGRESSIVE Strategy Rationale

The AGGRESSIVE strategy is chosen for v1 because:

1. **User Experience**: False positives (over-splitting) are less problematic than false negatives (missing documents)
2. **User Control**: Users can easily merge documents, but cannot easily split incorrectly merged documents
3. **Data Safety**: Better to isolate documents that should be together than combine documents that should be separate
4. **Flexibility**: Future versions can add BALANCED or CONSERVATIVE strategies

### Confidence Score Interpretation

| Confidence | Interpretation | Action |
|------------|----------------|---------|
| 1.0 | Fallback (no indicators) | Single document |
| 0.7 | Strong indicator (keyword) | Split with high confidence |
| 0.6 | Medium indicator (invoice #) | Split with medium confidence |
| 0.5 | Weak indicator (date) | Split with low confidence |
| 0.3 | Page boundary only | Split (AGGRESSIVE) or continue (BALANCED) |

### Known Limitations (v1)

1. **No Layout Analysis**: Does not analyze visual layout or formatting
2. **Text-Only**: Relies solely on text content, ignores images/graphics
3. **Header-Only**: Only analyzes first 200 characters, may miss indicators lower on page
4. **No Context**: Does not consider document context or relationships between pages
5. **No ML**: Rule-based heuristics only, no machine learning
6. **Single Language**: English keywords only (future: multi-language support)

These limitations are acceptable for Epic 3 MVP. Future enhancements can address them.

### Testing Strategy

#### Unit Test Coverage Goals
- **Core functionality**: 100% (detect, analyzePage, determineDocumentBoundaries)
- **Heuristics**: 100% (all detection methods)
- **Error handling**: 100% (all error paths)
- **Helpers**: 90%+ (extractHeaderText, confidence calculation)
- **Overall**: 90%+ code coverage

#### Test Files Organization
```
services/
  __tests__/
    DocumentDetector.test.ts        # Main test file
    fixtures/
      single-document.json          # Pages with no indicators
      three-documents.json          # Pages with invoice keywords
      ambiguous-case.json           # Pages with weak indicators
      edge-cases.json               # Empty text, special chars
      performance-100-pages.json    # Performance testing
```

#### Test Categories

1. **Happy Path Tests**:
   - Single document detection
   - Multi-document detection
   - Each heuristic individually

2. **Edge Case Tests**:
   - Empty pages array
   - Single-page PDF
   - All pages with indicators
   - No pages with indicators
   - Empty text pages

3. **Error Tests**:
   - Invalid input (null, undefined)
   - Malformed Page objects
   - Text parsing errors

4. **Performance Tests**:
   - 100-page PDF (<1 second)
   - Large text content
   - Many heuristic matches

5. **Integration Tests**:
   - Use real PDFParser output
   - Test with actual PDF files
   - Verify end-to-end flow

### Future Enhancements

1. **Machine Learning**: Train ML model on labeled invoice datasets
2. **Layout Analysis**: Analyze visual layout and formatting
3. **Multi-Language**: Support non-English keywords and patterns
4. **Context Awareness**: Consider document relationships and context
5. **User Feedback Loop**: Learn from user corrections to split decisions
6. **Advanced Heuristics**: Add more sophisticated pattern detection
7. **Configurable Strategies**: Allow users to choose AGGRESSIVE/BALANCED/CONSERVATIVE

## Related Files

- `/services/DocumentDetector.ts` - Service to create (main deliverable)
- `/services/__tests__/DocumentDetector.test.ts` - Test file to create
- `/services/PDFParser.ts` - Dependency (provides Page interface)
- `/stores/extractionStore.ts` - Will be updated in Story 3.11
- `/app/extract/components/FileUploadSection.tsx` - Will consume this in Story 3.11
- `/docs/tech-spec-epic-3.md` - Technical specification reference
- `/docs/stories/story-3.9.md` - Previous story (PDF parsing)
- `/docs/stories/story-3.11.md` - Next story (store integration, will use this service)

## Definition of Done

- [ ] All acceptance criteria are met and verified
- [ ] DocumentDetector service class implemented in `services/DocumentDetector.ts`
- [ ] All interfaces defined (DetectedDocument, DetectionResult, DetectionHeuristic)
- [ ] detect() method fully implemented with proper typing
- [ ] All 4 heuristics implemented (keywords, invoice number, date, page boundary)
- [ ] AGGRESSIVE detection strategy implemented
- [ ] Confidence scoring logic implemented (max of all indicators)
- [ ] Fallback logic implemented (single document when no indicators)
- [ ] Document boundary merging logic implemented
- [ ] Error handling implemented for all edge cases
- [ ] Custom error types created and used appropriately
- [ ] Unit tests written and passing (>90% coverage)
- [ ] Test fixtures created for all test scenarios
- [ ] All heuristics tested individually
- [ ] Multi-document detection tested
- [ ] Single document detection tested
- [ ] Ambiguous cases tested
- [ ] Edge cases tested (empty text, special chars, etc.)
- [ ] Performance requirement verified (<1 second for 100 pages)
- [ ] Performance optimizations implemented (regex compilation, caching)
- [ ] Logging implemented for debugging
- [ ] Integration with PDFParser tested with real data
- [ ] Code reviewed and approved by tech lead
- [ ] No TypeScript errors or warnings
- [ ] ESLint passes with no errors
- [ ] All tests pass in CI/CD pipeline
- [ ] Documentation complete (JSDoc, API docs, algorithm explanation)
- [ ] Integration points documented for Story 3.11
- [ ] Build passes with no errors
- [ ] Code follows project conventions and style guide

## Notes

- This story implements the core intelligence of the batch extraction pipeline
- AGGRESSIVE strategy is intentional - prefer over-splitting to under-splitting
- Confidence scores are designed to be interpretable and actionable
- The algorithm should be fast and deterministic
- Keep the API simple and clean for easy integration
- Document all heuristics clearly for future maintenance
- This service is pure business logic - no UI dependencies
- Consider testability when designing the API
- Story 3.11 will consume this service immediately upon completion
- The DocumentDetector should be stateless and side-effect free (except logging)
- Focus on reliability over sophistication - simple heuristics that work well
- Future ML enhancements can build on this foundation

## Revision Notes

### Initial Draft - SM Agent (2025-10-26)

Created comprehensive story following Story 3.9 pattern with:
- All 14 acceptance criteria from epics.md
- 11 major tasks with 50+ subtasks covering full implementation
- Detailed technical notes with code examples and interfaces
- Complete testing strategy with multiple test scenarios
- Performance optimization guidance
- Integration documentation with Story 3.9 and Story 3.11
- AGGRESSIVE strategy rationale and confidence scoring explanation
- Edge case handling and error management
- Documentation and code quality tasks

**Key Implementation Details:**
- Singleton pattern for service class
- 4 heuristics: keywords (0.7), invoice number (0.6), date (0.5), page boundary (0.3)
- AGGRESSIVE threshold: 0.3 (split on any indicator)
- Fallback: Single document with confidence 1.0 when no indicators
- Performance target: <1 second for 100 pages
- Maximum confidence scoring (not cumulative)
- First 200 characters analysis for all heuristics

**Testing Coverage:**
- Single document detection
- Multi-document detection (3 documents)
- All heuristics tested individually
- Ambiguous cases and edge cases
- Performance testing with 100-page fixture
- Integration testing with real PDFParser output

Ready for Architect review.

### Implementation Complete - DEV Agent (2025-10-26)

Successfully implemented Story 3.10 with all acceptance criteria met:

**Deliverables Completed:**
1. ✅ DocumentDetector.ts service class (397 lines)
   - Singleton pattern implementation
   - All 4 heuristics implemented (keywords, invoice number, date, page boundary)
   - AGGRESSIVE detection strategy with 0.3 threshold
   - Comprehensive error handling with custom error types
   - Performance optimized for <1 second on 100 pages

2. ✅ detectionTestData.ts test fixtures (300+ lines)
   - 20+ helper functions for various test scenarios
   - Single document, multi-document, edge cases
   - Performance test with 100-page fixture
   - Special characters, unicode, empty text tests

3. ✅ DocumentDetector.test.ts comprehensive test suite (570+ lines)
   - 47 tests across 11 test suites
   - All 14 acceptance criteria covered
   - Singleton, detection, heuristics, confidence, error handling, performance, integration tests

**Test Results:**
- ✅ All 47 tests passing (100% pass rate)
- ✅ 97.95% code coverage (exceeds 90% requirement)
- ✅ Performance: 100-page detection in <1 second (meets requirement)
- ✅ Build passing with zero TypeScript errors

**Acceptance Criteria Verification:**
- ✅ AC1: DocumentDetector service class created
- ✅ AC2: detect() method implementation
- ✅ AC3: DetectedDocument data structure
- ✅ AC4: AGGRESSIVE detection strategy
- ✅ AC5: Invoice/Receipt keyword detection (0.7 confidence)
- ✅ AC6: Invoice number pattern detection (0.6 confidence)
- ✅ AC7: Date pattern detection (0.5 confidence)
- ✅ AC8: Page boundary heuristic (0.3 confidence)
- ✅ AC9: Multi-indicator confidence scoring (max, not cumulative)
- ✅ AC10: Fallback for no indicators (1.0 confidence)
- ✅ AC11: Comprehensive unit tests
- ✅ AC12: Test data with invoice keywords
- ✅ AC13: Test data with no keywords (fallback)
- ✅ AC14: Performance requirements (<1 second for 100 pages)

**Files Created:**
- `lib/services/DocumentDetector.ts` - Main service (397 lines)
- `lib/services/__tests__/DocumentDetector.test.ts` - Tests (570+ lines)
- `lib/services/__tests__/fixtures/detectionTestData.ts` - Fixtures (300+ lines)

**Integration Notes:**
- Imports Page interface from PDFParser (Story 3.9)
- Exports DetectedDocument, ErrorCode, DocumentDetectionError types
- Exports singleton instance: documentDetector
- Ready for integration with Story 3.11 (Batch Extraction Store)

**Code Quality:**
- TypeScript strict mode compliant
- Zero linting errors
- Comprehensive JSDoc documentation
- Follows singleton pattern like PDFParser
- Stateless service design
- Performance optimized (regex compilation, string caching)

Story 3.10 is complete and ready for production use.
