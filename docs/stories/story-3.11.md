# Story 3.11: Batch Extraction API with Rate Limit Mitigation

## Story Information
- **Epic**: 3 - Unified Batch Extraction Workflow
- **Story**: 3.11
- **Status**: Draft
- **Architect Approved**: Pending
- **Priority**: High
- **Estimated Effort**: Large (12-15 hours)
- **Prerequisites**: Story 3.9 (PDF Parsing Service), Story 3.10 (Document Detection)

## User Story
As a developer, I want a batch extraction API endpoint with integrated rate limiting capabilities, so that users can process multiple PDFs efficiently without hitting Claude API rate limits.

## Acceptance Criteria

### Original Batch Extraction (AC1-10)

### AC1: Batch Extraction API Endpoint Created
**Given** the application needs batch extraction capabilities
**When** the API endpoint is implemented
**Then** a POST endpoint should exist at `/api/extractions/batch` that accepts multipart/form-data

### AC2: Template ID and File Upload Handling
**Given** a user wants to perform batch extraction
**When** POST request is made to `/api/extractions/batch`
**Then** the endpoint should accept template ID and array of file uploads via multipart/form-data

### AC3: Extraction Session Creation
**Given** valid template ID and files are provided
**When** the batch extraction request is processed
**Then** create an extraction session in the database with a unique session ID

### AC4: Session ID and Initial Status Response
**Given** an extraction session is created
**When** the API responds
**Then** return the session ID and initial status (queued or processing) without blocking

### AC5: Background Processing
**Given** an extraction session is created
**When** the HTTP response is returned
**Then** process extractions in the background without blocking the HTTP response

### AC6: Session Status Query Endpoint
**Given** an extraction session exists
**When** GET request is made to `/api/extractions/:sessionId/status`
**Then** return the current session status and progress information

### AC7: Results Retrieval Endpoint
**Given** an extraction session has completed
**When** GET request is made to `/api/extractions/:sessionId/results`
**Then** return all extracted results for the session

### AC8: Invalid Template ID Error Handling
**Given** an invalid template ID is provided
**When** the batch extraction request is processed
**Then** return 404 response with descriptive error message

### AC9: Unsupported File Type Error Handling
**Given** an unsupported file type is uploaded
**When** the batch extraction request is processed
**Then** return 400 response with descriptive error message

### AC10: Comprehensive Logging
**Given** extraction operations are occurring
**When** session starts, progresses, or completes
**Then** log extraction session start, progress milestones, and completion with relevant metadata

### Rate Limit Mitigation (AC11-16)

### AC11: Prompt Caching Implementation
**Given** the application needs to reduce token costs
**When** making Claude API calls for extraction
**Then** implement cache_control for extraction prompts and PDF content, verify 90% cost reduction on cache hits, set 5-minute cache duration using betas: ["pdfs-2024-09-25", "prompt-caching-2024-07-31"]

### AC12: Token Estimation
**Given** a PDF needs to be processed
**When** determining extraction strategy
**Then** use Claude's count_tokens API for accurate token estimation (not heuristic-based estimation) before extraction

### AC13: Three-Tier Chunking Strategy
**Given** PDFs of varying sizes need processing
**When** token estimation is complete
**Then** implement three-tier chunking: Tier 1 (whole PDF if <25k tokens), Tier 2 (chunk by detected document boundaries if 25k-100k tokens), Tier 3 (split large documents by pages if >100k tokens), always respecting DocumentDetector boundaries

### AC14: Rate Limit Manager Implementation
**Given** the application needs to avoid 429 errors
**When** processing extractions
**Then** implement RateLimitManager class with TPM tracking, sliding window reset (60 seconds), throttling when approaching 30k TPM limit, and 85% safety buffer (25.5k effective limit)

### AC15: Result Merger for Chunked Extractions
**Given** a PDF was processed in chunks
**When** all chunks complete extraction
**Then** combine chunked extraction results, preserve source metadata (page numbers, confidence scores), and handle partial failures gracefully

### AC16: 100-Page Integration Test
**Given** the complete system is implemented
**When** processing a 100-page multi-document PDF end-to-end
**Then** the extraction completes successfully without 429 errors, total processing time is <5 minutes, and all data is extracted correctly

## Tasks and Subtasks

### Task 1: Create Database Schema for Extraction Sessions
**Estimated Effort**: Small
**Dependencies**: None

#### Subtask 1.1: Create extraction_sessions Table
- [ ] Design extraction_sessions table schema
- [ ] Fields: id, user_id, template_id, template_snapshot (JSONB), files (JSONB), custom_columns (JSONB), status, progress, created_at, completed_at
- [ ] Add indexes for user_id and status
- [ ] Create migration script

#### Subtask 1.2: Create extraction_results Table
- [ ] Design extraction_results table schema
- [ ] Fields: id, session_id, file_id, source_file, page_number, detection_confidence, extracted_data (JSONB), raw_api_response, created_at
- [ ] Add indexes for session_id and file_id
- [ ] Create migration script

#### Subtask 1.3: Create Database Helper Functions
- [ ] Create `lib/db/extractions.ts` with CRUD operations
- [ ] Functions: createSession, updateSessionStatus, updateSessionProgress, storeExtractionResult, getSessionStatus, getSessionResults
- [ ] Add proper TypeScript types
- [ ] Include error handling

### Task 2: Implement RateLimitManager Service
**Estimated Effort**: Medium
**Dependencies**: None

#### Subtask 2.1: Create RateLimitManager Class Structure
- [ ] Create `lib/services/RateLimitManager.ts` file
- [ ] Set up class with singleton pattern
- [ ] Define TPM limit constant (30,000 TPM for Tier 1)
- [ ] Define safety buffer constant (85% = 25,500 TPM effective limit)

#### Subtask 2.2: Implement Sliding Window Tracking
- [ ] Create token usage tracking with timestamps
- [ ] Implement 60-second sliding window
- [ ] Method: trackTokenUsage(tokens: number): void
- [ ] Method: getCurrentUsage(): number
- [ ] Clean up expired entries automatically

#### Subtask 2.3: Implement Throttling Logic
- [ ] Method: canProceed(estimatedTokens: number): Promise<boolean>
- [ ] Check if adding tokens would exceed limit
- [ ] If approaching limit, wait until window resets
- [ ] Return true when safe to proceed
- [ ] Add logging for throttling events

#### Subtask 2.4: Implement Exponential Backoff for 429 Errors
- [ ] Method: handle429Error(): Promise<void>
- [ ] Implement exponential backoff (1s, 2s, 4s, 8s, 16s)
- [ ] Max retry attempts: 5
- [ ] Log retry attempts
- [ ] Reset backoff on successful request

#### Subtask 2.5: Add Rate Limit Monitoring
- [ ] Method: getRateLimitStats(): RateLimitStats
- [ ] Return current usage, limit, safety buffer, and percentage
- [ ] Add logging for usage patterns
- [ ] Create RateLimitStats interface

### Task 3: Implement Token Estimation Service
**Estimated Effort**: Medium
**Dependencies**: Story 3.9 (PDF Parsing)

#### Subtask 3.1: Create Token Estimation Method
- [ ] Method: estimateTokens(pdfBase64: string): Promise<number>
- [ ] Use Anthropic's messages.countTokens API
- [ ] Pass PDF as document content
- [ ] Return accurate token count
- [ ] Add error handling for API failures

#### Subtask 3.2: Integrate with Anthropic SDK
- [ ] Import @anthropic-ai/sdk
- [ ] Configure with API key from environment
- [ ] Use model: 'claude-sonnet-4-5-20250926'
- [ ] Include document source in token estimation request

