# UAT Execution Expertise

Automated User Acceptance Testing using browser-use (UI) or Node.js fetch (API).

## Purpose

Eliminate manual UAT verification bottleneck by executing Gherkin scenarios against a running application. Transform human-readable Gherkin specs into automated verification.

## Modes

| Mode | Tool | When to Use |
|------|------|-------------|
| Browser | browser-use CLI | UI interactions, visual verification, form submissions |
| API | Node.js fetch | HTTP endpoints, REST/GraphQL APIs, webhook testing |

## Mode Auto-Detection

Determine mode from architecture and changed files:

**Browser Mode indicators:**
- Files: `*.tsx`, `*.jsx`, `*.vue`, `pages/**`, `components/**`
- Gherkin patterns: "I click", "I see", "I am on page", "I fill in", "I select"
- Architecture: Frontend components, UI flows

**API Mode indicators:**
- Files: `api/**`, `routes/**`, `*.controller.ts`, `handlers/**`
- Gherkin patterns: "GET /", "POST /", "response status", "response contains"
- Architecture: REST endpoints, API handlers

**Mixed scenarios:** When both detected, run API tests first (faster feedback), then browser tests.

## Scope-Based Execution Depth

| Scope | UAT Depth | Evidence |
|-------|-----------|----------|
| trivial | Skip | None |
| small | Happy path only | Pass/fail log |
| medium | Happy + 1-2 error cases | Screenshots/responses |
| large | Full scenario coverage | Full evidence capture |
| complex | Full + regression checks | Full evidence + timing |

## Prerequisite Checks

Before UAT execution:
1. Server running (detect port, verify health endpoint)
2. Test database seeded (if applicable)
3. Required tools installed (browser-use for UI, Node.js for API)
4. Credentials available (env vars, secrets.json, or prompt)

## Fallback: Manual UAT

When automated UAT is unavailable, generate a manual checklist for human verification.

### When Manual Fallback Applies

| Condition | Trigger | Fallback Action |
|-----------|---------|-----------------|
| browser-use not installed | User declines install prompt | Generate checklist |
| browser-use install fails | npm/pip error | Generate checklist |
| Node.js unavailable | API mode, no Node | Generate checklist |
| CI without browser | Headless not supported | Generate checklist |
| Complex visual verification | AI cannot assess design | Mark for human review |

### STATUS.md Format

When manual UAT is required, STATUS.md shows:

```markdown
## UAT Status

**Mode:** MANUAL_REQUIRED
**Reason:** browser-use not installed (user declined)
**Generated:** 2026-02-03T10:00:00Z

See: Manual UAT Checklist below
```

### Generating Manual Checklist from Gherkin

Transform Gherkin scenarios into step-by-step human instructions:

**Input (Gherkin):**
```gherkin
Scenario: User logs in successfully
  Given I am on the login page
  When I enter "test@example.com" in the email field
  And I enter "password123" in the password field
  And I click the "Login" button
  Then I should be redirected to "/dashboard"
```

**Output (Manual Checklist):**
```markdown
## Manual UAT Checklist

| # | Scenario | Steps | Status |
|---|----------|-------|--------|
| 1 | User logs in successfully | See below | [ ] |

### Scenario 1: User logs in successfully

1. Visit: http://localhost:3000/login
2. Enter email: `test@example.com`
3. Enter password: `password123`
4. Click button: "Login"
5. **Verify:** URL changes to `/dashboard`

**Result:** [ ] PASS / [ ] FAIL

**Notes:** _______________
```

### Evidence Required

For manual UAT, document evidence of verification:

| Scope | Evidence Required |
|-------|------------------|
| small | Text confirmation ("tested on DATE") |
| medium | Screenshot of final state |
| large | Screenshot per scenario |
| complex | Video or screenshot series |

### Marking Complete

After manual verification, update STATUS.md:

```markdown
## UAT Status

**Mode:** MANUAL_COMPLETED
**Verified by:** Dean
**Verified at:** 2026-02-03T14:30:00Z

### Results
| Scenario | Result | Notes |
|----------|--------|-------|
| User logs in | PASS | Redirected correctly |
| Invalid password | PASS | Error shown |
```

### Manual Findings Status

| Status | Meaning | Next Step |
|--------|---------|-----------|
| PASS | All scenarios verified | Proceed to approval |
| FAIL | Scenario failed verification | Create bug issue |
| BLOCKED | Cannot test (env issue) | Fix environment |
| SKIPPED | Out of scope for manual | Document reason |

## Related Files

| File | Purpose |
|------|---------|
| [browser-mode.md](browser-mode.md) | Browser-use execution details |
| [api-mode.md](api-mode.md) | Node.js fetch execution details |
| [gherkin-patterns.md](gherkin-patterns.md) | Step-to-action mapping |
