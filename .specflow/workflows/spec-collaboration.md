# SpecFlow Collaborative Spec Creation Workflow

**Trigger:** When spec creation begins for a classified work item
**Purpose:** Define how Security, Cost, and QA specialists collaborate on spec sections

This workflow defines the protocol for multi-agent collaborative spec creation, ensuring all three SpecFlow pillars are addressed through parallel generation and structured consolidation.

## Workflow Overview

```
[Work Item Classified] -> [Spec Orchestrator] -> [Parallel Specialists]
                                                        |
                    +-----------------------------------+-----------------------------------+
                    |                                   |                                   |
             [Security Specialist]               [Cost Specialist]                 [QA Specialist]
                    |                                   |                                   |
             positions/security-v1.md            positions/cost-v1.md              positions/qa-v1.md
                    |                                   |                                   |
                    +-----------------------------------+-----------------------------------+
                                                        |
                                              [Consolidation]
                                                        |
                         +------------------------------+------------------------------+
                         |                                                             |
                  [No Conflicts]                                              [Conflicts Detected]
                         |                                                             |
              handoff-to-review.md                                         handoff-to-debate.md
                         |                                                             |
                 [Review Swarm]                                             [Consensus Mechanism]
```

## Phase 1: Parallel Generation

### Principle: Independence Prevents Anchoring

All specialists receive the same feature context simultaneously and generate their sections independently. This prevents:
- **Anchoring bias:** First position influencing subsequent ones
- **Premature consensus:** Agreeing before substantive review
- **Groupthink:** Conforming to dominant voice

### Specialist Responsibilities

| Specialist | Agent Reference | Section | Output File |
|------------|----------------|---------|-------------|
| Security | Jordan (security-reviewer.md) | STRIDE threat model, trust boundaries, data classification | positions/security-v1.md |
| Cost | Taylor (cost-optimizer.md) | Cost breakdown, assumptions, optimization opportunities | positions/cost-v1.md |
| QA | SpecFlow QA patterns | Gherkin scenarios (min 6: 2 happy, 2 error, 1 edge, 1 security) | positions/qa-v1.md |

### Input Context (Same for All)

Each specialist receives:
```markdown
**Feature:** {feature_name}
**Description:** {feature_description}
**Work Item:** {issue_number} ({type})
**Pillars:** {selected_pillars}

**Research Summary:** (if available from Research Swarm)
{Summarized findings from research phase}

**Constraints:**
- {Any known constraints from PM classification}
```

## Phase 2: Position File Format

Each specialist writes a position file with this exact structure:

```markdown
# {Domain} Position: {Feature Name}
**Agent:** {Security | Cost | QA}
**Version:** v1
**Timestamp:** {YYYY-MM-DDTHH:MM:SSZ}

## Section Content

{Domain-specific content following spec template structure}

### For Security:
- STRIDE table (12 rows minimum)
- Trust boundaries diagram
- Data classification table

### For Cost:
- Monthly cost breakdown table
- Assumptions (traffic, storage, users)
- Optimization opportunities table

### For QA:
- Gherkin scenarios organized by category
- Coverage summary

## Key Decisions

Document significant decisions made during generation:

1. **{Decision}:** {What was decided}
   - **Reasoning:** {Why this choice}
   - **Alternatives considered:** {What else was evaluated}
   - **Trade-offs:** {What was sacrificed}

2. **{Decision}:** {What was decided}
   - **Reasoning:** {Why this choice}
   - **Alternatives considered:** {What else was evaluated}
   - **Trade-offs:** {What was sacrificed}

## Cross-Domain Notes

Flag items that may affect other specialists:

- **For Security review:** {Items Cost/QA should verify}
- **For Cost review:** {Items Security/QA should verify}
- **For QA review:** {Items Security/Cost should verify}

## Alignment Markers

These markers enable consensus detection:

- [ ] Ready for consensus check
- [ ] No blocking concerns
- [ ] Cross-domain dependencies: {list specific dependencies or "none"}

### Blocking Concern Examples:
- "Security requires encryption that impacts cost significantly"
- "QA scenarios require production-like data that raises privacy concerns"
- "Cost optimization conflicts with security requirements"

If any blocking concern exists, mark that checkbox unchecked and explain in Cross-Domain Notes.
```

## Phase 3: Consolidation

### Orchestrator Consolidation Process

1. **Read all position files** from `.specflow/specs/{feature}/positions/`

2. **Check alignment markers:**
   - All "Ready for consensus check" marked -> proceed
   - All "No blocking concerns" marked -> no debate needed
   - Cross-domain dependencies documented -> verify addressed

