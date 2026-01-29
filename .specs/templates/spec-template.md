# Feature Specification: [Feature Name]

**Author:** [Your Name]
**Date:** [YYYY-MM-DD]
**Status:** Draft | Review | Approved

---

## Overview

[2-3 sentence description of the feature and its purpose]

### Problem Statement

[What problem does this feature solve? Who experiences this problem?]

### Proposed Solution

[High-level approach to solving the problem. What will be built?]

---

## Security Assessment

<!--
HOW TO COMPLETE THIS SECTION:

1. Run /cloud-security in Claude Code
2. Provide your feature description when prompted
3. Copy the STRIDE table from docs/security-assessment.md
4. Ensure all 6 categories have specific threats (not "N/A" or generic)
5. Verify each mitigation is implementable (has acceptance criteria)

CHECKLIST before marking complete:
[ ] Spoofing: Specific identity threat identified
[ ] Tampering: Specific data integrity threat identified
[ ] Repudiation: Audit/logging approach documented
[ ] Information Disclosure: Sensitive data identified and protected
[ ] Denial of Service: Rate limiting or resource limits specified
[ ] Elevation of Privilege: Authorization model documented

IMPORTANT: Generic mitigations like "use encryption" are insufficient.
Each mitigation must specify HOW it will be implemented.
-->

### STRIDE Threat Model

| Category | Threat ID | Threat/Issue | Mitigation |
|----------|-----------|--------------|------------|
| **Spoofing** | S.1 | [Identity verification vulnerability - how can attackers impersonate users?] | [Specific mitigation with implementation details] |
| **Spoofing** | S.2 | [Additional spoofing threat if applicable] | [Specific mitigation] |
| **Tampering** | T.1 | [Data modification vulnerability - how can data be altered?] | [Specific mitigation with implementation details] |
| **Tampering** | T.2 | [Additional tampering threat if applicable] | [Specific mitigation] |
| **Repudiation** | R.1 | [Action denial vulnerability - how can users deny actions?] | [Specific mitigation with implementation details] |
| **Repudiation** | R.2 | [Additional repudiation threat if applicable] | [Specific mitigation] |
| **Information Disclosure** | I.1 | [Data exposure vulnerability - what sensitive data could leak?] | [Specific mitigation with implementation details] |
| **Information Disclosure** | I.2 | [Additional disclosure threat if applicable] | [Specific mitigation] |
| **Denial of Service** | D.1 | [Availability vulnerability - how can service be disrupted?] | [Specific mitigation with implementation details] |
| **Denial of Service** | D.2 | [Additional DoS threat if applicable] | [Specific mitigation] |
| **Elevation of Privilege** | E.1 | [Unauthorized access vulnerability - how can permissions be escalated?] | [Specific mitigation with implementation details] |
| **Elevation of Privilege** | E.2 | [Additional privilege threat if applicable] | [Specific mitigation] |

### Trust Boundaries

<!--
Describe where data crosses trust boundaries in your system.
Include a diagram if helpful (ASCII art or link to diagram).
-->

```
+------------------+     +-------------------+     +------------------+
|   Public Zone    |     |  Application Zone |     |  Data Zone       |
|  (Untrusted)     |     |  (Semi-trusted)   |     |  (Trusted)       |
+------------------+     +-------------------+     +------------------+
|                  |     |                   |     |                  |
| - [Component 1]  | --> | - [Component 2]   | --> | - [Component 3]  |
| - [Component 2]  |     | - [Component 3]   |     | - [Component 4]  |
|                  |     |                   |     |                  |
+------------------+     +-------------------+     +------------------+
       |                        |                        |
       | [Control 1]            | [Control 2]            | [Control 3]
```

**Trust Boundary Controls:**

| Boundary | From | To | Controls |
|----------|------|-----|----------|
| TB-1 | Public Zone | Application Zone | [TLS, WAF, Rate Limiting, etc.] |
| TB-2 | Application Zone | Data Zone | [VPC, IAM, mTLS, etc.] |

### Data Classification

