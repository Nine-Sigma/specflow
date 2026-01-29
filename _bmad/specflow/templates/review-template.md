# Review: {Feature Name}

**Generated:** {timestamp}
**Spec:** .specflow/specs/{feature}/spec.md
**Status:** {PENDING | IN_REVIEW | COMPLETE}

---

## BOSS Criteria Validation

Criteria Reviewer evaluated acceptance criteria against the BOSS framework.

### Validation Results

| Criterion | Binary | Observable | Specific | Testable | Confidence |
|-----------|--------|------------|----------|----------|------------|
| {criterion text} | {pass/fail} | {pass/fail} | {pass/fail} | {pass/fail} | {high/borderline/low} |

**Summary:**
- Total criteria: {count}
- Clear pass: {count}
- Borderline: {count}
- Clear fail: {count}

### Rewrite Suggestions

<!-- Repeat for each criterion needing improvement -->

**Criterion:** {original text}
**Issue:** {which BOSS attribute failed and why}
**Suggested:** {improved version}
**Reasoning:** {why this is better}

---

<!-- If no rewrites needed -->
All acceptance criteria meet BOSS requirements. No rewrites suggested.

---

## Domain Reviews

### Security Review (Jordan)

| Aspect | Status | Notes |
|--------|--------|-------|
| Threat Model | {complete/needs-work/missing} | {brief notes} |
| STRIDE Coverage | {6/6 categories} | {gaps if any} |
| Trust Boundaries | {defined/unclear} | {notes} |
| Mitigations | {adequate/insufficient} | {notes} |

**Key Concerns:**
- {concern 1}
- {concern 2}

**Recommendation:** {APPROVE | REVISE | BLOCK}

---

### Cost Review (Taylor)

| Aspect | Status | Notes |
|--------|--------|-------|
| Estimate Provided | {yes/no} | {monthly estimate if yes} |
| Assumptions Listed | {yes/partial/no} | {gaps if any} |
| Scale Considered | {yes/no} | {notes on load assumptions} |
| Provider Pricing | {current/outdated} | {last verified date} |

**Key Concerns:**
- {concern 1}
- {concern 2}

**Recommendation:** {APPROVE | REVISE | BLOCK}

---

### QA Review

| Aspect | Status | Notes |
|--------|--------|-------|
| Gherkin Scenarios | {count} scenarios | {meets minimum 6?} |
| Happy Paths | {count} | {need 2+} |
| Error Paths | {count} | {need 2+} |
| Edge Cases | {count} | {need 1+} |
| Security Scenarios | {count} | {need 1+} |
| Test Readiness | {ready/needs-work} | {blockers if any} |

**Edge Cases Covered:**
- {edge case 1}
- {edge case 2}

**Edge Cases Missing:**
- {missing edge case 1}
- {none identified}

**Recommendation:** {APPROVE | REVISE | BLOCK}

---

## Consolidated Issues

<!-- Prioritized list of all issues from domain reviews -->

| Priority | Domain | Issue | Resolution |
|----------|--------|-------|------------|
| {1} | {domain} | {issue description} | {required action} |

---

## PM Gate Decision

**Overall Status:** {APPROVED | NEEDS_REVISION | ESCALATE_TO_USER}

**Blocking Issues:**
- {issue 1}
- {none}

**Non-Blocking Recommendations:**
- {recommendation 1}
- {none}

**PM Notes:**
{PM agent commentary on decision rationale}

---

## Next Steps

### If APPROVED
1. Generate handoff-to-execution.md
2. Move to .specflow/handoffs/ for watcher pickup
3. Execution Swarm begins implementation

### If NEEDS_REVISION
1. Return spec to author with feedback
2. Author addresses issues
3. Resubmit for review

### If ESCALATE_TO_USER
1. Pause automation
2. Present issues to user in terminal
3. User decides how to proceed
4. Record decision and continue or abort

---

**Review complete.** See approval.md for final decision record.

---
*Template: review-template.md*
*Used by: review-swarm.sh*
