# Consensus: {Feature Name}

**Generated:** {timestamp}
**Spec:** .specflow/specs/{feature}/draft-spec.md
**Status:** {ALIGNED | IN_DEBATE | ESCALATED}
**Rounds:** {current}/3

---

## Decision Points

Track alignment status for each key decision in the spec:

| Decision | Security | Cost | QA | Status |
|----------|----------|------|-----|--------|
| {decision text} | {position} | {position} | {position} | ALIGNED/DEBATE |
| {decision text} | {position} | {position} | {position} | ALIGNED/DEBATE |
| {decision text} | {position} | {position} | {position} | ALIGNED/DEBATE |

**Summary:**
- Total decision points: {count}
- Aligned: {count}
- In debate: {count}
- Escalated: {count}

---

## Round History

Summarized progression of debate (not full position text - see position files for details).

### Round 1 (Initial Positions)

- **Security:** {2-3 sentence summary of v1 position}
- **Cost:** {2-3 sentence summary of v1 position}
- **QA:** {2-3 sentence summary of v1 position}
- **Outcome:** {N} decision points aligned, {M} in debate

### Round 2 (First Response)

<!-- Include only if debate proceeded to Round 2 -->

- **Security:** {2-3 sentence summary of v2 position}
- **Cost:** {2-3 sentence summary of v2 position}
- **QA:** {2-3 sentence summary of v2 position}
- **Outcome:** {N} decision points aligned, {M} in debate

### Round 3 (Final Iteration)

<!-- Include only if debate proceeded to Round 3 -->

- **Security:** {2-3 sentence summary of v3 position}
- **Cost:** {2-3 sentence summary of v3 position}
- **QA:** {2-3 sentence summary of v3 position}
- **Outcome:** {N} decision points aligned, {M} in debate/escalated

---

## Cross-Domain Disputes

Track disputes that span multiple specialist domains:

| Dispute | Domains | Joint Iterations | Resolution Status |
|---------|---------|------------------|-------------------|
| {description} | Security vs Cost | {0-2}/2 | {RESOLVED/JOINT_REVIEW/PM_ESCALATION} |
| {description} | Security vs QA | {0-2}/2 | {RESOLVED/JOINT_REVIEW/PM_ESCALATION} |
| {description} | Cost vs QA | {0-2}/2 | {RESOLVED/JOINT_REVIEW/PM_ESCALATION} |

<!-- If no cross-domain disputes -->
No cross-domain disputes identified. All disagreements were within-domain.

---

## Agent Alignment Markers

Current alignment status from latest position files:

| Agent | Ready for Consensus | No Blocking Concerns | Dependencies Resolved |
|-------|---------------------|----------------------|-----------------------|
| Security | {checked/unchecked} | {checked/unchecked} | {checked/unchecked} |
| Cost | {checked/unchecked} | {checked/unchecked} | {checked/unchecked} |
| QA | {checked/unchecked} | {checked/unchecked} | {checked/unchecked} |

**Latest Blocking Concerns:**
<!-- List any unchecked "No Blocking Concerns" with reasons -->

- **{Agent}:** {specific blocking concern}

<!-- If no blocking concerns -->
No blocking concerns. All agents ready for consensus.

---

## Final Status

**Consensus Reached:** {yes/no}
**Unresolved Items:** {count}
**Next Step:** {REVIEW_SWARM | PM_ESCALATION | USER_ESCALATION}

### If ALIGNED (consensus reached)

- All decision points agreed
- Draft spec consolidated at `.specflow/specs/{feature}/draft-spec.md`
- Ready for BOSS validation via Review Swarm

### If ESCALATED (PM review needed)

**Items for PM Attention:**

1. **{Decision point}**
   - Security position: {summary}
   - Cost position: {summary}
   - QA position: {summary}
   - Why unresolved: {brief explanation}
   - Recommended resolution: {if any}

2. **{Decision point}**
   - Security position: {summary}
   - Cost position: {summary}
   - QA position: {summary}
   - Why unresolved: {brief explanation}
   - Recommended resolution: {if any}

**PM Options:**
- Accept Security position
- Accept Cost position
- Accept QA position
- Propose alternative
- Escalate to user

---

## Position File References

For detailed context on any decision point:

| Agent | Version | File |
|-------|---------|------|
| Security | v{N} | .specflow/specs/{feature}/positions/security-v{N}.md |
| Cost | v{N} | .specflow/specs/{feature}/positions/cost-v{N}.md |
| QA | v{N} | .specflow/specs/{feature}/positions/qa-v{N}.md |

<!-- If joint assessments exist -->

| Joint | Version | File |
|-------|---------|------|
| Security-Cost | joint-v{N} | .specflow/specs/{feature}/positions/joint-security-cost.md |

---

**Consensus process complete.** Next: {handoff-to-review.md | PM escalation}

---
*Template: consensus-template.md*
*Used by: consensus-mechanism.md workflow*
