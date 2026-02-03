---
name: uat-execution
description: Execute Gherkin scenarios using browser-use (UI) or Node.js fetch (API) for automated User Acceptance Testing
review-capable: true
report-capable: false
scope-minimum: small
triggers:
  files:
    - "*.tsx"
    - "*.jsx"
    - "*.vue"
    - "*.svelte"
    - "pages/**"
    - "components/**"
    - "api/**"
    - "routes/**"
    - "*.controller.ts"
    - "*.handler.ts"
    - "handlers/**"
  patterns:
    - "Scenario:"
    - "Given "
    - "When "
    - "Then "
    - "Feature:"
---

# UAT Execution Skill

Automate User Acceptance Testing by executing Gherkin scenarios from `5-test-plan.md` against a running application.

**Expertise reference:** `.specflow-lib/expertise/uat`

## When to Use This Skill

- During Review phase with Gherkin scenarios in test plan
- Scope `small` or above (trivial scope skips UAT)
- Feature has UI components (browser mode) or API endpoints (API mode)
- Manual UAT verification would create bottleneck

## Core Principles

### 1. Mode Auto-Detection

Determine execution mode from changed files and Gherkin patterns.

**Browser Mode triggers:**
- Changed files: `*.tsx`, `*.jsx`, `*.vue`, `pages/**`, `components/**`
- Gherkin patterns: "I click", "I see", "I am on page", "I fill in"

**API Mode triggers:**
- Changed files: `api/**`, `routes/**`, `*.controller.ts`, `handlers/**`
- Gherkin patterns: "GET /", "POST /", "response status", "response contains"

**Algorithm:**
```
browser_indicators = count(browser_file_matches) + count(browser_gherkin_patterns)
api_indicators = count(api_file_matches) + count(api_gherkin_patterns)

if api_indicators > browser_indicators:
  mode = "api"
else if browser_indicators > api_indicators:
  mode = "browser"
else:
  mode = "mixed"  # Run API first, then browser
```

### 2. Prerequisites Check

Before executing scenarios, verify:

```markdown
1. **Server running:**
   - Check for running dev server (curl health endpoint)
   - If not running, start with `npm run dev` (background)

2. **Tool availability:**
   - Browser mode: Check `browser-use` installed
   - API mode: Check `node` available (fallback to `curl`)

3. **Test database:**
   - If scenarios require seeded data, verify seed ran

4. **Credentials:**
   - Check env vars for API keys, auth tokens
   - Fall back to secrets.json if available
```

### 3. Lazy Install Prompt

When browser-use required but not installed:

```markdown
## Installation Required

browser-use is required for UI testing but not currently installed.

**Options:**
1. **Install:** Run `pip install browser-use` (recommended)
2. **Skip:** Use manual checklist instead of automated browser testing
3. **Cancel:** Stop UAT execution

Select: install / skip / cancel
```

**On "install":** Run installation, update config to prevent re-prompting:
```json
// .specflow/config.json
{
  "uat": {
    "browser_use_prompted": true,
    "browser_use_installed": true
  }
}
```

**On "skip":** Generate manual checklist, update config:
```json
{
  "uat": {
    "browser_use_prompted": true,
    "browser_use_installed": false,
    "skip_browser_uat": true
  }
}
```

### 4. Gherkin Parsing

Extract scenarios from `5-test-plan.md`:

```markdown
1. Find Gherkin code blocks: ```gherkin ... ```
2. Parse Feature, Background, Scenario blocks
3. Extract steps: Given, When, Then, And, But
4. Map to mode (browser or API)
5. Convert to executable actions
```

**Step mapping example:**
```
Gherkin: When I click "Login"
Action:  browser-use "Click the Login button"

Gherkin: When I POST to "/api/login" with: | email | test@example.com |
Action:  API_URL=... BODY='{"email":"test@example.com"}' node api-runner.mjs POST /api/login
```

### 5. Evidence Capture

Collect evidence for each scenario:

**Browser mode:**
- Screenshots at key steps
- Final state screenshot on failure
- Save to: `.specflow/features/{slug}/evidence/{scenario}/`

**API mode:**
- Full response JSON
- Headers and status
- Save to: `.specflow/features/{slug}/evidence/api/`

## Execution Steps

### Step 1: Detect Mode

