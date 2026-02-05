# Shared Agent Patterns

Common patterns used across all SpecFlow agents. Reference this file instead of duplicating patterns in individual agent commands.

## Standard Loading Sequence

All agents follow this loading sequence before execution:

```markdown
## Standard Load Sequence

1. Read STATE.md -> get feature slug, phase, last-agent
2. Read 0-triage.md -> get pillars, agent sequence, scope level
3. Read 0-scope.md -> get scope level details, risk factors
4. Read prior outputs as needed (targeted sections only)
```

### Loading Code Template

```markdown
### Step 1: Load Context

<context>
Read in order:
1. `.specflow/STATE.md` - Get current feature slug, phase
2. `.specflow/features/{slug}/0-triage.md` - Get pillars, agent sequence
3. `.specflow/features/{slug}/0-scope.md` - Get scope level, depth guidance

For prior dependencies, use targeted reads:
- Read specific section from requirements-lock.md
- Read specific ADR from architecture.md
- See `.specflow-lib/expertise/context-efficiency/targeted-reads.md`
</context>
```

## Scope-Depth Matrix

All agents match output depth to scope level:

| Scope | Output Depth | Max Sections | Time Budget | Guidance |
|-------|--------------|--------------|-------------|----------|
| trivial | Skip/minimal | 1-2 | 5 min | One-liner outputs, skip optional sections |
| small | Light | 3-5 | 15 min | Brief sections, essential content only |
| medium | Standard | Full | 30 min | Complete sections, moderate detail |
| large | Full | Comprehensive | 60 min | All sections with thorough detail |
| complex | Deep | Multi-part | 90+ min | Multiple documents, extensive analysis |

### Scope Interpretation by Output Type

| Output Type | trivial | small | medium | large | complex |
|-------------|---------|-------|--------|-------|---------|
| Requirements | 1-2 FR | 3-5 FR | 5-10 FR | 10+ FR | Multi-epic |
| Architecture | Skip | 1 ADR | 2-3 ADR | Full ADRs | Multi-doc |
| Security | Skip | Quick scan | STRIDE | Full STRIDE + controls | Threat model |
| Cost | Skip | Quick estimate | Analysis | Full analysis | TCO model |
| Test Plan | Manual only | Unit + E2E | Full types | Comprehensive | Multi-phase |
| Review | Skip | Quick pass | Standard | Thorough | Multi-round |

## Standard Output Protocol

All agents follow this output pattern after execution:

```markdown
### Step 5: Output

<output>
1. Write to `.specflow/features/{slug}/{N}-{type}.md`

2. Append to PROGRESS.md:
   ```markdown
   ## {timestamp} - {Agent} (/sf:{agent})

   **Work Done:**
   - {Summary of work}

   **Output:** `{N}-{type}.md`

   **Scope Honored:** {scope_level} -> {depth applied}

   **Uncertainties:** {any flagged, or "None"}

   ---
   ```

3. Update STATE.md:
   - last-agent: {agent}
   - next-agent: pm
   - phase: review
</output>
```

### Output File Numbering

| Number | File | Agent |
|--------|------|-------|
| 0 | 0-triage.md, 0-scope.md | PM |
| 1 | 1-spec.md | Analyst |
| 1.5 | 1.5-codebase-constraints.md | Analyst |
| 2 | 2-architecture.md | Architect |
| 3 | 3-security.md | Security |
| 4 | 4-cost.md | Cost |
| 5 | 5-test-plan.md, 5-requirements-lock.md, 5.5-epics.md | PM/TEA |
| 6 | 6-dev-output.md | Dev |
| 7 | 7-qa-output.md | QA |
| 8 | 8-review-output-vN.md | Review |
| 9 | 9-*.md | PMO Skills (reports) |

## Uncertainty Flagging Pattern

All agents use this pattern to flag uncertainty:

```yaml
uncertainty:
  - section: {section name}
    reason: {why uncertain}
    confidence: {percentage 0-100}
    options:
      - {approach 1}
      - {approach 2}
    recommendation: {preferred approach if any}
```

### When to Flag

| Confidence | Action |
|------------|--------|
| 90-100% | No flag needed |
| 70-89% | Consider flagging if critical section |
| 50-69% | Flag required |
| <50% | Flag + escalate to PM immediately |