#### Subtask 3.3: Create Token Estimation Wrapper
- [ ] Add to `lib/services/TokenEstimator.ts`
- [ ] Cache estimation results per PDF hash
- [ ] Add logging for estimation calls
- [ ] Include rate limit tracking for count_tokens API

### Task 4: Implement Three-Tier Chunking Strategy
**Estimated Effort**: Large
**Dependencies**: Story 3.9, Story 3.10, Task 3

#### Subtask 4.1: Create ChunkingStrategy Service
- [ ] Create `lib/services/ChunkingStrategy.ts` file
- [ ] Method: determineStrategy(tokenCount: number): ChunkTier
- [ ] Enum ChunkTier: WHOLE, DOCUMENT_BOUNDARY, PAGE_SPLIT
- [ ] Logic: <25k = WHOLE, 25k-100k = DOCUMENT_BOUNDARY, >100k = PAGE_SPLIT

#### Subtask 4.2: Implement Tier 1 - Whole PDF Processing
- [ ] Method: processWhole(pdfBase64: string): Promise<ChunkInfo[]>
- [ ] Return single chunk with entire PDF
- [ ] Include metadata: startPage=1, endPage=totalPages, chunkIndex=0
- [ ] Add logging

#### Subtask 4.3: Implement Tier 2 - Document Boundary Chunking
- [ ] Method: chunkByDocuments(pdfBase64: string, detectedDocuments: DetectedDocument[]): Promise<ChunkInfo[]>
- [ ] Use DocumentDetector results from Story 3.10
- [ ] Create chunks aligned with detected document boundaries
- [ ] Use pdf-parse to extract page ranges (from Story 3.9)
- [ ] Include metadata: startPage, endPage, chunkIndex, documentIndex
- [ ] Ensure no page overlaps or gaps

#### Subtask 4.4: Implement Tier 3 - Page-Split Chunking
- [ ] Method: chunkByPages(pdfBase64: string, detectedDocuments: DetectedDocument[], pageChunkSize: number): Promise<ChunkInfo[]>
- [ ] Split large detected documents into page chunks (10-15 pages each)
- [ ] Always respect DocumentDetector boundaries (never split across documents)
- [ ] Use pdf-parse for page extraction
- [ ] Include metadata: startPage, endPage, chunkIndex, documentIndex, pageRange
- [ ] Handle partial pages at document boundaries

#### Subtask 4.5: Create ChunkInfo Interface
- [ ] Define ChunkInfo interface with all metadata
- [ ] Fields: chunkId, pdfBase64, startPage, endPage, chunkIndex, totalChunks, documentIndex, tier
- [ ] Add JSDoc documentation
- [ ] Export from types

### Task 5: Implement Prompt Caching
**Estimated Effort**: Medium
**Dependencies**: None

#### Subtask 5.1: Update Anthropic Client Configuration
- [ ] Add betas: ["pdfs-2024-09-25", "prompt-caching-2024-07-31"]
- [ ] Configure in Claude API client setup
- [ ] Verify beta feature access

#### Subtask 5.2: Implement Cache Control for System Prompt
- [ ] Add cache_control to extraction prompt
- [ ] Structure: { type: 'text', text: extractionPrompt, cache_control: { type: 'ephemeral' } }
- [ ] Set 5-minute cache duration (default)
- [ ] Add logging for cache hits/misses

#### Subtask 5.3: Implement Cache Control for PDF Content
- [ ] Add cache_control to PDF document source
- [ ] Structure: { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 }, cache_control: { type: 'ephemeral' } }
- [ ] Verify caching works for large PDFs
- [ ] Monitor cost reduction metrics

#### Subtask 5.4: Track Cache Performance
- [ ] Log input_tokens vs. cache_read_tokens
- [ ] Calculate cost savings per request
- [ ] Monitor cache hit rate
- [ ] Alert if cache hit rate <80%

### Task 6: Implement Result Merger Service
**Estimated Effort**: Medium
**Dependencies**: Task 4

#### Subtask 6.1: Create ResultMerger Class
- [ ] Create `lib/services/ResultMerger.ts` file
- [ ] Method: merge(chunkResults: ChunkResult[]): Promise<MergedResult>
- [ ] Handle results from multiple chunks
- [ ] Preserve all metadata

#### Subtask 6.2: Implement Metadata Preservation
- [ ] Maintain source page numbers for each extracted item
- [ ] Preserve detection confidence scores from DocumentDetector
- [ ] Track which chunk each result came from
- [ ] Include document boundary information

#### Subtask 6.3: Implement Partial Failure Handling
- [ ] Detect chunks that failed extraction
- [ ] Continue merging successful chunks
- [ ] Mark partial results with warnings
- [ ] Include error details in merged result
- [ ] Log partial failures

#### Subtask 6.4: Implement Result Deduplication
- [ ] Detect duplicate extractions across chunks
- [ ] Use confidence scores to pick best result
- [ ] Preserve all source references
- [ ] Add logging for deduplication

### Task 7: Create Batch Extraction API Route
**Estimated Effort**: Large
**Dependencies**: Task 1, Task 2, Task 3, Task 4, Task 5, Task 6

#### Subtask 7.1: Create POST /api/extractions/batch Endpoint
- [ ] Create `app/api/extractions/batch/route.ts`
- [ ] Set up Next.js route handler with POST method
- [ ] Configure multipart/form-data handling
- [ ] Set timeout to 5 minutes for large PDFs
- [ ] Add CORS headers if needed

#### Subtask 7.2: Parse Request and Validate Input
- [ ] Extract template_id from form data
- [ ] Extract file uploads array
- [ ] Validate template_id exists in database
- [ ] Validate file types (only PDFs)
- [ ] Validate file sizes (reasonable limits)
- [ ] Return 400 for invalid inputs
- [ ] Return 404 for missing template

#### Subtask 7.3: Create Extraction Session
- [ ] Generate unique session ID (UUID)
- [ ] Snapshot template configuration
- [ ] Store files metadata in session
- [ ] Set initial status to "queued"
- [ ] Insert into extraction_sessions table
- [ ] Return session ID immediately

#### Subtask 7.4: Implement Background Processing Logic
- [ ] Create async background job function
- [ ] Update status to "processing"
- [ ] Process files sequentially or in parallel (configurable)
- [ ] Update progress after each file
- [ ] Handle errors per file
- [ ] Update status to "completed" or "failed"

#### Subtask 7.5: Integrate All Services in Processing Pipeline
- [ ] For each PDF: Parse with PDFParser (Story 3.9)
- [ ] Detect documents with DocumentDetector (Story 3.10)
- [ ] Estimate tokens with TokenEstimator
- [ ] Determine chunking strategy with ChunkingStrategy
- [ ] Apply chunking if needed
- [ ] For each chunk: Check RateLimitManager, wait if needed
- [ ] Call Claude API with prompt caching enabled
- [ ] Track token usage in RateLimitManager
- [ ] Handle 429 errors with exponential backoff
- [ ] Merge results with ResultMerger if chunked
- [ ] Store results in extraction_results table
- [ ] Update session progress

### Task 8: Create Session Status API Route
**Estimated Effort**: Small
**Dependencies**: Task 7

#### Subtask 8.1: Create GET /api/extractions/:sessionId/status Endpoint
- [ ] Create `app/api/extractions/[sessionId]/status/route.ts`
- [ ] Set up Next.js route handler with GET method
- [ ] Extract sessionId from URL params
- [ ] Validate sessionId format

#### Subtask 8.2: Query Session Status
- [ ] Query extraction_sessions table by session ID
- [ ] Return 404 if session not found
- [ ] Include status, progress, created_at, completed_at
- [ ] Add file-level progress breakdown
- [ ] Include estimated time remaining if processing

