# SpecFlow Consensus Mechanism Workflow

**Trigger:** When spec-orchestrator detects conflicts in consolidated draft
**Purpose:** Enable structured debate with bounded iterations

This workflow defines the protocol for resolving disagreements between Security, Cost, and QA specialists through structured debate rounds, with escalation to PM after 3 rounds.

## When Consensus is Needed

The consensus mechanism activates when:

1. **Conflicting recommendations between specialists**
   - Security mitigation adds significant cost (>20% of estimate)
   - Cost optimization reduces security posture
   - QA test requirements conflict with security constraints

2. **Missing alignment markers in position files**
   - "Ready for consensus check" unchecked
   - "No blocking concerns" unchecked

3. **Cross-domain dependencies flagged**
   - Any specialist noted dependencies on another domain
   - Dependencies not yet acknowledged/addressed

## Debate Protocol

Following Phase 5 decisions: 3 rounds maximum, veto within domain only, joint reassessment for cross-domain disputes.

### Round Structure

Each debate round follows this sequence:

```
Round N Process:
  1. Each agent reads all other agents' position files (version N-1)
  2. Each agent writes response to positions/{domain}-v{N}.md
  3. Responses include:
     - Points of agreement (citing other agent's position)
     - Points of disagreement with reasoning
     - Updated alignment markers
  4. After all agents respond, check consensus
```

### Round 1 (Initial Positions)

Specialists have already generated v1 positions via spec-collaboration workflow. If conflicts were detected, debate begins at Round 2.

### Round 2 (First Response)

Each specialist:

1. **Reads** all v1 position files
2. **Identifies** areas of agreement and disagreement
3. **Writes** positions/{domain}-v2.md with:
   - Acknowledged agreements
   - Defended positions with evidence
   - Proposed compromises
   - Updated alignment markers

### Round 3 (Final Iteration)

If still not aligned after Round 2:

1. **Reads** all v2 position files
2. **Focuses** on narrowing remaining disputes
3. **Writes** positions/{domain}-v3.md with:
   - Final position on disputed items
   - Clear statement of what would cause agreement
   - Explicit alignment markers (will this agent block?)

### Response Format

Each debate response must follow this structure:

```markdown
# {Domain} Position: {Feature Name}
**Agent:** {Security | Cost | QA}
**Version:** v{N}
**Timestamp:** {YYYY-MM-DDTHH:MM:SSZ}
**Responding to:** v{N-1} positions from all agents

## Points of Agreement

| Decision | Agreeing With | Our Position |
|----------|---------------|--------------|
| {decision} | {Agent} v{N-1} | Aligned - {brief reason} |

## Points of Disagreement

### {Disagreement 1}

**Their position:** {Agent} v{N-1} states "{quote}"
**Our position:** {our view}
**Reasoning:** {why we disagree}
**Evidence:** {supporting data}
**Compromise possible:** {yes/no - if yes, what would work}

## Updated Section Content

{If our position changed, provide updated domain content}

## Alignment Markers

- [ ] Ready for consensus check
- [ ] No blocking concerns
- [ ] Cross-domain dependencies: {list or "resolved"}

### Blocking Concerns (if any)

- {specific concern that prevents alignment}
```

## Consensus Detection

After each round, check alignment markers across all position files.

### Status Determination

```
ALIGNED:   All agents mark "Ready for consensus check" = checked
           AND all agents mark "No blocking concerns" = checked

DEBATE:    Any agent has "Ready for consensus check" unchecked
           OR any agent has "No blocking concerns" unchecked

ESCALATE:  3 rounds complete without ALIGNED status
           OR cross-domain stalemate after joint reassessment
```

### Automated Check (shell pseudocode)

```bash
# Check alignment markers in all v{N} files
check_consensus() {
  local feature=$1
  local version=$2
  local dir=".specflow/specs/${feature}/positions"

  # Count checked markers across all agents
  ready_count=$(grep -l "\[x\] Ready for consensus check" "${dir}"/*-v${version}.md 2>/dev/null | wc -l)
  no_concerns=$(grep -l "\[x\] No blocking concerns" "${dir}"/*-v${version}.md 2>/dev/null | wc -l)

  # Need 3 agents aligned (Security, Cost, QA)
  if [[ $ready_count -eq 3 && $no_concerns -eq 3 ]]; then
    echo "ALIGNED"
  else
    echo "DEBATE"
  fi
}
```