| Data Element | Classification | Storage | Encryption | Retention |
|--------------|----------------|---------|------------|-----------|
| [Data name] | PII / Sensitive / Internal / Public | [Where stored] | [At rest / In transit] | [Duration] |
| [Data name] | [Classification] | [Storage] | [Encryption] | [Retention] |
| [Data name] | [Classification] | [Storage] | [Encryption] | [Retention] |

---

## Cost Estimate

<!--
HOW TO COMPLETE THIS SECTION:

1. Run /cloud-cost in Claude Code
2. Provide your feature description and expected scale (users, traffic, storage)
3. Copy the cost breakdown from docs/cost-analysis.md
4. Ensure Assumptions section is complete (traffic, storage, users)
5. Include at least one optimization opportunity

CHECKLIST before marking complete:
[ ] All major components have cost entries
[ ] Monthly total is calculated
[ ] Traffic/usage assumptions documented
[ ] Storage/data assumptions documented
[ ] User count assumptions documented
[ ] At least one optimization identified

IMPORTANT: Costs without assumptions are meaningless.
Always document what traffic/scale the estimate is based on.
-->

### Monthly Cost Breakdown

| Component | Service | Configuration | Monthly Cost | Notes |
|-----------|---------|---------------|--------------|-------|
| Compute | [AWS Lambda / ECS / EC2] | [Config details] | $XX.XX | [Usage notes] |
| API | [API Gateway / ALB] | [Config details] | $XX.XX | [Usage notes] |
| Database | [RDS / DynamoDB / Aurora] | [Config details] | $XX.XX | [Usage notes] |
| Cache | [ElastiCache / DAX] | [Config details] | $XX.XX | [Usage notes] |
| Storage | [S3 / EBS / EFS] | [Config details] | $XX.XX | [Usage notes] |
| Messaging | [SQS / SNS / SES] | [Config details] | $XX.XX | [Usage notes] |
| Security | [WAF / KMS / Secrets Manager] | [Config details] | $XX.XX | [Usage notes] |
| Monitoring | [CloudWatch / X-Ray] | [Config details] | $XX.XX | [Usage notes] |
| Networking | [VPC / NAT / CloudFront] | [Config details] | $XX.XX | [Usage notes] |
| **Total** | | | **$XXX.XX** | |

### Assumptions

<!--
Document ALL assumptions that drive the cost estimate.
Costs are meaningless without this context.
-->

**Traffic:**
- Requests per day: [X requests/day]
- Peak concurrent users: [X users]
- API calls per month: [X calls]

**Storage:**
- Initial storage: [X GB]
- Growth rate: [X GB/month]
- Retention period: [X days/months]

**Users:**
- Monthly Active Users (MAU): [X users]
- Daily Active Users (DAU): [X users]
- User growth rate: [X% per month]

**Infrastructure:**
- Region: [us-east-1, etc.]
- Environment: [Production only / includes staging]
- Availability target: [99.9%, etc.]

### Optimization Opportunities

<!--
Identify ways to reduce costs as the feature scales.
Include estimated savings where possible.
-->

| Opportunity | Potential Savings | When to Implement |
|-------------|-------------------|-------------------|
| [Reserved Instances] | [30-40%] | [After 3 months of stable usage] |
| [Savings Plans] | [20-30%] | [When committed to 1-year usage] |
| [Right-sizing] | [Variable] | [After monitoring actual usage] |
| [Architecture change] | [X%] | [At X scale threshold] |

---

## Test Scenarios

<!--
HOW TO COMPLETE THIS SECTION:

Write Gherkin scenarios covering ALL categories below:

SCENARIO MINIMUMS (REQUIRED):
| Category       | Minimum | Purpose                                    |
|----------------|---------|-------------------------------------------|
| Happy Path     | 2       | Primary success flows users expect to work |
| Error Cases    | 2       | How system handles failures gracefully     |
| Edge Cases     | 1       | Boundary conditions and unusual inputs     |
| Security       | 1       | Auth/authz/input validation               |
|----------------|---------|-------------------------------------------|
| TOTAL MINIMUM  | 6       | Complete coverage across all categories   |

HOW TO COUNT:
- Each "Scenario:" or "Scenario Outline:" = 1 scenario
- Data table rows in Scenario Outline = 1 scenario each