3. **Merge into draft spec** following `.specs/templates/spec-template.md`:
   ```markdown
   # Feature Specification: {Feature Name}

   **Author:** Spec Orchestrator (collaborative)
   **Date:** {today}
   **Status:** Draft

   ---

   ## Overview
   {From work item description}

   ---

   ## Security Assessment
   {From positions/security-v1.md Section Content}

   ---

   ## Cost Estimate
   {From positions/cost-v1.md Section Content}

   ---

   ## Test Scenarios
   {From positions/qa-v1.md Section Content}

   ---

   ## Acceptance Criteria
   {Derived from all three positions}
   ```

4. **Write consolidated output** to `.specflow/specs/{feature}/draft-spec.md`

### Conflict Detection

| Conflict Type | Detection Rule | Example |
|--------------|----------------|---------|
| Security-Cost | Security mitigation adds >20% to cost | "Encryption at rest adds $150/month to $500 estimate" |
| Security-QA | Security constraint limits testability | "Auth tokens cannot be mocked per security requirements" |
| Cost-QA | Test infrastructure exceeds budget | "Test environment costs $200/month, not in cost estimate" |
| Within-Domain | Specialist flags blocking concern | Any unchecked "No blocking concerns" marker |

## Phase 4: Handoff

### Success Path: handoff-to-review.md

When all alignment markers are checked and no conflicts detected:

```markdown
# Handoff: Spec Orchestrator -> Review Swarm

**Feature:** {feature_name}
**Status:** Draft spec ready for review
**Date:** {timestamp}

## Consolidated Artifacts

| Artifact | Location |
|----------|----------|
| Draft spec | .specflow/specs/{feature}/draft-spec.md |
| Security position | .specflow/specs/{feature}/positions/security-v1.md |
| Cost position | .specflow/specs/{feature}/positions/cost-v1.md |
| QA position | .specflow/specs/{feature}/positions/qa-v1.md |

## Section Summaries

**Security:**
- STRIDE threats identified: {count}
- Trust boundaries documented: {count}
- Key mitigations: {list top 3}

**Cost:**
- Monthly estimate: ${total}
- Key assumptions: {traffic}, {storage}, {users}
- Optimization opportunities: {count}

**QA:**
- Total scenarios: {count}
- Coverage: {happy}/{error}/{edge}/{security}
- All categories met: {yes/no}

## Alignment Status

All specialists aligned. No blocking concerns identified.

## Review Swarm Instructions

1. Validate BOSS criteria on all acceptance criteria
2. Check spec completeness against template
3. Flag any borderline items for PM review
```

### Conflict Path: handoff-to-debate.md

When conflicts are detected or blocking concerns exist:

```markdown
# Handoff: Spec Orchestrator -> Debate Phase

**Feature:** {feature_name}
**Status:** Conflicts detected, debate required
**Date:** {timestamp}

## Conflicts Requiring Resolution

### Conflict 1: {Type}

**Description:** {What is the conflict}

**Position A ({Specialist}):**
> {Quote from position file}

**Position B ({Specialist}):**
> {Quote from position file}

**Impact if unresolved:**
- {What happens to spec}
- {What happens to implementation}
- {What happens to timeline}

### Conflict 2: {Type}
{Same structure}

## Artifacts for Debate

- Security position: .specflow/specs/{feature}/positions/security-v1.md
- Cost position: .specflow/specs/{feature}/positions/cost-v1.md
- QA position: .specflow/specs/{feature}/positions/qa-v1.md

## Orchestrator Recommendation

Based on project context and SpecFlow principles:

1. **{Conflict 1}:** {Recommended resolution with reasoning}
2. **{Conflict 2}:** {Recommended resolution with reasoning}

## Debate Protocol

Per Phase 5 decisions:
- Maximum 3 debate rounds before PM escalation
- Veto power only within own domain
- Cross-domain disputes: joint reassessment with 2 iterations, then PM
```

## Version Numbering

Position files use version suffixes for debate iterations:

| Version | Meaning |
|---------|---------|
| v1 | Initial parallel generation |
| v2 | After first debate round |
| v3 | After second debate round |
| final | After consensus reached |

If v3 doesn't resolve conflicts, escalate to PM with all versions for context.

## Directory Structure

```
.specflow/specs/{feature}/
  positions/
    security-v1.md      # Initial security position
    security-v2.md      # After debate round 1 (if needed)
    cost-v1.md          # Initial cost position
    cost-v2.md          # After debate round 1 (if needed)
    qa-v1.md            # Initial QA position
    qa-v2.md            # After debate round 1 (if needed)
  draft-spec.md         # Consolidated draft
  consensus.md          # Consensus summary (after debate)
  spec.md               # Final approved spec
```

---

*SpecFlow Workflow: spec-collaboration*
*Related: spec-orchestrator.md, pm-pillars.md*
