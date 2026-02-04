---
name: risk-management
description: RAID log management and risk correlation analysis with STRIDE integration
report-capable: true
scope-minimum: small
triggers:
  phrases:
    - "risk assessment"
    - "RAID log"
    - "risk report"
    - "risk analysis"
    - "identify risks"
---

# Risk Management

Generate comprehensive risk assessments that integrate with security pillar findings and track risks, assumptions, issues, and dependencies using the RAID log format.

## Purpose

This skill enables the PM to:
- Generate risk assessments integrating STRIDE findings from security analysis
- Track Risks, Assumptions, Issues, and Dependencies (RAID) in a structured format
- Identify cascading risks through correlation analysis
- Prioritize risks using a severity matrix (probability x impact)
- Produce actionable risk reports for stakeholders

## Data Sources

Primary sources for risk identification:

| Source | Risk Type | Location |
|--------|-----------|----------|
| Security Analysis | Technical risks | `.specflow/features/{slug}/3-security.md` |
| Cost Analysis | Financial risks | `.specflow/features/{slug}/4-cost.md` |
| Scope Document | Scope risks | `.specflow/features/{slug}/0-scope.md` |
| Drift Corrections | Execution risks | `.specflow/features/{slug}/drift/` |
| Requirements Lock | Dependency risks | `.specflow/features/{slug}/5-requirements-lock.md` |

### Reading Data Sources

For each feature assessment:
1. Check which source files exist in the feature directory
2. Extract relevant risk indicators from each source
3. Synthesize into RAID log format
4. Apply correlation analysis

## STRIDE Integration

The security pillar (3-security.md) uses STRIDE threat modeling. Map STRIDE findings to risk categories:

| STRIDE Category | Risk Category | Default Severity |
|-----------------|---------------|------------------|
| Spoofing | Authentication Risk | HIGH |
| Tampering | Data Integrity Risk | HIGH |
| Repudiation | Audit Risk | MEDIUM |
| Information Disclosure | Confidentiality Risk | HIGH |
| Denial of Service | Availability Risk | MEDIUM |
| Elevation of Privilege | Authorization Risk | CRITICAL |

### STRIDE Extraction Process

For each STRIDE finding in 3-security.md:
1. Extract threat category and description
2. Map to risk category using table above
3. Apply severity from finding (or use default if not specified)
4. Add mitigation status from finding
5. Include in RAID log Risks section

### Example STRIDE to Risk Mapping

From 3-security.md:
```markdown
### S - Spoofing
- **Threat:** User impersonation via session hijacking
- **Likelihood:** MEDIUM
- **Impact:** HIGH
- **Mitigation:** Secure cookies, short session timeout
- **Status:** Mitigated
```

Maps to Risk:
```markdown
| R-001 | Authentication | Session hijacking enables user impersonation | MEDIUM | HIGH | 6 | Secure cookies, short timeout | - | MITIGATED |
```

## RAID Log Format

### R - Risks

| ID | Category | Description | Probability | Impact | Severity | Mitigation | Owner | Status |
|----|----------|-------------|-------------|--------|----------|------------|-------|--------|

**Probability levels:**
- LOW (10-30%): Unlikely to occur
- MEDIUM (30-60%): May occur
- HIGH (60-90%): Likely to occur

**Impact levels:**
- LOW: Minor inconvenience, workaround exists
- MEDIUM: Significant impact, degraded functionality
- HIGH: Major impact, feature unusable
- CRITICAL: System-wide impact, data loss, security breach

**Severity calculation:** Probability x Impact (see matrix below)

**Status values:** OPEN, MITIGATED, ACCEPTED, TRANSFERRED, CLOSED

### A - Assumptions

| ID | Assumption | Validation Method | Status |
|----|------------|-------------------|--------|

Assumptions are statements believed to be true that could impact the feature if false.

**Extract from:**
- Requirements (implicit dependencies)
- Architecture decisions (technology capabilities)
- Scope document (timeline, resources)

**Status values:** VALID, INVALID, PENDING VALIDATION

### I - Issues

| ID | Issue | Impact | Resolution | Owner | Due Date | Status |
|----|-------|--------|------------|-------|----------|--------|

Issues are current problems actively affecting the feature.

**Extract from:**
- Review findings
- Drift corrections (from drift/ directory)
- COMMS files
- Test failures

**Status values:** OPEN, IN PROGRESS, BLOCKED, RESOLVED

### D - Dependencies

| ID | Dependency | Type | Provider | Status | Risk if Delayed |
|----|------------|------|----------|--------|-----------------|

