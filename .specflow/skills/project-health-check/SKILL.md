---
name: project-health-check
description: 6-dimension project health assessment with weighted scoring and flag analysis
report-capable: true
scope-minimum: small
triggers:
  phrases:
    - "health check"
    - "how's it going"
    - "project health"
    - "feature status"
    - "progress check"
---

# Project Health Check

Assess feature health across 6 dimensions using SpecFlow artifacts.

## Purpose

This skill evaluates a feature's health by analyzing SpecFlow artifacts across schedule, scope, quality, risk, stakeholder, and cost dimensions. Each dimension maps to specific SpecFlow outputs and contributes to an overall weighted health score.

## Dimension Mapping

| Dimension | Weight | SpecFlow Source | Calculation |
|-----------|--------|-----------------|-------------|
| Schedule Health | 20% | STATE.md | Based on dev_iterations, qa_iterations counts |
| Scope Health | 25% | 0-scope.md, drift/ | Based on drift correction count |
| Quality Health | 25% | 8-review-output.md | Based on finding severity counts |
| Risk Health | 20% | 3-security.md | Based on unmitigated STRIDE threats |
| Stakeholder Health | 10% | STATUS.md | Based on approval vs revision ratio |
| Cost Health | 0%* | 4-cost.md | *Only if cost analysis exists |

**Note:** Cost Health is only calculated if `4-cost.md` exists. When present, weights are redistributed to include cost at 10% (reducing others proportionally).

## Scoring Methodology

### Schedule Health Score (0-10)

Read `.specflow/STATE.md` and extract iteration counts:

**Data points:**
- `dev_iterations` count (number of Dev rework cycles)
- `qa_iterations` count (number of QA rework cycles)

**Scoring:**
| Total Iterations | Score |
|------------------|-------|
| 0 (first pass) | 10 |
| 1 | 8 |
| 2 | 6 |
| 3 | 4 |
| 4-5 | 2 |
| 6+ | 0 |

**Interpretation:** High iteration counts indicate scope issues, unclear requirements, or quality problems.

### Scope Health Score (0-10)

Count files in `.specflow/features/{slug}/drift/` folder:

**Data points:**
- Number of drift correction files (drift-1.md, drift-2.md, etc.)

**Scoring:**
| Drift Corrections | Score |
|-------------------|-------|
| 0-1 | 10 |
| 2-3 | 7 |
| 4-5 | 4 |
| 6+ | 0 |

**Interpretation:** Frequent drift corrections indicate unstable requirements or scope creep.

### Quality Health Score (0-10)

Read `.specflow/features/{slug}/8-review-output.md` and count findings by severity:

**Data points:**
- CRITICAL finding count
- MAJOR finding count
- MINOR finding count

**Scoring:**
```
Start at 10
-3 per CRITICAL finding
-1 per MAJOR finding
-0.5 per MINOR finding
Minimum 0
```

**Example:**
- 0 CRITICAL, 2 MAJOR, 4 MINOR = 10 - 0 - 2 - 2 = 6

**Interpretation:** Review findings indicate code quality and requirement adherence.

### Risk Health Score (0-10)

Read `.specflow/features/{slug}/3-security.md` STRIDE findings:

**Data points:**
- Unmitigated HIGH severity threats
- Unmitigated MEDIUM severity threats
- Total threats identified vs mitigated

**Scoring:**
```
Start at 10
-2 per unmitigated HIGH severity threat
-1 per unmitigated MEDIUM severity threat
Minimum 0
```

**Example:**
- 1 unmitigated HIGH, 2 unmitigated MEDIUM = 10 - 2 - 2 = 6

**Interpretation:** Unmitigated security threats represent delivery risk.

### Stakeholder Health Score (0-10)

Read `.specflow/features/{slug}/STATUS.md` approval history:

**Data points:**
- Count of APPROVED entries
- Count of NEEDS_REVISION entries
- First-pass approval rate

**Scoring:**
| First-Pass Approval Rate | Score |
|--------------------------|-------|
| >80% | 10 |
| 60-80% | 7 |
| 40-60% | 4 |
| <40% | 0 |

**Interpretation:** Low approval rates indicate misalignment with stakeholder expectations.

### Cost Health Score (0-10) - Optional

Read `.specflow/features/{slug}/4-cost.md` if exists:

**Data points:**
- Estimated monthly cost
- Cost thresholds from scope assessment
- Cost variance from baseline

**Scoring:**
| Cost Status | Score |
|-------------|-------|
| Under budget | 10 |
| Within 10% of budget | 8 |
| 10-25% over budget | 5 |
| >25% over budget | 2 |
| No baseline to compare | 7 |

**Note:** If `4-cost.md` does not exist, skip this dimension entirely.

## Overall Health Calculation

### Standard Formula (5 dimensions)

```
Overall Score = (Schedule x 0.20) + (Scope x 0.25) + (Quality x 0.25) + (Risk x 0.20) + (Stakeholder x 0.10)
```

### With Cost Dimension (6 dimensions)

When `4-cost.md` exists, redistribute weights:

```
Overall Score = (Schedule x 0.18) + (Scope x 0.22) + (Quality x 0.22) + (Risk x 0.18) + (Stakeholder x 0.10) + (Cost x 0.10)
```

### Example Calculation

```
Dimension Scores:
- Schedule: 8
- Scope: 10
- Quality: 7
- Risk: 9
- Stakeholder: 10

Weighted Calculation:
- Schedule: 8 x 0.20 = 1.60
- Scope: 10 x 0.25 = 2.50
- Quality: 7 x 0.25 = 1.75
- Risk: 9 x 0.20 = 1.80
- Stakeholder: 10 x 0.10 = 1.00

Overall Score: 8.65 (Healthy)
```

