# SpecFlow Expertise Layer

This folder contains **extracted methodology** for use by SpecFlow agents.

## Purpose

SpecFlow agents use this expertise (frameworks, checklists, techniques) autonomously. Agents read this content, apply it, and return outputs to PM for review.

## Folder Index

| Folder | Purpose | Description |
|--------|---------|-------------|
| `architecture/` | Architecture decision frameworks, ADR templates, validation | Decision domains, validation checklists |
| `cost/` | Cost analysis methodology, optimization strategies, pricing models | Cloud cost optimization |
| `discovery/` | Project classification and domain detection | Project type signals, complexity |
| `elicitation/` | PM's toolkit for user engagement (when-to-use techniques) | Decision tree for engagement |
| `requirements/` | BOSS acceptance criteria writing standards | Binary, Observable, Specific, Scope-bound |
| `scoping/` | Scope assessment, pillar selection, MVP strategies | Scope levels, pillar selection |
| `security/` | STRIDE threat model, security controls, compliance patterns | Security analysis framework |
| `validation/` | Pre-implementation readiness, traceability, test criteria | Readiness checklists |

## File Inventory

### Root Files

| File | Purpose |
|------|---------|
| `agent-pattern.md` | Standard architecture for all `/sf:*` agents |

### architecture/

| File | Purpose |
|------|---------|
| `index.md` | Overview and scope-based depth guidance |
| `decision-categories.md` | 5 decision domains (Data, Auth, API, Frontend, Infrastructure) |
| `adr-template.md` | Architecture Decision Record format |
| `validation-checklist.md` | 40-item coherence, coverage, readiness validation |

### cost/

| File | Purpose |
|------|---------|
| `index.md` | Overview and scope-based analysis depth |
| `cost-methodology.md` | 5-step cost analysis process |
| `optimization-strategies.md` | Compute, storage, network, operational optimizations |
| `pricing-models.md` | AWS, Azure, GCP pricing patterns |

### discovery/

| File | Purpose |
|------|---------|
| `project-classification.md` | Project type signals, domain complexity |

### elicitation/

| File | Purpose |
|------|---------|
| `when-to-use.md` | Decision tree for user engagement, technique selection |

### requirements/

| File | Purpose |
|------|---------|
| `boss-criteria.md` | Binary, Observable, Specific, Scope-bound criteria |

### scoping/

| File | Purpose |
|------|---------|
| `scope-levels.md` | 5 scope levels (trivial to complex) with signals |
| `pillar-selection.md` | Which pillars to apply based on signals and domain |
| `mvp-strategies.md` | MVP boundaries, in/out scope decisions |
| `risk-assessment.md` | Technical, market, resource risk factors |

### security/

| File | Purpose |
|------|---------|
| `index.md` | Overview and scope-based analysis depth |
| `stride-framework.md` | STRIDE threat categories (6) with analysis process |
| `security-controls.md` | 5 control category checklists |
| `compliance-patterns.md` | GDPR, HIPAA, PCI-DSS, SOX, ISO 27001 patterns |

### validation/

| File | Purpose |
|------|---------|
| `index.md` | Overview and agent usage patterns |
| `readiness-checklist.md` | 23-item pre-implementation readiness (4 categories) |
| `traceability-matrix.md` | FR/NFR to epic coverage format, gap analysis |
| `test-criteria.md` | Test quality standards, scope-based depth tables |

## How Agents Use This

Agents load expertise files in their "Step 3: Load Expertise" section:

```markdown
### Step 3: Load Expertise

<expertise>
Read and apply:
- `.specflow-lib/expertise/{domain}/{file}.md` - Specific methodology file
- `.specflow-lib/expertise/scoping/scope-levels.md` - Match depth to scope
</expertise>
```

See `agent-pattern.md` for the full agent architecture and loading patterns.
