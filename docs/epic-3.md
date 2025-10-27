# Epic 3: Unified Batch Extraction Workflow

**Status:** In Progress
**Priority:** High
**Timeline:** 8 Weeks
**Dependencies:** Epic 1 (Template System), Epic 2 (Production Extraction)

---

## Epic Overview

Transform MMDocScan from single-file processing to a powerful batch extraction platform with a unified single-page workflow. Enable users to process 1-100 files simultaneously with automatic document detection, custom columns, and polished results presentation.

**Business Value:**
- 97.5% reduction in clicks for batch processing (120 clicks → 3 clicks for 20 files)
- Support enterprise workloads (process entire invoice batches)
- Eliminate context switching with single-page design
- Add analytical power with custom columns

---

## Technical Foundation

**Based on:**
- Requirements Document v1.2
- Technical Implementation Plan v1.0
- 7 implementation phases over 8 weeks

**Core Technologies:**
- Next.js 14 App Router
- React 18 + TypeScript
- Zustand (state management)
- react-resizable-panels
- @dnd-kit (drag-and-drop)
- react-window (table virtualization)
- pdf-parse (PDF parsing)
- exceljs (Excel export)

---

## Epic Stories

### Phase 1: Foundation (Weeks 1-2)
**Stories 3.1 - 3.7**

- **Story 3.1:** Unified Page Layout with Resizable Panels
- **Story 3.2:** Tag-Based Template Builder UI
- **Story 3.3:** Drag-and-Drop Field Reordering
- **Story 3.4:** Template CRUD APIs
- **Story 3.5:** Save Template Flow
- **Story 3.6:** Basic File Upload (Single File)
- **Story 3.7:** Basic Extraction with Results Table

---

### Phase 2: Batch Processing (Weeks 3-4)
**Stories 3.8 - 3.11, 3.14** (Note: Story 3.11 uses SSE progress streaming; Stories 3.12-3.13 deferred)

- **Story 3.8:** Multi-File Upload UI ✓
- **Story 3.9:** PDF Parsing Service ✓
- **Story 3.10:** Auto-Detection Algorithm ✓
- **Story 3.11:** Batch Extraction API with Rate Limit Mitigation & SSE Progress Streaming
  - **Implementation Pattern**: In-memory sessions, SSE streaming, no database persistence
  - **Core Features**: Batch extraction, real-time SSE progress updates, session cleanup (5 min TTL)
  - **Rate Limiting**: Prompt caching (90% cost reduction), token estimation, three-tier chunking, TPM tracking
  - **Progress Tracking**: Built-in via SSE (eliminates need for Story 3.13)
  - **Effort**: Large (4-6 hours for clean implementation)
  - **Note**: Start fresh - previous overcomplicated implementation rolled back
- **Story 3.12:** ~~Extraction Queue with Concurrency~~ **DEFERRED** - Optional post-MVP enhancement
- **Story 3.13:** ~~Progress Tracking UI~~ **DEFERRED** - Integrated into Story 3.11 via SSE
- **Story 3.14:** Results Table with Source Tracking

---

### Phase 3: Custom Columns (Week 5)
**Stories 3.15 - 3.17**

- **Story 3.15:** Custom Columns UI (Static Values)
- **Story 3.16:** Custom Columns in Results Table
- **Story 3.17:** Custom Columns in Excel Export

---

### Phase 4: AI Features (Week 6)
**Stories 3.18 - 3.20**

- **Story 3.18:** AI Inspect API
- **Story 3.19:** AI Suggestions Modal
- **Story 3.20:** Prompt Merge Logic

---

### Phase 5: Excel Export Options (Week 6)
**Stories 3.21 - 3.22**

- **Story 3.21:** Export Dialog with Options
- **Story 3.22:** Excel Generation Service (Separate/Combined Sheets)

---

### Phase 6: Results Table UI Polish (Week 6)
**Stories 3.23 - 3.25**

