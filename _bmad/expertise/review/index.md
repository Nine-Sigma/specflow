# Review Expertise

<!-- Source: SpecFlow v2.2 - created for Multi-Lens Review System -->

Methodology for the multi-lens review system that validates Dev/QA work before merge. This folder contains foundational review methodology that all review lenses load.

## Purpose

This folder contains review methodology for specialized review lenses. Each lens loads this expertise plus optional external skills (if available) to perform focused reviews. The review system operates BEFORE PR creation - it validates implementation against acceptance criteria, identifies issues, and routes fixes to Dev/QA before code leaves the local workflow.

## Contents

| File | Purpose | When to Use |
|------|---------|-------------|
| [output-format.md](output-format.md) | Standard 8-review-output.md structure for all lenses | All lenses, all reviews |
| [feedback-loop.md](feedback-loop.md) | Routing findings to Dev/QA with fix context | After findings identified |
| [escalation-rules.md](escalation-rules.md) | When to escalate to PM | Decision points in review |

## Available Lenses

| Lens | Agent | Loads Internal | Loads External |
|------|-------|----------------|----------------|
| Code | /sf:review-code | review/* | code-review-excellence |
| Test | /sf:review-test | review/* | e2e-testing-patterns |
| Security | /sf:review-security | review/*, security/* | - |
| Architecture | /sf:review-arch | review/*, architecture/* | - |
| Performance | /sf:review-perf | review/* | sql-optimization-patterns |

### Loading Pattern

Each lens agent follows this loading pattern:

1. **Internal expertise (always):** Load `_bmad/expertise/review/*` (this folder)
2. **Domain expertise (if applicable):** Load additional internal expertise (e.g., security lens loads `security/*`)
3. **External skills (when available):** Load from `.specflow/skills/{skill-name}/SKILL.md`

Loading order determines precedence: explicit instructions > internal expertise > external skills.

## Scope-Based Usage

| Scope | Lenses Applied | Review Depth |
|-------|----------------|--------------|
| trivial | None | No review - direct to merge |
| small | Code only | Quick code quality check |
| medium | Code + Test + Security (if pillar selected) | Standard review depth |
| large | All applicable per 0-scope.md pillars | Full review with all applicable lenses |
| complex | All + deep review | Deep review with architecture + performance |

### Lens Selection Logic

1. **Always applied (small+):** Code lens
2. **Applied when pillar selected:** Security lens (if security pillar), Architecture lens (if architect pillar)
3. **Applied for scope:** Test lens (medium+), Performance lens (large+)
4. **Pillar override:** 0-scope.md pillar selections override default scope-based rules

## Relationship to Pillars

Review lenses are invoked based on pillars from `0-scope.md`:

- **Security pillar selected:** Include `/sf:review-security` lens
- **Architect pillar selected:** Include `/sf:review-arch` lens
- **Always (small+):** Include `/sf:review-code` lens
- **Always (medium+):** Include `/sf:review-test` lens
- **Large+ scope:** Include `/sf:review-perf` lens

The Review Orchestrator (Phase 20) reads `0-scope.md` to determine which lenses to spawn. Each lens writes findings to `8-review-output.md` following the standardized output format.

## How Agents Use This

### Review Lens Agents

```markdown
## Step 3: Load Expertise

<expertise>
Read and apply:

**Internal (required):**
- `_bmad/expertise/review/index.md` - This overview
- `_bmad/expertise/review/output-format.md` - Standard output structure
- `_bmad/expertise/review/feedback-loop.md` - Dev/QA routing protocol
- `_bmad/expertise/review/escalation-rules.md` - PM escalation criteria

**Domain-specific (lens-dependent):**
- Security lens: Add `_bmad/expertise/security/*`
- Architecture lens: Add `_bmad/expertise/architecture/*`

**External (if available):**
- `.specflow/skills/{lens-skill}/SKILL.md`
</expertise>
```

### Review Orchestrator

```markdown
## Step 3: Load Expertise

<expertise>
Read and apply:
- `_bmad/expertise/review/index.md` - Lens selection rules
- `_bmad/expertise/review/escalation-rules.md` - When to escalate vs route to fix loop
</expertise>
```
