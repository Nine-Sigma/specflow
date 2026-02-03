# Requirements Traceability Matrix

<!-- Source: SpecFlow validation methodology -->

Ensure all requirements are covered by implementation artifacts.

## Purpose

Validate that every Functional Requirement (FR) from the PRD is captured in epics and stories, identifying any gaps in coverage before implementation starts.

## Coverage Matrix Format

Create a matrix mapping PRD requirements to implementation artifacts:

| FR Number | PRD Requirement | Epic Coverage | Status |
|-----------|-----------------|---------------|--------|
| FR1 | [requirement text] | Epic X Story Y | Covered |
| FR2 | [requirement text] | **NOT FOUND** | MISSING |
| FR3 | [requirement text] | Epic Z Story A | Covered |
| FR4 | [requirement text] | Epic Y Story B, C | Covered |

### Status Values

| Status | Meaning |
|--------|---------|
| Covered | FR has corresponding epic/story |
| MISSING | FR not found in any epic/story |
| Partial | FR partially covered, needs expansion |
| N/A | FR intentionally deferred or out of scope |

## Coverage Analysis Process

### 1. Extract All FRs from PRD

From the PRD document:
- List all FR numbers (FR1, FR2, etc.)
- Include requirement text for each
- Note priority/severity if available

### 2. Extract Epic FR Coverage

From epics/stories document:
- Find FR coverage mapping or list
- Extract which FR numbers are claimed to be covered
- Document which epics cover which FRs

Format as:
```
## Epic FR Coverage Extracted

FR1: Covered in Epic X
FR2: Covered in Epic Y
FR3: Covered in Epic Z
...
Total FRs in epics: [count]
```

### 3. Compare and Identify Gaps

Using PRD FR list and epic coverage:
- Check each PRD FR against epic coverage
- Identify FRs NOT covered in epics
- Note any FRs in epics but NOT in PRD (scope creep)

### 4. Document Missing Coverage

List all uncovered FRs by severity:

```markdown
## Missing FR Coverage

### Critical Missing FRs

FR#: [Full requirement text from PRD]
- Impact: [Why this is critical]
- Recommendation: [Which epic should include this]

### High Priority Missing FRs

[List any other uncovered FRs]
```

## Coverage Statistics

Calculate and report coverage metrics:

```markdown
## Coverage Statistics

- Total PRD FRs: [count]
- FRs covered in epics: [count]
- Coverage percentage: [X%]
```

## When to Escalate

| Coverage Level | Action |
|----------------|--------|
| 100% | Proceed to implementation |
| 90-99% | Review missing FRs - may proceed if non-critical |
| < 90% | Resolve gaps before implementation |

**Critical rule:** Coverage < 100% requires explicit resolution before implementation starts. Either:
1. Add missing coverage to epics/stories
2. Explicitly document why FR is deferred (with ticket reference)

## NFR Coverage

Non-Functional Requirements also need coverage validation:

| NFR Category | Where Covered |
|--------------|---------------|
| Performance | Architecture decisions, test plan |
| Security | Security analysis, architecture |
| Scalability | Architecture, infrastructure |
| Reliability | Architecture, test plan |
| Usability | UX specs, acceptance criteria |

## Scope-Based Application

| Scope | Traceability Depth |
|-------|-------------------|
| trivial | Not needed |
| small | Quick check - key FRs only |
| medium | Full FR matrix |
| large | FR + NFR coverage |
| complex | Multi-phase traceability with dependencies |
