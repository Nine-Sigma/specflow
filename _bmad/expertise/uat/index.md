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

## Fallback: Manual Checklist

When automation unavailable (tools not installed, user declines install):

Generate checklist for human verification:
```markdown
## Manual UAT Checklist

- [ ] Scenario: User logs in successfully
  - Visit /login
  - Enter email: test@example.com
  - Enter password: password123
  - Click "Login"
  - Verify: Redirected to /dashboard

- [ ] Scenario: Invalid password rejected
  - Visit /login
  - Enter email: test@example.com
  - Enter password: wrong
  - Click "Login"
  - Verify: Error message "Invalid credentials"
```

## Related Files

| File | Purpose |
|------|---------|
| [browser-mode.md](browser-mode.md) | Browser-use execution details |
| [api-mode.md](api-mode.md) | Node.js fetch execution details |
| [gherkin-patterns.md](gherkin-patterns.md) | Step-to-action mapping |