TIPS FOR GOOD SCENARIOS:
- Use business language, not technical implementation details
- Each scenario tests ONE specific behavior
- Scenarios are independent (no shared state between them)
- Names clearly explain what is being tested
- Given/When/Then steps are specific and verifiable

BAD SCENARIO EXAMPLES (avoid these):
- Testing multiple behaviors in one scenario
- Named "Test 1", "Test 2" instead of descriptive names
- Dependent on other scenario state
- Contains API paths, SQL queries, or response formats
-->

### Happy Path

<!--
Minimum 2 scenarios: Primary success flows that users expect to work
-->

```gherkin
Feature: [Feature Name]

  Background:
    Given [common precondition for all scenarios]
    And [additional common setup if needed]

  Scenario: [Primary success case - describe the main user flow]
    Given [initial user/system state]
    When [user action or system event]
    Then [expected successful outcome]
    And [additional verifiable result]

  Scenario: [Secondary success case - alternative valid path]
    Given [initial user/system state]
    When [alternative valid action]
    Then [expected successful outcome]
```

### Error Cases

<!--
Minimum 2 scenarios: How system handles failures gracefully
-->

```gherkin
  Scenario: [Error case - invalid input]
    Given [initial state]
    When [user provides invalid input]
    Then [system rejects the input]
    And [user receives clear error message]
    And [system state is unchanged]

  Scenario: [Error case - system/dependency failure]
    Given [initial state]
    And [dependency is unavailable or fails]
    When [user attempts action]
    Then [system degrades gracefully]
    And [user receives appropriate feedback]
```

### Edge Cases

<!--
Minimum 1 scenario: Boundary conditions and unusual but valid inputs
-->

```gherkin
  Scenario: [Edge case - boundary condition]
    Given [boundary or unusual state]
    When [action at boundary]
    Then [system handles correctly]
    And [no unexpected behavior occurs]
```

### Security Scenarios

<!--
Minimum 1 scenario: Authentication, authorization, input validation
-->

```gherkin
  Scenario: [Security - unauthorized access attempt]
    Given [user without required permissions]
    When [user attempts restricted action]
    Then [access is denied]
    And [attempt is logged for audit]
    And [user receives appropriate error]
```

---

## Acceptance Criteria

<!--
Summarize the key acceptance criteria derived from the sections above.
These should be verifiable before the feature is considered complete.
-->

### Security
- [ ] All 6 STRIDE categories addressed with specific mitigations
- [ ] Trust boundaries documented with controls
- [ ] Data classification complete for all data elements
- [ ] Security scenarios pass

### Cost
- [ ] Cost estimate includes all major components
- [ ] Assumptions documented (traffic, storage, users)
- [ ] Optimization opportunities identified
- [ ] Total monthly cost is within budget: $[X]

### Testing
- [ ] Minimum 6 Gherkin scenarios documented (2 happy, 2 error, 1 edge, 1 security)
- [ ] All happy path scenarios pass
- [ ] All error case scenarios pass
- [ ] Edge case scenarios pass
- [ ] Security scenarios pass

### General
- [ ] Pre-commit hooks pass
- [ ] Code review approved
- [ ] Documentation updated

---

## References

- Security Assessment: `docs/security-assessment.md`
- Cost Analysis: `docs/cost-analysis.md`
- Related specs: [Links to related feature specs]
- External documentation: [Links to relevant external docs]

---

<!--
SPEC COMPLETION CHECKLIST:

Before submitting for review, verify:

SECURITY (Pillar 1):
[ ] STRIDE table has all 6 categories with SPECIFIC threats
[ ] Each mitigation is implementable (not generic "use encryption")
[ ] Trust boundaries documented
[ ] Data classification table complete

COST (Pillar 2):
[ ] Cost table includes all major components
[ ] Monthly total calculated
[ ] Assumptions section complete (traffic, storage, users)
[ ] At least one optimization opportunity identified

TESTING (Pillar 3):
[ ] Happy path: 2+ scenarios
[ ] Error cases: 2+ scenarios
[ ] Edge cases: 1+ scenarios
[ ] Security: 1+ scenarios
[ ] Total: 6+ scenarios

GENERAL:
[ ] Status updated to "Review"
[ ] All [placeholders] replaced with actual content
[ ] pre-commit hooks pass
-->