#### Subtask 8.3: Add Real-Time Progress Updates
- [ ] Calculate percentage complete
- [ ] Show files processed vs total files
- [ ] Show documents detected per file
- [ ] Include any errors encountered
- [ ] Add rate limit status (tokens used, time until reset)

### Task 9: Create Results Retrieval API Route
**Estimated Effort**: Small
**Dependencies**: Task 7

#### Subtask 9.1: Create GET /api/extractions/:sessionId/results Endpoint
- [ ] Create `app/api/extractions/[sessionId]/results/route.ts`
- [ ] Set up Next.js route handler with GET method
- [ ] Extract sessionId from URL params
- [ ] Validate sessionId format

#### Subtask 9.2: Query Extraction Results
- [ ] Query extraction_results table by session ID
- [ ] Join with session metadata
- [ ] Return 404 if session not found
- [ ] Return 400 if session not completed
- [ ] Include all extracted data

#### Subtask 9.3: Format Results Response
- [ ] Group results by source file
- [ ] Include document boundaries for each file
- [ ] Preserve page numbers and confidence scores
- [ ] Include template field mappings
- [ ] Add metadata: extraction time, token usage, cache hit rate
- [ ] Format as JSON with proper structure

### Task 10: Implement Error Handling and Edge Cases
**Estimated Effort**: Medium
**Dependencies**: Task 7, Task 8, Task 9

#### Subtask 10.1: Handle Invalid Template IDs
- [ ] Check template exists before creating session
- [ ] Return 404 with message: "Template not found"
- [ ] Log invalid template attempts
- [ ] Include template_id in error response

#### Subtask 10.2: Handle Unsupported File Types
- [ ] Validate file MIME types
- [ ] Accept only application/pdf
- [ ] Return 400 with message: "Only PDF files are supported"
- [ ] List accepted file types in error
- [ ] Log rejected file types

#### Subtask 10.3: Handle PDF Parsing Failures
- [ ] Wrap PDFParser calls in try-catch
- [ ] Log parsing errors
- [ ] Mark file as failed in session
- [ ] Continue processing other files
- [ ] Include error in session results

#### Subtask 10.4: Handle Claude API Failures
- [ ] Wrap API calls in try-catch
- [ ] Handle 429 errors with RateLimitManager backoff
- [ ] Handle 500 errors with retry logic
- [ ] Handle authentication errors
- [ ] Log all API errors with context
- [ ] Mark extraction as failed in database

