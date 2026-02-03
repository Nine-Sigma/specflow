# Validation Expertise

<!-- Source: SpecFlow validation methodology -->

Extracted validation methodology for autonomous agent use. Agents read this content, apply it to their validation tasks, and return outputs to PM for review.

## Purpose

Ensure that PRD, Architecture, Epics, and Stories are complete and aligned before implementation starts. This folder provides:

- Pre-implementation readiness criteria
- Requirements traceability matrix format
- Test quality and completeness checks

## Contents

| File | Purpose | When to Use |
|------|---------|-------------|
| [readiness-checklist.md](readiness-checklist.md) | Pre-implementation readiness criteria and final assessment format | Before starting implementation, PM checkpoint |
| [traceability-matrix.md](traceability-matrix.md) | FR/NFR to epic coverage format and gap analysis | Validating requirement coverage |
| [test-criteria.md](test-criteria.md) | Test quality standards and scope-based depth | TEA test plan validation, QA execution |

## How Agents Use This

### sf-tea (Test Engineering)

```markdown
Load and apply:
- `.specflow-lib/expertise/validation/test-criteria.md` - Test quality standards
- `.specflow-lib/expertise/validation/traceability-matrix.md` - Ensure tests cover requirements
```

TEA uses test-criteria.md to:
- Validate test plan has required scenario types (happy, error, edge, security)
- Match test depth to scope level
- Ensure acceptance criteria are BOSS-compliant

### sf-qa (Quality Assurance)

```markdown
Load and apply:
- `.specflow-lib/expertise/validation/test-criteria.md` - Execution quality standards
- `.specflow-lib/expertise/validation/readiness-checklist.md` - Pre-execution validation
```

QA uses test-criteria.md to:
- Validate test execution completeness
- Apply flaky test tiebreaker pattern
- Determine failure severity (critical blocks, minor queues)

### PM (Pre-Implementation Checkpoint)

```markdown
Load and apply:
- `.specflow-lib/expertise/validation/readiness-checklist.md` - Full readiness assessment
- `.specflow-lib/expertise/validation/traceability-matrix.md` - Coverage validation
```

PM uses readiness-checklist.md to:
- Gate implementation start
- Validate all pillars produced required outputs
- Ensure no gaps before routing to dev

## Scope-Based Usage

| Scope | Validation Depth | What to Apply |
|-------|------------------|---------------|
| trivial | Skip | No validation needed |
| small | Light | Quick readiness check only |
| medium | Standard | Full readiness checklist, basic coverage |
| large | Full | Complete readiness + traceability + test criteria |
| complex | Deep | All validation + cross-phase alignment |

### Light Validation (small scope)

- Spec exists with 3-5 acceptance criteria
- Test scenarios cover happy + error paths
- No formal traceability matrix needed

### Standard Validation (medium scope)

- Full readiness checklist applied
- Coverage matrix for all functional requirements
- Test criteria checked against BOSS

### Full Validation (large/complex scope)

- All sections of readiness checklist
- Complete traceability matrix with gap analysis
- Test criteria validation including security and performance
- Cross-document alignment verification
