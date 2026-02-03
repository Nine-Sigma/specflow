---
feature: ${feature-slug}
proposed_by: analyst
proposed_at: ${iso-timestamp}
scope_level: ${trivial|small|medium|large|complex}
approval_status: pending
approved_by: null
approved_at: null
pillars: []
spec_depth: ${none|light|standard|full|deep}
arch_depth: ${none|light|standard|full|deep}
---

# Scope Assessment: ${Feature Name}

<!--
Methodology Reference:
- Scope levels: .specflow-lib/expertise/scoping/scope-levels.md
- MVP strategies: .specflow-lib/expertise/scoping/mvp-strategies.md
- Risk assessment: .specflow-lib/expertise/scoping/risk-assessment.md
-->

## Original Request

${Quote the original request from 0-triage.md}

## Classification

| Dimension | Value | Notes |
|-----------|-------|-------|
| Project Type | ${type} | ${from discovery} |
| Domain | ${domain} | ${complexity level} |
| Context | ${greenfield/brownfield} | |

## Scope Level: ${level}

**Justification:** ${2-3 sentences explaining why this scope level}

### Signals Detected

<!-- Check signals that apply from .specflow-lib/expertise/scoping/scope-levels.md -->

- [x] ${signal that applies}
- [ ] ${signal that doesn't apply}

## Proposed Ceremony

| Phase | Depth | Rationale |
|-------|-------|-----------|
| Spec | ${depth} | ${why} |
| Architecture | ${depth} | ${why} |
| Security | ${skip/light/full} | ${why or "below threshold"} |
| Cost | ${skip/estimate/full} | ${why or "no new resources"} |
| Testing | ${depth} | ${why} |

## Risk Assessment

<!-- For medium+ scope, document per .specflow-lib/expertise/scoping/risk-assessment.md -->

| Risk Type | Level | Notes |
|-----------|-------|-------|
| Technical | ${L/M/H} | ${brief note} |
| Market | ${L/M/H} | ${brief note} |
| Resource | ${L/M/H} | ${brief note} |

## MVP Boundaries

<!-- For medium+ scope, per .specflow-lib/expertise/scoping/mvp-strategies.md -->

### In Scope (This Version)
- ${essential capability}

### Out of Scope (Later)
- ${deferred item}

---

## Pillar Selection

<!--
Methodology Reference: .specflow-lib/expertise/scoping/pillar-selection.md
-->

### Required Pillars
${List pillars that ARE needed with brief reason}

- **TEA**: ${reason, e.g., "Behavior change requires verification"}

### Skipped Pillars
${List pillars that are NOT needed with rationale}

- **Architect**: ${reason, e.g., "Single component, existing patterns"}
- **Security**: ${reason, e.g., "Internal data, no auth/PII"}
- **Cost**: ${reason, e.g., "No new resources"}

### Pillar Rationale (YAML)

```yaml
pillars:
  required:
    - tea
  skipped:
    - architect
    - security
    - cost

pillar_rationale:
  tea: "${detailed rationale}"
  architect: "${why skipped}"
  security: "${why skipped}"
  cost: "${why skipped}"
```

---

## PM Approval

<!-- PM fills this section after review -->

**Decision:** ${APPROVE|SCALE_DOWN|SCALE_UP|CLARIFY}

**Rationale:** ${Why this decision}

**Approved at:** ${iso-timestamp}
