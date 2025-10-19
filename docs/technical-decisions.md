# Technical Decisions - MMDocScan

**Project:** MMDocScan
**Last Updated:** 2025-10-18

---

## Overview

This document captures key technical decisions, constraints, and preferences identified during product planning and development.

---

## Decisions Log

### TD001: Confidence Scoring Granularity
**Date:** 2025-10-18
**Context:** During PRD development, considered granularity of AI extraction confidence scoring
**Decision:** Implement row-level confidence scores rather than per-field scores
**Rationale:** Per-field confidence would be too granular and interruptive to user workflow. Row-level scoring provides sufficient quality visibility while maintaining usability. Users can quickly scan for low-confidence rows that need manual review.
**Impact:**
- UI design: Display confidence score per row in preview table
- Data model: Confidence score as row attribute
- Excel output: Confidence score column for each data row
**Status:** Approved

### TD002: Output Data Structure - Flat vs Relational
**Date:** 2025-10-18
**Context:** During PRD UX/UI discussion, clarified the structure of extracted data output
**Decision:** Implement flat/denormalized output structure where header information is repeated on each detail row
**Rationale:** Target output is Excel for billing validation workflows. Flat structure is Excel-native and eliminates need for users to perform joins or lookups. Header fields (invoice number, date, vendor) appear on every line item row, ready for pivot tables, filtering, and analysis.
**Impact:**
- Data model: Single flat table structure (not header-detail tables)
- AI extraction prompt: Instruct Claude to denormalize data during extraction
- UI preview: Display flat table matching final Excel output
- Excel export: Direct mapping from preview to Excel (no transformation needed)
**Example:** Invoice with 3 line items produces 3 rows, each containing invoice header fields + line item fields
**Status:** Approved

### TD003: AI-Assisted Template Creation
**Date:** 2025-10-18
**Context:** During PRD epic planning, identified opportunity to enhance template creation workflow
**Decision:** Add AI field discovery and prompt testing capabilities to template creation workflow
**Rationale:**
- Users may not know what fields can be extracted from their documents
- Testing prompts during template creation prevents failed extractions in production
- Validates templates before reuse, improving overall quality
- Leverages same Claude API needed for production extraction
- Minimal scope increase (adds 2 stories to Epic 1) with significant UX benefit
**Impact:**
- FR002: AI-generated field suggestions from sample documents
- FR005: Prompt testing during template creation
- Epic 1 scope: Includes Claude Skills API integration (moved from Epic 2)
- Story estimates: Epic 1 increases from 7-8 to 9-10 stories; Epic 2 adjusts from 8-10 to 8-9 stories
- Total project scope: 17-19 stories (within Level 2 range)
**Enhanced Workflow:**
1. Upload sample document
2. AI suggests extractable fields
3. User refines field selection
4. User adds custom prompts
5. Test extraction on sample
6. Preview results and refine prompts
7. Save validated template
**Status:** Approved

---

## Technical Stack (from Product Brief)

**Frontend:**
- React with Next.js framework
- ShadCN component library
- Tailwind CSS for styling
- TypeScript

**Backend/Infrastructure:**
- Vercel for hosting and serverless functions
- Supabase for database (PostgreSQL)
- Python available for backend processing if needed

**AI Integration:**
- Direct Claude API integration
- Prompt caching strategy for token optimization

**File Handling:**
- Local file upload for MVP
- Future: SharePoint and other document sources

---

## Architecture Preferences

**Template Storage:**
- Templates stored in Supabase database
- Includes field definitions and custom AI prompts

**Document Processing:**
- Hybrid approach - client-side file handling, server-side Claude API calls
- Processing location optimized for performance and API usage

**Data Security:**
- Standard HTTPS/secure transmission
- Not a primary concern for MVP (internal tool)

---
