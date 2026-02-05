# Requirements Lock Format

Expertise for PM to synthesize pillar outputs into immutable `5-requirements-lock.md`.

## Purpose

The requirements lock is the **single source of truth** for development. It:
- Synthesizes all pillar outputs (spec, architecture, security, cost, test plan)
- Incorporates codebase constraints (from Analyst's 1.5-codebase-constraints.md)
- Normalizes requirements into five categories (FR/TC/SC/AC/IP)
- Requires user approval before becoming immutable
- Serves as the coordinator-context for drift detection (Phase 23)

## When to Create

PM creates 5-requirements-lock.md after ALL pillars complete:
1. 1-spec.md (Analyst) - REQUIRED
2. 1.5-codebase-constraints.md (Analyst) - REQUIRED
3. 2-architecture.md (Architect) - if applicable
4. 3-security.md (Security) - if applicable
5. 4-cost.md (Cost) - if applicable
6. 5-test-plan.md (TEA) - if applicable

## Document Format

### Frontmatter (YAML)

```yaml
---
feature: {slug}
version: 1.0
created: {iso-timestamp}
approved_at: null        # Set on approval
approved_by: null        # 'user' or 'pm' (auto-approve for trivial/small)
frozen: false            # Set to true after approval
synthesized_from:
  - 1-spec.md
  - 1.5-codebase-constraints.md
  - 2-architecture.md     # Include only if exists
  - 3-security.md         # Include only if exists
  - 4-cost.md             # Include only if exists
  - 5-test-plan.md        # Include only if exists
codebase_analysis:
  tech_stack: [typescript, react, next.js, prisma]
  framework_version: "Next.js 14.1"
  analyzed_files: 12
  patterns_detected: 8
---
```

### Body Structure

```markdown
# Requirements Lock: {Feature Name}

## Functional Requirements (FR)

Requirements derived from 1-spec.md acceptance criteria.

| ID | Requirement | Source | Verifiable |
|----|-------------|--------|------------|
| FR-01 | {requirement} | 1-spec.md AC-{N} | Yes |

## Technical Constraints (TC)

Constraints from 2-architecture.md AND 1.5-codebase-constraints.md.

| ID | Constraint | Source | Rationale |
|----|------------|--------|-----------|
| TC-01 | {constraint} | 2-architecture.md | {why} |
| TC-02 | {constraint} | CODEBASE: {file} | {project standard} |

## Security Constraints (SC)

Constraints from 3-security.md (if exists).

| ID | Constraint | Source | STRIDE Category | Rationale |
|----|------------|--------|-----------------|-----------|
| SC-01 | {constraint} | 3-security.md SEC-{N} | {category} | {why this constraint} |

## Acceptance Criteria (AC)

Testable criteria from 1-spec.md and 5-test-plan.md.

| ID | Criterion | Test Type | Source |
|----|-----------|-----------|--------|
| AC-01 | {criterion} | {Unit/Integration/E2E} | 1-spec.md AC-{N} |

## Integration Points (IP)

Dependencies from 1.5-codebase-constraints.md.

| ID | Integration | Related Files | Impact |
|----|-------------|---------------|--------|
| IP-01 | {service/middleware} | {paths} | {how to use} |
```

## Requirement Categories

### Functional Requirements (FR)
- **Source**: 1-spec.md acceptance criteria
- **What**: User-visible behaviors and outcomes
- **Format**: Action + outcome, verifiable
- **Count**: Matches AC count from 1-spec.md

### Technical Constraints (TC)
- **Source**: 2-architecture.md + 1.5-codebase-constraints.md
- **What**: How to build (not what to build)
- **Format**: Technology/pattern to use + rationale
- **Attribution**: Distinguish `2-architecture.md` vs `CODEBASE: {file}`

### Security Constraints (SC)
- **Source**: 3-security.md
- **What**: Security requirements and mitigations
- **Format**: Constraint + STRIDE category
- **Skip if**: 3-security.md does not exist

### Acceptance Criteria (AC)
- **Source**: 1-spec.md (primary) + 5-test-plan.md (test types)
- **What**: Testable criteria for verification
- **Format**: Criterion + test type + source
- **Must be**: BOSS-compliant (Binary, Observable, Specific, Scope-bound)

### Integration Points (IP)
- **Source**: 1.5-codebase-constraints.md
- **What**: Existing code that feature touches
- **Format**: Integration + files + impact
- **Purpose**: Ensure Dev knows what to reuse/integrate with

## Source Attribution Rules

Every requirement MUST have a source. Use these patterns:

| Source Type | Format | Example |
|-------------|--------|---------|
| Spec | `1-spec.md AC-{N}` | `1-spec.md AC-03` |
| Codebase | `CODEBASE: {file}` | `CODEBASE: tsconfig.json` |
| Architecture | `2-architecture.md` | `2-architecture.md` |
| Security | `3-security.md SEC-{N}` | `3-security.md SEC-01` |
| Cost | `4-cost.md` | `4-cost.md` |
| Test Plan | `5-test-plan.md` | `5-test-plan.md` |

**No unattributed requirements.** If you can't cite a source, don't include it.

## Synthesis Process

### Step 1: Gather Inputs

Read all pillar outputs that exist:
- 1-spec.md (REQUIRED)
- 1.5-codebase-constraints.md (REQUIRED)
- 2-architecture.md
- 3-security.md
- 4-cost.md
- 5-test-plan.md

### Step 2: Extract to Categories

| From | Extract To |
|------|------------|
| 1-spec.md AC items | FR + AC |
| 1.5-codebase-constraints.md TC items | TC (with CODEBASE: prefix) |
| 1.5-codebase-constraints.md IP items | IP |
| 2-architecture.md decisions | TC |
| 3-security.md mitigations | SC |
| 5-test-plan.md scenarios | AC (test types) |

### Step 3: De-duplicate

Remove duplicates where same requirement appears in multiple sources.
Keep the most authoritative source:
- For functional: 1-spec.md wins
- For technical: 2-architecture.md wins over CODEBASE
- For security: 3-security.md is authoritative

### Step 4: Resolve Conflicts

If pillar outputs conflict:
1. Document the conflict
2. PM attempts to resolve autonomously
3. If cannot resolve, escalate to user
4. Record resolution decision

### Step 5: Write Lock Document

Write to `.specflow/features/{slug}/5-requirements-lock.md`

## Immutability Protocol

### Before Approval

- `frozen: false` in frontmatter
- User can request edits
- PM can update based on feedback

### After Approval

- `frozen: true` in frontmatter
- `approved_at: {iso-timestamp}`
- `approved_by: user` (or `pm` for trivial/small)
- **NO MODIFICATIONS ALLOWED**

### Re-scope Scenario

If scope changes after approval:
1. Create new version: `5-requirements-lock-v2.md`
2. Reference previous version in frontmatter
3. User must re-approve new version
4. Old version remains frozen (historical record)

## User Approval Checkpoint

### Presentation Format

```markdown
## REQUIREMENTS LOCK REVIEW

**Feature:** {slug}
**Scope:** {scope_level}

### Synthesized Requirements

| Category | Count |
|----------|-------|
| Functional Requirements (FR) | {N} |
| Technical Constraints (TC) | {N} |
| Security Constraints (SC) | {N} |
| Acceptance Criteria (AC) | {N} |
| Integration Points (IP) | {N} |

### Codebase Constraints Detected

| Category | Count | Examples |
|----------|-------|----------|
| Tech Stack | {N} | {examples} |
| Patterns | {N} | {examples} |
| Integration Points | {N} | {examples} |

### Decision Needed

Review the full lock document below. All development work will reference this document.

- **[APPROVE]** - Lock is accurate, proceed to development
- **[EDIT]** - I want to modify specific requirements (specify which)
- **[REJECT]** - Major issues, need to revisit pillar outputs (explain why)

---

[Full 5-requirements-lock.md content here]
```

### Auto-Approval Rules

| Scope | Approval |
|-------|----------|
| trivial | Auto-approve by PM |
| small | Auto-approve by PM |
| medium | User approval required |
| large | User approval required |
| complex | User approval required |

Even for auto-approved scopes, generate the lock document. It serves as Dev's reference.

## Depth by Scope

| Scope | FR | TC | SC | AC | IP |
|-------|----|----|----|----|---|
| trivial | 1-2 | 1-2 | - | 1-2 | 0-1 |
| small | 3-5 | 2-3 | - | 3-5 | 1-2 |
| medium | 8-12 | 4-6 | 2-4 | 8-12 | 2-4 |
| large | 15+ | 6+ | 4+ | 15+ | 4+ |
| complex | 20+ | 8+ | 6+ | 20+ | 6+ |

## Anti-Patterns

- **Pillar concatenation**: Synthesis means normalization, not dumping all content
- **Missing attribution**: Every item needs a source - no "obvious" requirements
- **Over-specification**: Lock should be concise; detailed implementation is Dev's job
- **Mutable after approval**: Once frozen, create new version instead of editing
- **Skipping codebase constraints**: 1.5-codebase-constraints.md is required input
