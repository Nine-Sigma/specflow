---
name: executive-reporting
description: Generate executive status reports, dashboards, and board packages from SpecFlow feature artifacts
report-capable: true
scope-minimum: small
triggers:
  phrases:
    - "status report"
    - "exec summary"
    - "executive update"
    - "board package"
    - "stakeholder update"
---

# Executive Reporting

Generate executive-level communication from SpecFlow feature artifacts using a structured 5-gate methodology and Executive Pyramid format.

## Purpose

This skill enables PM to produce professional executive reports, stakeholder updates, and board packages by:

1. Collecting data from SpecFlow feature artifacts
2. Extracting key metrics, blockers, and achievements
3. Structuring output using the Executive Pyramid for maximum clarity
4. Applying RAG status thresholds for at-a-glance understanding

Reports answer the executive question: "What do I need to know and what decisions do I need to make?"

## Data Sources

Read the following SpecFlow artifacts for the feature being reported:

| File | Purpose | Data Extracted |
|------|---------|----------------|
| `.specflow/STATE.md` | Current session state | Phase progress, iteration counts, last activity |
| `.specflow/features/{slug}/STATUS.md` | Approval history | Approvals, revisions, blockers |
| `.specflow/features/{slug}/PROGRESS.md` | Work log | Completed tasks, pending items, timestamps |
| `.specflow/features/{slug}/0-scope.md` | Scope assessment | Scope level (trivial/small/medium/large/complex) |
| `.specflow/features/{slug}/1-spec.md` | Requirements | Functional requirements summary, acceptance criteria count |
| `.specflow/features/{slug}/3-security.md` | Security findings (if exists) | STRIDE threat summary, unmitigated risks |
| `.specflow/features/{slug}/4-cost.md` | Cost estimate (if exists) | Monthly estimate, infrastructure costs |
| `.specflow/features/{slug}/8-review-output.md` | Review findings (if exists) | Finding counts by severity |
| `.specflow/features/{slug}/drift/` | Drift corrections | Count of drift correction files |

**Note:** Not all files may exist depending on scope level. Report based on available data.

## 5-Gate Methodology

### Gate 1: Audience Analysis

**Question:** Who is this report for?

| Audience | Focus | Detail Level | Tone |
|----------|-------|--------------|------|
| Executive (C-suite) | Strategic impact, blockers, decisions needed | Minimal - headlines only | Decisive, action-oriented |
| Board | Governance, risk, investment status | Summary with key metrics | Formal, objective |
| Stakeholder | Progress, timeline, dependencies | Moderate detail | Collaborative, informative |
| Project Team | Detailed status, next steps | Full detail | Technical, operational |

**Action:** Identify primary audience from user request. Default to "Stakeholder" if unspecified.

### Gate 2: Data Collection

**Action:** Read all available SpecFlow artifacts listed in Data Sources.

**Process:**
1. Verify feature slug exists in `.specflow/features/`
2. Read STATE.md for session context
3. Read each numbered output file (0-scope through 8-review)
4. Check for drift/ folder and count correction files
5. Note which files exist vs missing

**Handle missing files:**
- If 3-security.md missing: Note "Security analysis not performed (scope: {level})"
- If 4-cost.md missing: Note "Cost analysis not performed"
- If 8-review-output.md missing: Note "Review not yet complete"

### Gate 3: Insight Extraction

**Question:** What are the key things this audience needs to know?

Extract and categorize:

| Category | What to Extract | Source Files |
|----------|-----------------|--------------|
| Progress | Completion %, current phase, recent activity | STATE.md, PROGRESS.md |
| Achievements | Completed milestones, approvals received | STATUS.md, PROGRESS.md |
| Blockers | Unresolved issues, pending decisions | STATUS.md, 8-review-output.md |
| Risks | Security threats, quality issues | 3-security.md, 8-review-output.md |
| Metrics | Iteration counts, finding counts, scope size | STATE.md, 0-scope.md |
| Next Steps | Upcoming work, dependencies | PROGRESS.md |

**Prioritize by audience:**
- Executives: Blockers > Risks > Progress
- Board: Risks > Metrics > Progress
- Stakeholder: Progress > Next Steps > Blockers

### Gate 4: Report Generation

**Action:** Write report using Executive Pyramid structure (see next section).

**Key principles:**
- Lead with conclusion, not background
- Quantify where possible (numbers > adjectives)
- Use RAG status indicators for at-a-glance understanding
- Keep Level 1 to ONE paragraph
- Include decision requests if any blockers need escalation

### Gate 5: Delivery Preparation

**Action:** Format for target audience and add visual aids.

| Audience | Format | Visual Aids |
|----------|--------|-------------|
| Executive | Markdown with RAG badges | Status table only |
| Board | Markdown with metrics table | RAG table, risk matrix |
| Stakeholder | Full markdown | All tables, timeline |

**Output location:** `.specflow/features/{slug}/9-exec-report.md`

## Executive Pyramid Structure

Reports follow a 4-level pyramid, starting broad and narrowing to detail.

### Level 1: Executive Summary (1 paragraph)

**Content:** Overall status, key message, decision needed (if any)

**Format:**
```markdown
## Executive Summary

**Status: [GREEN/YELLOW/RED]**

[One paragraph: What's the situation? What does the reader need to know? What decision is needed?]
```

**Example:**
```markdown
## Executive Summary

**Status: YELLOW**

User authentication feature is 70% complete with one blocking issue: security review identified a HIGH severity threat (session fixation) requiring architecture decision before dev can proceed. All other work is on track for the March 15 milestone. Decision needed: Approve session rotation approach vs JWT refactor (cost impact: 2 additional dev days).
```

### Level 2: Overview (3-5 bullets)

**Content:** Progress summary, key blockers, immediate next steps

