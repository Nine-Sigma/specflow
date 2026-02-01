# Review Skill Loading Pattern

<!-- Source: SpecFlow v2.2 Phase 18-02 - Skill-to-lens mapping for /sf:review architecture -->

This document provides the skill-to-lens mapping and loading pattern for the multi-lens review system. Phase 19 agents use these snippets directly.

## Architecture Overview

```
/sf:review (orchestrator)
    |
    +-- /sf:review-code
    |       +-- Internal: _bmad/expertise/review/*
    |       +-- External: .specflow/skills/code-review-excellence/SKILL.md
    |
    +-- /sf:review-test
    |       +-- Internal: _bmad/expertise/review/*
    |       +-- External: .specflow/skills/e2e-testing-patterns/SKILL.md
    |
    +-- /sf:review-security
    |       +-- Internal: _bmad/expertise/review/* + security/*
    |       +-- External: None (internal security expertise sufficient)
    |
    +-- /sf:review-arch
    |       +-- Internal: _bmad/expertise/review/* + architecture/*
    |       +-- External: None (internal architecture expertise sufficient)
    |
    +-- /sf:review-perf
            +-- Internal: _bmad/expertise/review/*
            +-- External: .specflow/skills/sql-optimization-patterns/SKILL.md
```

## Skill-to-Lens Mapping

