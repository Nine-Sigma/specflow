# Pre-Deployment Security Checklist

Final security verification before production deployment.

## Purpose

This checklist catches configuration and operational security issues that code review may miss. Run through before every production deployment.

---

## Authentication

- [ ] **Password hashing uses bcrypt/argon2/scrypt** (not MD5/SHA1)
  - Verify: Check password storage code, confirm cost factor >= 10 for bcrypt

- [ ] **Session tokens regenerated on login**
  - Verify: Log in, check that session ID changes after successful auth

- [ ] **JWT tokens have expiration (< 15 minutes for access tokens)**
  - Verify: Decode a token, confirm `exp` claim exists and is reasonable

- [ ] **Refresh token rotation enabled**
  - Verify: Use refresh token, confirm old token is invalidated

- [ ] **Account lockout after failed attempts (5-10 attempts)**
  - Verify: Attempt 10 wrong passwords, confirm account locks

## Authorization

- [ ] **All endpoints have authorization checks**
  - Verify: Test each endpoint without auth token, confirm 401 response

- [ ] **Resource ownership verified before access**
  - Verify: Try accessing another user's resource, confirm 403 response

- [ ] **Admin functions require admin role (not just auth)**
  - Verify: Access admin endpoint as regular user, confirm denied

- [ ] **No privilege escalation paths**
  - Verify: Try setting `isAdmin: true` in request body, confirm ignored

## Input Validation

- [ ] **All user input validated before use**
  - Verify: Send malformed data to each endpoint, confirm validation errors

- [ ] **SQL queries parameterized (no string concatenation)**
  - Verify: Search codebase for SQL, confirm all use parameterization

- [ ] **File uploads restricted (size, type, location)**
  - Verify: Try uploading oversized file, confirm rejected
  - Verify: Try uploading executable, confirm rejected

- [ ] **Allowlist validation preferred over blocklist**
  - Verify: Check validation logic uses explicit allowed values

## Output Encoding

- [ ] **XSS prevention for user-generated content**
  - Verify: Submit `<script>alert(1)</script>` as input, confirm escaped in output

- [ ] **Content-Type headers set correctly**
  - Verify: API responses have `Content-Type: application/json`

- [ ] **JSON responses use proper serialization**
  - Verify: No raw string concatenation for JSON output

## Secrets Management

- [ ] **No hardcoded secrets in code**
  - Verify: Search codebase for `password`, `secret`, `key`, `token`
  - Verify: Run `gitleaks` or `trufflehog` on repository

- [ ] **Environment variables used for configuration**
  - Verify: Check .env.example exists, actual .env is in .gitignore

- [ ] **Production secrets rotated from development**
  - Verify: Production API keys are different from staging/dev

- [ ] **.env and credential files in .gitignore**
  - Verify: `.env`, `*.pem`, `credentials.json` are gitignored

## Error Handling

- [ ] **No stack traces in production responses**
  - Verify: Trigger an error, confirm response has generic message

- [ ] **Generic error messages for end users**
  - Verify: Errors say "Something went wrong", not "SQL syntax error at..."

- [ ] **Internal error details logged (not exposed)**
  - Verify: Check logs contain stack trace when error occurs

- [ ] **No empty catch blocks in critical paths**
  - Verify: Search for `catch {}` or `catch (e) {}`, review each

## Logging

- [ ] **Security events logged (login, logout, failed auth)**
  - Verify: Check logs show auth events with timestamp and user

- [ ] **No sensitive data in logs (passwords, tokens, PII)**
  - Verify: Search logs for common sensitive fields

- [ ] **Log injection prevented**
  - Verify: User input with newlines doesn't create fake log entries

- [ ] **Logs accessible for incident response**
  - Verify: Can retrieve logs from last 30 days

## Dependencies

- [ ] **No known vulnerabilities in dependencies**
  - Verify: Run `npm audit --audit-level=high` or equivalent

- [ ] **Lockfile present and committed**
  - Verify: `package-lock.json` or `yarn.lock` exists in repo

- [ ] **Dependency sources trusted**
  - Verify: No private registries without verification

## Transport Security

- [ ] **HTTPS enforced for all endpoints**
  - Verify: HTTP requests redirect to HTTPS or fail

- [ ] **TLS 1.2+ required (no SSL 3.0, TLS 1.0/1.1)**
  - Verify: SSL Labs scan shows A rating

- [ ] **Secure cookies enabled (HttpOnly, Secure, SameSite)**
  - Verify: Inspect cookies in browser DevTools

## Security Headers

- [ ] **Content-Security-Policy configured**
  - Verify: Response has CSP header preventing inline scripts

- [ ] **X-Frame-Options set (DENY or SAMEORIGIN)**
  - Verify: Response has X-Frame-Options header

- [ ] **X-Content-Type-Options: nosniff**
  - Verify: Response has header preventing MIME sniffing

- [ ] **Strict-Transport-Security enabled (HSTS)**
  - Verify: Response has HSTS header with max-age >= 1 year

## Production Configuration

- [ ] **Debug mode disabled**
  - Verify: NODE_ENV=production, DEBUG=false

- [ ] **Default credentials changed**
  - Verify: No admin/admin, root/root, test accounts

- [ ] **Unnecessary endpoints removed**
  - Verify: /debug, /test, /metrics not publicly accessible

- [ ] **Rate limiting enabled on public endpoints**
  - Verify: Rapid requests get 429 response

---

## Quick Verification Commands

```bash
# Check for secrets in code
gitleaks detect --source . --verbose
trufflehog filesystem .

# Audit dependencies
npm audit --audit-level=high
pip check
safety check

# Check security headers
curl -I https://your-domain.com | grep -E "Content-Security|X-Frame|Strict-Transport"

# SSL/TLS verification
openssl s_client -connect your-domain.com:443 -tls1_2
```

## Sign-off

| Check Area | Verified By | Date |
|------------|-------------|------|
| Authentication | | |
| Authorization | | |
| Input Validation | | |
| Secrets Management | | |
| Error Handling | | |
| Logging | | |
| Dependencies | | |
| Transport Security | | |
| Security Headers | | |
| Production Config | | |

**Deployment approved:** [ ] Yes / [ ] No - Issues to resolve: _____________
