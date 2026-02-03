# Review Output Format

<!-- Source: SpecFlow v2.2 - created for Multi-Lens Review System -->

This file defines the standardized output format for all review lenses. All lenses write to `8-review-output.md` (or versioned `8-review-output-v{N}.md` for iterations) following this structure.

## Purpose

A consistent output format enables:
- Review Orchestrator to process findings uniformly across lenses
- Dev/QA to receive self-contained fix instructions
- PM to assess review status without parsing custom formats
- Versioned tracking of fix iterations

## Frontmatter Schema

```yaml
---
agent: review-{lens}
lens: code|test|security|arch|perf
created: {iso-timestamp}
version: v{1|2|3}
status: findings|clean|escalated
scope_level: trivial|small|medium|large|complex
iteration: 1|2|3
reviewed_files:
  - src/file1.ts
  - src/file2.ts
---
```

| Field | Type | Description |
|-------|------|-------------|
| agent | string | Agent that wrote this review (e.g., review-code) |
| lens | enum | Which lens produced this output |
| created | ISO timestamp | When review was written |
| version | string | v1, v2, v3 for iterations |
| status | enum | findings (has issues), clean (no issues), escalated (sent to PM) |
| scope_level | enum | From 0-scope.md |
| iteration | number | Current fix iteration (1-3) |
| reviewed_files | array | Files included in this review |

## Sections Template

```markdown
---
{frontmatter as above}
---

# {Feature Name} - {Lens} Review

## Summary

{2-3 sentence summary of review findings. State total findings by severity and overall assessment.}

## Findings

### CRITICAL (blocks merge)

| ID | Location | Issue | AC Reference | Severity |
|----|----------|-------|--------------|----------|
| C-01 | file:line | {description} | AC-XX | CRITICAL |

### MAJOR (should fix)

| ID | Location | Issue | AC Reference | Severity |
|----|----------|-------|--------------|----------|
| M-01 | file:line | {description} | AC-XX | MAJOR |

### MINOR (nice to have)

| ID | Location | Issue | AC Reference | Severity |
|----|----------|-------|--------------|----------|
| m-01 | file:line | {description} | AC-XX | MINOR |

## Fix Instructions

### C-01: {Issue Title}

**What's wrong:** {detailed explanation of the problem}
**How to fix:** {specific, actionable instructions}
**Files to change:** {list of files requiring modification}

### M-01: {Issue Title}

**What's wrong:** {detailed explanation}
**How to fix:** {specific instructions}
**Files to change:** {file list}

## Verification

After fixes, verify:
- [ ] {verification step for C-01}
- [ ] {verification step for M-01}
- [ ] All tests pass
- [ ] No new issues introduced
```

## Severity Definitions

| Severity | Impact | Blocks Merge | Examples |
|----------|--------|--------------|----------|
| CRITICAL | Security vulnerability, data loss risk, crashes, incorrect core behavior | YES | XSS vulnerability, SQL injection, authentication bypass, data corruption, null pointer on main path |
| MAJOR | Performance issue, UX degradation, edge case failures, incomplete feature | Should fix | N+1 query, missing error handling, poor accessibility, missing validation |
| MINOR | Style issue, naming convention, minor optimization, documentation | Nice to have | Inconsistent naming, missing JSDoc, non-idiomatic code style |

### Severity Decision Tree

1. **Could this cause security breach or data loss?** YES = CRITICAL
2. **Does this break core functionality?** YES = CRITICAL
3. **Could this cause user-facing issues in production?** YES = MAJOR
4. **Does this violate an acceptance criterion?** YES = MAJOR
5. **Is this a quality/style concern?** YES = MINOR

## AC Reference Requirement

**All findings MUST reference AC-XX from 1-spec.md.**

This ensures:
- Findings trace to requirements
- Out-of-scope issues are flagged (no AC reference = may be scope creep)
- Dev/QA can verify fix addresses the specific acceptance criterion

If a finding doesn't map to any AC:
1. Mark as `AC-??` in the table
2. Note in Fix Instructions: "No direct AC mapping - verify with PM if in scope"
3. Consider escalation if issue is significant

## Versioning Convention

