# Cost Analysis: User Authentication Feature

**Prepared by:** Taylor (Cloud Cost Optimizer)
**Date:** 2026-01-29
**Feature:** User authentication with email/password login
**Target Users:** 10,000 Monthly Active Users (MAU)
**Cloud Provider:** AWS

---

## Executive Summary

This cost analysis provides a detailed breakdown of the monthly cloud infrastructure costs for implementing a user authentication feature on AWS. The architecture is designed for 10,000 monthly active users with standard SaaS usage patterns.

**Total Estimated Monthly Cost: $127.50 - $187.50**

---

## 1. Cost Breakdown by Component

| Component | Service | Configuration | Monthly Cost | Notes |
|-----------|---------|---------------|--------------|-------|
| **Compute** | AWS Lambda | 1M invocations, 256MB, 200ms avg | $4.20 | Auth endpoints (login, logout, reset) |
| **Compute** | API Gateway | 1M requests | $3.50 | REST API for auth endpoints |
| **Database** | RDS PostgreSQL | db.t3.micro, 20GB storage | $25.00 | User credentials and profiles |
| **Database** | RDS Multi-AZ (optional) | Standby instance | $25.00 | High availability (recommended) |
| **Session Store** | ElastiCache Redis | cache.t3.micro, single node | $12.50 | Session token storage |
| **Email** | SES | 10,000 emails/month | $1.00 | Password reset, notifications |
| **Secrets** | Secrets Manager | 2 secrets, 10K API calls | $1.20 | JWT signing keys, DB credentials |
| **Encryption** | KMS | 2 keys, 10K requests | $2.02 | Data encryption keys |
| **Monitoring** | CloudWatch | Logs, metrics, alarms | $10.00 | Auth event logging, dashboards |
| **WAF** | AWS WAF | Web ACL, 1M requests | $11.00 | Rate limiting, bot protection |
| **CDN** | CloudFront | Minimal (static assets) | $2.00 | Edge caching for auth UI |
| **Networking** | VPC/NAT | NAT Gateway (partial) | $15.00 | Outbound traffic from private subnets |
| **Support** | AWS Support | Business tier (optional) | $0 - $100 | 24/7 support (scale-dependent) |

### Cost Summary

| Category | Monthly Cost | % of Total |
|----------|--------------|------------|
| Compute (Lambda + API GW) | $7.70 | 6% |
| Database (RDS + ElastiCache) | $62.50 | 49% |
| Security (WAF, KMS, Secrets) | $14.22 | 11% |
| Operations (CloudWatch, SES) | $11.00 | 9% |
| Networking (VPC, CloudFront) | $17.00 | 13% |
| **Subtotal (Production)** | **$112.42** | |
| High Availability Add-on | $25.00 | |
| Support (optional) | $0-$100 | |
| **Total Range** | **$127.50 - $237.50** | |

---

## 2. Assumptions

### Traffic Assumptions

| Metric | Value | Rationale |
|--------|-------|-----------|
| Monthly Active Users (MAU) | 10,000 | Given requirement |
| Daily Active Users (DAU) | 3,000 | 30% of MAU typical for SaaS |
| Logins per user/day | 2 | Morning + afternoon sessions |
| Total logins/month | 180,000 | 3,000 DAU x 2 x 30 days |
| Password resets/month | 500 | 5% of MAU typical |
| API calls/month | ~1,000,000 | Login + token refresh + logout |

### Infrastructure Assumptions

| Assumption | Value | Notes |
|------------|-------|-------|
| Region | us-east-1 | Standard pricing, lowest latency for NA |
| Environment | Production | Single environment (dev/staging additional) |
| Availability | 99.9% | Standard SLA target |
| Data retention | 90 days logs | Compliance minimum |
| Backup retention | 7 days | Automated RDS snapshots |

### Usage Patterns

- Peak hours: 9 AM - 5 PM local time (8 hours)
- Peak to average ratio: 3:1
- Weekend traffic: 40% of weekday
- Seasonal variation: +/- 20%

