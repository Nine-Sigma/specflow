# Coverage Thresholds

Enforce scope-based coverage requirements on changed files.

## Scope-Based Thresholds

| Scope | Pass Requirement | Coverage Requirement |
|-------|------------------|---------------------|
| trivial | All tests pass | None |
| small | All tests pass | None |
| medium | All tests pass | 70% on changed files |
| large | All tests pass | 80% on changed files |
| complex | All tests pass | 90% on changed files |

## Coverage Scope

Coverage is checked on **changed files only**, not the entire codebase.

Rationale:
- New code should meet threshold
- Legacy code coverage is a separate concern
- Prevents "hostage" situations from old code

## Threshold Enforcement

1. Read scope from `0-scope.md`
2. Get changed files from `6-dev-output.md`
3. Run coverage on those files only
4. Compare to threshold

```bash
# Vitest example with file filter
vitest run --coverage.include='src/auth.ts,src/session.ts'
```

## Finding Generation

Map test results to finding severity:

| Condition | Severity | Finding ID Pattern |
|-----------|----------|-------------------|
| Test fails | CRITICAL | T-XX |
| Regression (was passing, now fails) | CRITICAL | T-XX |
| Coverage below threshold | MAJOR | T-XX |
| Flaky test (passed on retry) | MINOR | T-XX |
| No tests for changed file | MINOR | T-XX |

## Vitest Coverage Config

```typescript
// vitest.config.ts
export default {
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['json', 'text'],
      include: ['src/**/*.ts'],  // Filtered dynamically
      thresholds: {
        lines: 70,      // Adjust per scope
        branches: 70,
        functions: 70,
        statements: 70,
      },
    },
  },
}
```

## Jest Coverage Config

```javascript
// jest.config.js
module.exports = {
  collectCoverage: true,
  coverageReporters: ['json', 'text'],
  collectCoverageFrom: ['src/**/*.ts'],  // Filtered dynamically
  coverageThreshold: {
    global: {
      lines: 70,
      branches: 70,
      functions: 70,
      statements: 70,
    },
  },
}
```

## Coverage Output Parsing

Extract from JSON coverage report:

```json
{
  "src/auth.ts": {
    "lines": { "pct": 85.7 },
    "branches": { "pct": 72.3 },
    "functions": { "pct": 100 }
  }
}
```

Aggregate by taking minimum across all changed files:
- If any file below threshold: FAIL
- Report per-file breakdown

## Example Finding

```markdown
| ID | Location | Issue | Severity |
|----|----------|-------|----------|
| T-02 | src/auth.ts | Coverage 58% below 70% threshold | MAJOR |

### T-02: Coverage Below Threshold

**What's wrong:** src/auth.ts has 58% line coverage, below the 70% required for medium scope.

**How to fix:** Add unit tests for:
- `logout()` function (lines 45-67)
- Error handling in `validateSession()` (lines 89-95)

**Files to change:** src/auth.test.ts
```