**Dependency types:**
- **Technical:** Library, API, service integration
- **Resource:** Team member, infrastructure, environment
- **External:** Vendor, regulatory approval, third-party service

**Extract from:**
- Requirements lock (5-requirements-lock.md)
- Architecture document (2-architecture.md)
- Package dependencies

**Status values:** ON TRACK, AT RISK, DELAYED, COMPLETED

## Severity Matrix (5x5)

Use this matrix to calculate severity from probability and impact:

|              | Impact: LOW | MEDIUM | HIGH | CRITICAL |
|--------------|-------------|--------|------|----------|
| Prob: LOW    | 1 (Green)   | 2      | 3    | 4        |
| Prob: MEDIUM | 2           | 4      | 6    | 8        |
| Prob: HIGH   | 3           | 6      | 9    | 12 (Red) |

### Severity Action Thresholds

| Severity Range | Color | Action Required |
|----------------|-------|-----------------|
| 1-3 | Green | Accept/Monitor - Document and track |
| 4-6 | Yellow | Mitigate - Develop mitigation plan |
| 7-9 | Orange | Escalate - Requires management attention |
| 10+ | Red | Block/Urgent - Stop work until addressed |

## Risk Correlation Analysis

Identify cascading risks where one risk materializing triggers others.

### Correlation Process

1. For each HIGH/CRITICAL severity risk, analyze:
   - Does this risk affect other identified risks?
   - If this risk materializes, what else fails?
   - What is the cumulative impact?

2. Mark correlated risks with `[CHAIN]` flag in the ID column

3. Calculate cumulative severity for risk chains

### Common Correlation Patterns

| Primary Risk | Secondary Risks | Pattern Name |
|--------------|-----------------|--------------|
| Security breach | Data integrity, Compliance violation | Security Cascade |
| Dependency delay | Schedule slip, Cost overrun | Schedule Cascade |
| Scope creep | Quality degradation, Technical debt | Quality Cascade |
| Key person unavailable | Knowledge gap, Delivery delay | Resource Cascade |
| API breaking change | Integration failure, Downstream failures | Integration Cascade |

### Correlation Output Format

```markdown
### Risk Correlation Map

**Chain 1: Security Cascade**
R-001 (Authentication) --triggers--> R-005 (Data Integrity) --triggers--> R-012 (Compliance)
Cumulative severity: 18 (CRITICAL)

**Chain 2: Schedule Cascade**
D-003 (API v2 release) --delays--> R-008 (Timeline) --triggers--> R-011 (Budget)
Cumulative severity: 12 (RED)
```

## Execution Methodology

### Step 1: Gather Data Sources

```
READ .specflow/features/{slug}/0-scope.md    # Scope risks
READ .specflow/features/{slug}/3-security.md  # Security risks (STRIDE)
READ .specflow/features/{slug}/4-cost.md      # Financial risks
READ .specflow/features/{slug}/5-requirements-lock.md  # Dependencies
READ .specflow/features/{slug}/drift/*.md     # Execution risks
```

### Step 2: Extract Risks from Each Source

**From 0-scope.md:**
- Scope level (larger scope = higher risk)
- Timeline constraints
- Resource assumptions

**From 3-security.md:**
- STRIDE threat findings
- Mitigation status
- Security requirements

**From 4-cost.md:**
- Budget constraints
- Cost overrun risks
- Resource allocation risks

**From 5-requirements-lock.md:**
- External dependencies
- Integration points
- Technical constraints

**From drift/:**
- Previous drift corrections (indicates execution risk)
- Pattern of scope changes

### Step 3: Build RAID Log

1. Populate Risks table from extracted data
2. Identify Assumptions (implicit in requirements)
3. Extract Issues from drift and review findings
4. List Dependencies from requirements lock

### Step 4: Calculate Severity Matrix

For each risk:
1. Assess probability (LOW/MEDIUM/HIGH)
2. Assess impact (LOW/MEDIUM/HIGH/CRITICAL)
3. Calculate severity using matrix
4. Assign action threshold color

### Step 5: Run Correlation Analysis

1. Filter to HIGH/CRITICAL risks
2. For each, trace potential cascade effects
3. Build correlation chains
4. Calculate cumulative severity

### Step 6: Generate Report

Produce output file with all sections.

## Output

Output file: `.specflow/features/{slug}/9-risk-report.md`

### Output Structure

