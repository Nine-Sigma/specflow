---
name: app-security
description: OWASP-based code-level vulnerability detection for auth, input, API, secrets, payment, and crypto patterns
review-capable: true
security-capable: true
scope-minimum: small
triggers:
  files:
    - "*.ts"
    - "*.tsx"
    - "*.js"
    - "*.jsx"
    - "*.py"
    - "*.go"
    - "*.java"
    - "src/**/*"
    - "api/**/*"
    - "auth/**/*"
  patterns:
    - "password"
    - "token"
    - "session"
    - "auth"
    - "login"
    - "jwt"
    - "bcrypt"
    - "crypto"
    - "encrypt"
    - "secret"
    - "api[_-]?key"
    - "payment"
    - "stripe"
    - "credit"
    - "card"
    - "pii"
    - "ssn"
    - "SELECT.*FROM"
    - "INSERT.*INTO"
    - "eval\\("
    - "exec\\("
    - "innerHTML"
    - "dangerouslySetInnerHTML"
---

# Application Security Skill

OWASP Top 10 code-level vulnerability detection for application security review.

## What This Skill Detects

This skill detects code-level vulnerabilities using OWASP Top 10 2021 methodology:

| OWASP Category | Code Patterns | Severity |
|----------------|---------------|----------|
| A01: Broken Access Control | Missing auth checks, IDOR, privilege escalation | CRITICAL |
| A02: Cryptographic Failures | Hardcoded secrets, weak algorithms, cleartext storage | CRITICAL |
| A03: Injection | SQL injection, XSS, command injection | CRITICAL |
| A04: Insecure Design | Missing rate limits, business logic flaws | MAJOR |
| A05: Security Misconfiguration | Debug mode, verbose errors, default credentials | MAJOR |
| A06: Vulnerable Components | Known CVEs in dependencies | MAJOR |
| A07: Auth Failures | Weak passwords, missing MFA, session fixation | CRITICAL |
| A08: Integrity Failures | Unsafe deserialization, missing integrity checks | MAJOR |
| A09: Logging Failures | Missing security events, sensitive data in logs | MINOR |
| A10: SSRF | Unvalidated URLs, internal service access | CRITICAL |

