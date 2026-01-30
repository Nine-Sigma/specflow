# /sf:architect - Architecture Decisions

Wraps BMAD `/architect` with SpecFlow ADR format.

## Usage

```
/sf:architect
/sf:architect <decision-context>
```

## SpecFlow Context

This command invokes BMAD's architect with additional context:
- ADR (Architecture Decision Record) format
- Integration with spec system
- Security and cost considerations included

## Output Format

Architecture output includes:
- Context and problem statement
- Decision drivers
- Considered options with tradeoffs
- Decision outcome
- Consequences (security, cost, maintenance)

## ADR Template

```markdown
# ADR-NNN: [Title]

## Status
Proposed | Accepted | Deprecated | Superseded

## Context
[Why this decision is needed]

## Decision
[What we decided]

## Consequences
- Security: [impact]
- Cost: [impact]
- Maintenance: [impact]
```

## When to Use

- New service or component architecture
- Technology selection decisions
- Integration approach choices
- Data model design

## Related

- `/architect` - Original BMAD architect
- `/sf:pm` - PM orchestrator (routes to architect)
- `/sf:create-architecture` - Full architecture creation
