# Cost Expertise

<!-- Source: _bmad/expansion-packs/cloud-architecture/agents/cost-optimizer.md -->

Extracted cost analysis methodology from BMAD for autonomous agent use.

## Purpose

SpecFlow agents use this expertise to perform cost analysis **without invoking BMAD's interactive workflows**. Agents read this content, apply it autonomously, and return outputs to PM for review.

## Contents

| File | Purpose | When to Use |
|------|---------|-------------|
| [cost-methodology.md](cost-methodology.md) | 5-step cost analysis process | All cost analysis (medium+ scope) |
| [optimization-strategies.md](optimization-strategies.md) | Compute, storage, network, operational optimization | When recommending cost savings |
| [pricing-models.md](pricing-models.md) | AWS, Azure, GCP pricing patterns | Multi-cloud comparison or provider-specific analysis |

## How Agents Use This

```markdown
## In sf-cost.md

<expertise>
Read and apply:
- `_bmad/expertise/cost/cost-methodology.md` - Cost analysis process
- `_bmad/expertise/cost/optimization-strategies.md` - Optimization recommendations
- `_bmad/expertise/cost/pricing-models.md` - Cloud provider pricing
</expertise>
```

## Scope-Based Usage

| Scope | Cost Analysis | What to Apply |
|-------|---------------|---------------|
| trivial | Skip | No cost analysis needed |
| small | Skip | No cost analysis needed |
| medium | Estimate | Step 1-2 of methodology, high-level estimate only |
| large | Breakdown | Full methodology (all 5 steps), optimization strategies |
| complex | Full comparison | Full methodology + multi-cloud pricing comparison |

### Depth Mapping

- **Skip**: No cost analysis (trivial/small scope or no new resources)
- **Estimate**: Total monthly/annual estimate, key drivers only
- **Breakdown**: By resource type, with alternatives and optimization recommendations
- **Full comparison**: Multi-provider projections, optimization strategies, detailed pricing model analysis

## Source Attribution

All content extracted from BMAD expansion pack:
- `_bmad/expansion-packs/cloud-architecture/agents/cost-optimizer.md`