**Complements STRIDE:** STRIDE (Jordan's 3-security.md) analyzes architecture-level threats during design phase. This skill analyzes code-level vulnerabilities during review phase.

## When to Use

- **Code review phase** - After Dev implementation, before merge
- **Security-focused review** - When PM requests security review
- **Pre-deployment** - Final security verification before release
- **Auth/payment changes** - Any code touching sensitive contexts

## Semantic Context Detection

This skill uses semantic reasoning to understand code PURPOSE, not just pattern matching.

### Context Identification

Before analyzing code, identify the security context:

| Context | How to Identify | Scrutiny Level |
|---------|-----------------|----------------|
| Authentication | File path contains auth/login/session, function handles credentials | CRITICAL |
| Payment | File path contains payment/billing/checkout, Stripe/PayPal integration | CRITICAL |
| PII | Variables contain ssn/dob/address, database fields marked personal/sensitive | CRITICAL |
| API | Route handlers, controllers, fetch/axios calls | HIGH |
| Secrets | Environment variables, config files, API keys | HIGH |
| Crypto | Encryption/decryption, hashing, signing | HIGH |
| General | Utilities, helpers, formatters | STANDARD |

### Semantic vs Syntactic Detection

**Syntactic (regex):** Matches keyword "password" anywhere in code
**Semantic (reasoning):** Understands that this function HANDLES passwords and requires bcrypt

```typescript
// Syntactic would miss this - no "password" keyword
function updateCredentials(cred: string) {
  user.secret = cred;  // SEMANTIC: This IS a password operation
}
```

Load context heuristics from: `patterns/semantic-context.md`

## Execution Methodology

### Step 1: Load Checklists

```
READ checklists/owasp-top10.md
READ checklists/pre-deployment.md
READ patterns/semantic-context.md
```

### Step 2: Identify Changed Files

From review context, identify files being reviewed.

### Step 3: Detect Security Contexts

For each file:
1. Check file path for auth/payment/PII markers
2. Scan function names for security-relevant operations
3. Identify external API calls and data flows
4. Assign scrutiny level per context detection table

### Step 4: Apply OWASP Checklist

For each file by context:

**CRITICAL context (auth/payment/PII):**
- Apply ALL OWASP categories with maximum scrutiny
- Every potential vulnerability is escalated
- Missing security controls are MAJOR at minimum

**HIGH context (API/secrets/crypto):**
- Focus on A01, A02, A03, A07, A10
- Check input validation, authorization, secrets handling
- Missing controls are MAJOR

**STANDARD context:**
- Focus on A03 (injection), A09 (logging)
- Style-only issues are MINOR

### Step 5: Generate Findings

For each finding:
1. Assign OWASP category (A01-A10)
2. Map to AC from 1-spec.md if applicable
3. Determine severity per calibration table
4. Provide anti-pattern and correct pattern examples
5. Route to Dev (never QA)

### Step 6: Include Pre-Deployment Checklist

After findings, include pre-deployment security checklist for final verification.

## Severity Calibration

| Scenario | Severity | Rationale |
|----------|----------|-----------|
| Auth bypass possible | CRITICAL | Direct security breach |
| SQL/XSS injection exploitable | CRITICAL | Data compromise |
| Hardcoded secrets in code | CRITICAL | Credential exposure |
| Missing input validation | MAJOR | Potential injection |
| Missing rate limiting | MAJOR | Abuse prevention |
| Session not regenerated | MAJOR | Fixation risk |
| Missing error handling | MAJOR | Information leakage |
| Verbose error messages | MAJOR | Attack surface |
| Missing security headers | MINOR | Defense in depth |
| Auth events not logged | MINOR | Audit trail |
| Non-critical data unencrypted | MINOR | Data protection |

## Output Format

Write to `8-skill-app-security.md` following review output-format.md standard.

### Frontmatter

```yaml
---
skill: app-security
created: {timestamp}
version: v1
status: findings|clean
category: OWASP Top 10
scope_level: {from 0-scope.md}
reviewed_files:
  - {files reviewed}
checked_contexts:
  - authentication
  - payment
  - api
---
```

### Sections

```markdown
# {Feature Name} - Application Security Review

## Summary

OWASP Top 10 review identified {N} findings: {X} CRITICAL, {Y} MAJOR, {Z} MINOR.
Primary concerns: {categories with CRITICAL findings}.

## Findings

### CRITICAL (blocks merge)

| ID | Location | Issue | OWASP Category | AC Reference | Severity |
|----|----------|-------|----------------|--------------|----------|
| A03-01 | file:line | {description} | A03:2021 Injection | AC-XX | CRITICAL |

### MAJOR (should fix)

| ID | Location | Issue | OWASP Category | AC Reference | Severity |
|----|----------|-------|----------------|--------------|----------|

### MINOR (nice to have)

| ID | Location | Issue | OWASP Category | AC Reference | Severity |
|----|----------|-------|----------------|--------------|----------|

## Fix Instructions

### A03-01: {Issue Title}

**OWASP Category:** A03:2021 - Injection
**Context:** Authentication (CRITICAL scrutiny)

**What's wrong:** {detailed explanation}

**Anti-pattern (wrong):**
```{language}
// NEVER DO THIS
{bad code example}
```

**Correct pattern:**
```{language}
// DO THIS INSTEAD
{good code example}
```

**Why this matters:** {security impact}
**Files to change:** {file list}

## Pre-Deployment Checklist

See: checklists/pre-deployment.md

## Verification

After fixes, verify:
- [ ] {verification step per finding}
- [ ] All existing tests pass
- [ ] No new security findings introduced
```

## Routing

All app-security findings route to **Dev** (never QA):
- Security vulnerabilities are implementation issues
- Dev fixes in existing review loop
- Re-review verifies fixes applied correctly

## Related Files

- `checklists/owasp-top10.md` - OWASP Top 10 vulnerability categories with examples
- `checklists/pre-deployment.md` - Pre-deployment security verification
- `patterns/semantic-context.md` - Context detection heuristics

## Skill Capabilities

- `review-capable: true` - Can be invoked during code review
- `security-capable: true` - Discovered when PM requests security review
