# Story 1.1: Project Infrastructure Setup

Status: Ready

## Story

As a developer,
I want a working Next.js application deployed to Vercel with basic routing,
so that I have a solid foundation for building MMDocScan features.

## Acceptance Criteria

1. **AC1** - Next.js 14+ project initialized with TypeScript
2. **AC2** - Tailwind CSS configured and working
3. **AC3** - ShadCN component library installed and verified
4. **AC4** - Basic application layout with navigation placeholder
5. **AC5** - Deployed to Vercel with automatic deployments on commit
6. **AC6** - Homepage displays "Document Scanning" title and basic navigation structure
7. **AC7** - Development environment runs locally without errors

## Tasks / Subtasks

- [ ] Initialize Next.js project with TypeScript (AC: #1)
  - [ ] Run `npx create-next-app@latest` with TypeScript configuration
  - [ ] Verify Next.js version is 14.0.0 or higher
  - [ ] Configure tsconfig.json for strict type checking
  - [ ] Verify project structure follows Next.js 14 conventions (app directory)

- [ ] Configure Tailwind CSS (AC: #2)
  - [ ] Install Tailwind CSS and dependencies (tailwindcss, postcss, autoprefixer)
  - [ ] Initialize Tailwind configuration (tailwind.config.ts)
  - [ ] Configure PostCSS (postcss.config.js)
  - [ ] Set up global styles with Tailwind directives
  - [ ] Verify Tailwind utilities work in a test component

- [ ] Install and verify ShadCN component library (AC: #3)
  - [ ] Run ShadCN CLI initialization (`npx shadcn-ui@latest init`)
  - [ ] Configure components.json with project preferences
  - [ ] Install initial components (Button, Card, or similar for verification)
  - [ ] Verify ShadCN components render correctly
  - [ ] Confirm Radix UI dependencies installed correctly

- [ ] Create basic application layout (AC: #4, #6)
  - [ ] Implement root layout component with HTML structure
  - [ ] Create navigation placeholder component
  - [ ] Design simple header with "MMDocScan" branding
  - [ ] Add navigation links placeholders (Templates, Process Documents)
  - [ ] Implement basic responsive layout structure
  - [ ] Create homepage with title and navigation

- [ ] Set up Vercel deployment (AC: #5)
  - [ ] Create Vercel project linked to Git repository
  - [ ] Configure automatic deployments on commit
  - [ ] Set up environment variables (if needed)
  - [ ] Verify deployment succeeds and application is accessible
  - [ ] Test automatic deployment trigger with a sample commit

- [ ] Configure development environment (AC: #7)
  - [ ] Install all development dependencies (ESLint, Prettier)
  - [ ] Configure ESLint with Next.js config (eslint-config-next)
  - [ ] Set up Prettier for code formatting
  - [ ] Verify `npm run dev` starts development server without errors
  - [ ] Verify `npm run build` creates production build successfully
  - [ ] Document local setup instructions in README (basic)

## Dev Notes

### Architecture Patterns and Constraints

**Technology Stack:**
- **Framework:** Next.js 14+ with React Server Components architecture
- **Styling:** Tailwind CSS v3.4+ utility-first framework
- **UI Components:** ShadCN (Radix UI primitives + Tailwind)
- **Language:** TypeScript 5.3+ for type safety
- **Deployment:** Vercel serverless platform with automatic CI/CD

**Key Architectural Decisions:**
- Use Next.js App Router (app directory structure) instead of Pages Router
- Implement React Server Components as default (mark client components explicitly with 'use client')
- Follow ShadCN copy-paste component pattern (components owned in codebase, not npm dependencies)
- Minimize bundle size from the start to stay within Vercel free tier bandwidth limits

**Constraints:**
- Level 2 project complexity: Simple architecture, minimal abstraction, prioritize speed
- Cost optimization: Design must stay within Vercel free tier (100GB bandwidth/month)
- Browser compatibility: Latest versions of Chrome, Firefox, Safari, Edge
- No authentication required for MVP (single-user internal tool)

[Source: docs/tech-spec-epic-combined.md#System Architecture Alignment]

### Source Tree Components to Touch

**Files to Create:**
```
/
├── app/
│   ├── layout.tsx              (Root layout with HTML structure)
│   ├── page.tsx                (Homepage)
│   └── globals.css             (Tailwind directives)
├── components/
│   ├── ui/                     (ShadCN components directory)
│   └── navigation.tsx          (Navigation placeholder component)
├── lib/
│   └── utils.ts                (ShadCN utility functions)
├── tailwind.config.ts          (Tailwind configuration)
├── postcss.config.js           (PostCSS configuration)
├── tsconfig.json               (TypeScript configuration)
├── components.json             (ShadCN configuration)
├── package.json                (Dependencies)
└── README.md                   (Setup instructions)
```

**Dependencies to Install:**
- Core: next (^14.0.0), react (^18.2.0), react-dom (^18.2.0)
- Styling: tailwindcss (^3.4.0), autoprefixer, postcss
- UI: @radix-ui/react-* (multiple packages via ShadCN)
- Utilities: class-variance-authority, clsx, tailwind-merge
- Development: typescript (^5.3.0), @types/node, @types/react, eslint, prettier

[Source: docs/tech-spec-epic-combined.md#Frontend Dependencies]

### Testing Standards Summary

**Testing Approach for this Story:**
- **Manual Verification:** Visual inspection of deployed application
- **Smoke Tests:**
  - Homepage loads without errors (200 status)
  - Navigation renders correctly
  - Tailwind styles apply (test utility class)
  - ShadCN component renders (install test button)
  - Development server starts without errors
  - Production build completes successfully

**Future Testing Setup (deferred to later stories):**
- Unit testing framework: Jest + React Testing Library
- E2E testing: Playwright
- Coverage target: 70%+ for critical paths

[Source: docs/tech-spec-epic-combined.md#Test Strategy Summary]

### Project Structure Notes

**Alignment with Unified Project Structure:**

This story establishes the foundational project structure following Next.js 14 conventions with App Router:

- `/app` directory for routes and layouts (Next.js 14 standard)
- `/components` directory for reusable UI components
- `/components/ui` for ShadCN components (copy-paste pattern)
- `/lib` for shared utilities and helper functions
- Root-level configuration files (tailwind.config.ts, tsconfig.json, etc.)

**No Conflicts Detected:**
- First story in the project, establishing baseline structure
- Following Next.js 14 best practices and ShadCN conventions
- Structure supports future features (API routes, database integration)

**Rationale for Structure:**
- Next.js App Router enables React Server Components (better performance)
- ShadCN copy-paste pattern gives full component control (no npm bloat)
- Separation of UI components (`/components/ui`) from feature components (`/components`) enables clear organization

[Source: docs/tech-spec-epic-combined.md#Core Components]

### References

**Technical Specifications:**
- [System Architecture](docs/tech-spec-epic-combined.md#System-Architecture-Alignment) - Next.js monolithic architecture with serverless API routes
- [Frontend Dependencies](docs/tech-spec-epic-combined.md#Frontend-Dependencies) - Complete dependency list with versions
- [Deployment Configuration](docs/tech-spec-epic-combined.md#External-Services) - Vercel hosting and CI/CD setup
- [Testing Strategy](docs/tech-spec-epic-combined.md#Test-Strategy-Summary) - Testing frameworks and approach

**Requirements:**
- [Epic 1 Overview](docs/epics.md#Epic-1-Project-Foundation--Template-Management) - Foundation goals and value delivery
- [Story 1.1 Definition](docs/epics.md#Story-11-Project-Infrastructure-Setup) - User story and acceptance criteria
- [PRD Goals](docs/PRD.md#Goals-and-Background-Context) - Project objectives and background

## Dev Agent Record

### Context Reference

- [Story Context 1.1](story-context-1.1.xml) - Generated 2025-10-19

### Agent Model Used

<!-- To be filled during implementation -->

### Debug Log References

<!-- To be added during implementation -->

### Completion Notes List

<!-- To be added during implementation -->

### File List

<!-- To be added during implementation -->
