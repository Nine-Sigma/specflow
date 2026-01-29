# UAT Report: {Feature Name}

**Generated:** {timestamp}
**Spec:** .specflow/specs/{feature}/spec.md
**Total Scenarios:** {count}

## Results Summary

| Status | Count |
|--------|-------|
| Passed | {n} |
| Failed | {n} |
| Flaky  | {n} |

## Scenario Details

### Passed

| Scenario | Duration |
|----------|----------|
| {name} | {time}ms |

### Failed

| Scenario | Failed Step | Error |
|----------|-------------|-------|
| {name} | {step} | {error} |

**Evidence:** {screenshot path if available}

### Flaky (Treated as Bugs)

| Scenario | Pattern | Tiebreaker |
|----------|---------|------------|
| {name} | fail->pass | {final result} |

**Note:** Flaky tests must be fixed before release. Flaky = Bug.

---

## Test Artifacts

| Artifact | Location |
|----------|----------|
| Generated tests | .specflow/execution/{feature}/uat-tests.spec.ts |
| Screenshots | .specflow/execution/{feature}/screenshots/ |
| Traces | .specflow/execution/{feature}/traces/ (if enabled) |

---

*UAT complete. Overall: {PASS|FAIL|FLAKY}*

---
*Template: uat-template.md*
*Used by: uat-executor.sh*
