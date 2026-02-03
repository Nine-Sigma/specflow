# Gherkin Pattern Mapping

Map Gherkin steps to executable actions for browser-use and API modes.

## Mode Detection from Gherkin

Scan Gherkin scenarios to determine execution mode:

### Browser Mode Patterns

| Gherkin Pattern | Confidence |
|-----------------|------------|
| `I am on the * page` | HIGH |
| `I click *` | HIGH |
| `I see *` / `I should see *` | HIGH |
| `I fill in * with *` | HIGH |
| `I select * from *` | HIGH |
| `I check *` / `I uncheck *` | HIGH |
| `I hover over *` | HIGH |
| `I wait for *` | MEDIUM |
| `the page should contain *` | MEDIUM |
| `I press Enter` / `I press *` | MEDIUM |

### API Mode Patterns

| Gherkin Pattern | Confidence |
|-----------------|------------|
| `I GET "/api/*"` / `GET /` | HIGH |
| `I POST to "/api/*"` / `POST /` | HIGH |
| `I PUT "/api/*"` / `PUT /` | HIGH |
| `I DELETE "/api/*"` / `DELETE /` | HIGH |
| `response status * be *` | HIGH |
| `response body * contain *` | HIGH |
| `response header *` | HIGH |
| `the API is running` | MEDIUM |
| `I send a * request` | MEDIUM |

### Mode Selection Algorithm

```
browser_score = count(browser_patterns)
api_score = count(api_patterns)

if api_score > browser_score:
  mode = "api"
else if browser_score > api_score:
  mode = "browser"
else if api_score > 0 and browser_score > 0:
  mode = "mixed"  # Run API first, then browser
else:
  mode = "unknown"  # Fall back to manual checklist
```

## Browser Mode: Step-to-Action Mapping

### Navigation

| Gherkin | browser-use Command |
|---------|---------------------|
| `Given I am on the login page` | `Navigate to {BASE_URL}/login` |
| `Given I am on "/dashboard"` | `Navigate to {BASE_URL}/dashboard` |
| `When I go to the home page` | `Navigate to {BASE_URL}` |
| `When I visit "/products"` | `Navigate to {BASE_URL}/products` |

### Form Interaction

| Gherkin | browser-use Command |
|---------|---------------------|
| `When I fill in "email" with "test@example.com"` | `Fill the email field with test@example.com` |
| `When I type "search term" in the search box` | `Type 'search term' in the search box` |
| `When I select "Option A" from "dropdown"` | `Select 'Option A' from the dropdown menu` |
| `When I check "remember me"` | `Check the remember me checkbox` |
| `When I uncheck "newsletter"` | `Uncheck the newsletter checkbox` |

### Actions

| Gherkin | browser-use Command |
|---------|---------------------|
| `When I click "Login"` | `Click the Login button` |
| `When I click the submit button` | `Click the submit button` |
| `When I press Enter` | `Press the Enter key` |
| `When I hover over "Menu"` | `Hover over the Menu element` |
| `When I scroll to "footer"` | `Scroll to the footer element` |

### Verification

| Gherkin | browser-use Command |
|---------|---------------------|
| `Then I should see "Welcome"` | `Verify text 'Welcome' is visible on the page` |
| `Then I should not see "Error"` | `Verify text 'Error' is NOT visible on the page` |
| `Then the page should contain "Dashboard"` | `Verify the page contains the text 'Dashboard'` |
| `Then the "email" field should contain "test@"` | `Verify the email field contains 'test@'` |
| `Then I should be on "/dashboard"` | `Verify the current URL contains '/dashboard'` |

### Waiting

| Gherkin | browser-use Command |
|---------|---------------------|
| `When I wait for "Loading" to disappear` | `Wait until 'Loading' text is no longer visible` |
| `When I wait 2 seconds` | `Wait for 2 seconds` |
| `Then I should eventually see "Success"` | `Wait for 'Success' text to appear, timeout 10s` |

## API Mode: Step-to-Action Mapping

### Request Actions

