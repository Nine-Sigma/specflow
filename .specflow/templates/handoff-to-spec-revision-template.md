# Handoff: Spec Revision Required

**Feature:** {feature-name}
**Generated:** {timestamp}
**Revision:** {N} of 3 (max before user escalation)

---

## Revision Context

**Original Spec:** .specflow/specs/{feature}/spec.md
**Review:** .specflow/specs/{feature}/review.md
**Approval Attempt:** .specflow/specs/{feature}/approval.md

### Gate Decision

- **Decision:** NEEDS_REVISION
- **Reason:** {brief explanation}

---

## Issues to Address

| # | Domain | Issue | Required Fix |
|---|--------|-------|--------------|
| 1 | {Security/Cost/QA/BOSS} | {issue description} | {specific fix} |
| 2 | {Security/Cost/QA/BOSS} | {issue description} | {specific fix} |
| 3 | {Security/Cost/QA/BOSS} | {issue description} | {specific fix} |

### Do NOT Change

These aspects passed review and should remain as-is:

- {aspect that passed review and should remain}
- {aspect that passed review and should remain}
- {aspect that passed review and should remain}

---

## Source Feedback

### From Security Review

<!-- Include if Security raised concerns -->
{Specific security feedback from review.md}

### From Cost Review

<!-- Include if Cost raised concerns -->
{Specific cost feedback from review.md}

### From QA Review

<!-- Include if QA raised concerns -->
{Specific QA feedback from review.md}

### From BOSS Validation

<!-- Include if criteria failed BOSS -->
{Specific criteria that need rewriting, with suggested improvements}

---

## Handoff Instructions

This file triggers spec-orchestrator (sf-work.sh) to:

1. Read this revision request
2. Re-invoke spec swarm with feedback
3. Generate updated spec addressing issues above
4. Re-submit for review

**Workflow:** handoff-to-spec-revision.md -> sf-work.sh watcher -> spec-swarm restart

### Spec Swarm Re-entry

When spec-orchestrator detects this handoff:

```
1. Parse issues from this file
2. Load original spec context
3. Spawn spec agents with revision instructions
4. Agents address specific issues only (not full rewrite)
5. Generate updated draft-spec.md
6. Write handoff-to-review.md for review swarm
```

### Revision Limit Enforcement

- Current revision: {N}
- Max revisions: 3
- If revision > 2: PM escalates to user instead of another revision cycle

---

## File Pickup

**Watcher monitors:** `.specflow/handoffs/`
**This file:** `.specflow/handoffs/handoff-to-spec-revision.md`
**Pickup trigger:** File creation detected by sf-work.sh polling loop

After pickup, this file is moved to `.specflow/handoffs/archive/` with timestamp.

---

*Template: handoff-to-spec-revision-template.md*
*Used by: pm-spec-gate.md workflow*
*Consumed by: sf-work.sh spec-orchestrator*