---

## 3. Scaling Projections

| MAU | Monthly Cost | Cost per User |
|-----|--------------|---------------|
| 10,000 | $127 | $0.013 |
| 25,000 | $185 | $0.007 |
| 50,000 | $295 | $0.006 |
| 100,000 | $520 | $0.005 |

**Cost drivers at scale:**
- Database: Upgrade to db.t3.small/medium
- ElastiCache: Add read replicas
- Lambda: Costs scale linearly
- WAF: Costs scale with requests

---

## 4. Optimization Opportunities

| Opportunity | Potential Savings | Implementation |
|-------------|-------------------|----------------|
| **Reserved Instances** | 30-40% on RDS | 1-year commitment for production RDS |
| **Savings Plans** | 20-30% on compute | 1-year compute savings plan |
| **Cognito Migration** | $50-70/month | Replace custom auth with Cognito (trade-off: less control) |
| **Lambda ARM64** | 20% on Lambda | Graviton2 processors |
| **S3 Intelligent Tiering** | 10% on storage | Automatic tier optimization |
| **Right-sizing** | Variable | Monitor actual usage, adjust instance sizes |

### Recommended Optimizations (Priority Order)

1. **Immediate:** Use Lambda ARM64 (Graviton2) - 20% compute savings
2. **Month 3:** Reserved Instance for RDS after baseline established
3. **Month 6:** Evaluate Cognito vs custom auth based on requirements
4. **Ongoing:** CloudWatch cost anomaly detection alerts

---

## 5. Alternative Architectures

### Option A: Serverless-First (Current)
- **Monthly Cost:** $127
- **Pros:** Auto-scaling, pay-per-use, minimal ops
- **Cons:** Cold starts, vendor lock-in
- **Best for:** Variable traffic, small-medium scale

### Option B: Container-Based (ECS Fargate)
- **Monthly Cost:** $180-220
- **Pros:** More control, portable, better cold starts
- **Cons:** Higher baseline cost, capacity planning
- **Best for:** Consistent traffic, medium-large scale

### Option C: Managed Auth (Cognito)
- **Monthly Cost:** $55-75 (MAU pricing)
- **Pros:** Fully managed, built-in MFA, social login
- **Cons:** Less customization, pricing at scale
- **Best for:** Standard auth needs, quick deployment

---

## 6. Cost Monitoring Strategy

### Recommended Alerts

| Alert | Threshold | Action |
|-------|-----------|--------|
| Daily spend | $10/day | Investigate spike |
| RDS utilization | >80% CPU | Consider upgrade |
| Lambda errors | >1% | Debug function |
| WAF blocked requests | >10K/day | Review attack patterns |

### Cost Allocation Tags

```
Project: specflow-auth
Environment: production | staging | development
Component: compute | database | security | monitoring
Owner: platform-team
CostCenter: engineering
```

---

## 7. Total Cost of Ownership (3-Year)

| Year | Monthly | Annual | Notes |
|------|---------|--------|-------|
| Year 1 | $127 | $1,524 | Baseline, on-demand pricing |
| Year 2 | $107 | $1,284 | Reserved instances applied |
| Year 3 | $107 | $1,284 | Continued reservations |
| **3-Year TCO** | | **$4,092** | |

### With Growth (2x MAU each year)

| Year | MAU | Monthly | Annual |
|------|-----|---------|--------|
| Year 1 | 10K | $127 | $1,524 |
| Year 2 | 20K | $160 | $1,920 |
| Year 3 | 40K | $250 | $3,000 |
| **3-Year TCO** | | | **$6,444** |

---

## 8. Recommendations

1. **Start with serverless architecture** - Optimal for 10K MAU
2. **Implement cost allocation tags** from day one
3. **Set up billing alerts** at $100, $150, $200 thresholds
4. **Review monthly** - Adjust based on actual usage
5. **Consider reserved capacity** after 3 months of production data

---

*Analysis completed using AWS pricing as of January 2026. Actual costs may vary based on usage patterns and pricing changes.*
