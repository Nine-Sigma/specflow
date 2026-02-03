# UAT Credential Handling

Secure credential management for automated UAT execution.

## Credential Chain

UAT executor attempts credentials in this order:

1. **Environment Variables** - CI/CD friendly, highest priority
2. **secrets.json** - Local development, gitignored file
3. **Interactive Prompt** - Fallback when running interactively
4. **Skip Auth Scenarios** - Mark scenarios as skipped if auth unavailable

## Environment Variables

| Variable | Purpose | Example |
|----------|---------|---------|
| `SPECFLOW_UAT_USERNAME` | Login username/email | `test@example.com` |
| `SPECFLOW_UAT_PASSWORD` | Login password | `TestPass123!` |
| `SPECFLOW_UAT_API_KEY` | API authentication key | `sk_test_abc123` |
| `SPECFLOW_UAT_API_SECRET` | API authentication secret | `secret_xyz789` |
| `SPECFLOW_UAT_BASE_URL` | Override app URL | `http://localhost:4000` |
| `SPECFLOW_UAT_TOKEN` | Pre-authenticated token | `Bearer eyJ...` |

**Usage in CI:**
```bash
# GitHub Actions
env:
  SPECFLOW_UAT_USERNAME: ${{ secrets.TEST_USERNAME }}
  SPECFLOW_UAT_PASSWORD: ${{ secrets.TEST_PASSWORD }}

# Local export
export SPECFLOW_UAT_USERNAME="test@example.com"
export SPECFLOW_UAT_PASSWORD="password123"
```

## secrets.json Format

Location: `.specflow/secrets.json` (gitignored)

```json
{
  "uat": {
    "credentials": {
      "username": "test@example.com",
      "password": "password123"
    },
    "api": {
      "key": "<your-api-key>",
      "secret": "<your-api-secret>"
    },
    "tokens": {
      "bearer": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

**Creating secrets.json:**
```bash
# Copy template
cp .specflow/secrets.example.json .specflow/secrets.json

# Or create manually
echo '{"uat":{"credentials":{"username":"","password":""}}}' > .specflow/secrets.json
```

## Security Notes

- **secrets.json is gitignored** - Never commit credentials to version control
- **Passwords stored in plaintext** - Use only for local development
- **CI should use environment variables** - Inject from CI secrets store
- **Never log credentials** - UAT executor masks credential values in output
- **Token refresh** - If using tokens, ensure they're valid before test run

## First-Time Setup Flow

```
UAT Executor Start
       |
       v
+------------------+
| Check ENV vars   |
| SPECFLOW_UAT_*   |
+------------------+
       |
   Found? ----YES----> Use env credentials
       |
       NO
       |
       v
+------------------+
| Check secrets.json|
| .specflow/secrets |
+------------------+
       |
   Found? ----YES----> Load credentials
       |
       NO
       |
       v
+------------------+
| Interactive mode?|
+------------------+
       |
   YES? ----YES----> Prompt user
       |              (offer to save to secrets.json)
       NO
       |
       v
+------------------+
| Skip auth scenarios|
| Mark as SKIPPED   |
+------------------+
```

## Credential Scope

Different credentials may be needed for different test types:

| Test Type | Credentials Used |
|-----------|-----------------|
| Browser login | `username`, `password` |
| API auth | `api.key`, `api.secret` |
| Pre-authenticated | `tokens.bearer` |
| Public endpoints | None required |

## Multiple Users

For tests requiring multiple user accounts:

```json
{
  "uat": {
    "users": {
      "admin": {
        "username": "admin@example.com",
        "password": "adminPass123"
      },
      "member": {
        "username": "member@example.com",
        "password": "memberPass123"
      }
    }
  }
}
```

Reference in Gherkin:
```gherkin
Given I am logged in as "admin"
When I visit the admin dashboard
Then I should see "User Management"
```
