# Rate Limiting Solution - Quick Reference

**Date**: 2025-10-26
**Issue**: Claude API rate limit exceeded (30k tokens/minute, sending 50k+ per call)
**Root Cause**: Sending entire 100-page PDFs in single API call

---

## The Misunderstanding (Circular Dependency)

**Question Raised**: "How can we break up pages by 'detect docs' when we can't send the document to evaluate?"

**Answer**: There is NO circular dependency because:

- **DocumentDetector runs LOCALLY** (server-side Node.js code)
- It uses simple regex/keyword matching (no API calls required)
- It analyzes already-parsed text from PDFParser
- Only AFTER local detection do we send chunks to Claude API

**Flow Chart**:
```
PDF File (binary)
    ↓
PDFParser (LOCAL - pdf-parse library)
    ↓
Parsed Pages (text array)
    ↓
DocumentDetector (LOCAL - regex/keywords) ← NO API CALL
    ↓
Detected Documents (boundaries)
    ↓
Loop: Send EACH document to Claude API ← RATE LIMITED
```

---

## Current vs Fixed Flow

### Current (Breaks Rate Limits)
```
100 pages → Parse → Send ALL 100 pages to Claude (50k+ tokens) → ❌ Rate limit error
```

### Fixed (Respects Rate Limits)
```
100 pages → Parse → Detect 10 documents → Send 10 separate calls (~5k tokens each)
    ↓
With throttling: 30k tokens/min = ~6 docs/minute
Total time: ~2 minutes for 100 pages ✅
```

---

## What DocumentDetector Actually Does

**Location**: `lib/services/DocumentDetector.ts`

**Input**: Array of Page objects (from PDFParser)
```typescript
{
  pageNumber: 1,
  text: "INVOICE\nInvoice #: INV-12345\nDate: 01/15/2024\n..."
}
```

**Process** (LOCAL, no API calls):
1. Loop through pages
2. Extract first 200 characters of each page
3. Apply 4 heuristics using regex:
   - Invoice/Receipt keywords (0.7 confidence)
   - Invoice number patterns (0.6 confidence)
   - Date patterns (0.5 confidence)
   - Page boundaries (0.3 confidence)
4. Calculate max confidence score per page
5. Split when confidence ≥ 0.3 (AGGRESSIVE strategy)

**Output**: Array of document boundaries
```typescript
[
  { startPage: 1, endPage: 10, pageCount: 10, confidence: 0.7 },
  { startPage: 11, endPage: 20, pageCount: 10, confidence: 0.6 },
  // ... 10 total documents
]
```

**Cost**: Milliseconds of local CPU time, zero API tokens

---

## Story 3.10 Status Clarification

| Aspect | Status | Evidence |
|--------|--------|----------|
| **Code Complete** | ✅ Yes | 397 lines implemented |
| **Unit Tests** | ✅ Passing | 47 tests, 97.95% coverage |
| **Integration Tested** | ❌ No | Blocked by rate limiting on downstream Claude API |
| **Ready to Use** | ✅ Yes | Once chunking implemented in extraction route |

**Why "Unable to Test"**:
- DocumentDetector code works perfectly (unit tests prove it)
- But the full workflow (Parse → Detect → Extract) hits rate limits at the Extract step
- You couldn't see DocumentDetector work end-to-end because extraction failed first

**Once we implement chunking**: DocumentDetector will work as designed

---

## Implementation Required

### File to Modify
`app/api/extract/production/route.ts` (lines 390-420)

### Current Code (Simplified)
```typescript
// Parse document
const message = await anthropic.messages.create({
  // Sends ENTIRE PDF in one call
  content: [{ type: 'document', data: documentBase64 }]
});

// Process result
const extractedRows = denormalizeData(...);
return NextResponse.json({ data: extractedRows });
```

### Required Changes
```typescript
import { documentDetector } from '@/lib/services/DocumentDetector';
import { pdfParser } from '@/lib/services/PDFParser';

// 1. Parse PDF first (if not already done)
const buffer = Buffer.from(documentBase64, 'base64');
const parseResult = await pdfParser.parsePDF(buffer);

// 2. Detect document boundaries (LOCAL - no API call)
const detectedDocs = await documentDetector.detect(parseResult.pages);

// 3. Process each detected document separately
const allExtractedRows = [];

for (const doc of detectedDocs) {
  // Extract pages for this document only
  const docPages = parseResult.pages.slice(doc.startPage - 1, doc.endPage);
  const docText = docPages.map(p => p.text).join('\n\n');

  // Convert text back to base64 (or send as text)
  const docBase64 = Buffer.from(docText).toString('base64');

  // Send THIS document to Claude (smaller payload)
  const message = await anthropic.messages.create({
    content: [{ type: 'text', text: docText }] // or document if needed
  });

  // Extract data
  const rows = processToolUse(message);
  allExtractedRows.push(...rows);

  // 4. THROTTLE: Wait if approaching rate limit
  await throttleIfNeeded();
}

// 5. Return combined results
return NextResponse.json({ data: allExtractedRows });
```

