# Implementation Readiness Checklist

<!-- Source: _bmad/workflows/3-solutioning/check-implementation-readiness/ -->

Validate that specs, architecture, and plans are complete before implementation.

## Pre-Implementation Checklist

### Documentation Completeness

- [ ] PRD exists with functional requirements
- [ ] Architecture document with key decisions
- [ ] Epics and stories defined
- [ ] Acceptance criteria are BOSS-compliant

### Requirements Traceability

- [ ] Every FR has corresponding epic/story
- [ ] No orphaned requirements
- [ ] Cross-cutting concerns addressed
- [ ] NFRs mapped to implementation

### Architecture Alignment

- [ ] All epics implementable with architecture
- [ ] No undocumented assumptions
- [ ] Integration points defined
- [ ] Dependencies identified

### Test Readiness

- [ ] Acceptance criteria are testable
- [ ] Test scenarios cover happy/error/edge paths
- [ ] Security test cases for medium+ scope
- [ ] Performance criteria for large+ scope

## Epic Quality Validation

### User Value Focus

For each epic, verify:
- Epic title is user-centric (what user can do)
- Epic goal describes user outcome
- Users can benefit from this epic alone

**Red flags:**
- "Setup Database" or "Create Models" - no user value
- "API Development" - technical milestone
- "Infrastructure Setup" - not user-facing

### Epic Independence

Test epic independence:
- Epic 1 must stand alone completely
- Epic 2 can function using only Epic 1 output
- Epic 3 can function using Epic 1 and 2 outputs
- Rule: Epic N cannot require Epic N+1 to work

**Violations:**
- "Epic 2 requires Epic 3 features to function"
- Stories in Epic 2 referencing Epic 3 components
- Circular dependencies between epics

### Story Quality

For each story, verify:
- [ ] Epic delivers user value
- [ ] Epic can function independently
- [ ] Stories appropriately sized
- [ ] No forward dependencies
- [ ] Database tables created when needed
- [ ] Clear acceptance criteria
- [ ] Traceability to FRs maintained

## Final Assessment Output

### Overall Status

Determine overall readiness status:

| Status | Criteria |
|--------|----------|
| **READY** | Only Nice-to-have issues remain |
| **NEEDS WORK** | More than 3 Important issues |
| **NOT READY** | Any Critical issue exists |

### Issue Severity Classification

**Critical (blocks implementation):**
- Missing functional requirements
- Forward dependencies breaking independence
- Technical epics with no user value
- Epic-sized stories that cannot be completed

**Important (should address):**
- Vague acceptance criteria
- Stories requiring future stories
- Database creation violations
- Incomplete error handling

**Nice-to-have:**
- Formatting inconsistencies
- Minor structure deviations
- Documentation gaps

### Assessment Report Format

```markdown
## Summary and Recommendations

### Overall Readiness Status

[READY | NEEDS WORK | NOT READY]

### Critical Issues Requiring Immediate Action

[List most critical issues that must be addressed]

### Recommended Next Steps

1. [Specific action item 1]
2. [Specific action item 2]
3. [Specific action item 3]

### Final Note

This assessment identified [X] issues across [Y] categories.
Address the critical issues before proceeding to implementation.
```

## When to Block

| Condition | Decision |
|-----------|----------|
| Any Critical issue | NOT READY - must resolve before implementation |
| More than 3 Important issues | NEEDS WORK - address before starting |
| Only Nice-to-have issues | READY - proceed with implementation |

## Scope-Based Application

| Scope | Checklist Depth | What to Validate |
|-------|-----------------|------------------|
| trivial | Skip | Not needed |
| small | Quick | Documentation exists, basic test coverage |
| medium | Standard | Full checklist, story quality |
| large | Complete | All sections plus epic independence |
| complex | Deep | Multi-phase validation, cross-phase alignment |
