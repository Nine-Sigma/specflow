# Review Expertise

<!-- Source: SpecFlow v2.2 - Dynamic Multi-Lens Review System -->

Methodology for the dynamic review system that validates Dev/QA work before merge. This folder contains foundational review methodology that all review skills load.

## Purpose

The review system is a **dynamic skill orchestrator** that:
1. Discovers all installed review-capable skills
2. Analyzes code to determine which skills are relevant
3. Spawns only relevant skills in parallel with fresh context
4. Routes fixes to Dev/QA (parallel when independent)
5. Performs focused re-review on subsequent iterations

The review system operates BEFORE PR creation - it validates implementation against acceptance criteria, identifies issues, and routes fixes to Dev/QA before code leaves the local workflow.

## Contents

| File | Purpose | When to Use |
|------|---------|-------------|
| [output-format.md](output-format.md) | Standard 8-review-output.md structure for all skills | All skills, all reviews |
| [feedback-loop.md](feedback-loop.md) | Routing findings to Dev/QA with fix context | After findings identified |
| [escalation-rules.md](escalation-rules.md) | When to escalate to PM | Decision points in review |
| [skill-loading.md](skill-loading.md) | Skill-to-lens mapping (legacy reference) | Understanding installed skills |

## Dynamic Skill Architecture

```
/sf:review (orchestrator)
    |
    +-- Step 1: Load context (6-dev-output.md, 1-spec.md, 0-scope.md)
    |
    +-- Step 2: Discover review-capable skills
    |       Read agents.json → filter source:"skill" + review-capable:true
    |       Read internal expertise triggers.yaml files
    |
    +-- Step 3: Match skills to content
    |       For each skill:
    |           Check file patterns against changed files
    |           Check code patterns against file contents
    |           If match: add to selection
    |
    +-- Step 4: Apply scope/pillar overrides
    |       Add scope-minimum skills (e.g., code-review for small+)
    |       Add pillar-required skills (e.g., security if pillar selected)
    |
    +-- Step 5: Spawn matched skills in parallel
    |       Each skill gets fresh context:
    |           - Only files relevant to that skill
    |           - 1-spec.md for AC references
    |           - output-format.md structure
    |
    +-- Step 6: Consolidate findings
    |       Merge all outputs → 8-review-output-vN.md
    |       Categorize: dev issues vs qa issues
    |
    +-- Step 7: Route fixes (parallel if independent)
    |       Dev issues → /sf:dev with fix context
    |       QA issues → /sf:qa with fix context
    |
    +-- Step 8: Focused re-review (iteration 2+)
            Only re-spawn skills that had findings
            Mode: VERIFY_FIXES (not full review)
```

## Skill Trigger Declaration

Each review-capable skill declares what it's good at:

```yaml
# In SKILL.md frontmatter
---
name: sql-optimization-patterns
review-capable: true
triggers:
  files:
    - "*.sql"
    - "**/migrations/**"
    - "**/prisma/**"
  patterns:
    - "SELECT\\s+.*FROM"
    - "INSERT\\s+INTO"
    - "prisma\\."
---
```

Internal expertise declares triggers via pillar-based overrides:

```yaml
# Security pillar binding (triggers security review)
# Activated when 0-scope.md has pillars.required includes "security"
# Uses methodology from: _bmad/expansion-packs/cloud-architecture/agents/security-reviewer.md#stride-framework

# File patterns that suggest security review:
files:
  - "*auth*"
  - "*login*"
  - "*payment*"
patterns:
  - "password"
  - "token"
  - "bcrypt"
```

## Currently Installed Skills

| Skill | Triggers (Files) | Triggers (Patterns) |
|-------|------------------|---------------------|
| code-review-excellence | `*.ts, *.tsx, *.js, *.py` | Always for code |
| e2e-testing-patterns | `*.test.*, *.spec.*` | `describe(`, `it(`, `test(` |
| sql-optimization-patterns | `*.sql, **/migrations/**` | `SELECT`, `INSERT`, `prisma.` |

## Scope-Based Minimums

| Scope | Minimum Skills | Additional via Detection |
|-------|----------------|--------------------------|
| trivial | None | None (no review) |
| small | code-review-excellence | Content-matched skills |
| medium | code-review-excellence | Content-matched skills |
| large | code-review-excellence | Content-matched skills |
| complex | code-review-excellence | Content-matched skills + deep review |

**Key insight:** Scope sets the *minimum* review. Content detection *adds* skills. A large scope feature with no SQL won't invoke sql-optimization-patterns.

## Pillar-Based Overrides

When a pillar is selected in `0-scope.md`, the related skill is always included:

| Pillar | Forces Skill |
|--------|--------------|
| security | Security expertise review |
| architect | Architecture expertise review |

## How Orchestrator Uses This

### /sf:review Orchestrator

```markdown
## Step 3: Load Expertise

<expertise>
Read and apply:
- `_bmad/expertise/review/index.md` - This overview (dynamic architecture)
- `_bmad/expertise/review/output-format.md` - Consolidated output structure
- `_bmad/expertise/review/escalation-rules.md` - When to escalate vs route to fix loop
</expertise>
```

### Individual Skills

Each skill receives fresh context when spawned:

```markdown
<context>
Files to review:
- {list of files matching this skill's triggers}

Spec reference:
- {1-spec.md content for AC references}

Output format:
- {output-format.md structure}
</context>
```

## Parallel Fix Routing

When findings are consolidated, Review analyzes independence:

```
Independent issues (different files):
  → Spawn Dev + QA in parallel via Task tool

Dependent issues (QA tests depend on Dev code):
  → Spawn Dev first, then QA after Dev completes
```

## Detection Module API

The detection module (`src/review/detection.ts`) provides the core discovery and matching logic:

### Functions

| Function | Purpose | Returns |
|----------|---------|---------|
| `discoverReviewSkills()` | Find all review-capable skills | `{ skills: ReviewSkill[], errors: [] }` |
| `matchSkillTriggers(skill, files, contents)` | Check if skill matches content | `{ matched: boolean, reason, detail }` |
| `detectRelevantSkills(context)` | Full detection pipeline | `DetectionResult[]` |
| `formatDetectionLog(results)` | Log-friendly output | Markdown string |

### Detection Context

```typescript
interface DetectionContext {
  changedFiles: string[];       // From 6-dev-output.md
  fileContents: Map<string, string>;  // File path -> content
  scope: 'trivial' | 'small' | 'medium' | 'large' | 'complex';
  selectedPillars: string[];    // From 0-scope.md
}
```

### Selection Algorithm

```
matched = content_triggers ∪ scope_minimum ∪ pillar_binding

For each skill:
  1. If pillar_binding matches selected pillar → INCLUDE
  2. Else if scope >= scope_minimum → INCLUDE
  3. Else if file pattern matches changed file → INCLUDE
  4. Else if code pattern matches file content → INCLUDE
  5. Else → SKIP (logged as "not relevant")
```

## Focused Re-Review

Iteration 2+ uses VERIFY_FIXES mode:

1. Only re-spawn skills that had findings in previous iteration
2. Only check that specific findings are resolved
3. Do NOT look for new issues
4. If new critical issue found, escalate to PM

---
*Updated: 2026-02-01 - Revised for dynamic skill architecture*