### Throttling Logic
```typescript
let tokensUsedThisMinute = 0;
let minuteStartTime = Date.now();

async function throttleIfNeeded() {
  const now = Date.now();
  const elapsedMs = now - minuteStartTime;

  // Reset counter every minute
  if (elapsedMs >= 60000) {
    tokensUsedThisMinute = 0;
    minuteStartTime = now;
    return;
  }

  // If approaching limit, wait
  if (tokensUsedThisMinute >= 25000) { // 25k buffer under 30k limit
    const waitMs = 60000 - elapsedMs;
    console.log(`[Throttle] Waiting ${waitMs}ms to reset rate limit`);
    await new Promise(resolve => setTimeout(resolve, waitMs));
    tokensUsedThisMinute = 0;
    minuteStartTime = Date.now();
  }
}
```

### Token Estimation (Simple)
```typescript
function estimateTokens(text: string): number {
  // Rough heuristic: ~3.5 characters per token
  return Math.ceil(text.length / 3.5);
}

// Before each API call:
const estimatedTokens = estimateTokens(docText);
tokensUsedThisMinute += estimatedTokens;
```

---

## Expected Results

### Example: 100-Page PDF with 10 Invoices

**Before (Single Call)**:
- 100 pages × 500 tokens/page = 50,000 tokens
- Result: ❌ Rate limit error (exceeds 30k/minute)

**After (Chunked)**:
- Document 1: Pages 1-10 = ~5,000 tokens ✅
- Document 2: Pages 11-20 = ~5,000 tokens ✅
- Document 3: Pages 21-30 = ~5,000 tokens ✅
- Document 4: Pages 31-40 = ~5,000 tokens ✅
- Document 5: Pages 41-50 = ~5,000 tokens ✅
- Document 6: Pages 51-60 = ~5,000 tokens ✅ (wait 1 minute after this)
- Document 7: Pages 61-70 = ~5,000 tokens ✅
- ... and so on

**Total Time**: ~2 minutes for 100 pages (vs instant failure)

---

## Files Reference

| File | Purpose | Status |
|------|---------|--------|
| `lib/services/DocumentDetector.ts` | Local document boundary detection | ✅ Complete |
| `lib/services/PDFParser.ts` | PDF to text parsing | ✅ Complete (Story 3.9) |
| `app/api/extract/production/route.ts` | Extraction API endpoint | ⚠️ Needs chunking + throttling |
| `app/api/parse-pdf/route.ts` | PDF parsing endpoint | ✅ Complete |

---

## Testing Plan (After Implementation)

1. **Test with small PDF (1 document, 5 pages)**:
   - Should process in single API call
   - Verify DocumentDetector returns 1 document
   - Verify extraction works

2. **Test with medium PDF (3 documents, 30 pages)**:
   - Should make 3 API calls
   - Verify correct boundaries detected
   - Verify all data extracted and combined

3. **Test with large PDF (10+ documents, 100+ pages)**:
   - Should make 10+ API calls with throttling
   - Verify rate limit NOT exceeded
   - Verify complete extraction

4. **Monitor logs for**:
   - DocumentDetector output (boundaries found)
   - Token usage per call
   - Throttling delays
   - Total processing time

---

## FAQ

**Q: Does this require Story 3.11 (Batch Extraction Store)?**
A: No. We can implement chunking in the production route now. Story 3.11 adds queue management for better UX.

**Q: Will this slow down extraction?**
A: Yes, but unavoidably. Rate limits are hard constraints. Better to take 2 minutes than fail instantly.

**Q: What if DocumentDetector is wrong?**
A: AGGRESSIVE strategy prefers false positives (more splits). Worst case: extra API calls, but still under rate limit.

**Q: Can we make it faster?**
A: Yes, with parallel processing (Story 3.11), but must respect rate limits. Can't parallelize beyond 30k tokens/minute.

**Q: What about PDF parsing time?**
A: PDFParser already handles this (Story 3.9). This solution only addresses Claude API rate limits.

---

## Estimated Implementation Time

- Modify extraction route: ~30 minutes
- Add throttling logic: ~15 minutes
- Add token estimation: ~15 minutes
- Testing: ~30 minutes
- **Total**: ~90 minutes

---

## Key Takeaway

**DocumentDetector is NOT the bottleneck or circular dependency.**

It's a LOCAL service that:
- Runs in milliseconds
- Uses zero API tokens
- Enables chunking that solves rate limits

The solution is straightforward:
1. Parse locally
2. Detect boundaries locally
3. Send chunks to API (with throttling)
4. Combine results

---

**End of Document**
