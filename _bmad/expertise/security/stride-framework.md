# STRIDE Threat Model Framework

<!-- Source: _bmad/expansion-packs/cloud-architecture/agents/security-reviewer.md -->

Apply to features at **medium+ scope** with security pillar selected.

## STRIDE Categories

| Category | Threat Type | Key Questions |
|----------|-------------|---------------|
| **S**poofing | Identity verification weaknesses | Can attackers impersonate legitimate users/services? Are credentials properly validated? |
| **T**ampering | Data integrity vulnerabilities | Can data be modified without detection? Are integrity checks in place? |
| **R**epudiation | Lack of audit trails | Can users deny actions? Are audit logs comprehensive and tamper-proof? |
| **I**nformation Disclosure | Data exposure risks | Can sensitive data leak? Is data properly encrypted and access-controlled? |
| **D**enial of Service | Availability threats | Can the system be overwhelmed? Are rate limits and failovers in place? |
| **E**levation of Privilege | Authorization bypasses | Can users gain unauthorized access? Is least privilege enforced? |

## Analysis Process

### 1. Architecture Analysis
- Review proposed architecture from Cloud Architect
- Identify all data flows and trust boundaries
- Map attack surfaces and entry points
- Analyze security controls at each layer
- Review IAM and access control design

### 2. Threat Identification
- Identify assets and data requiring protection
- Enumerate potential threats using STRIDE categories
- For each category, ask the key questions above
- Document threats found in each category

### 3. Risk Assessment
- Assess likelihood of each threat
- Assess impact if threat is realized
- Prioritize by risk = likelihood x impact
- Recommend mitigations and controls

### 4. Mitigation Design
- Map controls to identified threats
- Design defense-in-depth layers
- Document residual risk after controls
- Create security monitoring plan

## Scope-Based Depth

| Scope | STRIDE Depth | Categories to Cover |
|-------|--------------|---------------------|
| trivial/small | Skip | None (no security analysis) |
| medium | Light | 2-3 most relevant categories |
| large | Full | All 6 categories |
| complex | Deep | All 6 + attack trees, threat scenarios |

## Output Format

For each applicable STRIDE category, document:

```markdown
### [Category]: [Threat Name]

**Threat:** [Description of the specific threat]
**Likelihood:** [Low/Medium/High]
**Impact:** [Low/Medium/High]
**Risk:** [Likelihood x Impact assessment]

**Mitigations:**
- [ ] [Control 1]
- [ ] [Control 2]

**Residual Risk:** [After mitigations]
```

## Common Mitigations by Category

| Category | Common Mitigations |
|----------|-------------------|
| Spoofing | MFA, strong auth, certificate validation, session management |
| Tampering | Checksums, digital signatures, input validation, HTTPS |
| Repudiation | Comprehensive logging, audit trails, timestamps, non-repudiation |
| Info Disclosure | Encryption (rest/transit), access controls, data classification |
| DoS | Rate limiting, autoscaling, CDN, circuit breakers |
| Elevation | RBAC, least privilege, input validation, authorization checks |
