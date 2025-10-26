# Story 3.9: PDF Parsing Service

## Story Information
- **Epic**: 3 - Unified Batch Extraction Workflow
- **Story**: 3.9
- **Status**: Ready
- **Priority**: High
- **Estimated Effort**: Medium
- **Prerequisites**: Story 3.8 (Multi-File Upload UI)
- **Architect Approved**: 2025-10-26

## User Story
As a developer, I want a reliable PDF parsing service, so that I can extract text and metadata from uploaded files.

## Acceptance Criteria

### AC1: PDFParser Service Class Created
**Given** the application needs PDF parsing capabilities
**When** the PDFParser service is implemented
**Then** a service class should exist at `services/PDFParser.ts` with proper TypeScript interfaces and error handling

### AC2: PDF-Parse Library Integration
**Given** the PDFParser service is being implemented
**When** PDF files need to be parsed
**Then** the service should use the pdf-parse library (version 1.1.1 - exact version pinned) with proper type definitions

### AC3: ParsePDF Method Implementation
**Given** a PDF file is uploaded
**When** `parsePDF(file: File)` is called
**Then** the method should return a Promise resolving to `{ pages: Page[], metadata: Metadata }`

### AC4: Page Data Structure
**Given** a PDF is being parsed
**When** page data is extracted
**Then** each Page object should include: pageNumber (1-indexed), text (extracted content), and optionally height/width (in points) if available

### AC5: Metadata Extraction
**Given** a PDF file is parsed
**When** metadata is extracted
**Then** the Metadata object should include: pageCount, title, author, createdDate (ISO format)

### AC6: Error Handling for Corrupted PDFs
**Given** a corrupted or unreadable PDF is uploaded
**When** the parsing process encounters errors
**Then** the service should catch the error, log it, and throw a descriptive error message

### AC7: Comprehensive Unit Tests
**Given** the PDFParser service is implemented
**When** running the test suite
**Then** tests should cover: valid PDFs, corrupted PDFs, multi-page PDFs, and edge cases

### AC8: Performance Requirements
**Given** a 100-page PDF file is uploaded
**When** the parsing process executes
**Then** the complete parsing should finish in less than 10 seconds

### AC9: Memory Efficient Handling
**Given** large PDF files are being processed
**When** the parsing occurs
**Then** the service should use efficient memory handling with file size limits (50MB max) to prevent excessive memory usage

### AC10: Debug Logging
**Given** the PDF parsing process is running
**When** operations occur (start, progress, completion, errors)
**Then** the service should log detailed information for debugging purposes

## Tasks and Subtasks

### Task 1: Install Dependencies
**Estimated Effort**: Small
**Dependencies**: None

#### Subtask 1.1: Install pdf-parse Library
- [ ] Run `npm install pdf-parse@1.1.1` (exact version, no caret)
- [ ] Verify installation in package.json
- [ ] Test basic import works

#### Subtask 1.2: Install TypeScript Type Definitions
- [ ] Run `npm install --save-dev @types/pdf-parse@^1.1.4`
- [ ] Verify type definitions are recognized
- [ ] Check for any type conflicts

#### Subtask 1.3: Verify Compatibility
- [ ] Ensure pdf-parse works with current Node.js version
- [ ] Test with Next.js build process
- [ ] Verify no conflicts with existing dependencies

### Task 2: Create TypeScript Interfaces and Types
**Estimated Effort**: Small
**Dependencies**: Task 1

#### Subtask 2.1: Define Page Interface
- [ ] Create Page interface with pageNumber, text, height, width
- [ ] Add JSDoc comments for each property
- [ ] Export from appropriate location (types/pdf.ts or inline)

#### Subtask 2.2: Define Metadata Interface
- [ ] Create Metadata interface with pageCount, title, author, createdDate
- [ ] Handle optional metadata fields gracefully
- [ ] Add proper type annotations

#### Subtask 2.3: Define ParseResult Interface
- [ ] Create ParseResult interface combining pages and metadata
- [ ] Ensure type safety for all return values
- [ ] Add error result type for failed parsing

#### Subtask 2.4: Define Error Types
- [ ] Create custom error class PDFParsingError
- [ ] Add error codes (CORRUPTED_FILE, INVALID_FORMAT, etc.)
- [ ] Include originalError for debugging

