# Release Gate: {Feature Name}

**Generated:** {timestamp}
**Version:** {version or commit}

## Quality Verification

| Check | Status | Notes |
|-------|--------|-------|
| UAT Scenarios | {pass/fail} | {n}/{total} passed |
| Integration Tests | {pass/fail} | {summary} |
| E2E Tests | {pass/fail} | {summary} |
| Security Scan | {pass/fail} | {findings count} |

## Feature Verification

| Criterion | Status |
|-----------|--------|
| All acceptance criteria met | {yes/no} |
| BOSS compliance validated | {yes/no} |
| PM approval received | {yes/no} |

## Ops Verification

| Check | Status |
|-------|--------|
| No critical test failures | {yes/no} |
| No unresolved flaky tests | {yes/no} |
| Documentation updated | {yes/no} |

## Release Decision

**Status:** {APPROVED_FOR_RELEASE | BLOCKED | NEEDS_REVIEW}

**Blocking Issues:**
- {issue or "none"}

**Non-Blocking Notes:**
- {note or "none"}

**Approved By:** {agent/user}

**Release Notes:**
{summary of changes for changelog}

---

*Release gate complete.*

---
*Template: release-gate-template.md*
*Used by: release-swarm.sh*
