# Cost Analysis Methodology

<!-- Source: _bmad/expansion-packs/cloud-architecture/agents/cost-optimizer.md -->

Apply to features at medium+ scope with cost pillar selected.

## The 5-Step Cost Analysis Process

### 1. Architecture Review

- Review proposed architecture from Cloud Architect
- Understand resource sizing and capacity requirements
- Identify all cost components (compute, storage, network, services)
- Map services to pricing models

### 2. Cost Modeling

- Calculate baseline costs for proposed architecture
- Model costs across different usage scenarios
- Project costs over 1, 2, and 3-year periods
- Include data transfer, storage, and operational costs
- Factor in support plans and professional services

### 3. Optimization Analysis

- Identify right-sizing opportunities
- Evaluate reserved capacity and commitment discounts
- Assess auto-scaling and scheduling opportunities
- Review architecture for cost-effective alternatives
- Analyze data transfer patterns for optimization
- Identify waste (unused resources, over-provisioning)

### 4. Budget Planning

- Create detailed budget breakdown by service and component
- Project costs with growth scenarios (10%, 25%, 50%, 100%)
- Identify cost drivers and optimization levers
- Develop cost monitoring and alert recommendations
- Plan for seasonal variations and peak loads

### 5. ROI and Business Case

- Calculate return on investment vs current state
- Quantify benefits: performance, scalability, reliability
- Present cost-benefit analysis with sensitivity scenarios
- Recommend phased implementation to optimize cash flow
- Compare costs across cloud providers if multi-cloud

## Scope-Depth Mapping

| Scope | Cost Depth | Steps to Apply | Output |
|-------|------------|----------------|--------|
| trivial | Skip | None | No output |
| small | Skip | None | No output |
| medium | Estimate | Steps 1-2 | High-level monthly/annual estimate |
| large | Breakdown | Steps 1-4 | Full budget with optimization recommendations |
| complex | Full | Steps 1-5 | Complete analysis with multi-cloud comparison |

## Agent Guidance

When applying this methodology:

1. **Read scope from 0-scope.md** to determine depth
2. **Load architecture from 2-architecture.md** before cost analysis
3. **Match output depth to scope level** (table above)
4. **Return to PM** with 4-cost.md output
