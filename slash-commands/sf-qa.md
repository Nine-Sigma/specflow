# /sf:qa - Quality Assurance

Wraps BMAD `/qa` with Gherkin and BOSS validation.

## Usage

```
/sf:qa
/sf:qa <feature-to-test>
```

## SpecFlow Context

This command invokes BMAD's QA with additional context:
- Gherkin scenario format
- BOSS criteria validation
- Test pyramid awareness

## Output Format

QA produces:
- Gherkin scenarios (minimum 6):
  - 2 happy path
  - 2 error cases
  - 1 edge case
  - 1 security scenario
- BOSS validation of acceptance criteria
- Test coverage recommendations

## Gherkin Example

```gherkin
Feature: User Login
  Scenario: Successful login with valid credentials
    Given a registered user with email "test@example.com"
    When they submit valid password "SecurePass123!"
    Then they are redirected to dashboard
    And session cookie is set with 24h expiry
```

## BOSS Validation

Ensures all criteria are:
- **B**inary: Pass/fail
- **O**bservable: Verifiable by running code
- **S**pecific: Exact values
- **S**cope-bound: This feature only

## Parallel Execution

When invoked by PM orchestrator:
- QA and Dev work in parallel
- QA writes test scenarios
- Dev implements features
- Checkpoint merge when both complete

## Related

- `/qa` - Original BMAD QA
- `/sf:tea` - Test architect (runs before QA)
- `/sf:dev` - Development (runs in parallel)
- `/sf:pm` - PM orchestrator (routes to QA)
