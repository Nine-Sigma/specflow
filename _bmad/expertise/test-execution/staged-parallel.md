# Staged Parallel Execution

Run tests in stages with parallelization within each stage.

## Execution Order

Tests run in stages for fast feedback:

```
Stage 1: Unit Tests (parallel within stage)
  |- auth.test.ts
  |- session.test.ts
  |- utils.test.ts
  (all run in parallel)

Stage 2: Integration Tests (after Stage 1 passes)
  |- auth.integration.test.ts
  |- api.integration.test.ts
  (run in parallel)

Stage 3: E2E Tests (after Stage 2 passes)
  |- login-flow.e2e.test.ts
  |- checkout.e2e.test.ts
  (run sequentially for stability)
```

## Stage Classification

Classify tests by file naming pattern:

| File Pattern | Stage | Parallelization |
|--------------|-------|-----------------|
| `*.test.ts` (no suffix) | Unit | Full parallel |
| `*.unit.test.ts` | Unit | Full parallel |
| `*.spec.ts` (Mocha style) | Unit | Full parallel |
| `*.integration.test.ts` | Integration | Parallel |
| `*.int.test.ts` | Integration | Parallel |
| `*.e2e.test.ts` | E2E | Sequential |
| `*.e2e.spec.ts` | E2E | Sequential |
| `tests/e2e/*.ts` | E2E | Sequential |
| `playwright/*.ts` | E2E | Sequential |

## Fail Fast Strategy

If any stage fails, subsequent stages do not run:

```
Unit Tests: 45 passed, 2 failed
  STOP - Integration and E2E skipped

Report:
- Unit: 45/47 passed (2 failed)
- Integration: SKIPPED (unit failed)
- E2E: SKIPPED (unit failed)
```

This saves time and provides faster feedback on failures.

## Framework Parallel Configuration

| Framework | Parallel Flag | Notes |
|-----------|--------------|-------|
| Vitest | `--pool=threads` | Default, no flag needed |
| Jest | `--maxWorkers=auto` | Default, no flag needed |
| Pytest | `-n auto` | Requires pytest-xdist |
| Go | `-parallel=4` | Defaults to GOMAXPROCS |

### E2E Sequential Override

For E2E tests, override parallelization:

```bash
# Vitest - run specific tests sequentially
vitest run --sequence.shuffle=false --pool=forks tests/e2e/

# Jest
jest --runInBand tests/e2e/

# Playwright
npx playwright test --workers=1
```

## Stage Execution Commands

### Vitest

```bash
# Stage 1: Unit
vitest run '**/*.test.ts' '**/*.unit.test.ts' --coverage

# Stage 2: Integration
vitest run '**/*.integration.test.ts' '**/*.int.test.ts'

# Stage 3: E2E (sequential)
vitest run '**/*.e2e.test.ts' --pool=forks
```

### Jest

```bash
# Stage 1: Unit
jest '**/*.test.ts' '**/*.unit.test.ts' --coverage

# Stage 2: Integration
jest '**/*.integration.test.ts' '**/*.int.test.ts'

# Stage 3: E2E (sequential)
jest '**/*.e2e.test.ts' --runInBand
```

## Output Format

```markdown
## Test Stages

| Stage | Tests | Passed | Failed | Duration |
|-------|-------|--------|--------|----------|
| Unit | 45 | 45 | 0 | 3.2s |
| Integration | 12 | 12 | 0 | 8.4s |
| E2E | 5 | 5 | 0 | 45.1s |

Total: 62 tests, 56.7s
```