| Version | Meaning | File Name |
|---------|---------|-----------|
| v1 | Initial review | 8-review-output.md OR 8-review-output-v1.md |
| v2 | First fix iteration reviewed | 8-review-output-v2.md |
| v3 | Second fix iteration reviewed | 8-review-output-v3.md |

**Iteration rules:**
- First review creates v1
- After fixes applied, Review creates v2 with focused re-review
- Max 3 iterations before PM escalation
- Each version is a complete snapshot (not a diff)

## ID Conventions

| Severity | Prefix | Example |
|----------|--------|---------|
| CRITICAL | C- | C-01, C-02 |
| MAJOR | M- | M-01, M-02 |
| MINOR | m- | m-01, m-02 |

IDs are unique within a single review output. Across versions, same issue keeps same ID for traceability.

## Example Output

```markdown
---
agent: review-code
lens: code
created: 2026-02-01T10:30:00Z
version: v1
status: findings
scope_level: medium
iteration: 1
reviewed_files:
  - src/auth/login.ts
  - src/auth/session.ts
---

# User Login - Code Review

## Summary

Code review identified 1 CRITICAL, 2 MAJOR, and 1 MINOR finding. The critical issue is a potential SQL injection vulnerability in the login handler. Major issues involve missing rate limiting and incomplete error handling. Recommend addressing all CRITICAL and MAJOR before merge.

## Findings

### CRITICAL (blocks merge)

| ID | Location | Issue | AC Reference | Severity |
|----|----------|-------|--------------|----------|
| C-01 | src/auth/login.ts:47 | User input concatenated into SQL query without parameterization | AC-01 | CRITICAL |

### MAJOR (should fix)

| ID | Location | Issue | AC Reference | Severity |
|----|----------|-------|--------------|----------|
| M-01 | src/auth/login.ts:12 | No rate limiting on login endpoint | AC-03 | MAJOR |
| M-02 | src/auth/session.ts:89 | Missing error handling for session storage failure | AC-02 | MAJOR |

### MINOR (nice to have)

| ID | Location | Issue | AC Reference | Severity |
|----|----------|-------|--------------|----------|
| m-01 | src/auth/login.ts:5 | Function name `doLogin` should be `handleLogin` per naming conventions | AC-?? | MINOR |

## Fix Instructions

### C-01: SQL Injection in Login Handler

**What's wrong:** Line 47 concatenates `username` directly into SQL query: `SELECT * FROM users WHERE username = '${username}'`. This allows SQL injection attacks.

**How to fix:** Use parameterized queries:
```typescript
const result = await db.query(
  'SELECT * FROM users WHERE username = $1',
  [username]
);
```

**Files to change:** src/auth/login.ts

### M-01: Missing Rate Limiting

**What's wrong:** Login endpoint accepts unlimited requests, enabling brute force attacks.

**How to fix:** Add rate limiting middleware (e.g., express-rate-limit) with max 5 attempts per IP per minute.

**Files to change:** src/auth/login.ts, src/middleware/rateLimit.ts (create)

### M-02: Missing Error Handling for Session Storage

**What's wrong:** Session save on line 89 doesn't handle Redis connection failures.

**How to fix:** Wrap in try/catch, return 503 with retry-after header on storage failure.

**Files to change:** src/auth/session.ts

## Verification

After fixes, verify:
- [ ] C-01: Run SQL injection test suite, verify parameterized query in code
- [ ] M-01: Test rate limit triggers after 5 failed attempts
- [ ] M-02: Test behavior when Redis is unavailable
- [ ] All existing tests pass
- [ ] No new security warnings from linter
```

## Clean Review Output

When review finds no issues:

```markdown
---
agent: review-code
lens: code
created: 2026-02-01T11:00:00Z
version: v1
status: clean
scope_level: medium
iteration: 1
reviewed_files:
  - src/auth/login.ts
---

# User Login - Code Review

## Summary

Code review completed with no findings. Implementation follows security best practices, error handling is comprehensive, and code style is consistent.

## Findings

### CRITICAL (blocks merge)

None.

### MAJOR (should fix)

None.

### MINOR (nice to have)

None.

## Verification

Review passed. Ready for next lens or merge.
```
