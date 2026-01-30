# /sf:tea - Test Engineering Analysis

Creates test plan with SpecFlow file protocol.

## Usage

```
/sf:tea
/sf:tea <feature-description>
```

## File Protocol

<required_reading>
Before starting work, read in order:

1. `.specflow/STATE.md` - Get current feature slug
2. `.specflow/features/{slug}/1-spec.md` - Acceptance criteria to test
3. `.specflow/features/{slug}/2-architecture.md` - Components to test
4. `.specflow/features/{slug}/3-security.md` - Security tests needed
5. `.specflow/features/{slug}/4-cost.md` - Performance constraints (if exists)
</required_reading>

<constraints>
Extract from prior outputs and design tests for:
- All acceptance criteria (from 1-spec.md) - MUST have tests
- Component interfaces (from 2-architecture.md)
- Security mitigations (from 3-security.md)
- Performance bounds (from 4-cost.md, if relevant)
</constraints>

<output>
After completing analysis:

1. Write output to `.specflow/features/{slug}/5-test-plan.md`
2. Append to `.specflow/features/{slug}/PROGRESS.md`:
   ```
   ## {timestamp} - TEA (/sf:tea)

   **Work Done:**
   - [Summary of test planning]

   **Output:** `5-test-plan.md`

   **Constraints Honored:**
   - [List constraints from prior outputs]

   ---
   ```
3. Update `.specflow/STATE.md`:
   - last-agent: tea
   - next-agent: pm-review
   - phase: review
</output>

## Output Format (5-test-plan.md)

```markdown
---
agent: tea
created: {iso-timestamp}
depends_on: ["1-spec.md", "2-architecture.md", "3-security.md", "4-cost.md"]
status: draft
---

# {Feature Name} Test Plan

## Summary

{2-3 sentence summary of test strategy}

## Test Coverage Matrix

| Criterion | Test Type | Description | Priority |
|-----------|-----------|-------------|----------|
| AC-01 | Unit | {description} | {H/M/L} |
| AC-02 | Integration | {description} | {H/M/L} |

## Gherkin Scenarios

### Happy Path

```gherkin
Feature: {Feature Name}

  Scenario: {Happy path scenario}
    Given {precondition}
    When {action}
    Then {expected result}
```

### Error Cases

```gherkin
  Scenario: {Error case}
    Given {precondition}
    When {invalid action}
    Then {error handling}
```

### Security Tests

```gherkin
  Scenario: {Security test from 3-security.md}
    Given {precondition}
    When {attack attempt}
    Then {mitigation works}
```

## Constraints for Downstream

- {Test requirements QA must implement}
- {Coverage expectations}

## Open Questions

- {Any unresolved items for PM review}
```

## Related

- `/sf:cost` - Prior in pillar sequence (4-cost.md)
- `/sf:pm` - Reviews test plan
- `/sf:qa` - Implements test plan
