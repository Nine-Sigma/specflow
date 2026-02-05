# Context Summarization Patterns

PM summarizes context when routing to agents to reduce context window usage and improve focus.

## Purpose

Instead of passing full file references to downstream agents, PM creates focused context summaries that:
- Reduce context window consumption
- Preserve critical rationale (the "why")
- Provide role-appropriate context (Dev needs different context than QA)
- Enable efficient agent handoffs

## When to Summarize

| Situation | Action |
|-----------|--------|
| Routing to Dev/QA after synthesis | Summarize requirements-lock |
| Routing after multiple pillar outputs | Summarize key decisions |
| Re-invoking after drift correction | Summarize correction needed |
| Session resume | Summarize progress state |

## Summarization Templates

### For Dev/QA Routing

Use this template when routing to Dev or QA after requirements-lock approval:

```markdown
## Context Summary

**Feature:** {slug}
**Scope:** {scope_level}
**Pillars Applied:** {security, cost, testing}

### Key Decisions (with rationale)
{For each major constraint from pillar outputs}
- **{TC-01}**: {constraint} -- *Rationale: {why}*
- **{SC-01}**: {constraint} -- *Rationale: {why}*

### Acceptance Criteria ({count} total)
- AC-01: {brief one-line summary}
- AC-02: {brief one-line summary}
...

### Integration Points
- IP-01: {file} -- {interface description}
- IP-02: {file} -- {interface description}

### Source Files (read if needed)
- 5-requirements-lock.md (full requirements)
- 2-architecture.md (ADRs)
```

### For Drift Correction

Use this template when routing to agent for drift correction:

```markdown
## Drift Correction Context

**Story/Issue:** {id}
**Drift Type:** {TEST_DRIFT | CODE_ISSUE | DRIFT}

### What's Wrong
{1-2 sentence description of mismatch}

### Expected (from AC)
{Exact AC text or test expectation}

### Actual (from output)
{What was built/tested}

### Fix Needed
{Specific change required}

### Files to Modify
- {file1.ts} -- {what to change}
```

### For Session Resume

Use this template when resuming a session after context clear:

```markdown
## Session Context

**Feature:** {slug}
**Last Work:** {last completed item}
**Next Work:** {next pending item}

### Decisions Made This Session
- {Decision 1}
- {Decision 2}

### Current Blockers
{None, or list}
```

## Rationale Preservation

When synthesizing requirements lock, preserve rationale for:

1. **Security constraints** -- Why this specific algorithm, expiry, etc.
2. **Cost constraints** -- Why this tier, limit, etc.
3. **Architecture decisions** -- Why this pattern, not alternative

Format in TC/SC tables with explicit Rationale column:

```markdown
| ID | Constraint | Source | Rationale |
|----|------------|--------|-----------|
| TC-01 | Use Argon2id for passwords | 3-security.md | OWASP recommended, memory-hard |
| SC-01 | 15-minute token expiry | 3-security.md | Balances UX with security |
| TC-02 | Use Next.js App Router | CODEBASE | Project standard from app/ structure |
```

**Key insight:** The "Rationale" column is what distinguishes a useful lock from a mere list of requirements. Dev/QA need to understand WHY to make correct implementation decisions.

## Context Efficiency Rules

1. **Summarize, don't copy** -- Extract key points, not full sections
2. **Include rationale** -- Why matters as much as what
3. **Role-specific** -- Dev needs different context than QA
4. **Reference for depth** -- "See X for full details"
5. **Fit in ~500 tokens** -- Summary should be digestible

## Role-Specific Context

### For Dev

Emphasize:
- Technical constraints and integration points
- ADR decisions that affect implementation
- Test commands and expected test types
- Security constraints that affect code patterns

De-emphasize:
- Test coverage details (that's QA's job)
- Cost justifications (unless affecting implementation)

### For QA

Emphasize:
- Acceptance criteria with test types
- Security constraints to verify
- Integration points to test boundaries
- Expected behaviors and edge cases

De-emphasize:
- Implementation details (only test behavior)
- Architecture decisions (unless affecting test approach)

## Anti-Patterns

- **Full file copying**: Summary should be ~500 tokens, not 5000
- **Missing rationale**: Constraints without "why" lead to wrong implementations
- **One-size-fits-all**: Dev and QA need different summaries
- **Reference-only**: Saying "read file X" defeats the purpose of summarization
- **Stale context**: Summary must reflect current state, not initial plan

## Example: Complete Dev Routing

After requirements-lock approval for "add-password-reset" feature:

```markdown
## Context Summary

**Feature:** add-password-reset
**Scope:** medium
**Pillars Applied:** security, testing

### Key Decisions (with rationale)
- **TC-01**: Use Argon2id for password hashing -- *Rationale: OWASP recommended, resists GPU attacks*
- **TC-02**: Store tokens in Redis -- *Rationale: Auto-expiry built-in, matches existing session pattern*
- **SC-01**: 256-bit token entropy -- *Rationale: Exceeds OWASP 128-bit minimum*
- **SC-02**: 1-hour token expiry -- *Rationale: Balance usability with security window*
- **SC-03**: Rate limit: 3 requests/hour/email -- *Rationale: Prevent enumeration attacks*

### Acceptance Criteria (7 total)
- AC-01: User can request reset via email
- AC-02: Token sent to registered email only
- AC-03: Token expires after 1 hour
- AC-04: Password updated on valid token
- AC-05: Token invalidated after use
- AC-06: Rate limited to 3 requests/hour
- AC-07: Old password no longer works

### Integration Points
- IP-01: src/lib/redis.ts -- Use getRedisClient() for token storage
- IP-02: src/services/email.ts -- Use sendEmail() for reset link
- IP-03: src/middleware/rate-limit.ts -- Use existing rate limiter pattern

### Source Files (read if needed)
- 5-requirements-lock.md (full requirements with all TC/SC/AC/IP)
- 2-architecture.md (ADRs for token storage, email flow)
```

This summary is ~350 tokens vs ~2000+ tokens for full file references, while preserving the critical rationale that Dev needs.
