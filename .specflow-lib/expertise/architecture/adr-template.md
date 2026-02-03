# Architecture Decision Record Template

<!-- Source: _bmad/workflows/3-solutioning/create-architecture/steps/step-04-decisions.md -->

Use this template to document significant architectural decisions. ADRs capture the context, decision, and consequences for future reference.

## When to Use ADRs

**Always use ADRs for:**
- Complex scope features (required)
- Any decision with significant trade-offs
- Decisions that affect multiple components
- Technology choices that are hard to change later

**Consider ADRs for:**
- Large scope features with non-obvious decisions
- Decisions that override common patterns
- Choices that future developers will question

**Skip ADRs for:**
- Trivial/small scope features
- Decisions already documented in architecture doc
- Decisions provided by starter template

## ADR Template

```markdown
# ADR-NNN: [Decision Title]

**Status:** [Proposed | Accepted | Deprecated | Superseded]
**Date:** [YYYY-MM-DD]
**Category:** [Data | Auth | API | Frontend | Infrastructure]

## Context

[What is the issue that we're seeing that is motivating this decision?]
[What constraints do we have?]
[What forces are at play?]

## Decision

[What is the decision and why was it chosen?]
[Be specific about the technology, version, and configuration if applicable.]

## Consequences

### Positive

- [Benefits of this decision]
- [How it solves the problem]
- [Advantages over alternatives]

### Negative

- [Drawbacks or risks]
- [What we're giving up]
- [Technical debt introduced]

### Neutral

- [Trade-offs to be aware of]
- [Things that change but aren't clearly better/worse]
- [Dependencies introduced]

## Alternatives Considered

| Alternative | Pros | Cons | Why Not |
|-------------|------|------|---------|
| [Option 1] | [Pros] | [Cons] | [Reason rejected] |
| [Option 2] | [Pros] | [Cons] | [Reason rejected] |
| [Option 3] | [Pros] | [Cons] | [Reason rejected] |

## Implementation Notes

[Optional: specific guidance for implementing this decision]

## References

- [Links to relevant docs, PRs, or discussions]
- [Links to external resources that informed the decision]
```

## ADR Naming Convention

Store ADRs in: `docs/adr/` or `architecture/decisions/`

Name format: `ADR-NNN-brief-title.md`

Examples:
- `ADR-001-use-postgresql-for-primary-database.md`
- `ADR-002-jwt-with-refresh-tokens-for-auth.md`
- `ADR-003-event-driven-architecture-for-notifications.md`

## ADR Status Lifecycle

```
Proposed  -->  Accepted  -->  Deprecated
                    \
                     -->  Superseded by ADR-NNN
```

**Proposed**: Under discussion, not yet approved
**Accepted**: Approved and in effect
**Deprecated**: No longer recommended, but existing code may use it
**Superseded**: Replaced by a newer ADR (link to it)

## Quick Decision Record

For less significant decisions, use inline documentation:

```markdown
### Database: PostgreSQL 16

**Decision:** Use PostgreSQL 16 for primary database
**Rationale:** Team familiarity, JSON support, strong ecosystem
**Alternatives:** MySQL (less JSON support), MongoDB (team less familiar)
```

This is sufficient for medium/large scope when a full ADR isn't warranted.

## Example ADR

```markdown
# ADR-001: Use PostgreSQL for Primary Database

**Status:** Accepted
**Date:** 2026-02-01
**Category:** Data

## Context

We need to select a primary database for the application. The application will:
- Store user data with complex relationships
- Handle JSON payloads from third-party integrations
- Require strong consistency for financial transactions

Team has experience with both PostgreSQL and MySQL.

## Decision

Use PostgreSQL 16 as the primary database.

We chose PostgreSQL because:
1. Superior JSON/JSONB support for third-party data
2. Better handling of complex queries and joins
3. Stronger transactional guarantees
4. Team has more production experience with PostgreSQL

## Consequences

### Positive
- Native JSON operators reduce application complexity
- Strong ACID compliance for financial data
- Extensive ecosystem of tools and extensions

### Negative
- Slightly higher operational complexity than MySQL
- Larger memory footprint for small datasets

### Neutral
- Requires PostgreSQL-specific hosting (not MySQL-compatible)
- Migration tooling (Prisma) works equally well with both

## Alternatives Considered

| Alternative | Pros | Cons | Why Not |
|-------------|------|------|---------|
| MySQL 8 | Simpler ops, familiar | Weaker JSON, less strict | JSON support critical |
| MongoDB | Native JSON, flexible schema | Weak joins, eventual consistency | Need strong consistency |
| SQLite | Simple, embedded | Not for production scale | Won't scale |

## References

- [PostgreSQL JSON Functions](https://www.postgresql.org/docs/16/functions-json.html)
- [Prisma PostgreSQL Setup](https://www.prisma.io/docs/concepts/database-connectors/postgresql)
```
