# /sf:cost - Cost Analysis (Taylor)

Invoke Taylor, the cost-focused SpecFlow agent.

## Usage

```
/sf:cost
/sf:cost <feature-description>
```

## What This Does

Taylor performs comprehensive cost analysis:
1. Component cost breakdown
2. Scaling projections
3. Assumption documentation
4. Optimization recommendations

## Cost Categories

| Category | Examples |
|----------|----------|
| Compute | EC2, Lambda, Cloud Run |
| Storage | S3, RDS, DynamoDB |
| Data Transfer | Egress, CDN |
| Third-Party | Stripe fees, Auth0 |
| Managed Services | RDS, ElastiCache |

## Output Format

Taylor produces a structured cost breakdown with:
- Explicit assumptions list
- Component cost table
- Scaling projections (small/medium/large)
- Optimization suggestions

## Scaling Projections Example

| Scale | Users | Monthly Cost |
|-------|-------|--------------|
| Small | 1K | $50-100 |
| Medium | 10K | $200-500 |
| Large | 100K | $1,000-2,500 |

## When to Use

- Always for new features (/sf:pm routes automatically)
- When evaluating infrastructure changes
- Before choosing between implementation options

## Related

- `/cloud-cost` - Original BMAD cost agent
- `/sf:security` - Security analysis (Jordan)
- `/sf:pm` - PM orchestrator