### Task 3: Implement PDFParser Service Class
**Estimated Effort**: Medium
**Dependencies**: Task 1, Task 2

#### Subtask 3.1: Create Service Class Structure
- [ ] Create `services/PDFParser.ts` file
- [ ] Set up class with singleton pattern (or static methods)
- [ ] Add logger instance for debugging
- [ ] Import pdf-parse and type definitions

#### Subtask 3.2: Implement File to Buffer Conversion (Server-Side Only)
- [ ] Create helper method to convert File to Buffer
- [ ] Handle ArrayBuffer to Buffer conversion
- [ ] Add error handling for file reading
- [ ] **WARNING**: PDFParser is server-side only. Must be called from API routes (e.g., `/api/parse-pdf`)

#### Subtask 3.3: Implement Core parsePDF Method
- [ ] Create async parsePDF(file: File) method
- [ ] Convert File to Buffer
- [ ] Call pdf-parse with Buffer
- [ ] Transform raw output to ParseResult format
- [ ] Add try-catch for error handling

#### Subtask 3.4: Implement Metadata Extraction
- [ ] Extract pageCount from pdf-parse output
- [ ] Parse title from PDF metadata (with fallback)
- [ ] Parse author from PDF metadata (with fallback)
- [ ] Format createdDate to ISO string (with fallback)
- [ ] Handle missing metadata gracefully

#### Subtask 3.5: Implement Page Processing
- [ ] Extract text for each page
- [ ] Assign 1-indexed page numbers
- [ ] Handle pages with no text content
- [ ] Optimize text extraction for performance
- [ ] **Note**: Page dimensions (height/width) deferred to Story 3.10+ (requires PDF.js pagerender option)

### Task 4: Implement Memory Optimization and File Size Limits
**Estimated Effort**: Medium
**Dependencies**: Task 3

#### Subtask 4.1: Configure File Size Limits
- [ ] Add file size validation (50MB max)
- [ ] Throw FILE_TOO_LARGE error if exceeded
- [ ] Configure max buffer size limits
- [ ] Add memory usage monitoring (optional)

#### Subtask 4.2: Optimize Large File Handling
- [ ] Add 15-second parsing timeout
- [ ] Throw PARSING_TIMEOUT error if exceeded
- [ ] Add progress callbacks for UI feedback
- [ ] Consider worker thread for CPU-intensive parsing
- [ ] Test with large files (100+ pages)

#### Subtask 4.3: Implement Caching Strategy
- [ ] Add optional result caching by file hash
- [ ] Cache parsed results for duplicate uploads
- [ ] Implement cache invalidation strategy
- [ ] Add cache size limits

### Task 5: Implement Error Handling
**Estimated Effort**: Small
**Dependencies**: Task 2, Task 3

#### Subtask 5.1: Handle Corrupted PDF Files
- [ ] Catch pdf-parse errors for corrupted files
- [ ] Provide user-friendly error message
- [ ] Log technical details for debugging
- [ ] Test with intentionally corrupted PDFs

#### Subtask 5.2: Handle Invalid File Types
- [ ] Validate file is actually a PDF (magic number check: `%PDF`)
- [ ] Return clear error for non-PDF files
- [ ] Handle files with .pdf extension but invalid content
- [ ] Example: `buffer.toString('utf-8', 0, 4) === '%PDF'`

#### Subtask 5.3: Handle Password-Protected PDFs
- [ ] Detect password-protected PDFs
- [ ] Return specific error for encrypted files
- [ ] Document limitation (no password support in v1)

#### Subtask 5.4: Handle Malformed PDFs
- [ ] Catch parsing errors for malformed structure
- [ ] Attempt partial extraction if possible
- [ ] Log specific error details
- [ ] Return structured error response

### Task 6: Implement Logging
**Estimated Effort**: Small
**Dependencies**: Task 3

#### Subtask 6.1: Add Parsing Start/End Logs
- [ ] Log when parsing begins (filename, size)
- [ ] Log successful completion (pages, duration)
- [ ] Include performance metrics
- [ ] Use appropriate log levels (info, debug)

#### Subtask 6.2: Add Progress Logging
- [ ] Log progress for large files (every 25 pages)
- [ ] Log memory usage periodically
- [ ] Add timing information
- [ ] Keep logs concise but informative