## Interpretation

| Score | Status | Color | Action |
|-------|--------|-------|--------|
| 8-10 | Healthy | Green | Continue as planned |
| 6-7.9 | Manageable | Yellow | Monitor closely |
| 4-5.9 | At Risk | Orange | Escalate concerns |
| 0-3.9 | Critical | Red | Immediate intervention |

### Status Definitions

**Healthy (Green):** Feature is progressing well with minimal issues. No intervention needed.

**Manageable (Yellow):** Some concerns exist but are being addressed. Monitor for changes and be prepared to intervene.

**At Risk (Orange):** Significant issues in one or more dimensions. Escalate to stakeholders and develop mitigation plan.

**Critical (Red):** Major problems requiring immediate attention. Consider scope reduction, deadline extension, or resource reallocation.

## Flag Analysis

For any dimension scoring below 5, generate a flag:

### Flag Format

```markdown
### [DIMENSION] FLAG

**Score:** X/10
**Status:** At Risk
**Root Cause:** [Analysis from source artifact]

**Evidence:**
- [Specific finding 1]
- [Specific finding 2]

**Recommended Actions:**
1. [Action 1]
2. [Action 2]
```

### Example Flags

**Quality Flag (Score: 3/10):**
```markdown
### QUALITY FLAG

**Score:** 3/10
**Status:** Critical
**Root Cause:** Multiple CRITICAL findings in code review

**Evidence:**
- 2 CRITICAL: SQL injection vulnerabilities in auth module
- 3 MAJOR: Missing error handling in API endpoints
- 5 MINOR: Code style violations

**Recommended Actions:**
1. Prioritize CRITICAL security fixes before any other work
2. Add input validation review to dev checklist
3. Consider security-focused code review for auth module
```

**Scope Flag (Score: 4/10):**
```markdown
### SCOPE FLAG

**Score:** 4/10
**Status:** At Risk
**Root Cause:** Frequent drift corrections indicate unstable requirements

**Evidence:**
- 5 drift corrections recorded
- Scope changed 3 times after development started
- Original timeline exceeded by 40%

**Recommended Actions:**
1. Freeze scope for remaining development
2. Schedule stakeholder alignment meeting
3. Document deferred items for future iteration
```

## Output Format

Output file: `.specflow/features/{slug}/9-health-check.md`

### Template

```markdown
# Health Check: {feature-name}

**Generated:** {date}
**Feature:** {slug}
**Overall Score:** {score}/10 ({status})

## Summary

{One-paragraph health summary}

## Dimension Breakdown

| Dimension | Score | Weight | Weighted | Status |
|-----------|-------|--------|----------|--------|
| Schedule | X/10 | 20% | X.XX | {color} |
| Scope | X/10 | 25% | X.XX | {color} |
| Quality | X/10 | 25% | X.XX | {color} |
| Risk | X/10 | 20% | X.XX | {color} |
| Stakeholder | X/10 | 10% | X.XX | {color} |
| **Overall** | **X.XX/10** | **100%** | **X.XX** | **{color}** |

## Flags

{Flag sections for any dimension < 5, or "No flags - all dimensions healthy"}

## Data Sources

| Dimension | Source File | Status |
|-----------|-------------|--------|
| Schedule | STATE.md | {Found/Missing} |
| Scope | drift/ | {Found/Missing} |
| Quality | 8-review-output.md | {Found/Missing} |
| Risk | 3-security.md | {Found/Missing} |
| Stakeholder | STATUS.md | {Found/Missing} |
| Cost | 4-cost.md | {Found/Skipped} |

## Recommendations

{Prioritized list of actions based on flags and overall score}
```

## Partial Data Handling

If some artifacts don't exist:

1. **Skip that dimension** - Don't estimate or assume data
2. **Recalculate weights** - Redistribute weights among available dimensions
3. **Note missing dimensions** - Document in Data Sources table

### Weight Redistribution Example

If `3-security.md` is missing (no Risk Health):

```
Original weights: Schedule 20%, Scope 25%, Quality 25%, Risk 20%, Stakeholder 10%
Available total: 100% - 20% = 80%

Redistributed weights:
- Schedule: 20/80 = 25%
- Scope: 25/80 = 31.25%
- Quality: 25/80 = 31.25%
- Stakeholder: 10/80 = 12.5%
```

### Minimum Requirements

At least 3 dimensions must be calculable for a meaningful health check:
- If fewer than 3 dimensions available, return warning instead of score
- Core dimensions (Quality, Scope, Schedule) are most important

## Execution Steps

1. **Load feature context**
   - Read `.specflow/STATE.md` for current feature slug
   - Identify feature directory: `.specflow/features/{slug}/`

2. **Gather dimension data**
   - For each dimension, attempt to read source file
   - Record found vs missing sources
   - Extract relevant metrics

3. **Calculate scores**
   - Apply scoring methodology per dimension
   - Handle missing dimensions via weight redistribution
   - Calculate weighted overall score

4. **Generate flags**
   - For any dimension < 5, generate detailed flag
   - Include root cause analysis and recommendations

5. **Write output**
   - Generate health check document
   - Write to `.specflow/features/{slug}/9-health-check.md`

## Routing

Health check results inform PM decisions:

- **Healthy (8-10):** Continue to next workflow stage
- **Manageable (6-7.9):** Continue with monitoring note
- **At Risk (4-5.9):** PM presents flags to user for decision
- **Critical (0-3.9):** PM pauses workflow, requires user intervention
