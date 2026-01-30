# /sf:code-review - Review Code Changes

Wraps BMAD `/code-review` with security checklist.

## Usage

```
/sf:code-review
```

## SpecFlow Context

Code review with:
- Security checklist (OWASP Top 10)
- Cost impact assessment
- Test coverage verification

## Prerequisites

- Story implemented (/sf:dev-story)

## Security Checklist

- [ ] No hardcoded secrets (API keys, passwords)
- [ ] Input validation on all user inputs
- [ ] Output encoding for XSS prevention
- [ ] Authentication on protected routes
- [ ] Authorization checks (role-based)
- [ ] Error handling (no info leakage)
- [ ] SQL injection prevention (parameterized queries)
- [ ] CSRF tokens on state-changing requests
- [ ] Rate limiting on public endpoints
- [ ] Logging without sensitive data

## OWASP Top 10 Coverage

| # | Risk | Checked |
|---|------|---------|
| 1 | Broken Access Control | [ ] |
| 2 | Cryptographic Failures | [ ] |
| 3 | Injection | [ ] |
| 4 | Insecure Design | [ ] |
| 5 | Security Misconfiguration | [ ] |
| 6 | Vulnerable Components | [ ] |
| 7 | Auth Failures | [ ] |
| 8 | Data Integrity Failures | [ ] |
| 9 | Logging/Monitoring Failures | [ ] |
| 10 | SSRF | [ ] |

## Cost Impact

- [ ] No N+1 queries
- [ ] Appropriate caching
- [ ] Efficient data structures
- [ ] No unnecessary API calls

## Test Coverage

- [ ] All acceptance criteria have tests
- [ ] Edge cases covered
- [ ] Error paths tested
- [ ] Security scenarios included

## Related

- `/code-review` - Original BMAD
- `/sf:dev-story` - Previous step
- `/sf:pr` - Create pull request
