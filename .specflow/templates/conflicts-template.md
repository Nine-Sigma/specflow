<!--
CONFLICTS.md Template
=====================
Location: .specflow/features/{slug}/CONFLICTS.md

Purpose: Track unresolved agent disagreements that escalate beyond COMMS.
Created by: PM when agents cannot resolve via single COMMS exchange.

Workflow:
1. Agent A asks question via COMMS/{A}-to-{B}-{NNN}.md
2. Agent B responds, updating status to resolved
3. If Agent A disagrees -> creates new COMMS or flags disagreement
4. After 1 exchange unresolved -> PM creates CONFLICT entry here
5. PM reviews positions and writes Decision + Rationale
6. If PM cannot decide -> status: escalated, presented to user

Status values:
- open: Awaiting resolution
- resolved: PM or user made decision, applied to spec
- escalated: PM cannot decide, needs user input

Resolver values:
- pending: No decision yet
- pm: PM made the decision
- user: User was escalated to and decided
-->

---
feature: ${feature-slug}
created: ${iso-timestamp}
status: open
---

# Conflicts

<!-- PM adds conflict entries when agents cannot resolve via COMMS after 1 exchange -->

## CONFLICT-001: ${Descriptive Title}

**Created:** ${iso-timestamp}
**Agents:** ${agent1}, ${agent2}
**Status:** open
**Exchange Count:** 1
**COMMS Reference:** ${comms-filename}

### ${Agent1} Position

${Position summary from COMMS exchange - what they believe and why}

### ${Agent2} Position

${Position summary from COMMS response - what they believe and why}

### Resolution

**Resolver:** ${pending | pm | user}
**Decision:** ${summary of decision made}
**Rationale:** ${why this decision was made}
**Applied:** ${iso-timestamp when resolved}
**Spec Updated:** ${yes/no - did this change any numbered output?}

---

<!--
Resolution Chain:
1. Agents try to resolve via COMMS (1 exchange max)
2. If unresolved -> PM creates CONFLICT entry
3. PM reviews and decides (writes Decision + Rationale)
4. If PM can't decide -> status: escalated, presented to user
5. Resolver applies decision, marks Applied timestamp
-->