```markdown
# Risk Report: {feature-name}

Generated: {date}
Feature: {slug}
Scope: {scope-level}

## Executive Summary

**Risk Profile:** {GREEN|YELLOW|ORANGE|RED}
**Top 5 Risks by Severity:**

| Rank | ID | Description | Severity | Status |
|------|----|-----------  |----------|--------|
| 1 | R-XXX | ... | 12 | OPEN |
| 2 | R-XXX | ... | 9 | OPEN |
| 3 | R-XXX | ... | 8 | MITIGATED |
| 4 | R-XXX | ... | 6 | OPEN |
| 5 | R-XXX | ... | 6 | OPEN |

## Full RAID Log

### Risks
[Full risks table]

### Assumptions
[Full assumptions table]

### Issues
[Full issues table]

### Dependencies
[Full dependencies table]

## Risk Correlation Map

[Correlation chains with cumulative severity]

## Recommended Actions

For RED/ORANGE severity risks:

| Risk ID | Action | Priority | Owner |
|---------|--------|----------|-------|
| R-001 | Implement 2FA | URGENT | Dev |
| R-005 | Add input validation | HIGH | Dev |

## Next Review Date

{date} (recommended: {scope-based interval})
- Trivial/Small: End of development
- Medium: Weekly
- Large/Complex: Twice weekly
```

## Example Output

```markdown
# Risk Report: user-authentication

Generated: 2026-02-04
Feature: user-authentication
Scope: medium

## Executive Summary

**Risk Profile:** YELLOW
**Top 5 Risks by Severity:**

| Rank | ID | Description | Severity | Status |
|------|----|-----------  |----------|--------|
| 1 | R-001 | Session hijacking via XSS | 9 | OPEN |
| 2 | R-002 | Password brute force | 6 | MITIGATED |
| 3 | R-003 | Token expiry too long | 6 | OPEN |
| 4 | R-004 | Missing audit logging | 4 | OPEN |
| 5 | D-001 | OAuth provider API changes | 4 | ON TRACK |

## Full RAID Log

### Risks

| ID | Category | Description | Probability | Impact | Severity | Mitigation | Owner | Status |
|----|----------|-------------|-------------|--------|----------|------------|-------|--------|
| R-001 | Confidentiality | Session hijacking via XSS | HIGH | HIGH | 9 | CSP headers, HttpOnly cookies | Dev | OPEN |
| R-002 | Authentication | Password brute force attack | MEDIUM | HIGH | 6 | Rate limiting implemented | Dev | MITIGATED |
| R-003 | Authentication | Token expiry window too long | MEDIUM | MEDIUM | 4 | Reduce to 15min | Dev | OPEN |
| R-004 | Audit | Missing login attempt logging | MEDIUM | MEDIUM | 4 | Add audit log | Dev | OPEN |

### Assumptions

| ID | Assumption | Validation Method | Status |
|----|------------|-------------------|--------|
| A-001 | Users have valid email addresses | Email verification flow | VALID |
| A-002 | Database supports bcrypt hashing | PostgreSQL test | VALID |
| A-003 | Redis available for session store | Infra check | PENDING VALIDATION |

### Issues

| ID | Issue | Impact | Resolution | Owner | Due Date | Status |
|----|-------|--------|------------|-------|----------|--------|
| I-001 | Password reset flow incomplete | Users cannot recover accounts | Complete implementation | Dev | 2026-02-06 | IN PROGRESS |

### Dependencies

| ID | Dependency | Type | Provider | Status | Risk if Delayed |
|----|------------|------|----------|--------|-----------------|
| D-001 | OAuth 2.0 provider SDK | Technical | Auth0 | ON TRACK | Authentication features blocked |
| D-002 | Email service for verification | External | SendGrid | ON TRACK | User registration blocked |

## Risk Correlation Map

**Chain 1: Security Cascade**
R-001 (XSS) --enables--> Session hijacking --leads to--> Account takeover
Cumulative severity: 12 (RED when materialized)

## Recommended Actions

| Risk ID | Action | Priority | Owner |
|---------|--------|----------|-------|
| R-001 | Implement CSP headers, audit XSS vectors | URGENT | Dev |
| R-003 | Reduce token expiry to 15 minutes | HIGH | Dev |
| R-004 | Add comprehensive audit logging | MEDIUM | Dev |

## Next Review Date

2026-02-11 (Weekly - medium scope feature)
```

## Routing

Risk management findings route to **PM** for:
- Stakeholder communication
- Resource allocation decisions
- Escalation handling

RED severity risks may require:
- Immediate stakeholder notification
- Work stoppage until mitigation
- Scope reassessment