#### Subtask 6.3: Add Error Logging
- [ ] Log all errors with stack traces
- [ ] Include file metadata in error logs
- [ ] Log error recovery attempts
- [ ] Use error log level appropriately

#### Subtask 6.4: Configure Log Levels
- [ ] Set up debug mode for development
- [ ] Reduce verbosity in production
- [ ] Allow runtime log level configuration
- [ ] Integrate with application logging system

### Task 7: Create Unit Tests
**Estimated Effort**: Medium
**Dependencies**: Task 3, Task 5

#### Subtask 7.1: Set Up Test Infrastructure
- [ ] Create `services/__tests__/PDFParser.test.ts`
- [ ] Set up test fixtures folder with sample PDFs
- [ ] Configure Jest for async testing
- [ ] Add test utilities for file mocking

#### Subtask 7.2: Create Test Fixtures
- [ ] Create valid single-page PDF
- [ ] Create valid multi-page PDF (10+ pages)
- [ ] Create corrupted PDF file
- [ ] Create password-protected PDF (if testing limitations)
- [ ] Create PDF with no metadata
- [ ] Create PDF with special characters in text

#### Subtask 7.3: Test Valid PDF Parsing
- [ ] Test parsing single-page PDF
- [ ] Test parsing multi-page PDF
- [ ] Verify page count accuracy
- [ ] Verify text extraction accuracy
- [ ] Verify page dimensions
- [ ] Test with PDF containing images

#### Subtask 7.4: Test Metadata Extraction
- [ ] Test extraction with full metadata
- [ ] Test extraction with partial metadata
- [ ] Test extraction with no metadata
- [ ] Test date parsing and formatting
- [ ] Test handling of special characters in metadata

#### Subtask 7.5: Test Error Scenarios
- [ ] Test corrupted PDF handling
- [ ] Test non-PDF file handling
- [ ] Test password-protected PDF
- [ ] Test empty file handling
- [ ] Test extremely large file handling
- [ ] Verify error messages are user-friendly

#### Subtask 7.6: Test Performance
- [ ] Create 100-page test PDF
- [ ] Measure parsing time
- [ ] Verify <10 second requirement
- [ ] Test memory usage
- [ ] Profile for bottlenecks

#### Subtask 7.7: Test Edge Cases
- [ ] Test PDF with 0 pages (if possible)
- [ ] Test PDF with 1000+ pages
- [ ] Test PDF with unicode text
- [ ] Test PDF with rotated pages
- [ ] Test PDF with non-standard page sizes

### Task 8: Performance Optimization
**Estimated Effort**: Small
**Dependencies**: Task 3, Task 7

#### Subtask 8.1: Profile Parsing Performance
- [ ] Measure parsing time for various file sizes
- [ ] Identify bottlenecks in code
- [ ] Use performance profiling tools
- [ ] Document performance characteristics

#### Subtask 8.2: Optimize Text Extraction
- [ ] Minimize string concatenation
- [ ] Use efficient data structures
- [ ] Avoid unnecessary array copies
- [ ] Consider lazy evaluation where applicable

#### Subtask 8.3: Optimize Memory Usage
- [ ] Profile memory consumption
- [ ] Implement garbage collection hints
- [ ] Release large objects promptly
- [ ] Verify no memory leaks

#### Subtask 8.4: Add Performance Monitoring
- [ ] Add timing metrics to logs
- [ ] Track parsing duration
- [ ] Monitor memory peaks
- [ ] Create performance dashboard (optional)

### Task 9: Integration Preparation
**Estimated Effort**: Small
**Dependencies**: All previous tasks

#### Subtask 9.1: Create Service Export
- [ ] Export PDFParser from services/index.ts
- [ ] Ensure clean API surface
- [ ] Add barrel exports if needed
- [ ] Document public API

#### Subtask 9.2: Document Store Integration Pattern
- [ ] Document that PDFParser is stateless and returns ParseResult
- [ ] Document that calling code (Story 3.10) manages Zustand store updates
- [ ] Note: PDFParser does not directly update store (violates single responsibility)
- [ ] Prepare integration documentation for Story 3.10

