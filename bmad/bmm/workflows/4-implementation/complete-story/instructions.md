# Complete Story Workflow Instructions

## Purpose
Automate the full story lifecycle from creation to implementation, testing, and GitHub push. This workflow orchestrates multiple agents and workflows to complete a user story end-to-end with minimal manual intervention.

## What This Workflow Does

### **Phase 1: Story Creation & Review**
1. **SM Agent** creates draft story using `create-story` workflow
2. **Architect Agent** reviews for technical feasibility and alignment
3. **If issues found:** SM Agent regenerates story with fixes (max 2 iterations)
4. **If approved:** Continue to Phase 2

### **Phase 2: Preparation**
5. **SM Agent** marks story as Ready for Development (`story-ready` workflow)
6. **SM Agent** generates Story Context XML (`story-context` workflow)

### **Phase 3: Implementation**
7. **Dev Agent** implements all tasks (`dev-story` workflow)
8. **SM Agent** tests database operations via Supabase MCP (if applicable)

### **Phase 4: Finalization**
9. **Dev Agent** pushes changes to GitHub with auto-generated commit message
10. **SM Agent** generates completion report with next steps

---

## When to Use This Workflow

**✅ Use complete-story when:**
- You want full automation from story creation to GitHub push
- The story is well-defined in epics.md with clear requirements
- You have Supabase MCP configured for database testing
- You want minimal manual intervention

**❌ Don't use complete-story when:**
- Story requirements are ambiguous (use `create-story` manually first)
- You want to review architect feedback before regenerating
- Implementation requires manual testing beyond database operations
- Story involves complex infrastructure changes requiring human oversight

---

## Execution Steps

### **Step 1: Load Workflow Configuration**

```bash
# Load this workflow file
workflow_file = "{project-root}/bmad/bmm/workflows/4-implementation/complete-story/workflow.yaml"
```

### **Step 2: Discover Next Story**

```bash
# Read workflow-status to determine next story
workflow_status_file = "{output_folder}/bmm-workflow-status.md"

# Extract:
# - TODO_STORY: Next story to work on (e.g., "3.5")
# - IN_PROGRESS_STORY: Current story (should be empty or completed)
# - Epic number and story number
```

### **Step 3: Spawn SM Agent for Story Creation**

**Agent:** `general-purpose` (acting as SM)
**Task:** Execute `create-story` workflow
**Inputs:**
- Epic number (from workflow-status)
- Story number (from workflow-status)
- Non-interactive mode: `true`

**Expected Output:**
- Story file created at `{story_dir}/story-{epic_num}.{story_num}.md`
- Story status: Draft

### **Step 4: Spawn Architect Agent for Review**

**Agent:** `architect-reviewer`
**Task:** Review story for technical feasibility
**Inputs:**
- Story file path (from Step 3)
- Tech spec file (e.g., `tech-spec-epic-{epic_num}.md`)
- Epics file (`epics.md`)

**Expected Output:**
- Review verdict: `APPROVED` or `REQUIRES CHANGES`
- List of issues (if any)
- List of recommendations

### **Step 5: Conditional - Regenerate Story (if needed)**

**Condition:** Architect verdict == `REQUIRES CHANGES`

**Agent:** `general-purpose` (acting as SM)
**Task:** Execute `create-story` workflow WITH architect feedback
**Inputs:**
- Architect feedback (from Step 4)
- Same epic/story numbers
- Overwrite existing story file

**Max Iterations:** 2
**After max iterations:** Prompt user for manual intervention

**Loop:** Return to Step 4 for architect re-review

### **Step 6: Mark Story Ready**

**Condition:** Architect verdict == `APPROVED`

**Agent:** `general-purpose` (acting as SM)
**Task:** Execute `story-ready` workflow
**Inputs:**
- Story file path (from Step 3 or Step 5)

**Expected Output:**
- Story status updated to: Ready
- Workflow-status updated

### **Step 7: Generate Story Context**

**Agent:** `general-purpose` (acting as SM)
**Task:** Execute `story-context` workflow
**Inputs:**
- Story file path

**Expected Output:**
- Story Context XML created at `{story_dir}/story-context-{epic_num}.{story_num}.xml`

### **Step 8: Implement Story**

**Agent:** `general-purpose` (acting as Dev)
**Task:** Execute `dev-story` workflow
**Inputs:**
- Story file path
- Story Context XML path

