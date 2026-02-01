# Architecture Expertise

<!-- Source: _bmad/workflows/3-solutioning/create-architecture/ -->

Extracted methodology for autonomous agent use. Agents read this content, apply it autonomously, and return outputs to PM for review.

## Purpose

Provides architecture decision frameworks, ADR templates, and validation checklists for sf-architect agent to use without invoking interactive BMAD workflows.

## Contents

| File | Purpose | When to Use |
|------|---------|-------------|
| [decision-categories.md](decision-categories.md) | Framework for organizing architectural decisions by domain | When making core decisions (data, auth, API, frontend, infra) |
| [adr-template.md](adr-template.md) | Architecture Decision Record format for documenting significant decisions | Complex scope, or any decision with significant trade-offs |
| [validation-checklist.md](validation-checklist.md) | Coherence, coverage, and readiness validation | After architecture document is complete |

## How Agents Use This

```markdown
## In sf-architect.md

<expertise>
Read and apply:
- `_bmad/expertise/architecture/decision-categories.md` - What to decide
- `_bmad/expertise/architecture/adr-template.md` - How to document decisions
- `_bmad/expertise/architecture/validation-checklist.md` - How to validate
- `_bmad/expertise/scoping/scope-levels.md` - Match depth to scope
</expertise>
```

## Scope-Based Usage

| Scope | Architecture Depth | What to Produce |
|-------|-------------------|-----------------|
| trivial | Skip | No architecture doc needed |
| small | Light | Brief summary, API contract if needed, no diagrams |
| medium | Standard | Summary, key decisions, ASCII flow diagram, API contracts |
| large | Full | All sections, multiple diagrams, data model, integration points |
| complex | Deep + ADRs | Multi-part output, ADRs for each major decision, C4 diagrams |

### Depth Guidance

**Skip (trivial)**
- Return to PM with "No architecture doc needed - trivial scope"
- Log to PROGRESS.md

**Light (small)**
- Brief 1-2 paragraph summary
- API contract if new endpoint
- No decision categories or validation needed

**Standard (medium)**
- Cover 2-3 most relevant decision categories
- ASCII flow diagram for main flow
- API contracts for all endpoints
- Run light validation (coherence only)

**Full (large)**
- All 5 decision categories with rationale
- Multiple diagrams (data model, flow, component)
- Full validation checklist

**Deep + ADRs (complex)**
- Full coverage plus ADR for each significant decision
- C4 diagrams (context, container, component)
- Complete validation with gap analysis
- Architecture readiness assessment

## Source Files

This content extracted from:
- `_bmad/workflows/3-solutioning/create-architecture/steps/step-04-decisions.md` - Decision categories
- `_bmad/workflows/3-solutioning/create-architecture/steps/step-07-validation.md` - Validation methodology
- `_bmad/workflows/3-solutioning/create-architecture/architecture-decision-template.md` - ADR template
