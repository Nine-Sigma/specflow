# /sf:dev-story - Develop a Single Story

<!-- Requirements: WRK-16, WRK-17, WRK-18, WRK-19 -->

Implements a single story from sprint-status.yaml with TDD workflow and completion tracking.

## Usage

```
/sf:dev-story <story-id>
/sf:dev-story 1-1-auth-setup
```

## SpecFlow Context

**Required Reading:**
1. `.specflow/STATE.md` - Current feature
2. `.specflow/features/{slug}/sprint-status.yaml` - Work tracker
3. `.specflow/features/{slug}/stories/{story-id}.md` - Story to implement
4. `.specflow/features/{slug}/5-requirements-lock.md` - Source requirements
5. `.specflow/features/{slug}/2-architecture.md` - Architecture context

## Workflow

### Step 1: Load Story (WRK-16)

```
1. Parse story-id from command argument
2. Read story file: .specflow/features/{slug}/stories/{story-id}.md
3. Parse frontmatter for:
   - depends_on: Verify all dependencies are done
   - parallel_safe: Note for PM tracking
   - estimated_points: Set expectations
   - test_command: REQUIRED - command to run tests
4. Read acceptance criteria section
5. Read technical context section
```

**Dependency Check:**

Before starting implementation:
```
for dep_id in story.depends_on:
  dep_story = find_story_in_sprint_status(dep_id)
  if dep_story.status != 'done':
    ERROR: "Cannot start {story-id}: dependency {dep_id} not complete"
    return
```

**Test Command Validation:**

```python
test_command = story.frontmatter.get("test_command")

if not test_command:
    # Try to detect from project
    test_command = detect_test_command()

    if not test_command:
        ERROR: "No test_command in story and cannot detect test runner."
        ERROR: "Add test_command to story frontmatter, e.g.:"
        ERROR: "  test_command: 'npm test src/lib/redis.test.ts'"
        return

# Store for TDD workflow
ACTIVE_TEST_COMMAND = test_command
```

**Auto-Detection Fallback:**

```python
def detect_test_command():
    if exists("package.json"):
        pkg = read_json("package.json")
        scripts = pkg.get("scripts", {})

        # Check for test script
        if "test" in scripts:
            if "vitest" in scripts["test"]:
                return "npx vitest {test_file}"
            if "jest" in scripts["test"]:
                return "npm test -- {test_file}"
            return "npm test"

    if exists("pytest.ini") or exists("pyproject.toml"):
        return "pytest {test_file}"

    return None  # Cannot detect
```

### Step 2: Update Status to In-Progress

Update sprint-status.yaml:
```yaml
stories:
  - id: 1-1-auth-setup
    status: in-progress  # Was: pending
    started_at: {iso-timestamp}
```

### Step 3: TDD Implementation with Test Verification

Follow TDD flow from acceptance criteria:

```
For each acceptance criterion (AC-01, AC-02, ...):

  1. **Write test for criterion (RED)**
     - Create test file if not exists
     - Add test case for this AC
     - Comment: // AC-{N}: {criterion text}

  2. **Run test - MUST fail (verify RED)**
     ```bash
     {test_command}  # e.g., npm test src/lib/redis.test.ts
     ```

     **Verify failure:**
     - Test command must exit with non-zero status
     - Output should show failing test
     - If test PASSES before implementation:
       ERROR: "Test passes before implementation - test may be wrong"
       Review test logic before proceeding

     **Capture RED evidence:**
     ```
     RED_EVIDENCE = {
       test_file: "{test_file}",
       failing_test: "{test_name}",
       error: "{error_message}",
       timestamp: "{iso}"
     }
     ```

  3. **Implement minimal code (GREEN)**
     - Write just enough code to pass the test
     - No extra features, no optimization

  4. **Run test - MUST pass (verify GREEN)**
     ```bash
     {test_command}
     ```

     **Verify success:**
     - Test command must exit with zero status
     - Output should show passing test
     - If test FAILS after implementation:
       ERROR: "Test still failing. Debug before marking AC complete."
       Do NOT proceed until test passes.

     **Capture GREEN evidence:**
     ```
     GREEN_EVIDENCE = {
       test_file: "{test_file}",
       passing_tests: {count},
       failing_tests: 0,
       output_snippet: "{relevant output}",
       timestamp: "{iso}"
     }
     ```

  5. **Refactor if needed** (optional)
     - Clean up code
     - Re-run tests to ensure still passing

  6. **Mark criterion done WITH test evidence**
     In story file, update:
     ```markdown
     - [x] AC-01: {criterion} ✓
       - Test: `src/lib/redis.test.ts::should connect to redis`
       - Evidence: 3 tests passed, 0 failed (2026-02-05T14:30:00Z)
     ```
```

**Test Evidence Format:**

Each completed AC must include:
- Test file and test name
- Pass count (must be > 0)
- Fail count (must be 0)
- Timestamp of passing run