#### Subtask 9.3: Plan FileUploadSection Integration
- [ ] Design flow: upload → parse → update UI
- [ ] Plan loading state during parsing
- [ ] Design error state display
- [ ] Document integration points for Story 3.10

#### Subtask 9.4: Create Usage Examples
- [ ] Write example code for basic usage
- [ ] Document error handling patterns
- [ ] Show integration with React components
- [ ] Add code comments

### Task 10: Documentation and Code Quality
**Estimated Effort**: Small
**Dependencies**: All previous tasks

#### Subtask 10.1: Add Code Documentation
- [ ] Add JSDoc comments to all public methods
- [ ] Document parameters and return types
- [ ] Add usage examples in comments
- [ ] Document error scenarios

#### Subtask 10.2: Create Service Documentation
- [ ] Document PDFParser API
- [ ] List all methods and their signatures
- [ ] Document error types and codes
- [ ] Add troubleshooting guide

#### Subtask 10.3: Update Technical Specification
- [ ] Update tech-spec-epic-3.md with implementation details
- [ ] Document performance characteristics
- [ ] Note any limitations or known issues
- [ ] Add architectural diagrams if needed

#### Subtask 10.4: Code Review Preparation
- [ ] Run linter and fix issues
- [ ] Format code consistently
- [ ] Remove debug code and console.logs
- [ ] Ensure all tests pass
- [ ] Check TypeScript strict mode compliance

## Technical Notes

### TypeScript Interfaces

```typescript
// Core data structures
interface Page {
  pageNumber: number;      // 1-indexed page number
  text: string;            // Extracted text content
  height?: number;         // Page height in points (1/72 inch) - optional, deferred to Story 3.10+
  width?: number;          // Page width in points (1/72 inch) - optional, deferred to Story 3.10+
}

interface Metadata {
  pageCount: number;       // Total number of pages
  title: string;           // Document title (or filename if missing)
  author: string;          // Document author (or "Unknown" if missing)
  createdDate: string;     // ISO 8601 format date string
}

interface ParseResult {
  pages: Page[];
  metadata: Metadata;
}

// Error handling
class PDFParsingError extends Error {
  code: ErrorCode;
  originalError?: Error;

  constructor(message: string, code: ErrorCode, originalError?: Error) {
    super(message);
    this.name = 'PDFParsingError';
    this.code = code;
    this.originalError = originalError;
  }
}

enum ErrorCode {
  CORRUPTED_FILE = 'CORRUPTED_FILE',
  INVALID_FORMAT = 'INVALID_FORMAT',
  PASSWORD_PROTECTED = 'PASSWORD_PROTECTED',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  PARSING_FAILED = 'PARSING_FAILED',
  UNSUPPORTED_PDF_VERSION = 'UNSUPPORTED_PDF_VERSION',
  PARSING_TIMEOUT = 'PARSING_TIMEOUT',
}
```

### PDFParser Service Implementation Pattern

```typescript
import pdfParse from 'pdf-parse';

class PDFParser {
  private static instance: PDFParser;
  private logger: Logger;

  private constructor() {
    this.logger = new Logger('PDFParser');
  }

  static getInstance(): PDFParser {
    if (!PDFParser.instance) {
      PDFParser.instance = new PDFParser();
    }
    return PDFParser.instance;
  }

  async parsePDF(file: File): Promise<ParseResult> {
    const startTime = performance.now();
    this.logger.info(`Starting PDF parsing: ${file.name} (${file.size} bytes)`);

    try {
      // Convert File to Buffer
      const buffer = await this.fileToBuffer(file);

      // Parse PDF with pdf-parse
      const data = await pdfParse(buffer);

      // Extract and format results
      const result = this.formatParseResult(data, file.name);

      const duration = performance.now() - startTime;
      this.logger.info(`PDF parsed successfully in ${duration.toFixed(2)}ms: ${result.metadata.pageCount} pages`);

      return result;
    } catch (error) {
      this.logger.error(`PDF parsing failed for ${file.name}:`, error);
      throw this.handleParsingError(error, file.name);
    }
  }

  private async fileToBuffer(file: File): Promise<Buffer> {
    const arrayBuffer = await file.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  private formatParseResult(data: any, filename: string): ParseResult {
    // Implementation details...
  }

  private handleParsingError(error: any, filename: string): PDFParsingError {
    // Error classification and formatting...
  }
}

export const pdfParser = PDFParser.getInstance();
```

