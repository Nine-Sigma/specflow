# /sf:create-architecture - Create Technical Architecture

Wraps BMAD `/create-architecture` with ADR format.

## Usage

```
/sf:create-architecture
```

## SpecFlow Context

Creates architecture with:
- ADR (Architecture Decision Record) format
- Security architecture (trust boundaries)
- Cost architecture (resource planning)

## Prerequisites

- PRD completed (/sf:create-prd)

## Output Format

Architecture includes:
- System context diagram
- Component breakdown
- ADR for key decisions
- Security/cost considerations

## Security Architecture

Trust boundary diagram (ASCII):
```
+------------------+     +------------------+
|   Public Zone    |     |   Private Zone   |
|   (Untrusted)    |---->|   (Trusted)      |
|   - CDN          |     |   - API          |
|   - Static       |     |   - Database     |
+------------------+     +------------------+
```

## Cost Architecture

Resource planning:
| Component | Size | Est. Cost/mo |
|-----------|------|--------------|
| Compute | t3.medium | $30 |
| Database | db.t3.small | $25 |
| Storage | 100GB S3 | $3 |

## Related

- `/create-architecture` - Original BMAD architecture
- `/sf:create-prd` - Previous step
- `/sf:create-epics` - Next step
- `/sf:security` - Detailed security analysis
- `/sf:cost` - Detailed cost analysis