**Example Story File After TDD:**

```markdown
## Acceptance Criteria

- [x] AC-01: Redis client connects using environment URL ✓
  - Test: `src/lib/redis.test.ts::should connect to redis`
  - Evidence: 3 tests passed, 0 failed (2026-02-05T14:30:00Z)

- [x] AC-02: Connection handles AUTH from env var ✓
  - Test: `src/lib/redis.test.ts::should authenticate`
  - Evidence: 4 tests passed, 0 failed (2026-02-05T14:45:00Z)

- [x] AC-03: Graceful connection close ✓
  - Test: `src/lib/redis.test.ts::should close cleanly`
  - Evidence: 5 tests passed, 0 failed (2026-02-05T15:00:00Z)
```

**Criteria Markers in Code:**

Add traceability comments:
```typescript
// STORY: 1-1-auth-setup
// AC-01: Email validates against RFC 5322
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
```

### Step 4: Update Story File During Work

As criteria are implemented, update story file:
```markdown
## Acceptance Criteria

- [x] AC-01: Email field accepts valid email format
- [x] AC-02: Password field masks input
- [ ] AC-03: Submit button disabled until valid
```

Add implementation notes:
```markdown
## Dev Notes

- Used zod for email validation (more robust than regex)
- Password visibility toggle added per UX feedback
- Submit button uses form validity API
```

### Step 5: Mark Story Done (WRK-17)

**BEFORE marking done, validate test evidence:**

```python
def validate_completion(story):
    for ac in story.acceptance_criteria:
        if ac.status != "done":
            ERROR: f"AC-{ac.id} not marked complete"
            return False

        if not ac.test_evidence:
            ERROR: f"AC-{ac.id} missing test evidence"
            ERROR: "Run tests and capture output before marking done"
            return False

        if ac.test_evidence.failing_tests > 0:
            ERROR: f"AC-{ac.id} has failing tests"
            return False

    return True
```

When ALL acceptance criteria complete AND validated:

1. **Run full test suite for story:**
   ```bash
   {test_command}  # Full run, not just last AC
   ```

   Capture final evidence:
   ```
   FINAL_TEST_RUN = {
     total_tests: {N},
     passed: {N},
     failed: 0,
     duration: "{X}s",
     timestamp: "{iso}"
   }
   ```

2. **Update story file:**
   ```yaml
   ---
   status: done
   completed_at: {iso-timestamp}
   final_test_run:
     total: {N}
     passed: {N}
     failed: 0
   ---
   ```

3. **Write completion to PROGRESS.md:**
   ```markdown
   ## {timestamp} - Dev (/sf:dev-story)

   **Story Complete:** 1-1-redis-client

   **Acceptance Criteria:** 5/5 passed
   **Test Evidence:** All ACs have test verification
   **Final Test Run:** 15 tests passed, 0 failed

   **Implementation Notes:** {summary from Dev Notes}
   **Files Modified:** {list}

   ---
   ```

4. **Return to PM** with test summary:
   ```
   Story 1-1-redis-client complete.
   Test Evidence: 5 ACs verified, 15 tests passing.
   Returning to PM for next story creation.
   ```

**FAIL if:**
- Any AC missing test evidence
- Any test failing in final run
- Test command not found/configured

### Step 6: PM Creates Next Story

After dev returns:
1. PM reads completion notes and learnings
2. PM creates next story (informed by implementation)
3. PM routes to `/sf:dev-story {next-id}`

This enables incremental learning (WRK-18).

## Parallel-Safe Stories (WRK-19)

Stories marked `parallel_safe: true` can theoretically run concurrently.

**Detection:**
- No file overlap with other pending stories
- No data dependency (separate models/features)
- PM verifies parallel safety when creating stories

**Current behavior:**
- Single Claude session executes sequentially
- parallel_safe flag is informational for future multi-agent scenarios
- Human developers could work parallel stories in separate sessions

**Marking Parallel Safety:**

PM sets in story frontmatter:
```yaml
---
story_id: 2-1-data-model
parallel_safe: true  # No overlap with auth epic stories
depends_on: []
---
```

## Error Handling

| Error | Response |
|-------|----------|
| Story file not found | "Story {id} not found. Check stories/ folder." |
| Story already done | "Story {id} already complete. Use --force to reimplement." |
| Dependencies not met | "Cannot start: {dep_id} must complete first." |
| Feature not in-progress | "No active feature. Run /sf:pm first." |
| No test_command | "No test_command in story. Add to frontmatter or configure project test runner." |
| Tests not passing | "Cannot complete: {N} tests failing. Fix before marking done." |

## Related Commands

- `/sf:create-story` - Create story details (PM uses this)
- `/sf:dev` - Direct development (for small scope without stories)
- `/sf:implement` - TDD loop within story
- `/sf:code-review` - After story complete
