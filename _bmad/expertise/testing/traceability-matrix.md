# Test Traceability Matrix

AC-to-test mapping format for TEA output and PM validation.

## Purpose

Ensure every acceptance criterion has test coverage and identify gaps before implementation.

## Matrix Format

```markdown
| AC | Unit Spec | Integration Spec | E2E Spec | API Spec | Gherkin | Coverage |
|----|-----------|------------------|----------|----------|---------|----------|
| AC-01 | validateEmail | - | loginFlow | POST /login | Scenario 1,2 | FULL |
| AC-02 | verifyToken | createSession | loginFlow | - | Scenario 1 | FULL |
| AC-03 | - | destroySession | logoutFlow | POST /logout | Scenario 3 | FULL |
| AC-04 | - | - | - | - | - | MISSING |
```

## Coverage Status Values

| Status | Symbol | Meaning | Action |
|--------|--------|---------|--------|
| FULL | Green | AC fully covered by tests | Proceed |
| PARTIAL | Yellow | AC partially covered | Review sufficiency |
| MISSING | Red | AC has no test coverage | Add tests |
| N/A | Gray | AC not testable (documentation, etc.) | Document why |

## Building the Matrix

### Step 1: List All ACs

Extract all acceptance criteria from `1-spec.md`:

```markdown
## ACs from 1-spec.md

- AC-01: User can login with valid credentials
- AC-02: Session token is returned on successful login
- AC-03: User can logout and session is invalidated
- AC-04: Session expires after 15 minutes of inactivity
```

### Step 2: Map Test Specifications

For each AC, identify which test specifications cover it:

```markdown
## AC Mapping

AC-01 (login with valid credentials):
- Unit: validateEmail, hashPassword
- Integration: -
- E2E: loginFlow
- API: POST /login success/failure
- Gherkin: Scenario 1 (happy), Scenario 2 (error)

AC-02 (session token returned):
- Unit: generateToken, verifyToken
- Integration: createSession
- E2E: loginFlow (checks redirect)
- API: POST /login (checks token in response)
- Gherkin: Scenario 1 (includes token assertion)
```

### Step 3: Identify Gaps

Find ACs with no test coverage:

```markdown
## Coverage Gaps

**AC-04 (session timeout):**
- MISSING: No test specifications for timeout behavior
- Recommendation: Add integration test for session expiry
```

### Step 4: Build Final Matrix

Compile into table format for 5-test-plan.md output.

## Validation Rules

### Full Coverage Requirements

For each AC, require at minimum:
- One Gherkin scenario (documents behavior)
- One test specification (verifies behavior)

### Scope-Based Expectations

| Scope | Coverage Requirement |
|-------|---------------------|
| trivial | 1 test per AC minimum |
| small | 1-2 tests per AC |
| medium | Multiple test types per critical AC |
| large | Full matrix coverage |
| complex | Full matrix + cross-AC integration |

## PM Validation Checkpoint

After TEA completes, PM validates the traceability matrix:

### Completeness Check

```markdown
## PM Validation

- [ ] Every AC from 1-spec.md appears in matrix
- [ ] No AC has MISSING status
- [ ] Critical ACs have multiple test types
- [ ] Gherkin column has at least one scenario per AC
```

### Drift Detection

If matrix shows gaps:

1. PM writes `drift/correction-tea-N.md`
2. TEA re-runs addressing corrections
3. PM validates corrected matrix

## Example: Complete Traceability Section

```markdown
## Traceability Matrix

| AC | Unit | Integration | E2E | API | Gherkin | Coverage |
|----|------|-------------|-----|-----|---------|----------|
| AC-01: Valid login | validateCreds | - | loginFlow | POST /login | S1, S2 | FULL |
| AC-02: Session token | generateToken | createSession | - | - | S1 | FULL |
| AC-03: Logout clears | - | destroySession | logoutFlow | POST /logout | S3 | FULL |
| AC-04: Session timeout | - | sessionExpiry | timeoutFlow | - | S4 | FULL |
| AC-05: Remember me | - | extendSession | - | - | S5 | PARTIAL |

### Coverage Summary

- Total ACs: 5
- FULL coverage: 4 (80%)
- PARTIAL coverage: 1 (20%)
- MISSING coverage: 0 (0%)

### Notes on Partial Coverage

**AC-05 (Remember me):** Integration test covers session extension, but no E2E test for checkbox UI. Acceptable for small scope - UI behavior covered by manual QA.
```

## Cross-Reference with Gherkin

Each Gherkin scenario should reference ACs:

```gherkin
Feature: User Authentication

  @AC-01 @AC-02
  Scenario: Successful login
    Given a registered user with email "test@example.com"
    When they login with valid credentials
    Then they should be redirected to dashboard
    And a session token should be stored

  @AC-01
  Scenario: Failed login with invalid credentials
    Given a registered user with email "test@example.com"
    When they login with wrong password
    Then they should see error "Invalid credentials"
    And no session should be created
```

This enables bidirectional traceability:
- Matrix shows AC -> Tests
- Gherkin tags show Test -> ACs
