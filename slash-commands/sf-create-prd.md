# /sf:create-prd - Create PRD from Brief

Wraps BMAD `/create-prd` with three pillars integration.

## Usage

```
/sf:create-prd
```

## SpecFlow Context

Creates PRD with mandatory three pillars:
- Security section (STRIDE requirements)
- Cost section (budget constraints)
- Testing section (acceptance criteria format)

## Prerequisites

- Product brief completed (/sf:product-brief)

## Output Format

PRD includes:
- User stories with BOSS criteria
- Security requirements
- Cost constraints
- Testing strategy

## Three Pillars in PRD

### Security Section
- Authentication requirements
- Authorization model
- Data classification
- Compliance needs (GDPR, HIPAA, etc.)

### Cost Section
- Budget constraints
- Scaling expectations
- Third-party service limits

### Testing Section
- Acceptance criteria format (BOSS)
- Minimum scenario counts
- Coverage expectations

## Related

- `/create-prd` - Original BMAD create PRD
- `/sf:product-brief` - Previous step
- `/sf:create-architecture` - Next step
