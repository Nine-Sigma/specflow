# /sf:qa - Quality Assurance

Wraps BMAD `/qa` with SpecFlow file protocol and test plan execution.

## Usage

```
/sf:qa
/sf:qa <testing-focus>
```

## File Protocol

<required_reading>
Before starting work, read in order:

1. `.specflow/STATE.md` - Get current feature slug
2. `.specflow/features/{slug}/1-spec.md` - Acceptance criteria to verify
3. `.specflow/features/{slug}/5-test-plan.md` - Test plan to implement
4. `.specflow/features/{slug}/6-dev-output.md` - Dev implementation to test (if exists)

Replace {slug} with the feature slug from STATE.md.
</required_reading>

<constraints>
From required reading:

**Acceptance Criteria (from 1-spec.md):**
- [List all AC-XX items that must be verified]

**Test Coverage (from 5-test-plan.md):**
- [Test types required: unit, integration, e2e]
- [Coverage expectations]
- [Priority tests]

**Implementation Notes (from 6-dev-output.md):**
- [How dev implemented features]
- [Edge cases identified by dev]
- [Testing notes from dev]
</constraints>

<output>
After completing testing:

1. Write summary to `.specflow/features/{slug}/7-qa-output.md`
2. Append to `.specflow/features/{slug}/PROGRESS.md`:
   ```
   ## {timestamp} - QA (/sf:qa)

   **Work Done:**
   - [Tests written/executed]
   - [Coverage achieved]

   **Output:** `7-qa-output.md`

   **Constraints Honored:**
   - [Coverage]: {tests per 5-test-plan.md requirements}
   - [Criteria]: {AC-XX items verified}

   ---
   ```
3. Update `.specflow/STATE.md`:
   - last-agent: qa
   - next-agent: pm-review
   - phase: review
</output>

## Output Format (7-qa-output.md)

```markdown
---
agent: qa
created: {iso-timestamp}
depends_on: ["1-spec.md", "5-test-plan.md", "6-dev-output.md"]
status: draft
---

# {Feature Name} QA Report

## Summary

{2-3 sentence summary of testing results}

## Test Results

| Test | Type | Status | Notes |
|------|------|--------|-------|
| AC-01 | {unit/integration} | {PASS/FAIL} | {notes} |
| AC-02 | {unit/integration} | {PASS/FAIL} | {notes} |

## Coverage Report

- Unit tests: {X}% of functions
- Integration tests: {X}% of endpoints
- E2E tests: {N} scenarios

## Gherkin Execution

| Scenario | Status | Notes |
|----------|--------|-------|
| {scenario name} | {PASS/FAIL} | {notes} |

## Issues Found

| Issue | Severity | Related AC | Description |
|-------|----------|------------|-------------|
| {issue} | {H/M/L} | AC-XX | {description} |

## Recommendations

- {For PM: approve/revise/escalate recommendation}
- {Any concerns about implementation}

## Files Modified

| File | Change |
|------|--------|
| {test file path} | {description} |
```

## Parallel Execution

When invoked by PM orchestrator:
- QA may work in parallel with Dev
- QA writes tests from 5-test-plan.md
- QA can run tests before dev-output exists (against spec)
- Final verification after dev completes

## Scope Enforcement

QA can only modify test files:
- `tests/**`
- `__tests__/**`
- `*.test.*`
- `*.spec.*`
- `test-data/**`
- `fixtures/**`
- `*.feature`

Source code changes require handoff to Dev.

## BOSS Validation

Ensures all criteria are:
- **B**inary: Pass/fail
- **O**bservable: Verifiable by running code
- **S**pecific: Exact values
- **S**cope-bound: This feature only

## Related

- `/qa` - Original BMAD qa
- `/sf:dev` - Development (may run in parallel)
- `/sf:tea` - Test plan author (5-test-plan.md)
- `/sf:pm` - PM orchestrator
