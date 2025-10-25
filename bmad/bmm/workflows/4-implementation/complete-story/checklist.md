# Complete Story Workflow Validation Checklist

## Pre-Execution Validation

### **Prerequisites Check**
- [ ] Workflow-status file exists at `{output_folder}/bmm-workflow-status.md`
- [ ] `TODO_STORY` field is populated in workflow-status
- [ ] Epics file exists at `{output_folder}/epics.md`
- [ ] Next story exists in epics.md with clear definition
- [ ] Tech spec exists for current epic (e.g., `tech-spec-epic-{num}.md`)
- [ ] Git repository initialized with remote configured
- [ ] Git working tree is clean (no uncommitted changes)

### **Optional Configuration**
- [ ] Supabase MCP configured (required for database testing)
- [ ] Solution architecture file exists (improves story quality)
- [ ] Previous stories in epic completed (for integration context)

---

## Phase 1: Story Creation & Review

### **Step 1: Story Creation (SM Agent)**
- [ ] SM agent loaded with config variables
- [ ] `create-story` workflow executed in non-interactive mode
- [ ] Story file created at `{story_dir}/story-{epic_num}.{story_num}.md`
- [ ] Story has valid structure (User Story, ACs, Tasks, Dev Notes)
- [ ] Story references epics.md and tech spec correctly
- [ ] Story status set to "Draft"
- [ ] Workflow-status updated with IN_PROGRESS_STORY

### **Step 2: Architect Review**
- [ ] Architect agent loaded
- [ ] Story file read successfully
- [ ] Tech spec loaded for context
- [ ] Epics.md loaded for requirements
- [ ] Review completed with verdict: APPROVED or REQUIRES CHANGES
- [ ] Issues documented (if any)
- [ ] Recommendations provided

### **Step 3: Regeneration (if needed)**
- [ ] Condition evaluated: verdict == REQUIRES CHANGES
- [ ] Architect feedback passed to SM agent
- [ ] Story regenerated with fixes incorporated
- [ ] Story file overwritten with updated version
- [ ] Iteration counter incremented
- [ ] Max iterations checked (abort if exceeded)
- [ ] Loop back to Step 2 for re-review

### **Approval Gate**
- [ ] Architect verdict: APPROVED (after 1-2 iterations max)
- [ ] All critical issues resolved
- [ ] Story ready for implementation

---

## Phase 2: Preparation

### **Step 4: Mark Story Ready**
- [ ] `story-ready` workflow executed
- [ ] Story status updated from "Draft" to "Ready"
- [ ] Workflow-status updated with NEXT_ACTION
- [ ] No errors during status update

### **Step 5: Generate Story Context**
- [ ] `story-context` workflow executed
- [ ] Story Context XML created at `{story_dir}/story-context-{epic_num}.{story_num}.xml`
- [ ] Context includes:
  - [ ] Story metadata (epic, story ID, title)
  - [ ] Task breakdown
  - [ ] Documentation artifacts (PRD, tech spec, epics)
  - [ ] Code artifacts (existing files to modify)
  - [ ] Dependency analysis
  - [ ] Development constraints
  - [ ] API interface specifications
  - [ ] Test coverage strategy
- [ ] Context file is valid XML
- [ ] Context file size reasonable (< 50KB)

---

## Phase 3: Implementation

### **Step 6: Implement Story (Dev Agent)**
- [ ] Dev agent loaded with config variables
- [ ] `dev-story` workflow executed
- [ ] Story file loaded successfully
- [ ] Story Context XML loaded successfully
- [ ] All tasks from story executed:
  - [ ] Database migrations created (if applicable)
  - [ ] API endpoints implemented (if applicable)
  - [ ] Validation schemas created (if applicable)
  - [ ] Types/interfaces updated
  - [ ] Business logic implemented
  - [ ] Error handling implemented
  - [ ] Tests created (unit/integration)
- [ ] Build succeeded (TypeScript compilation)
- [ ] Lint passed (or warnings acceptable)
- [ ] Implementation status: "completed" (not "blocked")

### **Step 7: Database Testing (if applicable)**

#### **Condition Check**
- [ ] Story involves database changes (migration file created OR schema changes)
- [ ] Supabase MCP connection active
- [ ] `enable_database_testing` == true