### Example Usage

```markdown
## Authentication Approach

JWT-based authentication with refresh tokens.

---
uncertainty:
  - section: Token Storage
    reason: Client preference unclear (httpOnly cookie vs localStorage)
    confidence: 60
    options:
      - httpOnly cookie (more secure, CSRF needed)
      - localStorage (simpler, XSS risk)
    recommendation: httpOnly cookie for security
---
```

## Quality Self-Check

Before completing output, all agents run this checklist:

```markdown
## Self-Check Before Output

- [ ] Does depth match scope level?
  - trivial/small: Brief output
  - medium: Standard depth
  - large/complex: Comprehensive

- [ ] Are all required sections present?
  - Check agent template for required sections
  - Mark optional sections as "N/A - scope {level}" if skipped

- [ ] Is rationale included for decisions?
  - Every decision has "why" explanation
  - Trade-offs are documented

- [ ] Are there any uncertainty flags needed?
  - Check confidence on each section
  - Flag anything below 70%

- [ ] Is output BOSS-compliant?
  - Binary: Yes/no verifiable
  - Observable: Can be tested
  - Specific: No ambiguity
  - Scope-bound: Matches feature scope
```

## PM Return Protocol

All agents return to PM, never route directly to next agent:

```markdown
### Routing

**Always return to PM.** Do not route directly to next agent.

Update STATE.md:
- last-agent: {this-agent}
- next-agent: pm
- phase: review

PM will:
- Review output quality
- Check scope compliance
- Decide to approve, request revision, or escalate to user
- Route to next agent when ready
```

### Why Return to PM

1. **Quality gate** - PM catches scope drift, missing content
2. **User engagement** - PM decides when to involve user
3. **Routing control** - PM adjusts sequence based on output
4. **Drift detection** - PM tracks deviations from plan

## Context Efficiency Integration

All agents should apply context efficiency patterns:

```markdown
### Context Efficiency

Load patterns from `.specflow-lib/expertise/context-efficiency/`:
- `targeted-reads.md` - Section-specific file reading
- `checkpoint-guidance.md` - When to recommend /clear
- `shared-patterns.md` - This file (don't reload)

**Key rules:**
1. Read sections, not full files (see targeted-reads.md)
2. Recommend clear at workflow boundaries (see checkpoint-guidance.md)
3. Use shared patterns instead of duplicating (reference this file)
```

## Error Handling Pattern

All agents handle errors consistently:

```markdown
### Error Handling

If blocked or encountering errors:

1. **Document the error** in PROGRESS.md:
   ```markdown
   ## {timestamp} - {Agent} [BLOCKED]

   **Error:** {description}
   **Attempted:** {what was tried}
   **Blocked by:** {specific blocker}

   ---
   ```

2. **Update STATE.md**:
   - phase: blocked
   - blocked-by: {blocker description}
   - next-agent: pm

3. **Return to PM** with error context

Do NOT:
- Continue with assumptions
- Skip sections silently
- Leave partial outputs without marking
```

## Persona Integration

All agents load and adopt their persona:

```markdown
### Step 2: Load Persona

<persona>
Read `.specflow-lib/personas/{agent}.md` and adopt:
- **Name**: Use persona name in communications
- **Role**: Frame work from role perspective
- **Style**: Match communication style
- **Principles**: Apply decision-making principles
</persona>
```

### Persona Files

| Agent | Persona File | Name |
|-------|-------------|------|
| pm | pm.md | John |
| analyst | analyst.md | Mary |
| architect | architect.md | Winston |
| dev | dev.md | Amelia |
| qa | qa.md | Quinn |
| security | security.md | Jordan |
| cost | cost.md | Taylor |

## Artifact Cross-References

When referencing other artifacts, use consistent format:

```markdown
**Requirement reference:**
See FR-01 in `1-spec.md`

**Architecture reference:**
See ADR-002 in `2-architecture.md`

**Security reference:**
See STRIDE table in `3-security.md`

**Constraint reference:**
See TC-03 in `5-requirements-lock.md`

**Test reference:**
See Test Matrix in `5-test-plan.md`
```

Use IDs (FR-01, ADR-002, TC-03) rather than prose descriptions for precision.