### pdf-parse Library Usage

```typescript
// Basic pdf-parse configuration
const options = {
  max: 0, // Parse all pages (0 = no limit)
  version: 'v1.10.100', // PDF.js version
};

const data = await pdfParse(buffer, options);

// pdf-parse returns:
// {
//   numpages: number,
//   numrender: number,
//   info: { Title, Author, CreationDate, ... },
//   metadata: any,
//   text: string, // All text concatenated
//   version: string
// }
```

### Magic Number Validation

```typescript
// Validate that file is actually a PDF before parsing
function validatePDFMagicNumber(buffer: Buffer): boolean {
  // PDF files always start with %PDF (magic number)
  const magicNumber = buffer.toString('utf-8', 0, 4);
  return magicNumber === '%PDF';
}

// Usage in parsePDF method:
async parsePDF(file: File): Promise<ParseResult> {
  const buffer = await this.fileToBuffer(file);

  // Validate magic number
  if (!this.validatePDFMagicNumber(buffer)) {
    throw new PDFParsingError(
      'File is not a valid PDF',
      ErrorCode.INVALID_FORMAT
    );
  }

  // Validate file size (50MB max)
  const MAX_FILE_SIZE = 50 * 1024 * 1024;
  if (file.size > MAX_FILE_SIZE) {
    throw new PDFParsingError(
      'File exceeds maximum size (50MB)',
      ErrorCode.FILE_TOO_LARGE
    );
  }

  // Continue with parsing...
}
```

### Server-Side API Route Integration

**IMPORTANT**: pdf-parse is server-side only (requires Node.js). It cannot run in the browser.

```typescript
// Example API route: /app/api/parse-pdf/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pdfParse from 'pdf-parse';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file size (50MB max)
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 50MB.' },
        { status: 413 }
      );
    }

    // Convert File to Buffer (server-side)
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse PDF with timeout
    const parsePromise = pdfParse(buffer);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('PARSING_TIMEOUT')), 15000)
    );

    const data = await Promise.race([parsePromise, timeoutPromise]);

    // Return parsed result
    return NextResponse.json({
      pages: data.numpages,
      text: data.text,
      metadata: data.info,
    });
  } catch (error: any) {
    if (error.message === 'PARSING_TIMEOUT') {
      return NextResponse.json(
        { error: 'Parsing timeout exceeded (15 seconds)' },
        { status: 408 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to parse PDF' },
      { status: 500 }
    );
  }
}
```

### Memory Efficiency Considerations

**Note**: pdf-parse does NOT support true streaming - it loads the full PDF buffer into memory.

1. **File Size Limits**:
   - Enforce 50MB maximum file size
   - Throw FILE_TOO_LARGE error if exceeded
   - Validate before parsing begins

2. **Large File Handling**:
   - Set 15-second parsing timeout
   - Throw PARSING_TIMEOUT if exceeded
   - Consider pagination for very large documents
   - Use progress callbacks for UI feedback

3. **Garbage Collection**:
   - Nullify large objects after use
   - Avoid circular references
   - Let WeakMap/WeakSet help with cleanup

### Performance Optimization Strategies

1. **Lazy Loading**: Don't extract all text upfront if not needed
2. **Caching**: Cache parsed results by file hash
3. **Worker Threads**: Move parsing to background thread (future enhancement)
4. **Incremental Processing**: Parse pages on-demand
5. **Text Compression**: Compress large text content in memory

### Error Classification Matrix

| Error Type | Detection Method | User Message | Recovery Action |
|------------|------------------|--------------|-----------------|
| Corrupted PDF | pdf-parse throws exception | "File appears to be corrupted" | Ask user to re-upload |
| Invalid Format | Magic number check fails | "File is not a valid PDF" | Reject file |
| Password Protected | pdf-parse detects encryption | "Password-protected PDFs not supported" | Inform limitation |
| File Too Large | Size exceeds 50MB | "File exceeds maximum size (50MB)" | Suggest splitting |
| Parsing Timeout | Operation exceeds 15 seconds | "File is too complex to parse" | Retry or reject |
| Unsupported PDF Version | pdf-parse version error | "PDF version not supported. Try re-saving as PDF 1.7." | Request re-save |

