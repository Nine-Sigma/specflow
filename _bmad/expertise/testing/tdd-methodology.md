# TDD Methodology

Test-Driven Development patterns for SpecFlow qa-first workflow.

## Red-Green-Refactor Cycle

The fundamental TDD rhythm:

```
RED    -> Write a test that fails (behavior not yet implemented)
GREEN  -> Write minimal code to make the test pass
REFACTOR -> Clean up code while keeping tests green
```

**Critical insight:** In SpecFlow's qa-first path, QA handles the RED phase for integration/E2E/API tests. Dev handles GREEN (and all unit test TDD internally).

## SpecFlow TDD Flow

```
                     +-----------------+
                     |  TEA Analysis   |
                     |  (5-test-plan)  |
                     +--------+--------+
                              |
              +---------------+---------------+
              |                               |
              v                               v
   +----------+----------+       +-----------+-----------+
   | recommended_flow:   |       | recommended_flow:     |
   | qa-first            |       | dev-only              |
   +----------+----------+       +-----------+-----------+
              |                               |
              v                               v
   +----------+----------+       +-----------+-----------+
   | QA writes failing   |       | Dev implements with   |
   | integration/E2E/API |       | internal unit TDD     |
   | tests (RED phase)   |       | (RED-GREEN-REFACTOR)  |
   +----------+----------+       +-----------+-----------+
              |                               |
              v                               |
   +----------+----------+                    |
   | Dev implements to   |                    |
   | make tests pass     |                    |
   | (GREEN phase)       |                    |
   +----------+----------+                    |
              |                               |
              v                               |
   +----------+----------+                    |
   | QA verifies all     |                    |
   | tests pass          |                    |
   +----------+----------+                    |
              |                               |
              +---------------+---------------+
                              |
                              v
                     +--------+--------+
                     |     Review      |
                     +-----------------+
```

## QA's Role in TDD (Red Phase)

When `recommended_flow: qa-first`, QA writes tests BEFORE Dev implements.

### What QA Writes

| Test Type | Written By | Purpose |
|-----------|------------|---------|
| Integration | QA | Service interactions, database operations |
| E2E | QA | Full user flows, UI interactions |
| API | QA | HTTP contracts, request/response validation |

### What QA Does NOT Write

| Test Type | Written By | Reason |
|-----------|------------|--------|
| Unit | Dev | Implementation-specific, requires internal knowledge |
| Mock setup | Dev | Part of implementation decisions |
| Test infrastructure | Dev | Framework configuration |

### QA TDD Rules

1. **Behavior-focused**: Tests describe WHAT, not HOW
2. **Spec-derived**: Tests come directly from TEA's specifications and AC references
3. **Will fail initially**: Tests written before code exists - failure expected
4. **AC traceable**: Every test references AC-XX from requirements

### QA TDD Output (5-qa-tests.md)

```yaml
---
agent: qa
mode: tdd
test_status: failing
created: {timestamp}
depends_on: ["5-test-plan.md", "1-spec.md"]
---

# {Feature} - TDD Tests (Red Phase)

## Summary

Tests written per TEA specifications. All tests are expected to FAIL
until Dev implements the feature.

## Tests Written

| Test File | Test Name | AC Ref | Type | Expected Status |
|-----------|-----------|--------|------|-----------------|
| auth.test.ts | should authenticate user | AC-01 | integration | FAILING |
| login.e2e.ts | complete login flow | AC-01,02 | e2e | FAILING |

## Expected Failures

All tests should fail with:
- Integration: Service/function not implemented
- E2E: Page/component not rendered
- API: Endpoint returns 404

## Constraints for Dev

- Do NOT modify test files
- Implement until tests pass
- Tests define the contract
```

## Test-First Principles

### Good Test-First Tests

1. **Test behavior, not implementation**
   - Good: "should reject invalid email format"
   - Bad: "should call validateEmail with regex pattern"

2. **One assertion per concept**
   - Good: Separate tests for valid input, invalid input, edge cases
   - Bad: Single test with 10 assertions

3. **Readable as specification**
   - Good: "when user submits empty form, should show required field errors"
   - Bad: "test form submission"

4. **Independent and isolated**
   - Good: Each test sets up its own state
   - Bad: Tests depend on execution order

### Test-First Anti-Patterns

| Anti-Pattern | Problem | Fix |
|--------------|---------|-----|
| Testing implementation | Breaks when refactoring | Test observable behavior |
| Tight coupling to framework | Hard to migrate | Abstract test utilities |
| Shared state between tests | Flaky, order-dependent | Isolate test fixtures |
| Testing private methods | Indicates wrong abstraction | Test public API |
| Over-mocking | Tests pass but code fails | Use integration tests |
| Writing tests after code | Loses TDD design benefits | Follow the discipline |

## Anti-Patterns to Avoid

### QA Anti-Patterns

1. **Writing unit tests**: QA writes behavior tests only
2. **Testing internals**: Tests should not know implementation details
3. **Skipping failing verification**: Always confirm tests fail before handoff
4. **Adding implementation hints**: Tests should not prescribe HOW to implement

### Dev Anti-Patterns (in qa-first flow)

1. **Modifying QA's tests**: QA's tests are the contract
2. **Making tests pass by changing assertions**: Implement the behavior
3. **Adding workarounds**: If test seems wrong, communicate via COMMS
4. **Skipping green verification**: Always confirm all tests pass

## TDD Scope Guidance

| Scope | recommended_flow | QA TDD Work |
|-------|------------------|-------------|
| trivial | dev-only | None |
| small | dev-only | None (unless explicit integration needed) |
| medium | qa-first if integration | Integration tests |
| large | qa-first | Integration + E2E/API tests |
| complex | qa-first | Full test suite before implementation |
