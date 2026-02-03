# Review Escalation Rules

<!-- Source: SpecFlow v2.2 - created for Multi-Lens Review System -->

This file defines when Review escalates to PM instead of continuing the fix loop. All triggers are binary (YES/NO) decisions following BOSS criteria (Binary, Observable, Specific, Scope-bound).

## Purpose

Clear escalation rules ensure:
- Review loops converge (don't run forever)
- PM is involved only when necessary
- Decisions are consistent and predictable
- User is protected from unnecessary interruptions

## Escalation Triggers

| Trigger | Condition | Action | PM Receives |
|---------|-----------|--------|-------------|
| CRITICAL finding | severity == CRITICAL after iteration 2 | Immediate escalation | Full finding details + Review recommendation |
| Max iterations | iteration >= 3 with findings remaining | Escalate with history | All versions, fix attempts, remaining issues |
| Dev/QA disagreement | Conflict in COMMS/ unresolved | Escalate conflict | Both perspectives + Review's opinion |
| Scope ambiguity | Finding doesn't map to any AC | Escalate for decision | Finding details + scope question |
| Architecture concern | Fix requires cross-cutting change | Escalate for decision | Concern + impact analysis |
| User decision needed | Trade-off requires user input | Escalate to PM→User | Options + Review recommendation |

## Binary Trigger Checks

Each check is a YES/NO decision. No ambiguity.

### Check 1: Is severity CRITICAL after remediation attempt?

```
IF finding.severity == CRITICAL AND iteration >= 2:
    THEN escalate immediately
    WHY: CRITICAL findings block merge; if not fixed after first attempt, needs PM
```

### Check 2: Is this iteration 3 or higher with findings?

```
IF iteration >= 3 AND status == findings:
    THEN escalate with full history
    WHY: Fix loop not converging after 3 attempts
```

### Check 3: Does finding reference any AC?

```
IF finding.ac_reference == "AC-??" OR finding.ac_reference is null:
    THEN escalate for scope clarification
    WHY: Can't verify if finding is in scope without AC traceability
```

### Check 4: Is there a COMMS/ conflict?

```
IF COMMS/ contains disagreement AND resolution is contested:
    THEN escalate for conflict resolution
    WHY: Agents cannot resolve disagreement autonomously
```

### Check 5: Does fix require architecture change?

```
IF fix_requires_new_table OR fix_requires_new_service OR fix_changes_api_contract:
    THEN escalate for architecture decision
    WHY: Cross-cutting changes need PM/Architect approval
```

### Check 6: Is this a trade-off requiring user preference?

```
IF multiple_valid_fixes AND choice_affects_user_experience:
    THEN escalate for user decision
    WHY: User preference trumps Review opinion on UX trade-offs
```

## Escalation Format

When Review escalates to PM, use this format:

```markdown
**ESCALATE TO PM**

Feature: {slug}
Review Iteration: {N}
Lens: {code|test|security|arch|perf}
Trigger: {which trigger from table above}

## Issue Summary

{2-3 sentence summary of what happened and why escalation is needed}

## Review Recommendation

{What Review thinks should happen. Be specific.}

## Supporting Evidence

### Findings History

| Version | Findings | Status |
|---------|----------|--------|
| v1 | C-01, M-01, M-02 | Fixed C-01, M-01 |
| v2 | M-02 | Partial fix |
| v3 | M-02 | Same issue persists |

### Relevant Files

- `8-review-output-v1.md`: Initial review
- `8-review-output-v3.md`: Current state
- `COMMS/dev-to-review-001.md`: Dev's explanation (if applicable)

## Decision Needed

{Specific question for PM. Must be answerable with a clear action.}

Options:
1. {Option A} - {brief pro/con}
2. {Option B} - {brief pro/con}
3. {Option C} - {brief pro/con}
```

## PM Response Handling

| PM Response | Review Action |
|-------------|---------------|
| APPROVED | Mark finding as resolved (PM override), continue workflow |
| NEEDS_REVISION | Create new fix context, route back to Dev/QA |
| ESCALATE_TO_USER | Wait for PM to return with user decision |
| OUT_OF_SCOPE | Remove finding from review, continue workflow |
| DEFER | Log for future, continue workflow without blocking |

### After PM Response

1. Update `8-review-output-v{N+1}.md` with PM decision
2. Add to PROGRESS.md: "PM escalation resolved: {decision}"
3. Continue workflow based on response type

## Non-Escalation Path

**Most issues stay within the Review -> Dev/QA loop.**

Escalation is the exception, not the norm. Good reviews minimize escalations by:

- Writing specific, actionable fix instructions
- Referencing exact AC for each finding
- Limiting scope to what's actually broken (not style preferences)
- Using MAJOR/MINOR appropriately (reserve CRITICAL for true blockers)

### Escalation Rate Guidance

| Rate | Assessment |
|------|------------|
| < 5% of reviews | Healthy - Review is effective |
| 5-15% | Normal - Some ambiguity expected |
| 15-30% | Concerning - Review may be too strict or specs unclear |
| > 30% | Problem - Investigate root cause |

If escalation rate is high, consider:
- Are specs sufficiently detailed?
- Is Review applying appropriate severity?
- Are Dev/QA understanding fix instructions?
- Is there a systemic architecture issue?

## Quick Reference: When NOT to Escalate

Do NOT escalate when:

- Finding is MINOR (never escalate MINOR)
- Dev/QA acknowledges issue and is working on fix (give them 3 iterations)
- Finding is style/convention that doesn't affect functionality
- You're on iteration 1 or 2 with MAJOR findings (let fix loop work)
- Dev provided valid alternative solution (accept if it meets AC)

## Escalation Anti-Patterns

| Anti-Pattern | Why It's Wrong | Do Instead |
|--------------|----------------|------------|
| Escalate MINOR findings | Wastes PM time | Accept or drop MINOR if Dev disagrees |
| Escalate after iteration 1 | Didn't give Dev a chance | Wait for iteration 2 minimum |
| Escalate style disagreements | Not Review's job to enforce style | Let team conventions guide |
| Escalate without recommendation | Unhelpful to PM | Always include what you think should happen |
| Escalate vague issues | PM can't decide without specifics | Include exact location, AC reference, evidence |
