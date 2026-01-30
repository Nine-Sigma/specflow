# Approval: {Feature Name}

**Generated:** {timestamp}
**Spec:** .specflow/specs/{feature}/spec.md
**Status:** {APPROVED | REVISION_REQUESTED | USER_ESCALATED | USER_APPROVED}

---

## Input Summary

### Review Results

| Domain | Recommendation | Key Concern |
|--------|----------------|-------------|
| Security | {APPROVE/REVISE/BLOCK} | {brief} |
| Cost | {APPROVE/REVISE/BLOCK} | {brief} |
| QA | {APPROVE/REVISE/BLOCK} | {brief} |

### BOSS Validation

- Total criteria: {N}
- High confidence: {N} ({%})
- Borderline: {N} ({%})
- Low confidence: {N} ({%})

### Consensus Status

- Status: {ALIGNED/ESCALATED}
- Rounds: {N}/3
- Unresolved: {count}

---

## PM Decision

**Decision:** {APPROVED | NEEDS_REVISION | ESCALATE_TO_USER}
**Timestamp:** {ISO timestamp}

**Reasoning:**
{PM agent's explanation for decision}

**Issues Identified:**
- {issue 1}
- {issue 2}
- {none}

---

## User Escalation

**Escalated:** {yes/no}
**Reason:** {why user input needed}

### Presented to User

<!-- Copy of escalation message shown to user -->
```
Spec requires your input before proceeding.

Feature: {feature name}
Issue: {brief description}

Details:
- {specific issue 1}
- {specific issue 2}

Options:
A) Approve as-is (accept noted risks)
B) Request revision (provide guidance)
C) Discuss further (ask questions)
```

### User Response

**Timestamp:** {ISO timestamp}
**Decision:** {approve-as-is | request-revision | discussed}
**Notes:** {user's response/guidance}

<!-- If user did not escalate, mark section as N/A -->

---

## Revision History

| Revision | Date | Issues | Outcome |
|----------|------|--------|---------|
| 1 | {date} | {what was fixed} | {APPROVED/REVISION_REQUESTED} |
| 2 | {date} | {what was fixed} | {APPROVED/REVISION_REQUESTED} |

<!-- If no revisions, mark as "First submission - no prior revisions" -->

---

## Next Steps

### If APPROVED

- [x] Generate handoff-to-execution.md
- [ ] Execution swarm begins

### If REVISION_REQUESTED

- [ ] Spec returned to creators
- [ ] Address: {specific issues}
- [ ] Resubmit for review

### If USER_APPROVED

- [x] User accepted with noted concerns
- [x] Generate handoff-to-execution.md
- [ ] Execution swarm begins

---

## Audit Trail

| Event | Timestamp | Actor | Action |
|-------|-----------|-------|--------|
| Review complete | {timestamp} | Review Swarm | Generated review.md |
| PM decision | {timestamp} | PM Agent | {decision} |
| User escalation | {timestamp} | PM Agent | Presented to user |
| User response | {timestamp} | User | {decision} |
| Handoff generated | {timestamp} | PM Agent | {handoff file} |

---

*Template: approval-template.md*
*Used by: pm-spec-gate.md workflow*