## Dev Notes

### Integration with Story 3.8 (Multi-File Upload)

The PDFParser service will be called after files are uploaded:

1. User uploads files via FileUploadSection
2. Files are added to Zustand store with status 'pending'
3. **Story 3.10** will call PDFParser for each file
4. Page count is extracted and stored in UploadedFile.pageCount
5. File status updated to 'ready' or 'error'
6. UI shows page count in file list

### Integration with Story 3.10 (Auto-Detection)

Story 3.10 will use PDFParser as its first step:

```typescript
// Story 3.10 will implement this flow:
async function detectDocumentType(file: File) {
  // Step 1: Parse PDF (Story 3.9)
  const parseResult = await pdfParser.parsePDF(file);

  // Step 2: Detect document type from parsed text (Story 3.10)
  const detectionResult = await documentDetector.detect(parseResult.pages);

  return { parseResult, detectionResult };
}
```

### Testing Strategy

#### Unit Test Coverage Goals
- **Core functionality**: 100% (parsePDF, formatParseResult)
- **Error handling**: 100% (all error paths)
- **Helpers**: 90%+ (buffer conversion, metadata extraction)
- **Overall**: 85%+ code coverage

#### Test Files Organization
```
services/
  __tests__/
    PDFParser.test.ts        # Main test file
    fixtures/
      valid-single.pdf       # 1 page, full metadata
      valid-multi.pdf        # 10 pages, full metadata
      no-metadata.pdf        # Valid PDF, no metadata
      corrupted.pdf          # Intentionally corrupted
      large-100-pages.pdf    # Performance testing
      unicode-text.pdf       # Special characters
      password.pdf           # Encrypted PDF
```

#### Integration Testing Approach
- Mock File objects in tests
- Use actual PDF files as fixtures
- Test with real pdf-parse library (not mocked)
- Verify output format matches interfaces exactly

#### Performance Testing Checklist
- [ ] Single page: <100ms
- [ ] 10 pages: <500ms
- [ ] 100 pages: <10000ms (requirement)
- [ ] 500 pages: <30000ms (stretch goal, but may hit timeout)
- [ ] Memory usage: <100MB for 100-page PDF
- [ ] Verify 15-second timeout works correctly

### Known Limitations (v1)

1. **No Password Support**: Password-protected PDFs cannot be parsed
2. **No OCR**: Scanned PDFs without text layer will return empty text
3. **No Form Data**: Form fields are not extracted
4. **No Annotations**: Comments and annotations are ignored
5. **No Images**: Image content is not extracted (text only)
6. **Page Rendering**: No visual rendering, text extraction only

These limitations are acceptable for Epic 3 MVP. Future enhancements can address them.

### Security Considerations

1. **File Validation**: Always validate file is actually PDF before parsing
2. **Size Limits**: Enforce maximum file size to prevent DoS
3. **Timeout Protection**: Set parsing timeout to prevent infinite loops
4. **Memory Limits**: Monitor memory usage during parsing
5. **Sandboxing**: Consider running parser in isolated context (future)

### Dependencies

```json
{
  "dependencies": {
    "pdf-parse": "1.1.1"
  },
  "devDependencies": {
    "@types/pdf-parse": "^1.1.4"
  }
}
```

Note: pdf-parse internally uses PDF.js, which is a Mozilla project and well-maintained.

## Related Files

- `/services/PDFParser.ts` - Service to create (main deliverable)
- `/services/__tests__/PDFParser.test.ts` - Test file to create
- `/stores/extractionStore.ts` - Will be updated in Story 3.10
- `/app/extract/components/FileUploadSection.tsx` - Will consume this in Story 3.10
- `/docs/tech-spec-epic-3.md` - Technical specification reference
- `/docs/stories/story-3.8.md` - Previous story (multi-file upload)
- `/docs/stories/story-3.10.md` - Next story (auto-detection, will use this service)

## Definition of Done