**Expected Output:**
- List of files created
- List of files modified
- Test results (pass/fail)
- Implementation status: `completed` or `blocked`

**On Failure:**
- Generate error report
- Abort workflow
- Notify user of blockers

### **Step 9: Test Database Operations (if applicable)**

**Condition:** Story involves database changes (check story tasks for migration/schema keywords)

**Agent:** `general-purpose` (acting as SM)
**Task:** Execute database tests via Supabase MCP

**Test Coverage:**
1. **RLS Policies**
   - Create second test user
   - Test SELECT (user sees only own data)
   - Test INSERT (user creates for self only)
   - Test UPDATE (cross-user blocked)
   - Test DELETE (cross-user blocked)

2. **Migration Verification**
   - Execute migration SQL via `mcp__supabase__apply_migration`
   - Verify schema changes via `mcp__supabase__list_tables`
   - Check data integrity with sample queries

3. **Security Advisors**
   - Run `mcp__supabase__get_advisors` with type: `security`
   - Check for RLS disabled warnings
   - Verify no new critical issues

**Expected Output:**
- Test results: Pass/fail for each test
- Security advisor summary
- Data migration stats (rows affected, etc.)

**On Failure:**
- Report failed tests
- Continue to Step 10 (do not abort)

### **Step 10: Push to GitHub**

**Condition:** Implementation status == `completed` AND auto_push_to_github == `true`

**Agent:** `general-purpose` (acting as Dev)
**Task:** Git commit and push

**Commit Message Format:**
```
Implement Story {epic_num}.{story_num}: {story_title}

{Summary of changes}

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Commands:**
```bash
git add .
git commit -m "{commit_message}"
git push
```

**On Failure:**
- Report git errors
- Continue to Step 11 (do not abort)
- User can manually push later

### **Step 11: Generate Completion Report**

**Agent:** `general-purpose` (acting as SM)
**Task:** Summarize workflow execution

**Report Sections:**
1. **Story Summary**
   - Story ID, title, status
   - Architect review iterations (if any)

2. **Implementation Summary**
   - Files created (count + list)
   - Files modified (count + list)
   - Tests run (count + results)

3. **Database Testing** (if applicable)
   - Migration status
   - RLS policy test results
   - Security advisor findings

4. **Git Status**
   - Commit hash (if pushed)
   - Push status (success/failed)

5. **Next Steps**
   - If all passed: "Run `*approve-story` workflow to complete Story {epic_num}.{story_num}"
   - If blocked: "Review errors and fix issues before approval"
   - If manual testing needed: "Perform manual testing, then run `*approve-story`"

**Output File:** `{output_folder}/complete-story-report-{epic_num}.{story_num}.md`

---

## Error Handling

### **Story Creation Fails**
- **Action:** Abort workflow
- **Reason:** Cannot proceed without story
- **User Action:** Check epics.md for valid story definition, re-run workflow

### **Architect Rejects After Max Iterations**
- **Action:** Pause workflow, prompt user
- **Reason:** Story has fundamental issues requiring human review
- **User Action:** Manually review architect feedback, edit story, re-run from Step 2

### **Implementation Blocked**
- **Action:** Abort workflow, generate report
- **Reason:** Dev agent encountered errors or missing dependencies
- **User Action:** Review implementation errors, fix blockers, re-run `dev-story` workflow

### **Database Tests Fail**
- **Action:** Report failures, continue to GitHub push
- **Reason:** Tests may fail due to environment issues, not blocking
- **User Action:** Review test failures, fix database issues, re-test manually

### **Git Push Fails**
- **Action:** Report error, continue to completion report
- **Reason:** Git errors (conflicts, auth issues) don't invalidate implementation
- **User Action:** Manually resolve git issues and push

---

## Configuration Options

### **max_architect_iterations**
- **Default:** 2
- **Description:** Maximum times to regenerate story based on architect feedback
- **When to increase:** Complex stories with many integration points
- **When to decrease:** Simple CRUD stories with clear requirements

### **enable_database_testing**
- **Default:** `true`
- **Description:** Use Supabase MCP to test database operations
- **When to disable:** Story doesn't involve database changes, or Supabase MCP not available

### **auto_push_to_github**
- **Default:** `true`
- **Description:** Automatically push successful implementations to GitHub
- **When to disable:** Want to manually review changes before pushing

### **skip_manual_approval**
- **Default:** `false`
- **Description:** Skip `story-ready` workflow (story goes directly from Draft to implementation)
- **When to enable:** Full automation with no human approval gates

---

## Prerequisites

### **Required:**
1. ✅ Workflow-status file exists at `{output_folder}/bmm-workflow-status.md`
2. ✅ Epics file exists at `{output_folder}/epics.md`
3. ✅ Tech spec exists for current epic (e.g., `tech-spec-epic-3.md`)
4. ✅ Git repository initialized with remote configured

### **Optional:**
5. ⚠️ Supabase MCP configured (for database testing)
6. ⚠️ Solution architecture file exists (improves story quality)
7. ⚠️ Previous stories completed (for integration context)

---

## Example Execution

### **Scenario:** Complete Story 3.5 from scratch

```yaml
# User runs: *complete-story

