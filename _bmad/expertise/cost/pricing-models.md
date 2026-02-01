# Cloud Pricing Models

<!-- Source: _bmad/expansion-packs/cloud-architecture/agents/cost-optimizer.md -->

Reference for multi-cloud pricing comparison and provider-specific analysis.

## AWS

- **EC2**: On-Demand, Reserved, Savings Plans, Spot
- **S3**: Storage tiers, request pricing, data transfer
- **RDS**: Instance pricing, storage, backup, Multi-AZ

## Azure

- **VMs**: Pay-as-you-go, Reserved, Spot
- **Blob Storage**: Access tiers, operations pricing
- **SQL Database**: DTU or vCore models

## GCP

- **Compute Engine**: On-demand, Committed Use, Preemptible
- **Cloud Storage**: Storage classes, operations
- **Cloud SQL**: Instance pricing, storage, backups

## When to Compare

| Scope | Multi-Cloud Comparison? |
|-------|------------------------|
| trivial | No |
| small | No |
| medium | No (single provider assumed) |
| large | Optional (if considering migration) |
| complex | Yes (full provider comparison required) |

## Agent Guidance

When using pricing models:

1. **Identify target provider(s)** from architecture document
2. **Map resources to pricing categories** (compute, storage, network)
3. **Consider commitment options** (reserved, savings plans)
4. **For complex scope**: Compare equivalent services across providers
