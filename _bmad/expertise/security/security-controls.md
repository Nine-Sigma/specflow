# Security Controls Checklist

<!-- Source: _bmad/expansion-packs/cloud-architecture/agents/security-reviewer.md -->

Implementation checklist for security reviews. Apply to features at **medium+ scope** with security pillar selected.

## Identity & Access

- [ ] Implement least privilege access
- [ ] Use role-based access control (RBAC)
- [ ] Enable multi-factor authentication (MFA)
- [ ] Rotate credentials regularly
- [ ] Use service accounts and managed identities
- [ ] IAM roles and policies properly scoped
- [ ] Federation configured where applicable

## Network Security

- [ ] Implement network segmentation
- [ ] Use private subnets for sensitive resources
- [ ] Configure security groups and NACLs
- [ ] Enable DDoS protection
- [ ] Use Web Application Firewall (WAF)
- [ ] VPCs properly configured
- [ ] Firewall rules follow least-access principle

## Data Protection

- [ ] Encrypt data at rest (AES-256)
- [ ] Encrypt data in transit (TLS 1.2+)
- [ ] Use managed encryption key services
- [ ] Implement data classification
- [ ] Enable backup encryption
- [ ] Key management procedures documented
- [ ] Data loss prevention (DLP) where applicable

## Logging & Monitoring

- [ ] Enable comprehensive audit logging
- [ ] Centralize logs in SIEM
- [ ] Set up security alerts and notifications
- [ ] Implement anomaly detection
- [ ] Create incident response playbooks
- [ ] CloudTrail/audit logs enabled
- [ ] Log retention policies defined

## Vulnerability Management

- [ ] Keep systems patched and updated
- [ ] Scan for vulnerabilities regularly
- [ ] Harden OS and application configurations
- [ ] Implement container security scanning
- [ ] Use security baselines
- [ ] Patch management procedures documented
- [ ] Regular penetration testing scheduled

## Scope-Based Application

| Scope | Controls Review Depth |
|-------|----------------------|
| trivial/small | Skip controls review |
| medium | Key controls in 2-3 categories most relevant to feature |
| large | All 5 categories, full checklist review |
| complex | All categories + custom controls, compliance mapping |

## Review Output Format

For each applicable control category:

```markdown
### [Category Name]

**Status:** [Compliant / Partial / Non-Compliant / N/A]

**Implemented Controls:**
- [x] [Control implemented]
- [x] [Control implemented]

**Gaps Identified:**
- [ ] [Missing control - priority]
- [ ] [Missing control - priority]

**Recommendations:**
1. [Specific remediation action]
2. [Specific remediation action]
```

## Priority Levels

| Priority | Description | Timeline |
|----------|-------------|----------|
| Critical | Immediate security risk | Before deployment |
| High | Significant risk if exploited | Within sprint |
| Medium | Should be addressed | Within quarter |
| Low | Best practice improvement | When convenient |
