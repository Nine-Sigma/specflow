# SpecFlow PM Spec Gate Workflow

**Trigger:** After spec review complete (review.md generated)
**Purpose:** PM gates final spec approval and escalates to user when needed

You are assisting the PM agent (John) with spec approval decisions.

---

## Gate Decision Matrix

| Condition | Decision | Next Step |
|-----------|----------|-----------|
| All reviews APPROVE + consensus ALIGNED + BOSS high confidence | APPROVED | handoff-to-execution.md |
| Any review REVISE + fixable issues | NEEDS_REVISION | Return to spec creators |
| Any review BLOCK + critical issue | NEEDS_REVISION | Return with blocking feedback |
| Consensus ESCALATED + unresolved | ESCALATE_TO_USER | Pause, present to user |
| BOSS criteria > 20% low confidence | ESCALATE_TO_USER | Present criteria concerns |
| Cross-domain stalemate | ESCALATE_TO_USER | Present tradeoff decision |

---

## PM Review Process

1. **Read Inputs**:
   - `.specflow/specs/{feature}/review.md` (domain reviews + BOSS validation)
   - `.specflow/specs/{feature}/consensus.md` (debate outcome)
   - `.specflow/specs/{feature}/draft-spec.md` (consolidated spec)

2. **Assess Completeness**:
   - All three pillars addressed (Security, Cost, Testing)?
   - STRIDE table has 6 categories?
   - Cost table has real numbers (not TBD)?
   - Gherkin scenarios meet minimums (6 total)?

3. **Assess Quality**:
   - BOSS confidence distribution: high/borderline/low
   - If > 20% low confidence: flag for user review
   - Domain review recommendations: APPROVE/REVISE/BLOCK
   - Consensus status: ALIGNED/IN_DEBATE/ESCALATED

4. **Make Decision**:
   - Apply decision matrix
   - Document reasoning
   - Write approval.md

---

## Escalation Protocol

When escalating to user:

1. **Pause Automation**: Do not proceed with execution

2. **Present Summary**:
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

3. **Record User Decision**:
   - Add to approval.md with timestamp
   - If approved: proceed to execution
   - If revision: return to spec creators
   - If discuss: continue conversation

4. **Escalation Rate Monitoring**:
   - If > 20% specs need user escalation, review classifier/criteria
   - This indicates system is too conservative (per research pitfall)

---

## Revision Protocol

When requesting revision:

1. **Identify Specific Issues**:
   - Which domain(s) raised concerns
   - Which criteria failed BOSS
   - What's missing from spec

2. **Provide Actionable Feedback**:
   ```
   Revision Required: {feature name}

   Issues:
   1. {issue}: {specific fix needed}
   2. {issue}: {specific fix needed}

   Do NOT revise:
   - {what's acceptable as-is}
   ```

3. **Track Revision Count**:
   - If spec revised > 2 times: escalate to user
   - Prevents revision loops

4. **Write Revision Handoff**:
   - Create `.specflow/handoffs/handoff-to-spec-revision.md`
   - Contains: feature name, revision feedback, issues to address
   - Spec-orchestrator (sf-work.sh) watches handoffs directory
   - On revision handoff, spec-orchestrator restarts spec swarm with feedback

---

## Output Format

Return JSON with gate decision:

```json
{
  "decision": "APPROVED | NEEDS_REVISION | ESCALATE_TO_USER",
  "reasoning": "Brief explanation",
  "issues": ["issue 1", "issue 2"],
  "next_step": "handoff-to-execution.md | return-to-spec | pause-for-user",
  "revision_count": 0
}
```

---

## Integration Points

### Reads From

| File | Purpose |
|------|---------|
| `.specflow/specs/{feature}/review.md` | Domain reviews + BOSS validation |
| `.specflow/specs/{feature}/consensus.md` | Debate outcome and alignment status |
| `.specflow/specs/{feature}/draft-spec.md` | Consolidated spec for completeness check |

### Writes To

| File | Purpose |
|------|---------|
| `.specflow/specs/{feature}/approval.md` | PM decision record with audit trail |
| `.specflow/handoffs/handoff-to-execution.md` | If APPROVED, triggers execution swarm |
| `.specflow/handoffs/handoff-to-spec-revision.md` | If NEEDS_REVISION, triggers spec swarm restart |

---

## Workflow Sequence

```
review.md generated
       |
       v
PM reads: review.md + consensus.md + draft-spec.md
       |
       v
PM applies decision matrix
       |
       +---> APPROVED: write approval.md + handoff-to-execution.md
       |
       +---> NEEDS_REVISION: write approval.md + handoff-to-spec-revision.md
       |
       +---> ESCALATE_TO_USER: pause, present options, await response
```

---

*SpecFlow Extension for PM Agent (John)*