#### **Migration Testing**
- [ ] Migration SQL syntax validated
- [ ] Migration executed via `mcp__supabase__apply_migration`
- [ ] Migration succeeded without errors
- [ ] Schema changes verified via `mcp__supabase__list_tables`
- [ ] Expected columns exist with correct types
- [ ] Constraints created (UNIQUE, FK, NOT NULL)
- [ ] Indexes created

#### **RLS Policy Testing**
- [ ] Second test user created for cross-user tests
- [ ] **SELECT Policy:**
  - [ ] User 1 can SELECT own data
  - [ ] User 2 cannot SELECT User 1's data
- [ ] **INSERT Policy:**
  - [ ] User can INSERT with own user_id
  - [ ] User cannot INSERT with different user_id (if applicable)
- [ ] **UPDATE Policy:**
  - [ ] User can UPDATE own data
  - [ ] User 2 cannot UPDATE User 1's data
- [ ] **DELETE Policy:**
  - [ ] User can DELETE own data
  - [ ] User 2 cannot DELETE User 1's data

#### **Data Migration Testing** (if migrating data)
- [ ] Existing data backed up
- [ ] Data transformation executed
- [ ] Row counts match (source vs destination)
- [ ] Sample data verified (spot check 5-10 rows)
- [ ] No data loss
- [ ] Rollback script available and tested

#### **Security Advisors**
- [ ] `mcp__supabase__get_advisors` executed with type: security
- [ ] No new ERROR-level issues introduced
- [ ] WARN-level issues reviewed and acceptable
- [ ] RLS enabled on all public tables

---

## Phase 4: Finalization

### **Step 8: Push to GitHub**

#### **Pre-Push Validation**
- [ ] Implementation status == "completed"
- [ ] `auto_push_to_github` == true
- [ ] Git working tree has changes to commit
- [ ] No merge conflicts

#### **Commit**
- [ ] All files staged with `git add .`
- [ ] Commit message generated with:
  - [ ] Story ID and title
  - [ ] Summary of changes
  - [ ] Co-authored-by Claude tag
- [ ] Commit succeeded (hash returned)

#### **Push**
- [ ] Push to remote succeeded
- [ ] No authentication errors
- [ ] No remote conflicts
- [ ] Commit visible on GitHub

### **Step 9: Completion Report**

#### **Report Sections**
- [ ] **Story Summary:**
  - [ ] Story ID, title, epic
  - [ ] Architect review iterations
  - [ ] Final status (Ready for Approval)
- [ ] **Implementation Summary:**
  - [ ] Files created (count + list)
  - [ ] Files modified (count + list)
  - [ ] Build status
  - [ ] Test status
- [ ] **Database Testing:** (if applicable)
  - [ ] Migration status
  - [ ] RLS test results (pass/fail)
  - [ ] Security advisor findings
  - [ ] Data migration stats
- [ ] **Git Status:**
  - [ ] Commit hash
  - [ ] Push status (success/failed)
  - [ ] Branch name
- [ ] **Next Steps:**
  - [ ] Clear action for user (approve-story or fix issues)
  - [ ] List of blockers (if any)

#### **Report Output**
- [ ] Report saved to `{output_folder}/complete-story-report-{epic_num}.{story_num}.md`
- [ ] Report displayed to user
- [ ] Report is readable and actionable

---

## Success Criteria

### **Full Success (All Green)**
- [ ] ✅ Story created and approved by architect (≤ 2 iterations)
- [ ] ✅ Story marked as Ready for Development
- [ ] ✅ Story Context XML generated
- [ ] ✅ Implementation completed with no blockers
- [ ] ✅ Build passed
- [ ] ✅ Database tests passed (if applicable, 100% pass rate)
- [ ] ✅ RLS policies verified (if applicable)
- [ ] ✅ Security advisors: 0 new ERROR-level issues
- [ ] ✅ Changes committed to Git
- [ ] ✅ Changes pushed to GitHub
- [ ] ✅ Completion report generated
- [ ] ✅ Next action clear: Run `*approve-story` workflow

