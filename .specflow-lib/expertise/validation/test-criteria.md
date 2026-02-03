# Test Quality Criteria

<!-- Source: _bmad/workflows/3-solutioning/check-implementation-readiness/ -->

Quality standards for test plans and test execution.

## Test Plan Quality Criteria

### Scenario Coverage

For each feature, verify test scenarios include:

- [ ] Happy path scenarios (minimum 2)
- [ ] Error handling scenarios (minimum 2)
- [ ] Edge case scenarios (minimum 1)
- [ ] Security scenarios (medium+ scope)
- [ ] Performance scenarios (large+ scope)

### BOSS Compliance

All acceptance criteria must be:

| Criterion | Validation |
|-----------|------------|
| **Binary** | Each criterion has clear pass/fail |
| **Observable** | Can be verified without code inspection |
| **Specific** | Concrete values and behaviors stated |
| **Scope-bound** | Matches feature scope, not over-engineered |

### Acceptance Criteria Review

For each story's ACs, verify:

- Given/When/Then format (proper BDD structure)
- Each AC can be verified independently
- Covers all scenarios including errors
- Clear expected outcomes

**Issues to find:**
- Vague criteria like "user can login"
- Missing error conditions
- Incomplete happy path
- Non-measurable outcomes

## Test Depth by Scope

| Scope | Min Tests | Types Required |
|-------|-----------|----------------|
| trivial | 1 | Verification only |
| small | 2-3 | Happy + error |
| medium | 6-10 | Happy + error + edge + security |
| large | 10-15 | Full coverage + integration |
| complex | 15+ | Full + performance + security |

### Scenario Minimums by Type

| Scope | Happy Path | Error | Edge | Security | Performance |
|-------|------------|-------|------|----------|-------------|
| trivial | 1 | 0 | 0 | 0 | 0 |
| small | 1-2 | 1 | 0 | 0 | 0 |
| medium | 2-3 | 2 | 1 | 1 | 0 |
| large | 3-4 | 3 | 2 | 2 | 1 |
| complex | 4+ | 4+ | 3+ | 3+ | 2+ |

## Test Execution Quality

### Pass/Fail Standards

| Result | Handling |
|--------|----------|
| All tests pass | Proceed to merge |
| Critical failure | Block pipeline (exit 1) |
| Minor failure | Queue for later (exit 0 with warning) |
| Flaky test | Treat as bug, apply tiebreaker |

### Flaky Test Tiebreaker

When a test flips between pass and fail:

1. First run: Pass or Fail recorded
2. Second run: If different result, trigger tiebreaker
3. Third run: Definitive result (3rd run decides)

**Rule:** Flaky tests are bugs. Fix immediately, do not ignore.

### Coverage Thresholds

Coverage thresholds are advisory, not blocking:

| Level | Guidance |
|-------|----------|
| < 60% | Warning - review coverage gaps |
| 60-80% | Acceptable for most features |
| > 80% | Excellent, do not over-engineer |

**Advisory means:** Warn but don't block. Low coverage is a signal to review, not an automatic failure.

## Test Categories

### Unit Tests

- Test individual functions/methods
- Mock external dependencies
- Fast execution (< 100ms each)
- High volume, low cost

### Integration Tests

- Test component interactions
- Use real dependencies where practical
- Medium execution time
- Focus: Trophy-shaped testing (integration-focused)

### End-to-End Tests

- Test complete user flows
- Use real environment
- Slower execution
- Limited quantity (2-3 per feature)

### Security Tests

For medium+ scope:
- Authentication bypass attempts
- Authorization violations
- Input validation (injection, XSS)
- Data exposure checks

### Performance Tests

For large+ scope:
- Response time under load
- Concurrent user handling
- Resource utilization
- Degradation behavior

## Quality Validation Checklist

Before approving test plan:

- [ ] Scenario count meets scope minimum
- [ ] All acceptance criteria have corresponding tests
- [ ] Error paths explicitly tested
- [ ] Security scenarios for medium+ scope
- [ ] Performance criteria for large+ scope
- [ ] No duplicate or redundant tests
- [ ] Tests are maintainable (not brittle)