## Cross-Domain Dispute Handling

Per Phase 5 decisions: Cross-domain disputes get joint reassessment before PM escalation.

### Identifying Cross-Domain Disputes

A dispute is cross-domain when:

| Dispute Type | Domains Involved | Example |
|--------------|------------------|---------|
| Security-Cost | Jordan + Taylor | "Encryption adds $150/month" |
| Security-QA | Jordan + QA | "Cannot mock auth tokens per security" |
| Cost-QA | Taylor + QA | "Test environment exceeds budget" |

### Joint Reassessment Process

When a cross-domain dispute is identified:

1. **Tag the dispute** in handoff-to-debate.md as cross-domain
2. **Both affected agents** re-evaluate together:
   - Read each other's latest position
   - Focus specifically on the disputed item
   - Write joint assessment: `positions/joint-{domain1}-{domain2}.md`

3. **Two joint iterations** allowed:
   - Joint v1: Initial joint assessment
   - Joint v2: Response to first joint assessment

4. **If still disputed after joint v2:** Escalate to PM

### Joint Assessment Format

```markdown
# Joint Assessment: {Domain1} + {Domain2}
**Feature:** {feature_name}
**Dispute:** {brief description}
**Iteration:** joint-v{N}

## The Dispute

**{Domain1} position:** {summary}
**{Domain2} position:** {summary}
**Root cause:** {why the conflict exists}

## Analysis

### {Domain1} perspective
{Why this matters to their domain}

### {Domain2} perspective
{Why this matters to their domain}

## Proposed Resolution

**Recommendation:** {specific proposal}
**{Domain1} impact:** {what they give up/gain}
**{Domain2} impact:** {what they give up/gain}

## Resolution Status

- [ ] {Domain1} accepts
- [ ] {Domain2} accepts

### If Not Accepted

**{Domain} blocking reason:** {why unacceptable}
```

## Termination Conditions

### ALIGNED: Proceed to Review Swarm

When consensus is reached:

1. **Write** `.specflow/specs/{feature}/consensus.md` with final state
2. **Merge** aligned positions into `draft-spec.md`
3. **Generate** `handoff-to-review.md`
4. **Proceed** to Review Swarm for BOSS validation

### ESCALATE_TO_PM: Requires Human Judgment

Escalation triggers:

- 3 standard rounds exhausted without alignment
- Cross-domain dispute unresolved after 2 joint iterations
- Any agent explicitly requests PM escalation

When escalating:

1. **Write** `.specflow/specs/{feature}/consensus.md` with final state (ESCALATED)
2. **Include** all position versions for PM context
3. **Generate** PM escalation summary:
   - What was agreed
   - What remains disputed
   - Each agent's final position
   - Recommended resolution
4. **PM decides** or escalates to user

## Context Management

Per research pitfall: Prevent context window exhaustion during multi-round debate.

### Summary Protocol

Each round, agents receive SUMMARY of prior positions, not full text:

```
{Agent} v{N}: {key points in 2-3 sentences}
```

### Example Context Summary

```markdown
## Prior Position Summaries (for Round 3)

**Security v2:** Requires HttpOnly cookies for token storage. Concerned about
XSS attack surface. Will accept session storage only with CSP headers.

**Cost v2:** Session storage reduces complexity by $50/month. HttpOnly adds
server-side session management costs. Proposes short-lived tokens as compromise.

**QA v2:** Prefers HttpOnly for test simplicity (no localStorage mocking).
Edge case: session expiry during long forms needs handling.
```

### Full Context on Demand

Agents may read full position files when needed for specific decision points:

```markdown
**For detailed context, see:**
- positions/security-v2.md (lines 45-67: token storage rationale)
- positions/cost-v2.md (lines 23-31: session management costs)
```

## Integration with Spec Collaboration

This workflow is triggered by `spec-collaboration.md` when conflicts are detected:

```
spec-collaboration.md (Phase 1-4)
       |
       v
[Conflicts detected in Phase 3]
       |
       v
handoff-to-debate.md
       |
       v
consensus-mechanism.md (this workflow)
       |
       +--> ALIGNED: handoff-to-review.md
       |
       +--> ESCALATE: PM agent decision
```

---

*SpecFlow Workflow: consensus-mechanism*
*Related: spec-collaboration.md, pm-pillars.md*