**Format:**
```markdown
## Overview

- **Progress:** [X% complete, current phase]
- **Achieved:** [Recent milestone or approval]
- **Blocked:** [Current blocker, if any]
- **Risks:** [Top risk summary]
- **Next:** [Immediate next step]
```

### Level 3: Detail (by section)

**Content:** Detailed breakdown by dimension

**Sections:**
```markdown
## Schedule Status
[Current phase, iteration history, projected completion]

## Scope Status
[Scope level, drift corrections, scope stability]

## Quality Status
[Review findings summary, resolution status]

## Risk Status
[Security findings, unmitigated threats, mitigation status]

## Decisions Needed
[Any pending decisions requiring escalation]
```

### Level 4: Appendix

**Content:** Raw data, full findings, supporting evidence

**Include:**
- Full finding lists from 8-review-output.md
- Complete STRIDE table from 3-security.md
- Cost breakdown from 4-cost.md
- Approval history from STATUS.md

## RAG Status Thresholds

Use these thresholds to determine RED/YELLOW/GREEN status:

| Metric | GREEN | YELLOW | RED |
|--------|-------|--------|-----|
| Schedule | On track, 0-1 dev iterations | 2 iterations | 3+ iterations |
| Scope | No drift | 1-2 drift corrections | 3+ drift corrections |
| Quality | No CRITICAL findings | MAJOR findings unresolved | CRITICAL findings unresolved |
| Risk | All HIGH threats mitigated | Unmitigated MEDIUM threats | Unmitigated HIGH threats |

**Overall RAG Calculation:**
- **RED** if ANY dimension is RED
- **YELLOW** if ANY dimension is YELLOW (and none RED)
- **GREEN** if ALL dimensions are GREEN

## Output Format

Output file: `.specflow/features/{slug}/9-exec-report.md`

**Frontmatter:**
```yaml
---
report-type: executive-status
generated: YYYY-MM-DD
audience: [executive|board|stakeholder]
feature: {slug}
overall-status: [GREEN|YELLOW|RED]
schedule-status: [GREEN|YELLOW|RED]
scope-status: [GREEN|YELLOW|RED]
quality-status: [GREEN|YELLOW|RED]
risk-status: [GREEN|YELLOW|RED]
---
```

## Example Output

```markdown
---
report-type: executive-status
generated: 2026-02-04
audience: stakeholder
feature: user-authentication
overall-status: YELLOW
schedule-status: GREEN
scope-status: GREEN
quality-status: YELLOW
risk-status: YELLOW
---

# User Authentication - Executive Status Report

## Executive Summary

**Status: YELLOW**

User authentication feature is progressing well with 70% completion. Security review identified one HIGH severity threat (session fixation) that requires an architecture decision before implementation can proceed. Development is otherwise on track, with spec and architecture phases complete and approved. Decision needed by Feb 10 to maintain the March 15 delivery target.

## Overview

- **Progress:** 70% complete, currently in Development phase
- **Achieved:** Requirements and architecture approved, core login flow implemented
- **Blocked:** Session fixation mitigation approach pending decision
- **Risks:** 1 HIGH, 2 MEDIUM security threats identified (1 unmitigated)
- **Next:** Complete session management after architecture decision

## Schedule Status

| Phase | Status | Iterations | Notes |
|-------|--------|------------|-------|
| Triage | Complete | 1 | |
| Spec | Complete | 1 | Approved 2026-01-28 |
| Architecture | Complete | 1 | Approved 2026-01-30 |
| Security | Complete | 1 | 3 threats identified |
| Development | In Progress | 1 | Blocked on decision |
| QA | Not Started | - | |

**Schedule RAG: GREEN** - Within expected iteration count

## Scope Status

- **Scope Level:** Medium (3-10 files)
- **Drift Corrections:** 0
- **Scope Stability:** Stable

**Scope RAG: GREEN** - No drift detected

## Quality Status

| Severity | Count | Resolved | Unresolved |
|----------|-------|----------|------------|
| CRITICAL | 0 | - | - |
| MAJOR | 2 | 1 | 1 |
| MINOR | 4 | 3 | 1 |

**Quality RAG: YELLOW** - 1 MAJOR finding unresolved (session fixation)

## Risk Status

**STRIDE Summary:**
| Threat Type | HIGH | MEDIUM | LOW |
|-------------|------|--------|-----|
| Spoofing | 0 | 1 | 0 |
| Tampering | 0 | 0 | 1 |
| Repudiation | 0 | 0 | 0 |
| Info Disclosure | 1 | 0 | 0 |
| Denial of Service | 0 | 1 | 0 |
| Elevation | 0 | 0 | 0 |

**Unmitigated HIGH:** Session fixation allows attacker to hijack authenticated session

**Risk RAG: YELLOW** - HIGH threat identified, mitigation pending decision

## Decisions Needed

### Decision 1: Session Fixation Mitigation

**Context:** Security review identified session fixation vulnerability (HIGH severity)

**Options:**
| Option | Effort | Risk Reduction | Trade-off |
|--------|--------|----------------|-----------|
| Session rotation on login | 1 day | Full mitigation | Slight UX impact (re-auth) |
| JWT with refresh tokens | 3 days | Full mitigation | Architecture change |

**Recommendation:** Session rotation (lower effort, same risk reduction)

**Decision needed by:** 2026-02-10 to maintain timeline

---

## Appendix

### Full Security Findings

[Contents of 3-security.md STRIDE table]

### Full Review Findings

[Contents of 8-review-output.md findings table]

### Approval History

[Contents of STATUS.md]
```

## Routing

After generating report:

1. Save to `.specflow/features/{slug}/9-exec-report.md`
2. Return to PM with completion status
3. PM presents to user or chains to pptx skill for board package
