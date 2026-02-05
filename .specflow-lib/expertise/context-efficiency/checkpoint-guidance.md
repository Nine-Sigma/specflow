# Checkpoint Guidance for Long Workflows

Guidance for when to use `/clear` and context checkpoints during multi-agent SpecFlow workflows.

## Context Window Health Indicators

Monitor context usage throughout workflow execution:

| Status | Usage | Quality Impact | Action |
|--------|-------|----------------|--------|
| GREEN | 0-30% | Full quality, no degradation | Continue normally |
| YELLOW | 30-50% | Minor quality risk | Consider checkpoint after next agent |
| RED | 50-70% | Noticeable degradation | Clear after current agent completes |
| CRITICAL | 70%+ | Significant quality loss | Clear immediately after output saved |

**How to estimate usage:**
- Each agent invocation: ~15-25% of context
- Large file reads: ~5-10% per file
- Full requirements-lock.md: ~3-5%
- Full architecture.md: ~5-8%

## Workflow Checkpoint Recommendations

### Standard Feature Workflow

| After | Checkpoint Type | Reason |
|-------|-----------------|--------|
| Analyst (spec complete) | `/clear` | Fresh context for architecture thinking |
| Analyst (codebase analysis) | Continue | Still in analysis mode |
| Architect | Continue | Decision context needed for pillars |
| Security | Continue if small/medium | Context still relevant |
| Security + Cost | `/clear` | Implementation context differs from design |
| Requirements-Lock | `/clear` MANDATORY | Clean slate for dev work |
| Each Story Complete | `/clear` | Fresh context for next story |
| Dev Complete (all stories) | `/clear` | QA needs clean testing mindset |
| QA Complete | Continue if review next | Context still relevant for review |
| Review Round 1 | `/clear` if many findings | Fresh context for fix implementation |
| Review Round 2+ | `/clear` if Round 1 had RED | Ensure quality for verification |

### Scope-Based Adjustments

| Scope | Context Pressure | Checkpoint Frequency |
|-------|-----------------|---------------------|
| trivial | Very low | None needed |
| small | Low | After requirements-lock only |
| medium | Moderate | After spec, after lock, after dev |
| large | High | After each agent phase |
| complex | Very high | After each major agent |

## PM Checkpoint Signals

PM should add checkpoint recommendations to output messages:

### After Requirements-Lock

```markdown
---
## Context Checkpoint

**Recommendation:** `/clear` before dev work

**Reason:** Requirements are now frozen. Dev needs fresh context focused on implementation, not design decisions.

**What to load after clear:**
- STATE.md (feature context)
- 5-requirements-lock.md (frozen requirements)
- Specific story file when starting dev
---
```

### After Dev Complete

```markdown
---
## Context Checkpoint

**Recommendation:** `/clear` before QA

**Reason:** QA needs testing mindset, not implementation details. Fresh context improves test coverage quality.

**What to load after clear:**
- STATE.md (feature context)
- 5-requirements-lock.md (AC list for verification)
- 5-test-plan.md (test strategy)
---
```

### After Review with Many Findings

```markdown
---
## Context Checkpoint

**Recommendation:** `/clear` before fixes

**Reason:** {N} findings to address. Fresh context ensures each fix gets full attention.

**What to load after clear:**
- STATE.md (feature context)
- 8-review-output-v1.md (findings to address)
- Specific finding sections (not full file)
---
```

## Session Resume Protocol

When resuming after `/clear`:

### 1. Always Read STATE.md First

```markdown
Read .specflow/STATE.md
- Get current feature slug
- Get current phase (spec, dev, qa, review)
- Get last completed agent
- Get next expected action
```

### 2. Use Context Summaries

Don't reconstruct full context. Use summarized versions from synthesis artifacts:

```markdown
# Instead of reading all prior outputs
Read 5-requirements-lock.md

# Contains synthesized:
- All functional requirements (from 1-spec.md)
- All technical constraints (from 2-architecture.md)
- All security constraints (from 3-security.md)
- All integration points (from 1.5-codebase-constraints.md)
```

### 3. Load Only Relevant Sections

Apply targeted-reads.md patterns:

```markdown
# For dev work
Read ## Technical Constraints from requirements-lock.md
Read ## Integration Points from requirements-lock.md

# For QA work
Read ## Acceptance Criteria from requirements-lock.md
Read ## Test Types from test-plan.md

# For review work
Read specific finding sections only
```

### 4. Never Reconstruct Full History

**Bad pattern:**
```
Read 0-triage.md, 0-scope.md, 1-spec.md, 1.5-codebase-constraints.md,
2-architecture.md, 3-security.md, 4-cost.md, 5-test-plan.md,
PROGRESS.md, STATUS.md, sprint-status.yaml...
```

**Good pattern:**
```
Read STATE.md (context)
Read requirements-lock.md section relevant to current work
Read specific artifact if question arises
```

## Anti-Patterns

### 1. Running Full Workflow in One Session

**Problem:** Analyst through QA in single context window
- Context exhaustion by dev phase
- Quality degradation in later phases
- Increased error rate in QA

**Solution:** Clear at natural boundaries (post-lock, post-dev, post-review)

### 2. Clearing Mid-Agent

**Problem:** Clearing while agent is producing output
- Lose work in progress
- Incomplete artifacts
- Broken state

**Solution:** Always complete current agent, write output, then clear

### 3. Not Clearing After Requirements-Lock

**Problem:** Carrying design context into dev
- Implementation influenced by design discussions
- Context pressure during dev work
- Reduced code quality

**Solution:** MANDATORY clear after requirements-lock

### 4. Clearing Without State Save

**Problem:** Clearing before STATE.md updated
- Lose current position
- Resume uncertainty
- May redo work

**Solution:** Always update STATE.md before suggesting clear

### 5. Loading Full Files After Clear

**Problem:** Immediately consuming context with full file reads
- Defeats purpose of clear
- Quick return to high usage
- No quality benefit

**Solution:** Use targeted section reads (see targeted-reads.md)

## Context Window Recovery

If context is exhausted mid-workflow:

### Emergency Clear Protocol

1. **Complete current sentence/thought** - don't stop mid-output
2. **Save partial work** - write to PROGRESS.md with "PARTIAL" marker
3. **Update STATE.md** - note interrupted state
4. **Clear context**
5. **Resume from saved state** - read STATE.md, continue from marker

### Partial Work Format

```markdown
## {timestamp} - {Agent} (/sf:{agent}) [PARTIAL]

**Work Completed:**
- {completed items}

**Work Remaining:**
- {remaining items}

**Resume Point:** {specific task/section to continue}

---
```

## Quality Checkpoints

Beyond `/clear` for context, check quality at these points:

| Checkpoint | Quality Check |
|------------|---------------|
| After scope | Does scope match user intent? |
| After spec | Are all requirements BOSS-compliant? |
| After architecture | Do ADRs have clear rationale? |
| After lock | Is requirements-lock complete and consistent? |
| After each story | Does implementation match TC? |
| After QA | Are all AC verified? |
| After review | Are all findings addressed? |

Quality checks should be lightweight verification, not full re-reads.
