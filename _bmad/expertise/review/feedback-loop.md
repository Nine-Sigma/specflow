# Review Feedback Loop

<!-- Source: SpecFlow v2.2 - created for Multi-Lens Review System -->

This file documents how Review routes findings to Dev/QA for fixes. The feedback loop is owned by Review, not PM. PM is only involved for escalations defined in `escalation-rules.md`.

## Purpose

The feedback loop enables:
- Rapid iteration between Review and Dev/QA
- Self-contained fix context (Dev/QA can fix without re-reading all outputs)
- Bounded iterations (max 3 before escalation)
- Clear handoff protocol between agents

## Routing Protocol

1. **Review writes findings** to `8-review-output-v{N}.md`
2. **Review invokes Dev or QA** based on finding type:
   - Code issues, security fixes, performance fixes → `/sf:dev`
   - Test quality issues, test gaps, flaky tests → `/sf:qa`
3. **Invocation includes fix context** (finding IDs, priority order, reference to review output)
4. **Dev/QA applies fixes** and updates their output file
5. **Review performs focused re-review** (iteration N+1)
6. **If clean:** Set status to `clean`, workflow continues to next phase
7. **If findings remain:** Loop continues (max 3 iterations)
8. **If max iterations reached or CRITICAL persists:** Escalate to PM

## Fix Context Format

When Review invokes Dev/QA, include this context block:

```markdown
**Fix Request from Review**

Feature: {feature-slug}
Iteration: {N}
Review Output: `.specflow/features/{slug}/8-review-output-v{N}.md`
Priority: CRITICAL first, then MAJOR

## Findings to Address

| ID | Severity | Brief Description |
|----|----------|-------------------|
| C-01 | CRITICAL | {one-line summary} |
| M-01 | MAJOR | {one-line summary} |

## Instructions

1. Read full finding details in `8-review-output-v{N}.md`
2. Apply fixes following the Fix Instructions section
3. Update your output file (`6-dev-output.md` or `7-qa-output.md`)
4. Confirm fixes complete

## Scope

This fix request is LIMITED to the findings listed above. Do not:
- Refactor unrelated code
- Add features not in the original spec
- Change architecture without escalation
```

## Routing Decision Table

| Finding Type | Route To | Rationale |
|--------------|----------|-----------|
| Security vulnerability | Dev | Code change required |
| Code quality issue | Dev | Code change required |
| Architecture concern | Dev | Design/code change required |
| Performance issue | Dev | Code optimization required |
| Logic error | Dev | Code fix required |
| Test coverage gap | QA | Test creation required |
| Test quality issue | QA | Test improvement required |
| Flaky test | QA | Test stabilization required |
| Missing test scenario | QA | Test addition required |
| Test assertion weakness | QA | Test strengthening required |

### Mixed Findings

When findings route to both Dev and QA:
1. Route to Dev first (code fixes may affect tests)
2. After Dev confirms complete, route to QA
3. Review re-reviews after both complete

## Focused Re-Review

**Iteration 2+ performs focused re-review only.**

This means:
- Only verify the specific findings from previous iteration
- Do not perform full re-review (that would be a new v1)
- Check that fixes don't introduce new CRITICAL issues
- Minor new issues can be noted but don't block if original findings resolved

### Focused Re-Review Checklist

```markdown
## Focused Re-Review (Iteration {N+1})

Previous iteration: v{N}
Findings to verify: {list IDs}

### Verification Results

| ID | Status | Notes |
|----|--------|-------|
| C-01 | FIXED | Parameterized query implemented |
| M-01 | FIXED | Rate limiting added |
| M-02 | PARTIAL | Error handling added but missing retry logic |

### New Issues Found

| ID | Severity | Issue |
|----|----------|-------|
| M-03 | MAJOR | {only if found during verification} |

### Result

- [ ] All previous findings resolved
- [ ] No new CRITICAL issues
- [ ] Ready for next phase OR needs another iteration
```

## Iteration Tracking

| Iteration | What Happens | Outcome |
|-----------|--------------|---------|
| 1 | Initial full review | v1 with findings OR clean |
| 2 | Focused re-review after fixes | v2 with remaining findings OR clean |
| 3 | Final re-review attempt | v3 OR escalate to PM |

**After iteration 3:** If findings remain, escalate to PM with full history. PM decides whether to:
- Override and approve
- Route back for more fixes with guidance
- Escalate to user

## Local-First Requirement

All routing happens via local files. No external services required.

- Review reads Dev/QA outputs from `.specflow/features/{slug}/`
- Dev/QA read Review outputs from same location
- No API calls, webhooks, or external validation
- Works offline and in CI/CD environments

## File Locations

| File | Purpose | Written By |
|------|---------|------------|
| `.specflow/features/{slug}/8-review-output-v{N}.md` | Review findings | Review lenses |
| `.specflow/features/{slug}/6-dev-output.md` | Dev implementation | Dev |
| `.specflow/features/{slug}/7-qa-output.md` | QA test results | QA |
| `.specflow/features/{slug}/PROGRESS.md` | Work log | All agents |

## Communication via COMMS/

If Review needs clarification from Dev/QA (not a fix request), use the COMMS/ protocol:

```markdown
<!-- .specflow/features/{slug}/COMMS/review-to-dev-001.md -->

**From:** /sf:review-code
**To:** /sf:dev
**Subject:** Clarification on C-01 fix approach
**Awaiting:** Response

---

The fix for C-01 could be implemented two ways:
1. Parameterized query (recommended)
2. Input sanitization (less preferred)

Which approach did you take? Need to verify correct pattern was used.
```

This is for clarification only. Fix requests use the Fix Context Format above, not COMMS/.

## Example Full Flow

```
Iteration 1:
  Review → writes 8-review-output-v1.md (2 CRITICAL, 3 MAJOR)
  Review → invokes /sf:dev with fix context
  Dev → applies fixes, updates 6-dev-output.md
  Review → focused re-review

Iteration 2:
  Review → writes 8-review-output-v2.md (1 MAJOR remaining)
  Review → invokes /sf:dev with fix context
  Dev → applies fix, updates 6-dev-output.md
  Review → focused re-review

Iteration 3:
  Review → writes 8-review-output-v3.md (clean)
  Review → status: clean
  Review → returns to orchestrator (ready for next phase)
```
