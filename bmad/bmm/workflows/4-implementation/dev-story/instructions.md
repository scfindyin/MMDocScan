# Develop Story - Workflow Instructions

```xml
<critical>The workflow execution engine is governed by: {project_root}/bmad/core/tasks/workflow.xml</critical>
<critical>You MUST have already loaded and processed: {installed_path}/workflow.yaml</critical>
<critical>Communicate all responses in {communication_language} and language MUST be tailored to {user_skill_level}</critical>
<critical>Generate all documents in {document_output_language}</critical>
<critical>Only modify the story file in these areas: Tasks/Subtasks checkboxes, Dev Agent Record (Debug Log, Completion Notes), File List, Change Log, and Status</critical>
<critical>Execute ALL steps in exact order; do NOT skip steps</critical>
<critical>If {{run_until_complete}} == true, run non-interactively: do not pause between steps unless a HALT condition is reached or explicit user approval is required for unapproved dependencies.</critical>
<critical>Absolutely DO NOT stop because of "milestones", "significant progress", or "session boundaries". Continue in a single execution until the story is COMPLETE (all ACs satisfied and all tasks/subtasks checked) or a HALT condition is triggered.</critical>
<critical>Do NOT schedule a "next session" or request review pauses unless a HALT condition applies. Only Step 6 decides completion.</critical>

<critical>User skill level ({user_skill_level}) affects conversation style ONLY, not code updates.</critical>

<workflow>

  <step n="1" goal="Load story from status file IN PROGRESS section">
    <invoke-workflow path="{project-root}/bmad/bmm/workflows/workflow-status">
      <param>mode: data</param>
      <param>data_request: next_story</param>
    </invoke-workflow>

    <check if="status_exists == true AND in_progress_story != ''">
      <action>Use IN PROGRESS story from status:</action>
      - {{in_progress_story}}: Current story ID
      - Story file path derived from ID format

      <critical>DO NOT SEARCH - status file provides exact story</critical>

      <action>Determine story file path from in_progress_story ID</action>
      <action>Set {{story_path}} = {story_dir}/{{derived_story_file}}</action>
    </check>

    <check if="status_exists == false OR in_progress_story == ''">
      <action>Fall back to legacy auto-discovery:</action>
      <action>If {{story_path}} explicitly provided → use it</action>
      <action>Otherwise list story-*.md files from {{story_dir}}, sort by modified time</action>
      <ask optional="true" if="{{non_interactive}} == false">Select story or enter path</ask>
      <action if="{{non_interactive}} == true">Auto-select most recent</action>
    </check>

    <action>Read COMPLETE story file from {{story_path}}</action>
    <action>Parse sections: Story, Acceptance Criteria, Tasks/Subtasks, Dev Notes, Dev Agent Record, File List, Change Log, Status</action>
    <action>Identify first incomplete task (unchecked [ ]) in Tasks/Subtasks</action>

    <check>If no incomplete tasks → <goto step="6">Completion sequence</goto></check>
    <check>If story file inaccessible → HALT: "Cannot develop story without access to story file"</check>
    <check>If task requirements ambiguous → ASK user to clarify or HALT</check>
  </step>

  <step n="2" goal="Plan and implement task">
    <action>Review acceptance criteria and dev notes for the selected task</action>
    <action>Plan implementation steps and edge cases; write down a brief plan in Dev Agent Record → Debug Log</action>
    <action>Implement the task COMPLETELY including all subtasks, following architecture patterns and coding standards in this repo</action>
    <action>Handle error conditions and edge cases appropriately</action>
    <check>If unapproved dependencies are needed → ASK user for approval before adding</check>
    <check>If 3 consecutive implementation failures occur → HALT and request guidance</check>
    <check>If required configuration is missing → HALT: "Cannot proceed without necessary configuration files"</check>
    <check>If {{run_until_complete}} == true → Do not stop after partial progress; continue iterating tasks until all ACs are satisfied or a HALT condition triggers</check>
    <check>Do NOT propose to pause for review, standups, or validation until Step 6 gates are satisfied</check>
  </step>

  <step n="3" goal="Author comprehensive tests">
    <action>Create unit tests for business logic and core functionality introduced/changed by the task</action>
    <action>Add integration tests for component interactions where applicable</action>
    <action>Include end-to-end tests for critical user flows if applicable</action>
    <action>Cover edge cases and error handling scenarios noted in the plan</action>
  </step>

  <step n="4" goal="Run validations and tests">
    <action>Determine how to run tests for this repo (infer or use {{run_tests_command}} if provided)</action>
    <action>Run all existing tests to ensure no regressions</action>
    <action>Run the new tests to verify implementation correctness</action>
    <action>Run linting and code quality checks if configured</action>
    <action>Validate implementation meets ALL story acceptance criteria; if ACs include quantitative thresholds (e.g., test pass rate), ensure they are met before marking complete</action>
    <check>If regression tests fail → STOP and fix before continuing</check>
    <check>If new tests fail → STOP and fix before continuing</check>
  </step>

  <step n="5" goal="Mark task complete and update story">
    <action>ONLY mark the task (and subtasks) checkbox with [x] if ALL tests pass and validation succeeds</action>
    <action>Update File List section with any new, modified, or deleted files (paths relative to repo root)</action>
    <action>Add completion notes to Dev Agent Record if significant changes were made (summarize intent, approach, and any follow-ups)</action>
    <action>Append a brief entry to Change Log describing the change</action>
    <action>Save the story file (DO NOT COMMIT - batching for final commit)</action>
    <check>Determine if more incomplete tasks remain</check>
    <check>If more tasks remain → <goto step="1">Next task</goto></check>
    <check>If no tasks remain → <goto step="6">Completion</goto></check>
  </step>

  <step n="6" goal="Story completion sequence">
    <action>Verify ALL tasks and subtasks are marked [x] (re-scan the story document now)</action>
    <action>Run the full regression suite (do not skip)</action>
    <action>Confirm File List includes every changed file</action>
    <action>Execute story definition-of-done checklist, if the story includes one</action>
    <action>Update the story Status to: Ready for Review</action>
    <action>Save the story file (DO NOT COMMIT - batching for final commit)</action>
    <check>If any task is incomplete → Return to step 1 to complete remaining work (Do NOT finish with partial progress)</check>
    <check>If regression failures exist → STOP and resolve before completing</check>
    <check>If File List is incomplete → Update it before completing</check>
  </step>

  <step n="7" goal="Validation and handoff" optional="true">
    <action>Optionally run the workflow validation task against the story using {project-root}/bmad/core/tasks/validate-workflow.xml</action>
    <action>Prepare a concise summary in Dev Agent Record → Completion Notes</action>
    <action>Communicate that the story is Ready for Review</action>
  </step>

  <step n="8" goal="Update status file on completion">
    <action>Search {output_folder}/ for files matching pattern: bmm-workflow-status.md</action>
    <action>Find the most recent file (by date in filename)</action>

    <check if="status file exists">
      <action>Read the current status file</action>
      <action>Update CURRENT_WORKFLOW to: dev-story</action>
      <action>DO NOT move story from IN_PROGRESS - leave it there with "Ready for Review" status</action>
      <action>Update NEXT_ACTION to: "Story {{current_story_id}} implementation complete and ready for review. Run story-approved workflow when Definition of Done is verified."</action>
      <action>Update NEXT_COMMAND to: "Run story-approved workflow to mark story done and advance queue"</action>
      <action>Increment status version number</action>
      <action>Save the status file (DO NOT COMMIT - batching for final commit)</action>
      <critical>Story remains IN_PROGRESS until story-approved workflow is run</critical>
    </check>

    <check if="status file not found">
      <output>Note: No status file found - running in standalone mode</output>
    </check>
  </step>

  <step n="9" goal="Commit all changes in single atomic operation" critical="true">
    <critical>DEPLOYMENT DEPENDENCY CHECK - ALWAYS VERIFY BEFORE COMMIT:</critical>
    <check>If any ShadCN components were installed (npx shadcn add), ensure package.json and package-lock.json are modified and staged</check>
    <check>Run 'git status' to verify no package.json/package-lock.json changes are unstaged</check>
    <check>If new npm packages were installed, verify they appear in package.json dependencies</check>
    <action if="package.json or package-lock.json have unstaged changes">STOP and stage these files - Vercel deployment will fail without them</action>

    <action>Stage ALL modified files in a single git add command:</action>
    - Implementation code files (new/modified source code)
    - Story file ({{story_path}})
    - Status file (bmm-workflow-status.md) if it exists
    - **package.json and package-lock.json** (CRITICAL for Vercel deployment if modified)
    - Any other documentation or configuration files modified during implementation

    <action>Create ONE comprehensive commit with message format:</action>
    ```
    Implement Story {{current_story_id}}: {{story_title}}

    Implementation:
    - [List key implementation changes]
    - [List files created/modified]

    Story Updates:
    - All tasks marked complete (X task groups, Y subtasks)
    - Updated Dev Agent Record with completion notes
    - Status: Ready for Review

    Workflow Status:
    - Story {{current_story_id}} remains IN_PROGRESS (Ready for Review)
    - Awaiting story-approved workflow to mark done and advance queue

    All acceptance criteria verified and passing.

    🤖 Generated with [Claude Code](https://claude.com/claude-code)

    Co-Authored-By: Claude <noreply@anthropic.com>
    ```

    <action>Push ONCE to origin/main to trigger single Vercel deployment</action>

    <critical>This single commit/push replaces multiple separate commits, reducing Vercel deployments from 3+ to 1</critical>

    <output>**✅ Story Implementation Complete, {user_name}!**

**Story Details:**
- Story ID: {{current_story_id}}
- Title: {{current_story_title}}
- File: {{story_path}}
- Status: Ready for Review

**All Changes Committed:**
- ✅ Implementation code committed
- ✅ Story file updated with completion notes
- ✅ Workflow status file updated
- ✅ Single push to trigger deployment

**Next Steps:**
1. Review the implemented story and test the changes
2. Verify all acceptance criteria are met
3. When satisfied, run `story-approved` to mark story complete and advance the queue

Or check status anytime with: `workflow-status`
    </output>
  </step>

</workflow>
```
