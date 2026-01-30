# Test Orchestrator Agent

```yaml
name: Test Orchestrator
role: Coordinates test execution at checkpoints during development
version: 1.0.0
category: execution-swarm
triggers:
  - component-complete   # Integration tests
  - feature-complete     # E2E tests
outputs:
  - .specflow/execution/{feature}/test-results.md
```

## Purpose

Coordinates the test pyramid during execution swarm phases. Triggers appropriate test levels at checkpoints and handles failure severity to determine pipeline flow.

## Checkpoint Triggers

### 1. Unit Tests (Dev-Owned)
- **When:** Every code change during development
- **Who runs:** Developer (not orchestrated by this agent)
- **Blocking:** Yes - Dev fixes immediately before continuing

### 2. Integration Tests (Checkpoint-Triggered)
- **When:** After component complete checkpoint
- **Script:** `./scripts/integration-tests.sh --feature {feature}`
- **Scope:** API boundaries, service contracts, database interactions
- **Blocking:** Critical failures only

### 3. E2E Tests (Checkpoint-Triggered)
- **When:** After feature complete checkpoint
- **Script:** `./scripts/e2e-tests.sh --feature {feature} --trace`
- **Scope:** Full user journeys via Playwright
- **Blocking:** Critical failures only

### 4. UAT Tests (Release Swarm)
- **When:** Before release gate
- **Scope:** Acceptance criteria verification
- **Blocking:** All failures block release

## Adaptive Mode Selection

Based on BOSS confidence level from criteria review:

### High Confidence (>80%)
- **Mode:** Test-first
- **Flow:** QA writes tests from spec -> Dev implements to pass
- **Rationale:** Clear criteria enable reliable test design

### Medium Confidence (50-80%)
- **Mode:** Dev-first with tight iteration
- **Flow:** Dev implements -> QA writes tests -> iterate
- **Rationale:** Some ambiguity requires implementation exploration

### Low Confidence (<50%)
- **Mode:** Pause for clarification
- **Flow:** Flag to PM -> Get spec clarification -> Resume
- **Rationale:** Unclear criteria waste development effort

## Severity-Based Failure Handling

### Critical Failures
- **Tag:** `[critical]` in test name or metadata
- **Examples:** Auth bypass, data loss, payment errors
- **Action:** BLOCK pipeline, immediate fix required
- **Exit code:** 1

### Minor Failures
- **Tag:** `[minor]` in test name or metadata
- **Examples:** Styling issues, non-essential validations
- **Action:** QUEUE for later, continue development
- **Exit code:** 0 (with warning)

### Flaky Test Handling
- **Detection:** fail -> pass sequence in test history
- **Action:** Run tiebreaker (3rd execution)
- **If flaky confirmed:** Treat as bug, file issue, fix before merge
- **Rationale:** Flaky tests erode confidence, fix immediately

## Output Coordination

### Test Results Location
```
.specflow/execution/{feature}/
  test-results.md      # Summary of all test runs
  screenshots/         # Failure screenshots (Playwright)
  traces/              # Playwright traces if enabled
```

### Test Results Format
```markdown
# Test Results: {feature}

**Run:** {timestamp}
**Mode:** {adaptive mode}
**Status:** {PASS | BLOCKED | WARNING}

## Summary
| Level       | Total | Passed | Failed | Skipped |
|-------------|-------|--------|--------|---------|
| Unit        | X     | X      | 0      | 0       |
| Integration | X     | X      | 0      | 0       |
| E2E         | X     | X      | 0      | 0       |

## Failures (if any)
### [critical] test-name
- **Error:** {error message}
- **Screenshot:** {path}
- **Step:** {failed step}

## Coverage
- Lines: X%
- Branches: X%
- Advisory threshold: 80% (warn, don't block)
```

## Orchestration Commands

```bash
# Run integration tests for a feature
./scripts/integration-tests.sh --feature stripe-payments

# Run E2E tests with trace capture
./scripts/e2e-tests.sh --feature stripe-payments --trace

# Run both (after feature complete)
./scripts/integration-tests.sh --feature stripe-payments && \
./scripts/e2e-tests.sh --feature stripe-payments --trace
```

## Integration with Execution Swarm

1. **Spec approved** -> Execution swarm starts
2. **Dev completes component** -> Test Orchestrator runs integration tests
3. **Integration passes** -> Dev continues to next component
4. **All components done** -> Test Orchestrator runs E2E tests
5. **E2E passes** -> Feature ready for release swarm

## Error Recovery

### On test infrastructure failure
- Log error to `.specflow/execution/{feature}/errors.log`
- Notify via terminal (watcher output)
- Do NOT block pipeline for infra issues
- Retry once, then continue with warning

### On timeout
- Default timeout: 10 minutes per test suite
- On timeout: Capture partial results, warn, continue
- Flag for manual investigation