| Lens | Agent Command | Internal Expertise | External Skill | Fallback |
|------|---------------|-------------------|----------------|----------|
| Code | /sf:review-code | review/* | code-review-excellence | Use internal only |
| Test | /sf:review-test | review/* | e2e-testing-patterns | Use internal only |
| Security | /sf:review-security | review/*, security/* | None | Always has full expertise |
| Architecture | /sf:review-arch | review/*, architecture/* | None | Always has full expertise |
| Performance | /sf:review-perf | review/* | sql-optimization-patterns | Use internal only |

### Skill Detection

Each lens with external skill dependency checks for skill availability:

```bash
# Check if skill is installed
test -f .specflow/skills/{skill-name}/SKILL.md && echo "installed" || echo "missing"
```

If missing, the lens operates in fallback mode using internal expertise only.

## Loading Pattern Snippets

Copy-paste these `<expertise>` blocks into Phase 19 agent commands.

### /sf:review-code Loading Snippet

```markdown
<expertise>
Read and apply methodology from these sources:

**Internal expertise (required):**
- `_bmad/expertise/review/index.md` - Review system overview and lens selection
- `_bmad/expertise/review/output-format.md` - Standard 8-review-output.md structure
- `_bmad/expertise/review/feedback-loop.md` - Dev/QA routing protocol
- `_bmad/expertise/review/escalation-rules.md` - PM escalation criteria

**External skill (if available):**
```bash
if test -f .specflow/skills/code-review-excellence/SKILL.md; then
  # Load skill for enhanced code review patterns
  read .specflow/skills/code-review-excellence/SKILL.md
fi
```

Loading order: explicit instructions > internal expertise > external skill.

If external skill missing: Continue with internal expertise only.
</expertise>
```

### /sf:review-test Loading Snippet

```markdown
<expertise>
Read and apply methodology from these sources:

**Internal expertise (required):**
- `_bmad/expertise/review/index.md` - Review system overview and lens selection
- `_bmad/expertise/review/output-format.md` - Standard 8-review-output.md structure
- `_bmad/expertise/review/feedback-loop.md` - Dev/QA routing protocol
- `_bmad/expertise/review/escalation-rules.md` - PM escalation criteria

**External skill (if available):**
```bash
if test -f .specflow/skills/e2e-testing-patterns/SKILL.md; then
  # Load skill for E2E testing patterns (Playwright/Cypress)
  read .specflow/skills/e2e-testing-patterns/SKILL.md
fi
```

Loading order: explicit instructions > internal expertise > external skill.

If external skill missing: Continue with internal expertise only.
</expertise>
```

### /sf:review-perf Loading Snippet

```markdown
<expertise>
Read and apply methodology from these sources:

**Internal expertise (required):**
- `_bmad/expertise/review/index.md` - Review system overview and lens selection
- `_bmad/expertise/review/output-format.md` - Standard 8-review-output.md structure
- `_bmad/expertise/review/feedback-loop.md` - Dev/QA routing protocol
- `_bmad/expertise/review/escalation-rules.md` - PM escalation criteria

**External skill (if available):**
```bash
if test -f .specflow/skills/sql-optimization-patterns/SKILL.md; then
  # Load skill for SQL query optimization and EXPLAIN analysis
  read .specflow/skills/sql-optimization-patterns/SKILL.md
fi
```

Loading order: explicit instructions > internal expertise > external skill.

If external skill missing: Continue with internal expertise only.
</expertise>
```

## Fallback Behavior

When an external skill is not installed:

1. **Detection:** Agent checks for SKILL.md file at load time
2. **Log:** Agent notes in PROGRESS.md that skill was not available
3. **Continue:** Agent proceeds with internal expertise only
4. **Quality:** Review quality may be reduced but review still occurs
5. **Recommendation:** Agent may recommend skill installation in review output

### Fallback Log Entry

When operating without external skill, agents log:

```markdown
## Skill Loading

- External skill: {skill-name}
- Status: Not installed
- Mode: Fallback (internal expertise only)
- Recommendation: Run `npx specflow install {skill-name}@wshobson/agents:plugins/developer-essentials/skills/{skill-name}` for enhanced review
```

## Skill Installation

### Check Installed Skills

```bash
# List all installed skills
ls -1 .specflow/skills/
```

### Install Missing Skills

```bash
# Install code-review-excellence
npx specflow install code-review-excellence@wshobson/agents:plugins/developer-essentials/skills/code-review-excellence

# Install e2e-testing-patterns
npx specflow install e2e-testing-patterns@wshobson/agents:plugins/developer-essentials/skills/e2e-testing-patterns

# Install sql-optimization-patterns
npx specflow install sql-optimization-patterns@wshobson/agents:plugins/developer-essentials/skills/sql-optimization-patterns
```

### Verify Installation

```bash
# Verify all review skills are installed
for skill in code-review-excellence e2e-testing-patterns sql-optimization-patterns; do
  if test -f ".specflow/skills/${skill}/SKILL.md"; then
    echo "${skill}: installed"
  else
    echo "${skill}: MISSING"
  fi
done
```

## Skills Installed (Current State)

As of Phase 18-01, the following skills are installed:

| Skill | Lines | Purpose | Used By |
|-------|-------|---------|---------|
| code-review-excellence | 538 | Code review methodology, constructive feedback patterns | /sf:review-code |
| e2e-testing-patterns | 544 | Playwright/Cypress E2E testing patterns | /sf:review-test |
| sql-optimization-patterns | 509 | SQL query optimization, EXPLAIN analysis, indexing | /sf:review-perf |

### Skill Content Summary

**code-review-excellence:**
- Review mindset and goals
- Effective feedback patterns
- Comment classifications (critical, suggestion, nitpick)
- Security-focused review checklist
- Performance review checklist

**e2e-testing-patterns:**
- Testing pyramid philosophy
- Critical path identification
- Playwright and Cypress patterns
- Flaky test debugging
- CI/CD integration

**sql-optimization-patterns:**
- EXPLAIN query plan analysis
- Indexing strategies
- N+1 query detection and fixes
- Join optimization
- Database-specific optimizations (PostgreSQL, MySQL)

## Integration with Review Orchestrator

The Review Orchestrator (/sf:review) uses this document to:

1. **Determine lens selection** based on scope and pillars
2. **Spawn lens agents** with correct expertise loading
3. **Track skill availability** across the review system
4. **Recommend skill installation** when running in fallback mode

### Orchestrator Decision Flow

```
/sf:review spawned
    |
    +-- Read 0-scope.md for scope and pillars
    |
    +-- Select lenses based on:
    |       - Scope level (trivial=none, small=code, medium+=test, large+=perf)
    |       - Pillar selection (security pillar -> security lens)
    |
    +-- For each selected lens:
    |       - Spawn lens agent
    |       - Agent loads expertise (internal + external if available)
    |       - Agent performs review
    |       - Agent writes to 8-review-output.md
    |
    +-- Consolidate findings
    |
    +-- Route to fix loop or escalate to PM
```

---
*Phase: 18-external-skills-loading-pattern*
*Created: Phase 18-02*