| Gherkin | API Action |
|---------|------------|
| `When I GET "/api/users"` | `METHOD=GET ENDPOINT=/api/users` |
| `When I POST to "/api/login" with:` | `METHOD=POST ENDPOINT=/api/login BODY={table_to_json}` |
| `When I PUT "/api/user/1" with JSON:` | `METHOD=PUT ENDPOINT=/api/user/1 BODY={json_block}` |
| `When I DELETE "/api/user/1"` | `METHOD=DELETE ENDPOINT=/api/user/1` |
| `When I PATCH "/api/user/1" with:` | `METHOD=PATCH ENDPOINT=/api/user/1 BODY={table_to_json}` |

### Headers

| Gherkin | API Action |
|---------|------------|
| `Given I set header "Authorization" to "Bearer {token}"` | `HEADERS["Authorization"] = "Bearer {token}"` |
| `Given I set header "Content-Type" to "application/json"` | `HEADERS["Content-Type"] = "application/json"` |
| `Given I am authenticated as "user@example.com"` | Resolve token, set `Authorization` header |

### Response Verification

| Gherkin | Assertion |
|---------|-----------|
| `Then the response status should be 200` | `assert(response.status === 200)` |
| `Then the response status should be 4xx` | `assert(response.status >= 400 && response.status < 500)` |
| `Then the response body should contain "token"` | `assert(response.body.includes("token"))` |
| `Then the response body should be JSON` | `assert(isValidJSON(response.body))` |
| `Then the response should have JSON path "$.user.id"` | `assert(jsonPath(response.body, "$.user.id") !== undefined)` |
| `Then the response header "Content-Type" should be "application/json"` | `assert(response.headers["content-type"].includes("application/json"))` |

### Data Tables to JSON

```gherkin
When I POST to "/api/login" with:
  | email    | test@example.com |
  | password | password123      |
```

Becomes:
```json
{"email": "test@example.com", "password": "password123"}
```

### JSON Blocks

```gherkin
When I POST to "/api/user" with JSON:
"""
{
  "name": "John Doe",
  "roles": ["admin", "user"]
}
"""
```

Use JSON block directly as body.

## Parsing Gherkin from 5-test-plan.md

### Finding Scenarios

```regex
```gherkin
Feature: .*
[\s\S]*?
```
```

### Parsing Individual Scenarios

```regex
Scenario: (.*)
((?:\s+(?:Given|When|Then|And|But) .*)+)
```

### Example Parser Output

```json
{
  "feature": "Password Reset Request",
  "scenarios": [
    {
      "name": "User requests password reset for existing account",
      "steps": [
        {"keyword": "Given", "text": "a user exists with email \"user@example.com\""},
        {"keyword": "When", "text": "I submit a forgot password request for \"user@example.com\""},
        {"keyword": "Then", "text": "I should see \"If an account exists, a reset email has been sent.\""},
        {"keyword": "And", "text": "a reset email should be sent to \"user@example.com\""}
      ]
    }
  ]
}
```

## Pattern Extraction Regex

### Quoted Values

```regex
"([^"]*)"  # Extract value inside quotes
'([^']*)'  # Single quotes variant
```

### URL Paths

```regex
(?:GET|POST|PUT|DELETE|PATCH)\s+["\']?(/[^\s"']+)  # Extract /api/path
```

### Status Codes

```regex
status\s+(?:should\s+be\s+)?(\d{3})  # Extract numeric status
```

### Field Names

```regex
fill\s+(?:in\s+)?["\']?(\w+)["\']?\s+with  # Extract field name
```

## Mixed Mode Execution

When scenario has both browser and API steps:

1. **Parse all steps** and categorize by mode
2. **Execute API steps first** (setup, faster)
3. **Execute browser steps** (verification, visual)
4. **Collect results** from both modes

```json
{
  "scenario": "User logs in via API then sees dashboard",
  "mode": "mixed",
  "api_results": {
    "steps": [{"step": "POST /api/login", "status": "pass"}],
    "overall": "pass"
  },
  "browser_results": {
    "steps": [{"step": "Navigate to /dashboard", "status": "pass"}],
    "overall": "pass"
  },
  "overall": "pass"
}
```
