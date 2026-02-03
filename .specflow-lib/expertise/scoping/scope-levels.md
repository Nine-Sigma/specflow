# Scope Level Definitions

Extracted from BMAD methodology for autonomous agent use.

## The Five Scope Levels

| Level | Effort Signal | Example Features |
|-------|---------------|------------------|
| **trivial** | < 5 lines, no behavior change | Fix typo, update config, add comment |
| **small** | 1-3 files, single component | Logout button, simple UI tweak, add field |
| **medium** | 3-10 files, new endpoint | New API endpoint, form with validation |
| **large** | 10+ files, new feature area | Payment integration, new auth method |
| **complex** | New service, architecture change | Platform feature, microservice, major refactor |

## Scope Assessment Signals

### Trivial Signals (all must apply)
- [ ] Single-file change
- [ ] No logic changes (typo, config, comment)
- [ ] No user-facing behavior change
- [ ] < 5 lines of code

### Small Signals (2+ must apply)
- [ ] 1-3 files touched
- [ ] Single component/feature
- [ ] No new dependencies
- [ ] No data model changes
- [ ] No external service integration
- [ ] Existing patterns can be followed exactly

### Medium Signals (2+ must apply)
- [ ] 3-10 files touched
- [ ] New endpoint or component
- [ ] Minor data model changes (add column/field)
- [ ] Uses existing external services in new way
- [ ] Requires security consideration (auth-adjacent)
- [ ] New validation rules

### Large Signals (2+ must apply)
- [ ] 10+ files touched
- [ ] New feature area/module
- [ ] New database tables
- [ ] New external service integration
- [ ] Payment/PII handling
- [ ] Cross-cutting concerns (logging, auth, etc.)
- [ ] Multiple user roles affected

### Complex Signals (any applies)
- [ ] New service/microservice
- [ ] Architecture changes (new patterns)
- [ ] Research required (unknown technology)
- [ ] Multi-phase implementation needed
- [ ] Platform/infrastructure changes
- [ ] Breaking changes to existing APIs

## Selection Rule

**Choose the HIGHEST level where 2+ signals apply.**

If borderline between levels, prefer the higher level. It's better to over-prepare than under-prepare.

## Scope → Ceremony Mapping

| Scope | Pillars | Spec Depth | Arch Depth | Security | Cost | Testing |
|-------|---------|------------|------------|----------|------|---------|
| trivial | None | Skip | Skip | Skip | Skip | 1 check |
| small | Testing only | Light (3-5 ACs) | Light/Skip | Skip | Skip | 2-3 tests |
| medium | Security + Testing | Standard (8-12 ACs) | Standard | Light | Estimate | 6-8 tests |
| large | All | Full (15+ ACs) | Full | Full STRIDE | Breakdown | 10-15 tests |
| complex | All + Research | Deep (multi-phase) | Deep + ADRs | Deep | Full compare | 15+ tests |

## Scope Depth Definitions

### Spec Depth
- **Skip**: No separate spec, describe in scope doc
- **Light**: 3-5 acceptance criteria, brief user stories
- **Standard**: 8-12 acceptance criteria, full user stories, constraints
- **Full**: 15+ acceptance criteria, multiple user stories, detailed constraints
- **Deep**: Multi-section, phased delivery, epic-level breakdown

### Architecture Depth
- **Skip**: No architecture doc needed
- **Light**: Brief summary, API contract if needed, no diagrams
- **Standard**: Summary, key decisions, ASCII flow diagram, API contracts
- **Full**: All sections, multiple diagrams, data model, integration points
- **Deep**: Multi-part output, ADRs, C4 diagrams, extensive data model

### Security Depth
- **Skip**: No security analysis (trivial/small scope)
- **Light**: Key risks only, 2-3 STRIDE categories most relevant
- **Full**: Complete STRIDE (all 6 categories), implementation checklist
- **Deep**: STRIDE + attack trees, extended threat model, compliance mapping

### Cost Depth
- **Skip**: No cost analysis (no new resources)
- **Estimate**: Total monthly/annual estimate, key drivers only
- **Breakdown**: By resource type, with alternatives
- **Full**: Projections, multi-scenario comparison, optimization recommendations

### Testing Depth
- **Minimal**: 1-2 verification checks, happy path only
- **Light**: 3-5 tests, happy path + 1 error case
- **Standard**: 6-10 tests, full Gherkin scenarios
- **Full**: 10-15 tests, integration + E2E coverage
- **Deep**: 15+ tests, performance, security, multi-phase

## When PM Should Engage User

Scope assessment is autonomous, but PM should confirm with user when:

1. **Scope >= medium** - User should approve ceremony level
2. **Risk mismatch** - Small code change but high risk area (auth, payment)
3. **Ambiguous signals** - Could reasonably be two different levels
4. **User explicitly requested specific scope** - Verify understanding

## Anti-Patterns

❌ **Full ceremony for everything** - Match ceremony to scope
❌ **Under-scoping risky work** - Auth change is never "trivial"
❌ **Scope creep without re-assessment** - If scope changes, reassess
❌ **Skipping scope for speed** - Even trivial needs classification
