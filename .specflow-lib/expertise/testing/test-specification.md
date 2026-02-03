# Test Specification Format

How TEA writes test specifications that QA can implement.

## Specification vs Implementation

**TEA writes specifications (WHAT):**
- What behavior to test
- What assertions to make
- What dependencies are needed

**QA writes implementations (HOW):**
- How to set up test fixtures
- How to interact with the system
- How to verify outcomes

## Test Specification Format

### Unit Test Specification

```markdown
| Test | AC Reference | Description | Assertions |
|------|--------------|-------------|------------|
| should validate email format | AC-01 | Email field rejects invalid formats | Invalid email returns error message |
| should hash password | AC-01 | Password stored securely | Password != plaintext, bcrypt format |
| should generate session token | AC-02 | Login returns valid token | Token is JWT, has user ID claim |
```

### Integration Test Specification

```markdown
| Test | AC Reference | Description | Dependencies |
|------|--------------|-------------|--------------|
| should persist session | AC-02 | Session survives server restart | Database connection |
| should invalidate on logout | AC-03 | Logout clears server session | Session store, auth middleware |
| should expire after timeout | AC-04 | Session expires after 15 min | Time mock, session store |
```

### E2E Test Specification

```markdown
| Test | AC Reference | Description | User Flow |
|------|--------------|-------------|-----------|
| complete login flow | AC-01, AC-02 | User logs in successfully | Enter creds -> submit -> redirected to dashboard |
| logout clears session | AC-03 | User logs out and cannot access | Click logout -> redirected -> protected pages blocked |
| session timeout redirect | AC-04 | Expired session shows login | Wait 15min -> refresh -> login page shown |
```

### API Test Specification

```markdown
| Test | AC Reference | Description | Request/Response |
|------|--------------|-------------|------------------|
| POST /login success | AC-01 | Valid credentials return token | 200, body has token |
| POST /login invalid | AC-01 | Invalid credentials rejected | 401, body has error |
| POST /logout success | AC-03 | Logout invalidates session | 200, subsequent auth fails |
```

## Test Type Selection

Select test types based on what needs verification:

| Test Type | When to Use | Written By |
|-----------|-------------|------------|
| Unit | Pure functions, business logic, utilities | Dev |
| Integration | Database, external services, cross-component | QA |
| E2E | User flows, UI interactions | QA |
| API | HTTP contracts, request/response validation | QA |

## Scope-Based Test Count Guidance

From `_bmad/expertise/validation/test-criteria.md`:

| Scope | Unit | Integration | E2E/API | Total |
|-------|------|-------------|---------|-------|
| trivial | 1-2 | 0 | 0 | 1-2 |
| small | 2-3 | 0 | 0 | 2-3 |
| medium | 4-6 | 2-3 | 1 | 6-10 |
| large | 6-8 | 3-4 | 2-3 | 10-15 |
| complex | 8+ | 5+ | 3+ | 15+ |

## Specification Completeness Checklist

Before completing test plan:

- [ ] Every AC has at least one test specification
- [ ] Each test has clear assertions (BOSS criteria)
- [ ] Test type matches what's being verified
- [ ] Dependencies documented for integration/E2E tests
- [ ] Happy, error, and edge cases covered (per scope)
- [ ] Security scenarios included (medium+ scope)

## Example: Full Specification Section

```markdown
## Test Specifications (for QA)

QA should implement tests matching these specifications.

### Unit Tests (Dev implements)

| Test | AC Ref | Description | Assertions |
|------|--------|-------------|------------|
| validateEmail | AC-01 | Email format validation | Returns true for valid, false for invalid |
| hashPassword | AC-01 | Password hashing | Output matches bcrypt format |
| verifyToken | AC-02 | JWT validation | Valid token decodes, expired throws |

### Integration Tests (QA implements)

| Test | AC Ref | Description | Dependencies |
|------|--------|-------------|--------------|
| createSession | AC-02 | Session persisted to DB | Database, session model |
| destroySession | AC-03 | Session removed on logout | Database, auth middleware |

### E2E Tests (QA implements)

| Test | AC Ref | Description | User Flow |
|------|--------|-------------|-----------|
| loginFlow | AC-01,02 | Complete login | Form -> submit -> dashboard |
| logoutFlow | AC-03 | Complete logout | Button -> click -> login page |

### API Tests (QA implements)

| Test | AC Ref | Description | Contract |
|------|--------|-------------|----------|
| POST /api/login | AC-01 | Login endpoint | 200 + token / 401 + error |
| POST /api/logout | AC-03 | Logout endpoint | 200 / 401 if not authed |
```

## Writing Good Specifications

### Good Specification

```markdown
| Test | AC Ref | Description | Assertions |
|------|--------|-------------|------------|
| should reject expired token | AC-02 | Token past expiry is rejected | Returns 401, body contains "expired" |
```

- Clear what's tested
- AC reference for traceability
- Specific assertions

### Bad Specification

```markdown
| Test | AC Ref | Description | Assertions |
|------|--------|-------------|------------|
| token test | AC-02 | Test token | Should work |
```

- Vague description
- No specific assertions
- "Should work" is not BOSS-compliant