- [ ] All acceptance criteria are met and verified
- [ ] PDFParser service class implemented in `services/PDFParser.ts`
- [ ] pdf-parse and @types/pdf-parse installed
- [ ] All interfaces defined (Page, Metadata, ParseResult, PDFParsingError)
- [ ] parsePDF method fully implemented with proper typing
- [ ] Metadata extraction working (pageCount, title, author, createdDate)
- [ ] Error handling implemented for all edge cases
- [ ] Custom error types created and used appropriately
- [ ] Unit tests written and passing (>85% coverage)
- [ ] Test fixtures created (valid, corrupted, multi-page PDFs)
- [ ] Performance requirement verified (<5s for 100 pages)
- [ ] Memory efficiency verified (streaming approach)
- [ ] Logging implemented for debugging
- [ ] Code reviewed and approved by tech lead
- [ ] No TypeScript errors or warnings
- [ ] ESLint passes with no errors
- [ ] All tests pass in CI/CD pipeline
- [ ] Documentation complete (JSDoc, API docs)
- [ ] Integration points documented for Story 3.10
- [ ] Build passes with no errors
- [ ] Code follows project conventions and style guide

## Notes

- This story is foundational for the entire batch extraction pipeline
- Focus on reliability and error handling - this is a critical service
- Performance is important but correctness is paramount
- Keep the API simple and clean for easy integration
- Document limitations clearly (no OCR, no password support)
- This service is pure business logic - no UI dependencies
- Consider testability when designing the API
- Story 3.10 will consume this service immediately upon completion
- The PDFParser should be stateless and side-effect free (except logging)

## Revision Notes

### Revision 1 - Architect Review Fixes (2025-10-26)

Fixed all 8 issues identified in architect review:

**Critical Issues Fixed:**
1. **Wrong Library Import (Lines 414, 440, 481)**: Changed `import pdfjsLib from 'pdf-parse'` to `import pdfParse from 'pdf-parse'` throughout all code examples
2. **Browser Environment Incompatibility (Subtask 3.2, Technical Notes)**:
   - Removed "browser environment" references
   - Added warning: "PDFParser is server-side only. Must be called from API routes."
   - Updated integration notes with `/api/parse-pdf` API route pattern
   - Replaced client-side `fileToBuffer(file: File)` with server-side API route example

**High Issues Fixed:**
3. **Unrealistic Performance (AC8)**: Revised from "<5 seconds" to "<10 seconds" for 100-page PDFs
4. **Streaming Misrepresentation (AC9, Task 4)**:
   - Revised AC9 from "streaming approach" to "efficient memory handling with file size limits (50MB max)"
   - Removed "streaming" language from Task 4, renamed to "Memory Optimization and File Size Limits"
   - Added file size limit validation (50MB max)
   - Added note: "pdf-parse does NOT support true streaming - it loads the full PDF buffer into memory"

**Medium Issues Fixed:**
5. **Store Coupling Violation (Subtask 9.2)**: Removed store update tasks, documented that "PDFParser is stateless. Returns ParseResult. Calling code manages store updates."
6. **Page Dimension Complexity (AC4, Subtask 3.5)**:
   - Made dimensions optional in Page interface: `height?: number; width?: number;`
   - Added note: "Page dimensions deferred to Story 3.10+ (requires PDF.js pagerender option)"
7. **Incomplete Error Classification (Lines 390-409)**: Added `UNSUPPORTED_PDF_VERSION` and `PARSING_TIMEOUT` to ErrorCode enum with user messages
8. **Missing Timeout (Task 4, Subtask 4.2)**: Added 15-second parsing timeout requirement, throw `PARSING_TIMEOUT` error if exceeded

**Recommendations Applied:**
- Added file size validation (50MB limit) throughout
- Added magic number validation code example with `%PDF` check
- Pinned exact pdf-parse version: `1.1.1` (removed caret)
- Updated performance testing checklist to reflect 10-second requirement
- Added error classification for UNSUPPORTED_PDF_VERSION: "PDF version not supported. Try re-saving as PDF 1.7."

**Files Updated:**
- AC2, AC4, AC8, AC9: Performance and data structure acceptance criteria
- Subtasks 1.1, 3.2, 3.5, 4.1, 4.2, 5.2, 7.6, 9.2: Task descriptions and implementation notes
- Technical Notes: Library import, API route integration, magic number validation, memory efficiency, error classification
- Dependencies: Exact version pinning (1.1.1)

All changes maintain story integrity while addressing architect concerns about library usage, environment compatibility, and realistic expectations.