```bash
# Analyze changed files
CHANGED_FILES=$(cat 6-dev-output.md | grep -E '^\|.*\.(tsx|jsx|vue|api|controller)' || echo "")

# Analyze Gherkin patterns in 5-test-plan.md
BROWSER_PATTERNS=$(grep -cE 'I (click|see|am on|fill in)' 5-test-plan.md || echo "0")
API_PATTERNS=$(grep -cE '(GET|POST|PUT|DELETE) "|response (status|body|contains)' 5-test-plan.md || echo "0")

# Determine mode
if [ "$API_PATTERNS" -gt "$BROWSER_PATTERNS" ]; then
  MODE="api"
elif [ "$BROWSER_PATTERNS" -gt "$API_PATTERNS" ]; then
  MODE="browser"
else
  MODE="mixed"
fi
```

### Step 2: Check Prerequisites

```bash
# Check server
if ! curl -s http://localhost:3000/health > /dev/null 2>&1; then
  npm run dev &
  sleep 5  # Wait for server startup
fi

# Check tools
if [ "$MODE" = "browser" ] || [ "$MODE" = "mixed" ]; then
  if ! command -v browser-use &> /dev/null; then
    # Prompt for lazy install
    INSTALL_BROWSER_USE=prompt
  fi
fi

# API mode: Node.js or curl fallback
if [ "$MODE" = "api" ] || [ "$MODE" = "mixed" ]; then
  if command -v node &> /dev/null; then
    API_RUNNER="node .specflow/skills/uat-execution/api-runner.mjs"
  else
    API_RUNNER="curl"
  fi
fi
```

### Step 3: Parse Gherkin

Extract scenarios from 5-test-plan.md and categorize:

```markdown
## Parsed Scenarios

| Scenario | Mode | Steps | Priority |
|----------|------|-------|----------|
| User logs in successfully | browser | 5 | happy-path |
| API login returns token | api | 3 | happy-path |
| Invalid login shows error | browser | 4 | error-case |
```

### Step 4: Execute Scenarios

**Browser execution:**
```bash
browser-use "Navigate to http://localhost:3000/login"
browser-use "Fill email field with test@example.com"
browser-use "Fill password field with password123"
browser-use "Click Login button"
browser-use "Verify text 'Welcome' is visible" --save-screenshot evidence/login/final.png
```

**API execution:**
```bash
API_URL="http://localhost:3000" \
HEADERS='{"Content-Type":"application/json"}' \
BODY='{"email":"test@example.com","password":"password123"}' \
node .specflow/skills/uat-execution/api-runner.mjs POST /api/login \
  > evidence/api/login-response.json
```

**Curl fallback (when Node.js unavailable):**
```bash
curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  -w '\n{"status":%{http_code},"duration_ms":%{time_total}}' \
  http://localhost:3000/api/login \
  > evidence/api/login-response.json
```

### Step 5: Collect Results

Aggregate execution results:

```json
{
  "mode": "mixed",
  "total_scenarios": 5,
  "passed": 4,
  "failed": 1,
  "skipped": 0,
  "scenarios": [
    {
      "name": "User logs in successfully",
      "mode": "browser",
      "status": "pass",
      "duration_ms": 3450,
      "evidence": ["evidence/login/01-page.png", "evidence/login/02-form.png"]
    },
    {
      "name": "Invalid password rejected",
      "mode": "browser",
      "status": "fail",
      "error": "Expected 'Invalid credentials' but found 'Server error'",
      "evidence": ["evidence/invalid-login/final.png"]
    }
  ]
}
```

### Step 6: Generate Findings

Convert results to standardized findings:

```markdown
## UAT Execution Findings

**Status:** ISSUES_FOUND | PASSED

### Summary

5 scenarios executed: 4 passed, 1 failed
Mode: mixed (browser + API)
Duration: 12.3s

### Findings

| ID | Scenario | Mode | Status | Severity |
|----|----------|------|--------|----------|
| UAT-01 | User logs in successfully | browser | PASS | - |
| UAT-02 | API login returns token | api | PASS | - |
| UAT-03 | Invalid password rejected | browser | FAIL | CRITICAL |
| UAT-04 | Rate limit returns 429 | api | PASS | - |
| UAT-05 | Logout clears session | browser | PASS | - |

### Detailed Findings

#### UAT-03: Invalid password rejected [FAIL]

**Scenario:** Invalid password rejected
**Mode:** browser
**Severity:** CRITICAL (happy path failure)

**Expected:**
- User sees "Invalid credentials" message

**Actual:**
- User sees "Server error" message

**Evidence:**
- Screenshot: evidence/invalid-login/final.png

**Root cause analysis:**
Error handling not implemented for invalid credentials.
```

## Output Format

### Status Determination

