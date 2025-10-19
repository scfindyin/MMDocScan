# Story 1.2: Database Setup and Connection

Status: Ready

## Story

As a developer,
I want Supabase PostgreSQL database configured and connected to the Next.js application,
so that I can store and retrieve application data.

## Acceptance Criteria

1. **AC1** - Supabase project created and configured with PostgreSQL database
2. **AC2** - Database connection established from Next.js using Supabase client SDK
3. **AC3** - Environment variables configured for database credentials (SUPABASE_URL, SUPABASE_ANON_KEY)
4. **AC4** - Database connection verified with test query
5. **AC5** - Basic error handling implemented for database connection failures
6. **AC6** - Connection works in both local development and Vercel deployment


## Tasks / Subtasks

- [x] Create and configure Supabase project (AC: #1)
  - [x] Sign up for Supabase account or log in to existing account
  - [x] Create new Supabase project with PostgreSQL database
  - [x] Note project URL and anon key from project settings
  - [x] Verify project is in active state and accessible

- [x] Install Supabase client SDK (AC: #2)
  - [x] Install @supabase/supabase-js package (version ^2.38.0)
  - [x] Verify package installation in package.json
  - [x] Check for TypeScript type definitions

- [x] Configure environment variables (AC: #3)
  - [x] Create .env.local file in project root (add to .gitignore if not present)
  - [x] Add SUPABASE_URL environment variable with project URL
  - [x] Add SUPABASE_ANON_KEY environment variable with anon public key
  - [x] Create .env.example file with placeholder values for documentation
  - [x] Update README with environment variable setup instructions

- [x] Create Supabase client utility (AC: #2)
  - [x] Create lib/supabase.ts file for Supabase client initialization
  - [x] Implement createClient function using environment variables
  - [x] Export configured Supabase client for reuse across application
  - [x] Add TypeScript types for Supabase client

- [x] Implement database connection test (AC: #4, #5)
  - [x] Create API route: app/api/db-test/route.ts
  - [x] Implement GET handler that queries Supabase (e.g., SELECT current_timestamp)
  - [x] Return connection status (success/failure) and test data
  - [x] Add error handling with try-catch block
  - [x] Return appropriate HTTP status codes (200 for success, 500 for errors)
  - [x] Log errors for debugging without exposing sensitive information

- [x] Test local development connection (AC: #6)
  - [x] Start development server with npm run dev
  - [x] Navigate to /api/db-test endpoint
  - [x] Verify successful connection response
  - [x] Test error handling by temporarily using invalid credentials
  - [x] Confirm error messages are user-friendly and don't expose secrets

- [ ] Configure Vercel deployment environment variables (AC: #6)
  - [ ] Access Vercel project settings
  - [ ] Add SUPABASE_URL to Vercel environment variables
  - [ ] Add SUPABASE_ANON_KEY to Vercel environment variables
  - [ ] Set variables for Production, Preview, and Development environments
  - [ ] Trigger new deployment to apply environment variables

- [ ] Verify Vercel deployment connection (AC: #6)
  - [ ] Deploy application to Vercel (commit and push changes)
  - [ ] Access deployed application /api/db-test endpoint
  - [ ] Verify successful database connection from Vercel serverless function
  - [ ] Check Vercel function logs for any connection errors
  - [ ] Confirm connection works consistently across multiple requests

## Dev Notes

### Architecture Patterns and Constraints

**Technology Stack:**
- **Database:** Supabase PostgreSQL (managed cloud database)
- **Database Client:** @supabase/supabase-js SDK (version ^2.38.0)
- **Backend:** Next.js API Routes (serverless functions on Vercel)
- **Authentication:** Supabase anon key (public access for MVP, no user auth required)

**Key Architectural Decisions:**
- Use Supabase for PostgreSQL database hosting (eliminates need for self-managed database infrastructure)
- Implement Supabase client as singleton utility in /lib directory for consistent reuse
- Store only templates in database for MVP (no document persistence - documents processed in-memory only)
- Use environment variables for credentials (never commit secrets to repository)
- Leverage Next.js API routes for database interaction (serverless architecture)

**Constraints:**
- **Supabase Free Tier Limits:** 500MB database storage, 2GB bandwidth/month, 50MB file upload limit
- **Level 2 Project Complexity:** Simple architecture - direct Supabase client usage (no ORM abstraction needed)
- **Cost Optimization:** Stay within free tier as long as possible; optimize queries and minimize data transfer
- **Security:** Use anon key for public access (MVP is single-user internal tool, no authentication required)

[Source: docs/tech-spec-epic-combined.md#System Architecture Alignment, #External Services]

### Source Tree Components to Touch

**Files to Create:**
```
/
├── lib/
│   └── supabase.ts              (Supabase client initialization)
├── app/
│   └── api/
│       └── db-test/
│           └── route.ts         (Database connection test endpoint)
├── .env.local                   (Local environment variables - DO NOT COMMIT)
├── .env.example                 (Example environment variables for documentation)
└── README.md                    (Update with environment setup instructions)
```

**Files to Modify:**
- package.json (add @supabase/supabase-js dependency)
- .gitignore (ensure .env.local is excluded - should already be present from Story 1.1)
- README.md (add Supabase setup section)

**Database Schema (Future Story 1.3):**
- This story establishes connection only
- Database schema (templates table) will be created in Story 1.3
- No migrations or table creation in this story

[Source: docs/tech-spec-epic-combined.md#Data Models and Contracts]

### Testing Standards Summary

**Testing Approach for this Story:**
- **Manual Verification:** Primary testing method for database connection
- **Connection Tests:**
  - Local development: /api/db-test endpoint returns successful connection status
  - Vercel deployment: /api/db-test endpoint accessible and returns success
  - Error handling: Invalid credentials produce user-friendly error messages
  - No secrets exposed in error responses or logs

**Test Queries:**
- Simple SELECT query (e.g., `SELECT current_timestamp`) to verify connection
- No data modification in this story (INSERT/UPDATE/DELETE deferred to Story 1.3)

**Future Testing Setup:**
- Unit tests for Supabase client initialization (deferred to later stories)
- Integration tests with test database (deferred to later stories)
- Error simulation tests for connection failures

[Source: docs/tech-spec-epic-combined.md#Test Strategy Summary]

### Project Structure Notes

**Alignment with Unified Project Structure:**

This story extends the foundation from Story 1.1 by adding database connectivity:

- `/lib` directory for shared utilities (established in Story 1.1) - adding Supabase client singleton
- `/app/api` directory for API routes (new in this story) - Next.js serverless function convention
- Environment variables pattern following Next.js best practices (.env.local for local, Vercel UI for deployment)

**No Conflicts Detected:**
- Extends existing structure without modifying Story 1.1 components
- API routes directory is standard Next.js 14 App Router convention
- Supabase client in /lib follows established pattern for shared utilities

**Rationale for Structure:**
- Singleton Supabase client pattern prevents multiple connection instances (performance optimization)
- Environment variables provide security and flexibility (different credentials for dev/staging/production)
- API route for testing enables verification without frontend dependency

[Source: docs/tech-spec-epic-combined.md#Core Components, Story 1.1 Dev Notes]

### References

**Technical Specifications:**
- [External Services - Supabase](docs/tech-spec-epic-combined.md#External-Services) - Supabase configuration and free tier limits
- [Backend Dependencies](docs/tech-spec-epic-combined.md#Backend-Dependencies) - @supabase/supabase-js version and purpose
- [Data Models](docs/tech-spec-epic-combined.md#Data-Models-and-Contracts) - Future template schema overview (implemented in Story 1.3)
- [Integration Points - Supabase](docs/tech-spec-epic-combined.md#Integration-Points) - Protocol, authentication, connection details

**Requirements:**
- [Epic 1 Overview](docs/epics.md#Epic-1-Project-Foundation--Template-Management) - Foundation goals and database setup context
- [Story 1.2 Definition](docs/epics.md#Story-12-Database-Setup-and-Connection) - User story and acceptance criteria
- [PRD NFR](docs/PRD.md#Non-Functional-Requirements) - Usability and browser compatibility requirements

**Previous Story Context:**
- [Story 1.1](docs/stories/story-1.1.md#Dev-Notes) - Project structure foundation, Next.js setup, environment configuration patterns

## Dev Agent Record

### Context Reference

- [Story Context 1.2](story-context-1.1.2.xml) - Generated 2025-10-19

### Agent Model Used

claude-sonnet-4-5-20250929

### Debug Log References

### Completion Notes List

### File List

## Change Log

**2025-10-19 - Story 1.2 Created (Draft)**
- Story drafted by Scrum Master agent following create-story workflow
- Extracted requirements from epics.md and tech-spec-epic-combined.md
- Defined 6 acceptance criteria mapped to technical specifications
- Created 8 task groups with detailed subtasks for implementation
- Added comprehensive Dev Notes with architecture constraints and testing approach
- Status: Draft (ready for developer implementation)