### **Partial Success (Some Yellow)**
- [ ] ⚠️ Story created but required 2 architect iterations
- [ ] ⚠️ Implementation completed but database tests failed
- [ ] ⚠️ Implementation completed but git push failed
- [ ] ⚠️ Build succeeded with warnings
- [ ] ⚠️ Security advisors: WARN-level issues (no ERRORs)

### **Failure (Any Red)**
- [ ] ❌ Story creation failed (missing epics/tech spec)
- [ ] ❌ Architect rejected after max iterations (fundamental issues)
- [ ] ❌ Implementation blocked with errors
- [ ] ❌ Build failed
- [ ] ❌ Database migration failed
- [ ] ❌ RLS policies don't work (data leakage)
- [ ] ❌ Security advisors: new ERROR-level issues

---

## Rollback Checklist (If Failure)

### **Before Architect Approval**
- [ ] Delete draft story file
- [ ] Reset workflow-status IN_PROGRESS_STORY to empty
- [ ] No rollback needed (no code changes yet)

### **After Implementation Started**
- [ ] Rollback database migration (use rollback script)
- [ ] Reset git changes: `git reset --hard HEAD`
- [ ] Delete story file if fundamentally flawed
- [ ] Update workflow-status to previous state
- [ ] Document failure reason in workflow-status

### **After Database Migration**
- [ ] Execute rollback script: `migrations/{num}_rollback_*.sql`
- [ ] Verify schema restored via `mcp__supabase__list_tables`
- [ ] Verify data restored (spot check)
- [ ] Document rollback in migration notes

---

## Post-Workflow Actions

### **If Successful**
1. [ ] Review completion report
2. [ ] Perform manual testing (UI, API, integration)
3. [ ] Run `*approve-story` workflow when testing passes
4. [ ] Move to next story in queue

### **If Partial Success**
1. [ ] Review issues (database tests, git push)
2. [ ] Fix blockers manually
3. [ ] Re-run failed steps individually
4. [ ] Then run `*approve-story` workflow

### **If Failed**
1. [ ] Review error logs and completion report
2. [ ] Fix fundamental issues (epics, tech spec, dependencies)
3. [ ] Manually complete failed steps
4. [ ] Re-run workflow OR complete story manually

---

## Quality Gates

### **Gate 1: Story Quality (Before Implementation)**
- Story must have ≥ 5 acceptance criteria
- Story must have ≥ 3 tasks with subtasks
- Story must reference source documents (epics, tech spec)
- Story must include dev notes with architecture patterns
- Architect must approve (verdict: APPROVED)

### **Gate 2: Code Quality (Before Push)**
- Build must succeed (TypeScript compilation)
- Lint warnings acceptable (< 10 warnings)
- No ERROR-level TypeScript errors
- Implementation status must be "completed" (not "blocked")

### **Gate 3: Security Quality (Before Approval)**
- RLS must be enabled on all public tables with user data
- Cross-user isolation must be verified (if multi-tenant)
- No new ERROR-level security advisor issues
- Passwords/secrets not committed to git

---

## Metrics & Reporting

### **Workflow Metrics**
- [ ] Total execution time: _____ minutes
- [ ] Architect iterations: _____ (target: 1-2)
- [ ] Files created: _____ (track code growth)
- [ ] Files modified: _____ (track impact)
- [ ] Lines of code added: _____ (via git diff)
- [ ] Tests created: _____ (unit + integration)

### **Database Metrics** (if applicable)
- [ ] Migration execution time: _____ seconds
- [ ] Rows migrated: _____
- [ ] RLS tests passed: _____ / _____
- [ ] Security advisor issues: _____ ERROR, _____ WARN

### **GitHub Metrics**
- [ ] Commit hash: _____
- [ ] Files in commit: _____
- [ ] Commit pushed: Yes / No
- [ ] Time to push: _____ seconds

---

## Continuous Improvement

### **After Each Workflow Execution**
- [ ] Document any manual interventions required
- [ ] Note any steps that took longer than expected
- [ ] Identify any false positives from architect review
- [ ] Suggest workflow improvements
- [ ] Update checklist with new edge cases

### **Workflow Optimization Ideas**
- Add caching for frequently used documents
- Parallelize independent steps (architect review + context generation)
- Add pre-flight checks to catch issues earlier
- Improve architect review prompt with past false positives
- Add automatic dependency installation (npm/pip)