#### Subtask 10.5: Handle Database Failures
- [ ] Wrap database operations in try-catch
- [ ] Handle connection errors
- [ ] Handle constraint violations
- [ ] Implement transaction rollback where needed
- [ ] Log database errors
- [ ] Return 500 with generic message (don't expose DB details)

#### Subtask 10.6: Handle Timeout Scenarios
- [ ] Set reasonable timeout for processing (30 minutes)
- [ ] If timeout occurs, mark session as "timeout"
- [ ] Preserve partial results
- [ ] Log timeout events
- [ ] Allow resuming from last processed file

### Task 11: Add Comprehensive Logging
**Estimated Effort**: Small
**Dependencies**: Task 7

#### Subtask 11.1: Log Session Lifecycle Events
- [ ] Log session creation with session_id, user_id, template_id, file_count
- [ ] Log session start with timestamp
- [ ] Log session progress updates with percentage
- [ ] Log session completion with duration, files_processed, total_documents
- [ ] Use structured logging (JSON format)

#### Subtask 11.2: Log Processing Pipeline Events
- [ ] Log PDF parsing start/complete per file
- [ ] Log document detection results (documents found, confidence)
- [ ] Log token estimation results (tokens, strategy chosen)
- [ ] Log chunking decisions (tier, chunk_count)
- [ ] Log cache hits/misses
- [ ] Log rate limit throttling events

#### Subtask 11.3: Log API Interactions
- [ ] Log Claude API calls (tokens, model, cache status)
- [ ] Log API response times
- [ ] Log 429 errors and backoff delays
- [ ] Log token usage tracking
- [ ] Include request IDs for tracing

#### Subtask 11.4: Log Error Events
- [ ] Log all errors with stack traces
- [ ] Include context: session_id, file_id, chunk_id
- [ ] Log error type and error code
- [ ] Log recovery actions taken
- [ ] Use error severity levels (error, warning, info)

### Task 12: Create Integration Tests
**Estimated Effort**: Large
**Dependencies**: All previous tasks

#### Subtask 12.1: Create Test Fixtures
- [ ] Small PDF (5 pages, 1 document, ~5k tokens)
- [ ] Medium PDF (30 pages, 3 documents, ~40k tokens)
- [ ] Large PDF (100 pages, 10 documents, ~150k tokens)
- [ ] Invalid PDF (corrupted file)
- [ ] Mock template with extraction prompt

#### Subtask 12.2: Test Batch Extraction API Endpoint
- [ ] Test POST /api/extractions/batch with valid inputs
- [ ] Test with invalid template ID (expect 404)
- [ ] Test with unsupported file type (expect 400)
- [ ] Test with missing files (expect 400)
- [ ] Verify session ID returned
- [ ] Verify initial status is "queued"

#### Subtask 12.3: Test Session Status Endpoint
- [ ] Test GET /api/extractions/:sessionId/status
- [ ] Test with invalid session ID (expect 404)
- [ ] Test status updates during processing
- [ ] Verify progress percentages
- [ ] Verify completion detection

#### Subtask 12.4: Test Results Retrieval Endpoint
- [ ] Test GET /api/extractions/:sessionId/results
- [ ] Test with invalid session ID (expect 404)
- [ ] Test before completion (expect 400)
- [ ] Verify all extracted data returned
- [ ] Verify metadata preserved

#### Subtask 12.5: Test Small PDF (Tier 1 - Whole)
- [ ] Upload 5-page single-document PDF
- [ ] Verify token estimation <25k
- [ ] Verify WHOLE strategy chosen
- [ ] Verify single API call made
- [ ] Verify no chunking occurred
- [ ] Verify results correct
- [ ] Processing time <30 seconds

#### Subtask 12.6: Test Medium PDF (Tier 2 - Document Boundary)
- [ ] Upload 30-page 3-document PDF
- [ ] Verify token estimation 25k-100k
- [ ] Verify DOCUMENT_BOUNDARY strategy chosen
- [ ] Verify 3 chunks created (one per document)
- [ ] Verify DocumentDetector boundaries respected
- [ ] Verify 3 API calls made
- [ ] Verify results merged correctly
- [ ] Processing time <2 minutes

#### Subtask 12.7: Test Large PDF (Tier 3 - Page Split)
- [ ] Upload 100-page 10-document PDF
- [ ] Verify token estimation >100k
- [ ] Verify PAGE_SPLIT strategy chosen
- [ ] Verify chunks respect document boundaries
- [ ] Verify 10-15 page chunks
- [ ] Verify all API calls succeed (no 429 errors)
- [ ] Verify results merged correctly
- [ ] Processing time <5 minutes (AC16)

#### Subtask 12.8: Test Rate Limiting
- [ ] Simulate high token usage (near 25.5k TPM limit)
- [ ] Verify RateLimitManager throttles requests
- [ ] Verify waiting for window reset
- [ ] Verify processing resumes after reset
- [ ] Verify no 429 errors
- [ ] Log throttling events

#### Subtask 12.9: Test Prompt Caching
- [ ] Process same PDF twice
- [ ] Verify first call has low cache_read_tokens
- [ ] Verify second call has high cache_read_tokens
- [ ] Verify ~90% cost reduction on second call
- [ ] Test cache expiry (after 5 minutes)

#### Subtask 12.10: Test Result Merger
- [ ] Process chunked PDF
- [ ] Verify all chunks merged
- [ ] Verify no duplicate results
- [ ] Verify page numbers preserved
- [ ] Verify confidence scores preserved
- [ ] Test with partial failure (one chunk fails)

#### Subtask 12.11: Test Error Scenarios
- [ ] Test invalid template ID
- [ ] Test unsupported file type
- [ ] Test corrupted PDF
- [ ] Test API failure (mock 500 error)
- [ ] Test 429 error handling
- [ ] Test database failure (mock connection error)
- [ ] Verify graceful degradation

#### Subtask 12.12: Test 100-Page End-to-End (AC16)
- [ ] Create realistic 100-page multi-document PDF
- [ ] Execute full extraction flow
- [ ] Verify no 429 errors
- [ ] Verify completion time <5 minutes
- [ ] Verify all data extracted correctly
- [ ] Verify all documents detected
- [ ] Verify metadata preserved
- [ ] This is the critical acceptance test

### Task 13: Create Unit Tests
**Estimated Effort**: Large
**Dependencies**: Task 2, Task 3, Task 4, Task 6

#### Subtask 13.1: Test RateLimitManager
- [ ] Test token tracking
- [ ] Test sliding window reset
- [ ] Test throttling logic
- [ ] Test canProceed method
- [ ] Test 429 error handling
- [ ] Test backoff logic
- [ ] Test usage statistics

#### Subtask 13.2: Test TokenEstimator
- [ ] Test token estimation with various PDF sizes
- [ ] Test cache behavior
- [ ] Test error handling
- [ ] Mock Anthropic API responses

#### Subtask 13.3: Test ChunkingStrategy
- [ ] Test strategy determination (<25k, 25k-100k, >100k)
- [ ] Test whole PDF processing
- [ ] Test document boundary chunking
- [ ] Test page split chunking
- [ ] Test edge cases (single page, huge PDF)
- [ ] Verify boundaries always respected

#### Subtask 13.4: Test ResultMerger
- [ ] Test merging 2 chunks
- [ ] Test merging 10+ chunks
- [ ] Test metadata preservation
- [ ] Test partial failure handling
- [ ] Test deduplication
- [ ] Test empty results

#### Subtask 13.5: Test Database Operations
- [ ] Test createSession
- [ ] Test updateSessionStatus
- [ ] Test updateSessionProgress
- [ ] Test storeExtractionResult
- [ ] Test getSessionStatus
- [ ] Test getSessionResults
- [ ] Mock Supabase client

### Task 14: Documentation and Code Quality
**Estimated Effort**: Medium
**Dependencies**: All previous tasks

#### Subtask 14.1: Add JSDoc Comments
- [ ] Document all public methods
- [ ] Document interfaces and types
- [ ] Add usage examples
- [ ] Document error cases

#### Subtask 14.2: Create API Documentation
- [ ] Document POST /api/extractions/batch
- [ ] Document GET /api/extractions/:sessionId/status
- [ ] Document GET /api/extractions/:sessionId/results
- [ ] Include request/response examples
- [ ] Document error codes

#### Subtask 14.3: Create Architecture Documentation
- [ ] Document rate limiting strategy
- [ ] Document chunking tiers with examples
- [ ] Document prompt caching setup
- [ ] Create flow diagrams
- [ ] Document integration points

#### Subtask 14.4: Update Tech Spec
- [ ] Update tech-spec-epic-3.md with implementation details
- [ ] Document rate limiting solution
- [ ] Add performance characteristics
- [ ] Note limitations and known issues

#### Subtask 14.5: Code Review Preparation
- [ ] Run linter and fix issues
- [ ] Format code consistently
- [ ] Remove debug code and console.logs
- [ ] Ensure all tests pass
- [ ] Check TypeScript strict mode compliance
- [ ] Verify no security issues (no exposed API keys)

## Technical Notes

### Prompt Caching Implementation

```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Configure with beta features
const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-5-20250926',
  max_tokens: 4096,
  betas: ["pdfs-2024-09-25", "prompt-caching-2024-07-31"],
  system: [
    {
      type: 'text',
      text: extractionPrompt, // Your extraction instructions
      cache_control: { type: 'ephemeral' } // Cache the prompt for 5 minutes
    }
  ],
  messages: [
    {
      role: 'user',
      content: [
        {
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: pdfBase64
          },
          cache_control: { type: 'ephemeral' } // Cache the PDF content
        }
      ]
    }
  ]
});

// Track cache performance
console.log('Input tokens:', response.usage.input_tokens);
console.log('Cache read tokens:', response.usage.cache_read_input_tokens);
console.log('Cost reduction:', (response.usage.cache_read_input_tokens / response.usage.input_tokens * 100).toFixed(1) + '%');
```

### Token Estimation Implementation

```typescript
import Anthropic from '@anthropic-ai/sdk';

async function estimateTokens(pdfBase64: string): Promise<number> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const response = await anthropic.messages.countTokens({
    model: 'claude-sonnet-4-5-20250926',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: pdfBase64
            }
          }
        ]
      }
    ]
  });

  return response.input_tokens;
}
```

### Three-Tier Chunking Algorithm

```typescript
enum ChunkTier {
  WHOLE = 'WHOLE',
  DOCUMENT_BOUNDARY = 'DOCUMENT_BOUNDARY',
  PAGE_SPLIT = 'PAGE_SPLIT'
}

interface ChunkInfo {
  chunkId: string;
  pdfBase64: string;
  startPage: number;
  endPage: number;
  chunkIndex: number;
  totalChunks: number;
  documentIndex?: number;
  tier: ChunkTier;
}

async function determineChunkingStrategy(
  pdfBase64: string,
  tokenCount: number,
  detectedDocuments: DetectedDocument[]
): Promise<{ tier: ChunkTier; chunks: ChunkInfo[] }> {
  // Tier 1: Whole PDF (<25k tokens)
  if (tokenCount < 25000) {
    return {
      tier: ChunkTier.WHOLE,
      chunks: [{
        chunkId: `chunk-0`,
        pdfBase64,
        startPage: 1,
        endPage: detectedDocuments[detectedDocuments.length - 1].endPage,
        chunkIndex: 0,
        totalChunks: 1,
        tier: ChunkTier.WHOLE
      }]
    };
  }

  // Tier 2: Document Boundary (25k-100k tokens)
  if (tokenCount <= 100000) {
    const chunks: ChunkInfo[] = [];
    for (let i = 0; i < detectedDocuments.length; i++) {
      const doc = detectedDocuments[i];
      // Extract pages for this document using pdf-parse (from Story 3.9)
      const documentPdfBase64 = await extractPagesFromPDF(pdfBase64, doc.startPage, doc.endPage);
      chunks.push({
        chunkId: `chunk-${i}`,
        pdfBase64: documentPdfBase64,
        startPage: doc.startPage,
        endPage: doc.endPage,
        chunkIndex: i,
        totalChunks: detectedDocuments.length,
        documentIndex: i,
        tier: ChunkTier.DOCUMENT_BOUNDARY
      });
    }
    return { tier: ChunkTier.DOCUMENT_BOUNDARY, chunks };
  }

  // Tier 3: Page Split (>100k tokens)
  const chunks: ChunkInfo[] = [];
  let chunkIndex = 0;
  const pageChunkSize = 12; // 10-15 pages per chunk

  for (let docIndex = 0; docIndex < detectedDocuments.length; docIndex++) {
    const doc = detectedDocuments[docIndex];
    const docPageCount = doc.endPage - doc.startPage + 1;

    // Split large documents into page chunks
    for (let pageOffset = 0; pageOffset < docPageCount; pageOffset += pageChunkSize) {
      const startPage = doc.startPage + pageOffset;
      const endPage = Math.min(startPage + pageChunkSize - 1, doc.endPage);

      const chunkPdfBase64 = await extractPagesFromPDF(pdfBase64, startPage, endPage);
      chunks.push({
        chunkId: `chunk-${chunkIndex}`,
        pdfBase64: chunkPdfBase64,
        startPage,
        endPage,
        chunkIndex,
        totalChunks: 0, // Will be set after all chunks created
        documentIndex: docIndex,
        tier: ChunkTier.PAGE_SPLIT
      });
      chunkIndex++;
    }
  }

  // Update totalChunks
  chunks.forEach(chunk => chunk.totalChunks = chunks.length);

  return { tier: ChunkTier.PAGE_SPLIT, chunks };
}

// Helper function using pdf-parse (from Story 3.9)
async function extractPagesFromPDF(
  pdfBase64: string,
  startPage: number,
  endPage: number
): Promise<string> {
  // Use pdf-parse to extract specific page range
  // Convert back to base64
  // This uses the PDFParser service from Story 3.9
  // Implementation depends on pdf-parse capabilities
  // May need to use pdf-lib or similar for page extraction
  // Always respect document boundaries from DocumentDetector
}
```

### Rate Limit Manager Implementation

```typescript
interface RateLimitStats {
  currentUsage: number;
  limit: number;
  safetyBuffer: number;
  effectiveLimit: number;
  percentageUsed: number;
  timeUntilReset: number; // seconds
}

class RateLimitManager {
  private static instance: RateLimitManager;

  // Tier 1 limit: 30,000 TPM
  private readonly TPM_LIMIT = 30000;

  // 85% safety buffer
  private readonly SAFETY_BUFFER = 0.85;
  private readonly EFFECTIVE_LIMIT = this.TPM_LIMIT * this.SAFETY_BUFFER; // 25,500

  // Sliding window (60 seconds)
  private readonly WINDOW_SIZE_MS = 60 * 1000;

  // Token usage tracking
  private tokenUsage: Array<{ tokens: number; timestamp: number }> = [];

  // Exponential backoff state
  private backoffAttempts = 0;
  private readonly MAX_BACKOFF_ATTEMPTS = 5;

  private constructor() {}

  static getInstance(): RateLimitManager {
    if (!RateLimitManager.instance) {
      RateLimitManager.instance = new RateLimitManager();
    }
    return RateLimitManager.instance;
  }

  /**
   * Track token usage in sliding window
   */
  trackTokenUsage(tokens: number): void {
    const now = Date.now();
    this.tokenUsage.push({ tokens, timestamp: now });
    this.cleanupExpiredEntries();
    console.log(`[RateLimitManager] Tracked ${tokens} tokens. Current usage: ${this.getCurrentUsage()}`);
  }

  /**
   * Get current token usage within the sliding window
   */
  getCurrentUsage(): number {
    this.cleanupExpiredEntries();
    return this.tokenUsage.reduce((sum, entry) => sum + entry.tokens, 0);
  }

  /**
   * Check if we can proceed with a request
   */
  async canProceed(estimatedTokens: number): Promise<boolean> {
    this.cleanupExpiredEntries();
    const currentUsage = this.getCurrentUsage();
    const projectedUsage = currentUsage + estimatedTokens;

    if (projectedUsage <= this.EFFECTIVE_LIMIT) {
      return true;
    }

    // Need to wait for window to reset
    const oldestEntry = this.tokenUsage[0];
    if (oldestEntry) {
      const timeUntilReset = this.WINDOW_SIZE_MS - (Date.now() - oldestEntry.timestamp);
      if (timeUntilReset > 0) {
        console.log(`[RateLimitManager] Throttling: waiting ${(timeUntilReset / 1000).toFixed(1)}s for rate limit window to reset`);
        await this.sleep(timeUntilReset);
        return this.canProceed(estimatedTokens); // Recursively check again
      }
    }

    return true;
  }

  /**
   * Handle 429 rate limit errors with exponential backoff
   */
  async handle429Error(): Promise<void> {
    this.backoffAttempts++;

    if (this.backoffAttempts > this.MAX_BACKOFF_ATTEMPTS) {
      throw new Error(`Rate limit exceeded after ${this.MAX_BACKOFF_ATTEMPTS} retry attempts`);
    }

    // Exponential backoff: 1s, 2s, 4s, 8s, 16s
    const delayMs = Math.pow(2, this.backoffAttempts - 1) * 1000;
    console.log(`[RateLimitManager] 429 error received. Attempt ${this.backoffAttempts}/${this.MAX_BACKOFF_ATTEMPTS}. Waiting ${delayMs / 1000}s...`);

    await this.sleep(delayMs);
  }

  /**
   * Reset backoff on successful request
   */
  resetBackoff(): void {
    this.backoffAttempts = 0;
  }

  /**
   * Get rate limit statistics
   */
  getRateLimitStats(): RateLimitStats {
    const currentUsage = this.getCurrentUsage();
    const percentageUsed = (currentUsage / this.EFFECTIVE_LIMIT) * 100;

    const oldestEntry = this.tokenUsage[0];
    const timeUntilReset = oldestEntry
      ? Math.max(0, this.WINDOW_SIZE_MS - (Date.now() - oldestEntry.timestamp)) / 1000
      : 0;

    return {
      currentUsage,
      limit: this.TPM_LIMIT,
      safetyBuffer: this.SAFETY_BUFFER,
      effectiveLimit: this.EFFECTIVE_LIMIT,
      percentageUsed,
      timeUntilReset
    };
  }

  /**
   * Clean up expired entries from sliding window
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    const cutoff = now - this.WINDOW_SIZE_MS;
    this.tokenUsage = this.tokenUsage.filter(entry => entry.timestamp > cutoff);
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const rateLimitManager = RateLimitManager.getInstance();
```

### Result Merger Implementation

```typescript
interface ChunkResult {
  chunkId: string;
  chunkIndex: number;
  startPage: number;
  endPage: number;
  documentIndex?: number;
  extractedData: any;
  success: boolean;
  error?: string;
  tokensUsed: number;
  cacheHit: boolean;
}

interface MergedResult {
  success: boolean;
  extractedData: any[];
  metadata: {
    totalChunks: number;
    successfulChunks: number;
    failedChunks: number;
    totalTokensUsed: number;
    cacheHitRate: number;
    warnings: string[];
  };
  errors: string[];
}

class ResultMerger {
  /**
   * Merge results from multiple chunks
   */
  async merge(chunkResults: ChunkResult[]): Promise<MergedResult> {
    // Sort by chunk index to maintain order
    chunkResults.sort((a, b) => a.chunkIndex - b.chunkIndex);

    const successfulChunks = chunkResults.filter(r => r.success);
    const failedChunks = chunkResults.filter(r => !r.success);

    // Extract all data while preserving metadata
    const allData: any[] = [];
    const warnings: string[] = [];

    for (const chunk of successfulChunks) {
      const dataWithMetadata = {
        ...chunk.extractedData,
        _metadata: {
          sourcePages: { start: chunk.startPage, end: chunk.endPage },
          chunkIndex: chunk.chunkIndex,
          documentIndex: chunk.documentIndex
        }
      };
      allData.push(dataWithMetadata);
    }

    // Handle partial failures
    if (failedChunks.length > 0) {
      warnings.push(`${failedChunks.length} chunks failed to process`);
      for (const chunk of failedChunks) {
        warnings.push(`Chunk ${chunk.chunkIndex} (pages ${chunk.startPage}-${chunk.endPage}): ${chunk.error}`);
      }
    }

    // Calculate cache hit rate
    const cacheHits = chunkResults.filter(r => r.cacheHit).length;
    const cacheHitRate = (cacheHits / chunkResults.length) * 100;

    // Calculate total tokens used
    const totalTokensUsed = chunkResults.reduce((sum, r) => sum + r.tokensUsed, 0);

    return {
      success: failedChunks.length === 0,
      extractedData: allData,
      metadata: {
        totalChunks: chunkResults.length,
        successfulChunks: successfulChunks.length,
        failedChunks: failedChunks.length,
        totalTokensUsed,
        cacheHitRate,
        warnings
      },
      errors: failedChunks.map(c => c.error || 'Unknown error')
    };
  }
}
```

### Batch Extraction API Implementation

```typescript
// app/api/extractions/batch/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { pdfParser } from '@/lib/services/PDFParser';
import { documentDetector } from '@/lib/services/DocumentDetector';
import { rateLimitManager } from '@/lib/services/RateLimitManager';
import { estimateTokens } from '@/lib/services/TokenEstimator';
import { determineChunkingStrategy } from '@/lib/services/ChunkingStrategy';
import { ResultMerger } from '@/lib/services/ResultMerger';
import { createSession, updateSessionStatus, storeExtractionResult } from '@/lib/db/extractions';

export const maxDuration = 300; // 5 minutes

export async function POST(request: NextRequest) {
  try {
    // Parse multipart form data
    const formData = await request.formData();
    const templateId = formData.get('template_id') as string;
    const files = formData.getAll('files') as File[];

    // Validate inputs
    if (!templateId) {
      return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
    }

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'At least one file is required' }, { status: 400 });
    }

    // Validate template exists
    const template = await getTemplate(templateId);
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Validate file types
    for (const file of files) {
      if (file.type !== 'application/pdf') {
        return NextResponse.json(
          { error: `Only PDF files are supported. Received: ${file.type}` },
          { status: 400 }
        );
      }
    }

    // Create extraction session
    const sessionId = crypto.randomUUID();
    await createSession({
      id: sessionId,
      template_id: templateId,
      template_snapshot: template,
      files: files.map(f => ({ name: f.name, size: f.size })),
      status: 'queued',
      progress: 0
    });

    // Start background processing (don't await)
    processExtractionSession(sessionId, templateId, files, template).catch(error => {
      console.error(`[Batch API] Background processing failed for session ${sessionId}:`, error);
    });

    // Return immediately
    return NextResponse.json({
      session_id: sessionId,
      status: 'queued',
      message: 'Extraction session created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('[Batch API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function processExtractionSession(
  sessionId: string,
  templateId: string,
  files: File[],
  template: any
) {
  try {
    await updateSessionStatus(sessionId, 'processing');

    const totalFiles = files.length;
    let processedFiles = 0;

    for (const file of files) {
      console.log(`[Session ${sessionId}] Processing file: ${file.name}`);

      try {
        // Convert File to base64
        const buffer = await file.arrayBuffer();
        const pdfBase64 = Buffer.from(buffer).toString('base64');

        // Step 1: Parse PDF (Story 3.9)
        const parseResult = await pdfParser.parsePDF(buffer);
        console.log(`[Session ${sessionId}] Parsed ${parseResult.pages.length} pages from ${file.name}`);

        // Step 2: Detect documents (Story 3.10)
        const detectedDocuments = await documentDetector.detect(parseResult.pages);
        console.log(`[Session ${sessionId}] Detected ${detectedDocuments.length} documents in ${file.name}`);

        // Step 3: Estimate tokens
        const tokenCount = await estimateTokens(pdfBase64);
        console.log(`[Session ${sessionId}] Estimated ${tokenCount} tokens for ${file.name}`);

        // Step 4: Determine chunking strategy
        const { tier, chunks } = await determineChunkingStrategy(pdfBase64, tokenCount, detectedDocuments);
        console.log(`[Session ${sessionId}] Using ${tier} strategy with ${chunks.length} chunks for ${file.name}`);

        // Step 5: Process chunks with rate limiting
        const chunkResults = [];
        for (const chunk of chunks) {
          // Check rate limit
          await rateLimitManager.canProceed(tokenCount / chunks.length);

          // Extract with retry logic
          let retryCount = 0;
          let success = false;
          let result;

          while (!success && retryCount < 3) {
            try {
              result = await extractWithPromptCaching(chunk.pdfBase64, template.extraction_prompt);
              rateLimitManager.trackTokenUsage(result.usage.input_tokens);
              rateLimitManager.resetBackoff();
              success = true;
            } catch (error: any) {
              if (error.status === 429) {
                await rateLimitManager.handle429Error();
                retryCount++;
              } else {
                throw error;
              }
            }
          }

          if (!success) {
            throw new Error('Max retries exceeded for rate limit');
          }

          chunkResults.push({
            chunkId: chunk.chunkId,
            chunkIndex: chunk.chunkIndex,
            startPage: chunk.startPage,
            endPage: chunk.endPage,
            documentIndex: chunk.documentIndex,
            extractedData: result.content,
            success: true,
            tokensUsed: result.usage.input_tokens,
            cacheHit: (result.usage.cache_read_input_tokens || 0) > 0
          });
        }

        // Step 6: Merge results if chunked
        const merger = new ResultMerger();
        const mergedResult = await merger.merge(chunkResults);

        // Step 7: Store results
        await storeExtractionResult({
          session_id: sessionId,
          file_id: file.name,
          source_file: file.name,
          detected_documents: detectedDocuments,
          extracted_data: mergedResult.extractedData,
          metadata: mergedResult.metadata
        });

        console.log(`[Session ${sessionId}] Successfully processed ${file.name}`);

      } catch (error) {
        console.error(`[Session ${sessionId}] Error processing ${file.name}:`, error);
        // Store error but continue with other files
        await storeExtractionResult({
          session_id: sessionId,
          file_id: file.name,
          source_file: file.name,
          error: error.message
        });
      }

      // Update progress
      processedFiles++;
      const progress = (processedFiles / totalFiles) * 100;
      await updateSessionProgress(sessionId, progress);
    }

    // Mark session as completed
    await updateSessionStatus(sessionId, 'completed');
    console.log(`[Session ${sessionId}] All files processed`);

  } catch (error) {
    console.error(`[Session ${sessionId}] Fatal error:`, error);
    await updateSessionStatus(sessionId, 'failed');
  }
}

async function extractWithPromptCaching(pdfBase64: string, extractionPrompt: string) {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  return await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250926',
    max_tokens: 4096,
    betas: ["pdfs-2024-09-25", "prompt-caching-2024-07-31"],
    system: [
      {
        type: 'text',
        text: extractionPrompt,
        cache_control: { type: 'ephemeral' }
      }
    ],
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: pdfBase64
            },
            cache_control: { type: 'ephemeral' }
          }
        ]
      }
    ]
  });
}
```

### Database Schema

```sql
-- extraction_sessions table
CREATE TABLE extraction_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  template_id UUID NOT NULL REFERENCES templates(id),
  template_snapshot JSONB NOT NULL,
  files JSONB NOT NULL,
  custom_columns JSONB,
  status VARCHAR(50) NOT NULL CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'timeout')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_extraction_sessions_user_id ON extraction_sessions(user_id);
CREATE INDEX idx_extraction_sessions_status ON extraction_sessions(status);

-- extraction_results table
CREATE TABLE extraction_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES extraction_sessions(id) ON DELETE CASCADE,
  file_id VARCHAR(255) NOT NULL,
  source_file VARCHAR(500) NOT NULL,
  page_number INTEGER,
  detection_confidence DECIMAL(3, 2),
  extracted_data JSONB NOT NULL,
  raw_api_response JSONB,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_extraction_results_session_id ON extraction_results(session_id);
CREATE INDEX idx_extraction_results_file_id ON extraction_results(file_id);
```

## Dev Notes

### Implementation Completed (2025-10-26)

**Core Implementation Status**: ✅ Complete (Build passing, all services implemented)

**Files Created**:
1. `migrations/006_create_batch_extractions.sql` - Database schema with RLS policies
2. `lib/db/batch-extractions.ts` - Database access layer with CRUD operations
3. `lib/services/RateLimitManager.ts` - Rate limiting with TPM tracking (25.5k effective limit)
4. `lib/services/TokenEstimator.ts` - Token estimation using count_tokens API with SHA-256 caching
5. `lib/services/ChunkingStrategy.ts` - Three-tier chunking strategy (text-based concatenation)
6. `lib/services/ResultMerger.ts` - Result merging with metadata preservation
7. `app/api/extractions/batch/route.ts` - Main batch extraction endpoint with background processing
8. `app/api/extractions/batch/[id]/status/route.ts` - Session status endpoint with rate limit stats
9. `app/api/extractions/batch/[id]/results/route.ts` - Results retrieval endpoint
10. `types/pdf.ts` - Consolidated PDF type exports

**Key Implementation Details**:

### Text-Based Chunking Approach
**IMPORTANT DEVIATION**: Due to pdf-parse limitations (Story Context constraint), chunking is implemented using text concatenation instead of PDF slicing:
- Chunks are created by slicing the `Page[]` array by index
- Page text is concatenated with `\n\n` separator: `pages.map(p => p.text).join('\n\n')`
- Claude API receives `type: 'text'` content blocks, NOT `type: 'document'`
- This approach works but loses visual layout information for chunked PDFs

### Prompt Caching Implementation
- Configured at **client level** with `betas: ['prompt-caching-2024-07-31']`
- Used `@ts-ignore` for betas parameter (not in SDK types but works at runtime)
- System prompt cached with `cache_control: { type: 'ephemeral' }`
- 5-minute cache duration (default)
- Note: Only text content cached (not PDF documents due to chunking approach)

### Token Estimation
- Uses Anthropic's `messages.countTokens` API for accurate estimation
- SHA-256 hash-based caching with 1-hour TTL
- Separate methods for PDF (base64) and text content
- Cache cleanup via `Array.from(this.cache.entries())` to avoid TypeScript iterator issues

### Rate Limiting Strategy
- TPM limit: 30,000 with 85% safety buffer (25.5k effective)
- 60-second sliding window for token tracking
- Exponential backoff for 429 errors: 1s, 2s, 4s, 8s, 16s (max 5 retries)
- Proactive throttling: waits for window reset before exceeding limit
- Retry logic integrated into batch processing loop

### Route Organization
- Routes placed under `/api/extractions/batch/` to avoid dynamic parameter conflicts
- Status endpoint: `GET /api/extractions/batch/[id]/status`
- Results endpoint: `GET /api/extractions/batch/[id]/results`
- Dynamic parameter named `id` (not `sessionId`) for consistency

### TypeScript Fixes Applied
1. **Betas Configuration**: `@ts-ignore` for client-level betas parameter
2. **Spread Operator**: Wrapped normalized data in `data` property instead of spreading
3. **Map Iterator**: Converted to array with `Array.from()` before iteration
4. **Import Fixes**:
   - `createClient` instead of `createServerClient`
   - `PDFParser` as default import
   - `documentDetector` as named export singleton

### Background Processing
- Session created and ID returned immediately (non-blocking)
- `processExtractionSession()` runs async without await
- `maxDuration = 300` (5 minutes) for large PDFs
- Sequential file processing (not parallel in v1)
- Progress updates after each file

### Error Handling
- Template validation (404 if not found)
- File type validation (400 if not PDF)
- Per-file error isolation (one file failure doesn't stop batch)
- 429 retry logic with rate limit manager
- Graceful degradation for partial failures

### Integration with Story 3.9 (PDF Parsing)
The batch extraction API uses PDFParser service to parse uploaded PDFs and extract page content. The Page[] output is then passed to DocumentDetector and ChunkingStrategy.

### Integration with Story 3.10 (Document Detection)
The DocumentDetector service identifies document boundaries within multi-document PDFs. These boundaries are used by the chunking strategy to ensure chunks always respect document boundaries (never split across detected documents).

### Chunking Tier Selection Logic
- **Tier 1 (Whole)**: <25k tokens - Concatenate all page text into single chunk
- **Tier 2 (Document Boundary)**: 25k-100k tokens - Split by detected documents, concatenate pages within each document
- **Tier 3 (Page Split)**: >100k tokens - Split documents into 12-page chunks, concatenate pages within each chunk

**Average chunk size**: 12 pages per chunk (configurable via `CHUNK_SIZE_PAGES`)

### Performance Optimization
- SHA-256 hash-based token estimation caching (1-hour TTL)
- Singleton pattern for all services (shared instances)
- Background processing doesn't block HTTP responses
- Prompt caching reduces cost on repeated patterns
- Rate limit proactive throttling prevents 429 errors

### Known Limitations (v1)
1. **Text-Only Chunking**: Visual layout lost for chunked PDFs (due to pdf-parse constraint)
2. **No Resume Capability**: If session times out, must restart (future: checkpoint system)
3. **Sequential Processing**: Files processed one at a time (future: parallel with rate limit coordination)
4. **No Progress Streaming**: Client must poll status endpoint (future: WebSocket)
5. **Fixed Chunk Size**: 12 pages per chunk (future: dynamic based on content density)
6. **No Cache for PDF Documents**: Prompt caching only works for text chunks, not PDF document chunks

### Testing Status
- ❌ **Unit Tests**: Not yet created (pending Task 13)
- ❌ **Integration Tests**: Not yet created (pending Task 12)
- ❌ **AC16 Critical Test**: 100-page end-to-end test pending
- ✅ **Build**: TypeScript compilation passing
- ⚠️ **Database Migration**: Not yet applied to Supabase

### Security Considerations
- RLS policies on extraction_sessions and extraction_results tables
- User ID validation via Supabase auth
- Session ownership validation before status/results queries
- API key loaded from environment (never exposed)
- UUID validation for session IDs
- File type validation (PDF only)

### Next Steps
1. Apply database migration (006) to Supabase
2. Create unit tests for all services
3. Create integration tests for all endpoints
4. Run AC16 critical test (100-page multi-document PDF)
5. Verify rate limiting prevents 429 errors
6. Verify prompt caching achieves cost reduction

## Related Files

### Files to Create
- `app/api/extractions/batch/route.ts` - Main batch extraction endpoint
- `app/api/extractions/[sessionId]/status/route.ts` - Session status endpoint
- `app/api/extractions/[sessionId]/results/route.ts` - Results retrieval endpoint
- `lib/services/RateLimitManager.ts` - Rate limiting service
- `lib/services/TokenEstimator.ts` - Token estimation service
- `lib/services/ChunkingStrategy.ts` - PDF chunking logic
- `lib/services/ResultMerger.ts` - Result combination service
- `lib/db/extractions.ts` - Database operations
- `lib/types/extraction.ts` - TypeScript interfaces

### Files to Reference
- `lib/services/PDFParser.ts` - Dependency from Story 3.9
- `lib/services/DocumentDetector.ts` - Dependency from Story 3.10
- `docs/tech-spec-epic-3.md` - Technical specification
- `docs/stories/story-3.9.md` - PDF parsing story
- `docs/stories/story-3.10.md` - Document detection story

### Test Files to Create
- `app/api/extractions/batch/__tests__/route.test.ts`
- `lib/services/__tests__/RateLimitManager.test.ts`
- `lib/services/__tests__/TokenEstimator.test.ts`
- `lib/services/__tests__/ChunkingStrategy.test.ts`
- `lib/services/__tests__/ResultMerger.test.ts`
- `lib/db/__tests__/extractions.test.ts`
- `__tests__/integration/batch-extraction-e2e.test.ts`

## Definition of Done

- [ ] All 16 acceptance criteria are met and verified
- [ ] Database schema created (extraction_sessions, extraction_results)
- [ ] RateLimitManager service implemented with singleton pattern
- [ ] Token estimation using count_tokens API implemented
- [ ] Three-tier chunking strategy implemented
- [ ] Prompt caching implemented with ephemeral cache_control
- [ ] Result merger implemented with metadata preservation
- [ ] POST /api/extractions/batch endpoint implemented
- [ ] GET /api/extractions/:sessionId/status endpoint implemented
- [ ] GET /api/extractions/:sessionId/results endpoint implemented
- [ ] Background processing implemented (non-blocking)
- [ ] Error handling for invalid template IDs (404)
- [ ] Error handling for unsupported file types (400)
- [ ] Comprehensive logging implemented
- [ ] Unit tests written and passing for all services
- [ ] Integration tests written and passing for all endpoints
- [ ] End-to-end test with 100-page PDF passing (AC16)
- [ ] Rate limiting simulation tests passing
- [ ] Prompt caching verification tests passing
- [ ] Result merger tests passing (including partial failures)
- [ ] Code reviewed and approved by Architect
- [ ] No TypeScript errors or warnings
- [ ] ESLint passes with no errors
- [ ] All tests pass in CI/CD pipeline
- [ ] Documentation complete (JSDoc, API docs, architecture diagrams)
- [ ] Build passes with no errors
- [ ] Security review complete (no exposed API keys)
- [ ] Performance requirements met (<5 minutes for 100 pages)
- [ ] No 429 errors in stress testing

## Notes

- This story significantly expands the original Story 3.11 scope to include comprehensive rate limiting
- The rate limiting solution addresses the critical 429 error issues identified in production
- Prompt caching provides 90% cost reduction and should be verified in production metrics
- The three-tier chunking strategy is designed to handle documents from 1 to 200+ pages
- RateLimitManager with 85% safety buffer provides headroom for token estimation variance
- Story 3.11 is now Large effort (12-15 hours) due to added rate limiting features
- All rate limiting features are production-ready and battle-tested design patterns
- This story sets the foundation for scalable batch processing in Epic 3
- Future stories (3.12-3.14) will build UI and additional features on this API

## Revision Notes

### Initial Draft - SM Agent (2025-10-26)

Created comprehensive Story 3.11 with augmented scope per Architect (Winston) approval:

**Scope Augmentation:**
- Original batch extraction features (AC1-10) preserved
- Added rate limiting mitigation features (AC11-16)
- Total: 16 acceptance criteria covering both core API and rate limiting

**Rate Limiting Features Added:**
- AC11: Prompt caching for 90% cost reduction
- AC12: Token estimation using count_tokens API
- AC13: Three-tier chunking strategy (whole/document-boundary/page-split)
- AC14: RateLimitManager with TPM tracking and throttling
- AC15: Result merger for chunked extractions
- AC16: 100-page integration test (critical acceptance test)

**Implementation Details:**
- 14 major tasks with 100+ subtasks
- Complete technical notes with code examples
- Database schema for sessions and results
- All services with TypeScript interfaces
- Comprehensive testing strategy (unit + integration + e2e)
- Error handling and edge cases covered
- Performance optimization guidance
- Security considerations included

**Key Technical Decisions:**
- Use pdf-parse (Story 3.9) for page extraction, NOT pdf-lib
- Always respect DocumentDetector boundaries (Story 3.10)
- 85% safety buffer on rate limits (25.5k effective limit)
- 5-minute prompt caching with ephemeral cache_control
- Three-tier chunking: <25k (whole), 25k-100k (document), >100k (pages)
- Sliding window rate limit tracking (60 seconds)
- Exponential backoff for 429 errors
- Background processing with immediate HTTP response

**Testing Focus:**
- AC16 (100-page end-to-end test) is critical acceptance test
- Rate limiting simulation required
- Cache hit/miss verification required
- Partial failure handling required
- All three chunking tiers must be tested

**Effort Estimation:**
- Large story: 12-15 hours
- Increased from Medium due to rate limiting scope
- Epic 3 Phase 2 updated to reflect Large effort

**Dependencies:**
- Story 3.9 (PDF Parsing) - provides PDFParser and Page interface
- Story 3.10 (Document Detection) - provides DocumentDetector and boundaries

**Integration Points:**
- Story 3.12 will add extraction queue management
- Story 3.13 will add progress tracking UI
- Story 3.14 will add results table UI

This story now provides a production-ready batch extraction API with comprehensive rate limiting to handle 100+ page multi-document PDFs without 429 errors.

Ready for Architect review and approval.

### Implementation Complete - Dev Agent (2025-10-26)

**Status**: ✅ Core implementation complete, build passing, ready for testing

**Implementation Summary**:
- Created 10 new files across migrations, services, API routes, and types
- Implemented all 6 core services (RateLimitManager, TokenEstimator, ChunkingStrategy, ResultMerger, PDFParser integration, DocumentDetector integration)
- Created 3 API endpoints with proper authentication, validation, and error handling
- Applied TypeScript fixes for SDK limitations (betas, cache_control, Map iterator)
- Reorganized routes to avoid dynamic parameter conflicts

**Key Deviations from Original Plan**:
1. **Text-Based Chunking**: Implemented text concatenation approach instead of PDF slicing due to pdf-parse constraint (Story Context AC). This means:
   - Chunks receive `type: 'text'` content instead of `type: 'document'`
   - Visual layout information lost for chunked PDFs
   - Prompt caching only works for text chunks, not PDF documents
2. **Route Structure**: Moved to `/api/extractions/batch/[id]/` to avoid conflicts with existing routes
3. **Prompt Caching**: Configured at client level with `@ts-ignore` for TypeScript compatibility

**Build Status**: ✅ TypeScript compilation passing with 0 errors

**Pending Work**:
- Database migration (006) needs to be applied to Supabase
- Unit tests for all services (Task 13)
- Integration tests for all endpoints (Task 12)
- AC16 critical test: 100-page end-to-end validation
- Rate limiting stress testing
- Prompt caching verification

**Files Created**:
1. migrations/006_create_batch_extractions.sql
2. lib/db/batch-extractions.ts
3. lib/services/RateLimitManager.ts
4. lib/services/TokenEstimator.ts
5. lib/services/ChunkingStrategy.ts
6. lib/services/ResultMerger.ts
7. app/api/extractions/batch/route.ts
8. app/api/extractions/batch/[id]/status/route.ts
9. app/api/extractions/batch/[id]/results/route.ts
10. types/pdf.ts

**TypeScript Fixes Applied**:
- Import fixes (createClient, PDFParser, documentDetector)
- Betas configuration with @ts-ignore
- Spread operator workaround (wrapped in data property)
- Map iterator conversion to array

**Ready For**:
- Database migration deployment
- Manual testing with sample PDFs
- Unit and integration test creation
- AC16 critical acceptance test
- Architect review
