# FR Coverage Traceability Matrix

## Coverage Matrix Format

Create coverage matrix comparing PRD requirements against implementation:

| FR Number | PRD Requirement | Epic Coverage  | Status    |
| --------- | --------------- | -------------- | --------- |
| FR1       | [PRD text]      | Epic X Story Y | Covered   |
| FR2       | [PRD text]      | **NOT FOUND**  | MISSING   |
| FR3       | [PRD text]      | Epic Z Story A | Covered   |

## Gap Documentation Format

For each missing FR:

```markdown
## Missing FR Coverage

### Critical Missing FRs

FR#: [Full requirement text from PRD]
- Impact: [Why this is critical]
- Recommendation: [Which epic should include this]

### High Priority Missing FRs

[List any other uncovered FRs with same format]
```

## Coverage Statistics

Document coverage metrics:
- Total PRD FRs: [count]
- FRs covered in epics: [count]
- Coverage percentage: [percentage]
- Gap count by priority: Critical / High / Medium