- **Story 3.23:** Table Virtualization with react-window
- **Story 3.24:** Frozen Header and Always-Visible Scrollbar
- **Story 3.25:** Panel Maximize/Minimize Controls

---

### Phase 7: Polish & Production Ready (Weeks 7-8)
**Stories 3.26, 3.27, 3.29, 3.30** (Story 3.28 deferred)

- **Story 3.26:** Header Navigation Links
- **Story 3.27:** Error Handling & Edge Cases
- **Story 3.28:** ~~Session Persistence & Retention Settings~~ **DEFERRED** - Database session persistence not required for MVP
- **Story 3.29:** Accessibility Audit & Fixes
- **Story 3.30:** Performance Optimization & Final QA

---

## Deferred Stories (Post-MVP Enhancements)

The following stories have been deferred from MVP scope based on Sprint Change Proposal dated 2025-10-26:

### Story 3.12: Extraction Queue with Concurrency
- **Reason**: In-memory processing in Story 3.11 handles batch extraction sufficiently for MVP
- **Future Value**: Could add if users need persistent job queue or extremely large batches (>50 files)
- **Effort**: Medium (3-4 hours)
- **Prerequisites**: None (can be added independently)

### Story 3.13: Progress Tracking UI
- **Reason**: Progress tracking integrated into Story 3.11 via SSE streaming
- **Status**: Functionality delivered via alternate implementation
- **Future Considerations**: Current SSE approach provides real-time updates; no additional UI needed

### Story 3.28: Session Persistence & Retention Settings
- **Reason**: Users export results immediately; no recall requirement identified
- **Future Value**: Could add if business case emerges for extraction history/audit trail
- **Effort**: Medium-Large (6-8 hours - requires database schema, retention policies, settings UI)
- **Prerequisites**: Would need database migrations and batch_extractions table

**Note**: These stories remain in backlog and can be implemented post-MVP if user feedback indicates need.

---

## Success Metrics

### Functional
- ✅ Process 20 files in <3 minutes
- ✅ Auto-detection accuracy >80%
- ✅ Results table handles 1000+ rows smoothly
- ✅ Excel export works with both options

### Performance
- ✅ Page load <2 seconds
- ✅ Table renders 500 rows in <1 second
- ✅ 60fps scrolling with virtualization
- ✅ API response <3 seconds (P95)

### Quality
- ✅ 80% unit test coverage
- ✅ E2E tests for critical flows
- ✅ WCAG 2.1 AA compliance
- ✅ Lighthouse score >90

---

## Architecture Decisions

### Key Patterns

**Single-Page Architecture:**
- Left panel: Configuration (templates, files, columns)
- Right panel: Results (processing state, table, export)
- Resizable with draggable divider
- Maximize/minimize controls

**State Management:**
- Zustand for global app state
- No prop drilling
- Persist panel sizes to localStorage
- Session state for in-progress extractions

**Batch Processing Strategy:**
- Parallel PDF parsing
- Rate-limited Claude API calls (max 5 concurrent)
- Aggressive auto-detection (prefer false positives)
- Real-time progress updates

**Data Flow:**
1. User configures template + uploads files
2. Click "Start Extraction" → Create session
3. Backend parses PDFs → Detects documents
4. Queue extraction tasks → Call Claude API
5. Store results → Update progress
6. Frontend polls status → Display results
7. User exports to Excel

---

## Database Schema

### New Tables

**templates** - Store user templates
```sql
id, user_id, name, fields (JSONB), extraction_prompt, created_at, updated_at
```

**extraction_sessions** - Track batch processing
```sql
id, user_id, template_id, template_snapshot (JSONB), files (JSONB),
custom_columns (JSONB), status, progress, created_at, completed_at
```

**extraction_results** - Store extracted data
```sql
id, session_id, file_id, source_file, page_number, detection_confidence,
extracted_data (JSONB), raw_api_response, created_at
```

**user_settings** - User preferences
```sql
user_id, session_retention_days, updated_at
```

---

## API Endpoints