# Workflow execution:
Step 1: SM creates story-3.5.md (Draft)
  ✅ Story file: docs/stories/story-3.5.md
  ✅ Status: Draft

Step 2: Architect reviews story-3.5.md
  ❌ Verdict: REQUIRES CHANGES
  ⚠️ Issues: 3 critical issues found

Step 3: SM regenerates story-3.5.md with architect feedback
  ✅ Story file: docs/stories/story-3.5.md (overwritten)
  ✅ Status: Draft v2

Step 2 (iteration 2): Architect re-reviews story-3.5.md
  ✅ Verdict: APPROVED
  ✅ All issues resolved

Step 4: SM marks story-3.5.md as Ready
  ✅ Status: Ready
  ✅ Workflow-status updated

Step 5: SM generates story-context-3.5.xml
  ✅ Context file: docs/stories/story-context-3.5.xml (279 lines)

Step 6: Dev implements story-3.5
  ✅ Files created: 5
  ✅ Files modified: 8
  ✅ Build passed
  ✅ Status: completed

Step 7: SM tests database operations
  ✅ Migration executed
  ✅ RLS policies tested (all passed)
  ✅ Security advisors: 0 new issues

Step 8: Dev pushes to GitHub
  ✅ Commit: a1b2c3d "Implement Story 3.5: Save Template Flow"
  ✅ Pushed to origin/main

Step 9: SM generates completion report
  ✅ Report: docs/complete-story-report-3.5.md
  ✅ Next action: Run *approve-story workflow

# Total time: ~15 minutes (fully automated)
```

---

## Troubleshooting

### **"No story found in workflow-status"**
- **Solution:** Check `TODO_STORY` field in workflow-status.md is populated

### **"Architect keeps rejecting story"**
- **Solution:** After 2 iterations, manually review epics.md and tech spec for clarity

### **"Dev agent reports blockers"**
- **Solution:** Check implementation errors, install missing dependencies, re-run workflow

### **"Database tests fail"**
- **Solution:** Verify Supabase MCP connection, check migration SQL syntax

### **"Git push fails with conflicts"**
- **Solution:** Pull latest changes, resolve conflicts, manually push

---

## Success Criteria

**Workflow is successful if:**
1. ✅ Story created and approved by architect
2. ✅ Story marked as Ready
3. ✅ Implementation completed with no blockers
4. ✅ Database tests passed (if applicable)
5. ✅ Changes pushed to GitHub
6. ✅ Completion report generated

**Partial success if:**
- ⚠️ Implementation completed but database tests failed
- ⚠️ Implementation completed but git push failed

**Failure if:**
- ❌ Story creation failed
- ❌ Architect rejected after max iterations
- ❌ Implementation blocked with errors

---

## Future Enhancements

### **Planned Improvements:**
1. **Frontend Testing:** Add Playwright tests for UI changes
2. **Performance Testing:** Benchmark API endpoints before/after
3. **Security Scanning:** Integrate OWASP dependency check
4. **Deployment:** Auto-deploy to staging after successful tests
5. **Notifications:** Slack/email alerts on workflow completion
6. **Rollback:** Auto-rollback if production tests fail

---

## Related Workflows

- **create-story:** Story creation only (no architect review)
- **dev-story:** Implementation only (assumes story is ready)
- **story-context:** Context generation only
- **approve-story:** Final approval and status update (run after complete-story)