| Findings | Status |
|----------|--------|
| All scenarios pass | PASSED |
| Non-happy-path failures only | ISSUES_FOUND |
| Any happy-path failure | CRITICAL |
| Execution blocked (prerequisites) | BLOCKED |

**Happy path identification:**
- First scenario in each Feature (convention)
- Scenarios without "error", "invalid", "fail" in name
- Scenarios marked with `@happy-path` tag

### Full Output Template

```markdown
# UAT Execution Findings

## Status: PASSED | ISSUES_FOUND | CRITICAL | BLOCKED

## Summary

{N} scenarios executed: {passed} passed, {failed} failed, {skipped} skipped
Mode: {browser | api | mixed}
Duration: {time}

## Scenario Results

| ID | Scenario | Mode | Status | Duration |
|----|----------|------|--------|----------|
| UAT-01 | [scenario name] | browser | PASS | 2.3s |

## Detailed Failures

{For each failed scenario, include:}
### UAT-{N}: {Scenario Name} [FAIL]

**Severity:** {CRITICAL if happy-path, HIGH otherwise}

**Expected behavior:**
{From Gherkin Then steps}

**Actual behavior:**
{What actually happened}

**Evidence:**
{Links to screenshots/responses}

**Suggested fix:**
{If determinable from error}

## Route Decision

**Route to:** {Dev | Human Review}
**Reason:** {Routing logic}

{CRITICAL/logic issues -> Dev for fix}
{Test flakiness/environment issues -> Human review}
```

## Fallback: Manual Checklist

When automated execution unavailable:

```markdown
## Manual UAT Checklist

Automated UAT unavailable. Please verify manually:

### Feature: User Authentication

- [ ] **Scenario: User logs in successfully**
  1. Visit http://localhost:3000/login
  2. Enter email: test@example.com
  3. Enter password: password123
  4. Click "Login" button
  5. Verify: Redirected to /dashboard
  6. Verify: See "Welcome" message

- [ ] **Scenario: Invalid password rejected**
  1. Visit http://localhost:3000/login
  2. Enter email: test@example.com
  3. Enter password: wrongpassword
  4. Click "Login" button
  5. Verify: Error message "Invalid credentials"
  6. Verify: Still on /login page

Mark each scenario as PASS or FAIL, note any issues.
```

## Route Decision Logic

After UAT execution, determine routing:

```
if status == "CRITICAL" or status == "ISSUES_FOUND":
  # Analyze failure type
  if is_logic_issue(failure):
    route_to = "Dev"
    reason = "Application logic issue detected"
  else if is_test_flakiness(failure):
    route_to = "Human Review"
    reason = "Potential test flakiness, needs human judgment"
  else if is_environment_issue(failure):
    route_to = "Human Review"
    reason = "Environment issue, may not be code problem"
else:
  route_to = "Continue"
  reason = "All UAT scenarios passed"
```

**Logic issue indicators:**
- Wrong response content
- Missing expected elements
- Incorrect state after action

**Flakiness indicators:**
- Timing-related failures
- Intermittent pass/fail
- Race conditions

**Environment indicators:**
- Network errors
- Server unavailable
- Database connectivity

## Credential Handling

### Resolution Order

1. **Environment variables:**
   ```bash
   # Check common env var names
   $API_KEY, $AUTH_TOKEN, $BEARER_TOKEN, $API_SECRET
   ```

2. **Secrets file:**
   ```json
   // .specflow/secrets.json (gitignored)
   {
     "API_KEY": "sk-...",
     "AUTH_TOKEN": "eyJ..."
   }
   ```

3. **Prompt user:**
   ```markdown
   API authentication required for UAT.

   Enter API key (or 'skip' to run without auth):
   ```

4. **Skip:**
   Run without credentials, expect protected endpoints to fail.

### Storing Credentials

On user providing credential via prompt:

```markdown
Save this credential for future UAT runs?
1. Save to .specflow/secrets.json (recommended)
2. Use for this session only
3. Cancel

Select: save / session / cancel
```

## Scope-Based Behavior

| Scope | UAT Depth | Evidence |
|-------|-----------|----------|
| trivial | Skip UAT | None |
| small | Happy paths only | Pass/fail log |
| medium | Happy + key error cases | Screenshots/responses |
| large | All scenarios | Full evidence |
| complex | All + timing checks | Full evidence + performance |

## Integration with Review

This skill integrates with sf-review.md:

1. Review detects `5-test-plan.md` with Gherkin scenarios
2. Review triggers uat-execution skill
3. Skill executes scenarios, generates findings
4. Findings merged into Review consolidated output
5. Route decision affects overall Review routing
