# BMAD Expertise Layer

This folder contains **extracted methodology** from BMAD workflows for use by SpecFlow agents.

## Purpose

SpecFlow agents use BMAD's expertise (frameworks, checklists, techniques) **without invoking BMAD's interactive workflows**. Agents read this content, apply it autonomously, and return outputs to PM for review.

## Folder Index

| Folder | Purpose | Extracted From |
|--------|---------|----------------|
| `architecture/` | Architecture decision frameworks, ADR templates, validation | `_bmad/workflows/3-solutioning/create-architecture/` |
| `cost/` | Cost analysis methodology, optimization strategies, pricing models | `_bmad/expansion-packs/cloud-architecture/agents/cost-optimizer.md` |
| `discovery/` | Project classification and domain detection | `_bmad/workflows/2-plan-workflows/create-prd/` |
| `elicitation/` | PM's toolkit for user engagement (when-to-use techniques) | `_bmad/workflows/advanced-elicitation/` |
| `requirements/` | BOSS acceptance criteria writing standards | `_bmad/workflows/2-plan-workflows/create-prd/` |
| `scoping/` | Scope assessment, pillar selection, MVP strategies | `_bmad/workflows/2-plan-workflows/create-prd/` |
| `security/` | STRIDE threat model, security controls, compliance patterns | `_bmad/expansion-packs/cloud-architecture/agents/security-reviewer.md` |
| `validation/` | Pre-implementation readiness, traceability, test criteria | `_bmad/workflows/3-solutioning/check-implementation-readiness/` |

## File Inventory

### Root Files

| File | Purpose | Extracted From |
|------|---------|----------------|
| `agent-pattern.md` | Standard architecture for all `/sf:*` agents | SpecFlow-specific (not from BMAD) |

### architecture/

| File | Purpose | Extracted From |
|------|---------|----------------|
| `index.md` | Overview and scope-based depth guidance | SpecFlow-specific index |
| `decision-categories.md` | 5 decision domains (Data, Auth, API, Frontend, Infrastructure) | `_bmad/workflows/3-solutioning/create-architecture/steps/step-04-decisions.md` |
| `adr-template.md` | Architecture Decision Record format | `_bmad/workflows/3-solutioning/create-architecture/architecture-decision-template.md` |
| `validation-checklist.md` | 40-item coherence, coverage, readiness validation | `_bmad/workflows/3-solutioning/create-architecture/steps/step-07-validation.md` |

### cost/

| File | Purpose | Extracted From |
|------|---------|----------------|
| `index.md` | Overview and scope-based analysis depth | SpecFlow-specific index |
| `cost-methodology.md` | 5-step cost analysis process | `_bmad/expansion-packs/cloud-architecture/agents/cost-optimizer.md` |
| `optimization-strategies.md` | Compute, storage, network, operational optimizations | `_bmad/expansion-packs/cloud-architecture/agents/cost-optimizer.md` |
| `pricing-models.md` | AWS, Azure, GCP pricing patterns | `_bmad/expansion-packs/cloud-architecture/agents/cost-optimizer.md` |

### discovery/

| File | Purpose | Extracted From |
|------|---------|----------------|
| `project-classification.md` | Project type signals, domain complexity | `_bmad/workflows/2-plan-workflows/create-prd/` |

### elicitation/

| File | Purpose | Extracted From |
|------|---------|----------------|
| `when-to-use.md` | Decision tree for user engagement, technique selection | `_bmad/workflows/advanced-elicitation/` |

### requirements/

| File | Purpose | Extracted From |
|------|---------|----------------|
| `boss-criteria.md` | Binary, Observable, Specific, Scope-bound criteria | `_bmad/workflows/2-plan-workflows/create-prd/` |

### scoping/

| File | Purpose | Extracted From |
|------|---------|----------------|
| `scope-levels.md` | 5 scope levels (trivial to complex) with signals | `_bmad/workflows/2-plan-workflows/create-prd/` |
| `pillar-selection.md` | Which pillars to apply based on signals and domain | SpecFlow-specific methodology |
| `mvp-strategies.md` | MVP boundaries, in/out scope decisions | `_bmad/workflows/2-plan-workflows/create-prd/` |
| `risk-assessment.md` | Technical, market, resource risk factors | `_bmad/workflows/2-plan-workflows/create-prd/` |

### security/

| File | Purpose | Extracted From |
|------|---------|----------------|
| `index.md` | Overview and scope-based analysis depth | SpecFlow-specific index |
| `stride-framework.md` | STRIDE threat categories (6) with analysis process | `_bmad/expansion-packs/cloud-architecture/agents/security-reviewer.md` |
| `security-controls.md` | 5 control category checklists | `_bmad/expansion-packs/cloud-architecture/agents/security-reviewer.md` |
| `compliance-patterns.md` | GDPR, HIPAA, PCI-DSS, SOX, ISO 27001 patterns | `_bmad/expansion-packs/cloud-architecture/agents/security-reviewer.md` |

### validation/

| File | Purpose | Extracted From |
|------|---------|----------------|
| `index.md` | Overview and agent usage patterns | SpecFlow-specific index |
| `readiness-checklist.md` | 23-item pre-implementation readiness (4 categories) | `_bmad/workflows/3-solutioning/check-implementation-readiness/` |
| `traceability-matrix.md` | FR/NFR to epic coverage format, gap analysis | `_bmad/workflows/3-solutioning/check-implementation-readiness/` |
| `test-criteria.md` | Test quality standards, scope-based depth tables | `_bmad/workflows/3-solutioning/check-implementation-readiness/` |

## How Agents Use This

Agents load expertise files in their "Step 3: Load Expertise" section:

```markdown
### Step 3: Load Expertise

<expertise>
Read and apply:
- `_bmad/expertise/{domain}/{file}.md` - Specific methodology file
- `_bmad/expertise/scoping/scope-levels.md` - Match depth to scope
</expertise>
```

See `agent-pattern.md` for the full agent architecture and loading patterns.

## Source Attribution

All content is extracted from BMAD source files. Each expertise file includes a source comment at the top:

```markdown
<!-- Source: _bmad/path/to/original/file.md -->
```

This enables traceability back to the original BMAD methodology.