### Templates
- `GET /api/templates` - List templates
- `POST /api/templates` - Create template
- `GET /api/templates/:id` - Get template
- `PUT /api/templates/:id` - Update template
- `DELETE /api/templates/:id` - Delete template
- `POST /api/templates/ai-inspect` - AI field suggestions

### Extractions
- `POST /api/extractions/batch` - Start batch extraction
- `GET /api/extractions/:sessionId/status` - Poll progress
- `GET /api/extractions/:sessionId/results` - Get results
- `POST /api/extractions/:sessionId/export` - Export to Excel

### Settings
- `GET /api/settings` - Get user settings
- `PUT /api/settings` - Update settings

---

## Testing Strategy

### Unit Tests (60%)
- Template field validation
- PDF detection heuristics
- Excel export formatting
- Custom column calculations

### Integration Tests (30%)
- Template CRUD workflows
- Batch extraction flow
- AI inspect integration
- Excel export generation

### E2E Tests (10%)
- Complete extraction workflow
- Multi-file upload and process
- Export with both options
- Panel resizing and controls

---

## Deployment Plan

### Environments
- **Development:** Local + Supabase dev
- **Staging:** Vercel staging + Supabase staging
- **Production:** Vercel prod + Supabase prod

### CI/CD
- GitHub Actions for automated testing
- Deploy to staging on `develop` branch
- Deploy to production on `main` branch

### Migrations
- Supabase migrations for schema updates
- Run in staging first, then production
- Backup database before migrations

---

## Risk Mitigation

### Technical Risks

**Claude API Rate Limits**
- Mitigation: p-limit (max 5 concurrent), exponential backoff
- Contingency: Queue requests, show clear ETA

**Auto-Detection Inaccuracy**
- Mitigation: Aggressive detection, manual merge UI (future)
- Contingency: Allow disabling auto-detection

**PDF Parsing Failures**
- Mitigation: Graceful error handling, continue with other files
- Contingency: Suggest re-saving as PDF/A

**Performance with Large Batches**
- Mitigation: Virtualized table, streaming parsing
- Contingency: Batch size limits

### Project Risks

**Scope Creep**
- Mitigation: Strict adherence to requirements v1.2
- Contingency: Defer features to Phase 2.0

**Resource Availability**
- Mitigation: 2-3 developers minimum, cross-training
- Contingency: Reduce scope or extend timeline

---

## Definition of Done

**Per Story:**
- ✅ All acceptance criteria met
- ✅ Code reviewed and merged
- ✅ Unit tests written and passing
- ✅ Integration tests passing
- ✅ Build passes (no errors)
- ✅ Lint passes (no warnings)
- ✅ Manual testing completed
- ✅ Documentation updated

**Per Phase:**
- ✅ All phase stories complete
- ✅ E2E tests for phase features passing
- ✅ Demo to stakeholder
- ✅ Stakeholder approval

**Epic Complete:**
- ✅ All 30 stories complete
- ✅ Performance benchmarks met
- ✅ Accessibility audit passed
- ✅ User testing completed
- ✅ Deployed to production
- ✅ User guide published

---

## Story Queue

**Next Up (Week 1):**
1. Story 3.1 - Unified Page Layout
2. Story 3.2 - Tag-Based Template Builder
3. Story 3.3 - Field Drag-and-Drop

**Blocked:**
- None (all dependencies from Epics 1-2 complete)

**Deferred to Phase 2.0:**
- Formula custom columns
- Grouped/hierarchical extraction
- Manual document merge/split

---

## References

**Requirements:** `docs/requirements-unified-batch-extraction.md` (v1.2)
**Technical Plan:** `docs/technical-implementation-plan.md` (v1.0)
**PRD:** `docs/PRD.md`
**Tech Spec:** `docs/tech-spec-epic-combined.md`

---

## Change Log

**2025-10-24 - Epic Created**
- Based on approved requirements v1.2 and technical plan v1.0
- 30 stories across 7 phases
- 8-week timeline
- Status: Ready to Start
