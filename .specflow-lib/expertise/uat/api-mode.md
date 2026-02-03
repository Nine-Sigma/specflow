# API Mode UAT

Execute API Gherkin scenarios using Node.js fetch or curl fallback.

## When to Use

- Testing REST/GraphQL endpoints
- HTTP contract verification (status codes, response format)
- Authentication flows via API
- Webhook testing
- Scenarios with "GET /", "POST /", "response status" patterns

## Tool: Node.js Fetch (Primary)

Uses `api-runner.mjs` script for consistent execution and output format.

### Prerequisites Check

```bash
# Check Node.js available
node --version || echo "Node.js not available"
```

### Basic Usage

```bash
# GET request
API_URL="http://localhost:3000" \
  node .specflow/skills/uat-execution/api-runner.mjs GET /api/health

# POST with JSON body
API_URL="http://localhost:3000" \
HEADERS='{"Content-Type":"application/json"}' \
BODY='{"email":"test@example.com","password":"password123"}' \
  node .specflow/skills/uat-execution/api-runner.mjs POST /api/login

# With authorization
API_URL="http://localhost:3000" \
HEADERS='{"Authorization":"Bearer eyJ..."}' \
  node .specflow/skills/uat-execution/api-runner.mjs GET /api/user/profile
```

### Output Format

```json
{
  "method": "POST",
  "endpoint": "/api/login",
  "status": 200,
  "statusText": "OK",
  "headers": {
    "content-type": "application/json",
    "set-cookie": "session=abc123..."
  },
  "body": {
    "success": true,
    "user": { "id": 1, "email": "test@example.com" },
    "token": "eyJ..."
  },
  "duration_ms": 45
}
```

## Tool: curl (Fallback)

When Node.js unavailable, use curl for API requests.

### Curl Equivalent Commands

```bash
# GET request
curl -s -w '\n%{http_code}' http://localhost:3000/api/health

# POST with JSON
curl -s -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  -w '\n%{http_code}' \
  http://localhost:3000/api/login

# With authorization
curl -s -H "Authorization: Bearer eyJ..." \
  -w '\n%{http_code}' \
  http://localhost:3000/api/user/profile
```

### Curl Output Parsing

```bash
# Capture body and status separately
RESPONSE=$(curl -s -w '\n%{http_code}' http://localhost:3000/api/health)
STATUS=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')
```

## Execution Flow

### Step 1: Parse Gherkin to API Calls

```gherkin
Scenario: Login with valid credentials
  Given the API is running
  When I POST to "/api/login" with:
    | email    | test@example.com |
    | password | password123      |
  Then the response status should be 200
  And the response body should contain "token"
```

Becomes:
```bash
# Check API running
curl -s http://localhost:3000/api/health

# Execute request
API_URL="http://localhost:3000" \
HEADERS='{"Content-Type":"application/json"}' \
BODY='{"email":"test@example.com","password":"password123"}' \
  node .specflow/skills/uat-execution/api-runner.mjs POST /api/login

# Verify response (in skill logic)
# - Check status == 200
# - Check body contains "token"
```

### Step 2: Chain Requests for Auth Flows

```bash
# Login and capture token
RESPONSE=$(API_URL="http://localhost:3000" \
  BODY='{"email":"test@example.com","password":"password123"}' \
  node .specflow/skills/uat-execution/api-runner.mjs POST /api/login)

TOKEN=$(echo "$RESPONSE" | jq -r '.body.token')

# Use token for protected endpoint
API_URL="http://localhost:3000" \
HEADERS="{\"Authorization\":\"Bearer $TOKEN\"}" \
  node .specflow/skills/uat-execution/api-runner.mjs GET /api/user/profile
```

### Step 3: Collect Results

```json
{
  "scenario": "Login with valid credentials",
  "mode": "api",
  "steps": [
    {
      "gherkin": "When I POST to '/api/login'",
      "request": {
        "method": "POST",
        "endpoint": "/api/login",
        "body": {"email": "test@example.com", "password": "password123"}
      },
      "response": {
        "status": 200,
        "body": {"success": true, "token": "eyJ..."}
      },
      "status": "pass"
    },
    {
      "gherkin": "Then the response status should be 200",
      "expected": 200,
      "actual": 200,
      "status": "pass"
    },
    {
      "gherkin": "And the response body should contain 'token'",
      "expected": "token",
      "actual": "found at $.token",
      "status": "pass"
    }
  ],
  "overall": "pass"
}
```

## Gherkin Pattern Mapping

| Gherkin Pattern | API Action |
|-----------------|------------|
| `When I GET "/path"` | `GET /path` |
| `When I POST to "/path" with:` | `POST /path` with body from table |
| `When I PUT "/path" with:` | `PUT /path` with body |
| `When I DELETE "/path"` | `DELETE /path` |
| `Then the response status should be {code}` | Assert status code |
| `And the response body should contain "{text}"` | Assert body includes text |
| `And the response header "{name}" should be "{value}"` | Assert header value |
| `And the response should have JSON path "{path}"` | Assert JSON path exists |

## Credential Handling

Order of credential resolution:

1. **Environment variables:** `API_KEY`, `AUTH_TOKEN`, `BEARER_TOKEN`
2. **Secrets file:** `.specflow/secrets.json` (gitignored)
3. **Prompt user:** Ask for credentials, offer to save
4. **Skip:** Run without auth (may fail protected endpoints)

```json
// .specflow/secrets.json (gitignored)
{
  "API_KEY": "sk-...",
  "AUTH_TOKEN": "eyJ..."
}
```

## Evidence Capture

Save all API responses for review:

```bash
mkdir -p .specflow/features/${FEATURE}/evidence/api

# Save response to evidence file
node .specflow/skills/uat-execution/api-runner.mjs GET /api/health \
  > .specflow/features/${FEATURE}/evidence/api/health-check.json
```

## Limitations

- No browser interaction (use browser mode for UI)
- WebSocket testing not supported
- File uploads need multipart handling
- GraphQL requires specific query formatting
