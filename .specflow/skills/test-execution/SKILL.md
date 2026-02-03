---
name: test-execution
description: Run tests and enforce coverage gates. Detects framework, runs affected tests with staged parallel execution, and checks scope-based coverage thresholds.
review-capable: true
report-capable: false
scope-minimum: trivial
triggers:
  files:
    - "*.test.ts"
    - "*.test.tsx"
    - "*.test.js"
    - "*.spec.ts"
    - "*.test.py"
    - "*_test.go"
    - "src/**/*"
  patterns:
    - "test\\("
    - "describe\\("
    - "it\\("
    - "expect\\("
    - "def test_"
    - "func Test"
---

# Test Execution Skill

Run automated tests and enforce coverage thresholds as part of Review.

## When to Use This Skill

- Every Review invocation (scope-minimum: trivial = always runs)
- After Dev completes implementation
- During fix loop verification

## Core Principles

### 1. Framework Detection

Detect test framework from project files:

| Indicator | Framework | Run Command |
|-----------|-----------|-------------|
| package.json + vitest | Vitest | `npm test -- --coverage --reporter=json` |
| package.json + jest | Jest | `npm test -- --coverage --json` |
| pytest.ini OR conftest.py | Pytest | `pytest --cov --cov-report=json` |
| go.mod | Go | `go test -cover -json ./...` |

### 2. Smart Test Selection

Only run tests affected by changed files (see `_bmad/expertise/test-execution/smart-selection.md`).

**Key principle:** Run only affected tests for fast feedback.

```bash
# Get changed files from 6-dev-output.md
CHANGED_FILES="src/auth.ts,src/session.ts"

# Vitest: use 'related' command (not --changed which has bugs)
vitest related $CHANGED_FILES --run --coverage
```

### 3. Staged Parallel Execution

Run tests in stages (see `_bmad/expertise/test-execution/staged-parallel.md`):

1. **Unit tests** (parallel) - fast feedback
2. **Integration tests** (parallel) - after unit passes
3. **E2E tests** (sequential) - after integration passes

**Fail fast:** If any stage fails, subsequent stages do not run.

### 4. Coverage Thresholds

Enforce scope-based coverage (see `_bmad/expertise/test-execution/coverage-thresholds.md`):

| Scope | Threshold |
|-------|-----------|
| trivial/small | Pass only |
| medium | 70% |
| large | 80% |
| complex | 90% |

Coverage is checked on **changed files only**, not the entire codebase.

### 5. Flaky Test Detection

Tests that fail intermittently waste developer time and erode trust.

**Retry strategy:**
- Retry failed tests up to 2 times
- If passes on retry: flag as FLAKY (MINOR finding)
- If fails all retries: report as failure (CRITICAL finding)

**Flaky test output:**
```markdown
| ID | Location | Issue | Severity |
|----|----------|-------|----------|
| T-03 | src/utils.test.ts:12 | Test passed on retry (flaky) | MINOR |
```

## Execution Steps

### Step 1: Detect Framework

```bash
if [ -f "package.json" ]; then
  if grep -q "vitest" package.json; then
    FRAMEWORK="vitest"
  elif grep -q "jest" package.json; then
    FRAMEWORK="jest"
  fi
elif [ -f "pytest.ini" ] || [ -f "conftest.py" ]; then
  FRAMEWORK="pytest"
elif [ -f "go.mod" ]; then
  FRAMEWORK="go"
fi
```

### Step 2: Get Changed Files

Extract from 6-dev-output.md "Files Modified" table:

```markdown
## Files Modified

| File | Action | Lines Changed |
|------|--------|---------------|
| src/auth.ts | Modified | +45, -12 |
| src/session.ts | Added | +78 |
```

Parse to: `CHANGED_FILES="src/auth.ts,src/session.ts"`

### Step 3: Run Smart Selection

```bash
# Vitest
vitest related <changed-files> --run --coverage --reporter=json

# Jest
jest --findRelatedTests <changed-files> --coverage --json

# Pytest
pytest-testmon  # or explicit test list

# Go
go test -cover -json ./...

# Fallback: run all tests if no affected tests found
npm test -- --coverage
```

### Step 4: Parse Results

Extract from JSON output:
- `total_tests`: Number of tests run
- `passed_tests`: Number passing
- `failed_tests`: Number failing
- `coverage_percent`: Line coverage percentage
- `failed_test_details`: Array of `{name, file, line, message}`

### Step 5: Check Thresholds

1. Read scope from `0-scope.md`
2. Look up threshold from table
3. Compare coverage to threshold
4. Generate finding if below

### Step 6: Generate Findings

**Test Failures -> CRITICAL:**
```markdown
| ID | Location | Issue | Severity |
|----|----------|-------|----------|
| T-01 | src/auth.test.ts:45 | Test 'should logout' failed | CRITICAL |
```

**Coverage Below Threshold -> MAJOR:**
```markdown
| ID | Location | Issue | Severity |
|----|----------|-------|----------|
| T-02 | src/auth.ts | Coverage 58% below 70% | MAJOR |
```

**Flaky Tests -> MINOR:**
```markdown
| ID | Location | Issue | Severity |
|----|----------|-------|----------|
| T-03 | src/utils.test.ts:12 | Test passed on retry (flaky) | MINOR |
```

## Output Format

```markdown
### test-execution Findings

**Test Results:**
- Framework: {framework}
- Total: {N} tests
- Passed: {N}
- Failed: {N}
- Coverage: {N}%

**Threshold Check:**
- Scope: {scope}
- Required: {threshold}%
- Actual: {coverage}%
- Status: PASS | FAIL

| ID | Location | Issue | AC Reference | Severity |
|----|----------|-------|--------------|----------|
| T-01 | file:line | {description} | AC-XX | CRITICAL |

### T-01: {Issue Title}

**What's wrong:** {explanation of the failure}

**How to fix:** {specific instructions to resolve}

**Files to change:** {list of files}
```

## Status Determination

| Findings | Status |
|----------|--------|
| All tests pass, coverage met | PASSED |
| Flaky tests only | RISKS_IDENTIFIED |
| Coverage below threshold | MAJOR_ISSUES |
| Any test failure | FAILED |

## Route Decision

All test-execution findings route to **Dev** (not QA):

- **Test failures** = code issue (Dev must fix)
- **Coverage gaps** = missing tests (Dev writes unit tests)
- **Flaky tests** = unstable code or test (Dev investigates)

Exception: If QA's TDD tests fail, Dev is still responsible (they must make tests pass).

## Integration with Review

This skill is invoked by sf-review.md as part of the review phase:

1. skill-detector identifies test-execution as applicable
2. sf-review runs test-execution skill
3. Findings merged into `8-review-output.md`
4. Findings with CRITICAL/MAJOR severity block merge
5. Dev receives findings and enters fix loop

## Expertise References

- `_bmad/expertise/test-execution/smart-selection.md` - Affected test detection
- `_bmad/expertise/test-execution/staged-parallel.md` - Stage execution order
- `_bmad/expertise/test-execution/coverage-thresholds.md` - Threshold enforcement
