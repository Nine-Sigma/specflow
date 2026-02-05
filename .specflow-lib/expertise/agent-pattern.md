# SpecFlow Agent Pattern

This document defines the standard architecture for all `/sf:*` agents.

## Core Principle

```
SpecFlow Agent = Persona + Methodology + SpecFlow Protocol
```

- **Persona**: Communication style, principles (from `.specflow-lib/personas/`)
- **Methodology**: Reusable frameworks, checklists (from `.specflow-lib/methodology/`)
- **SpecFlow Protocol**: File locations, state tracking, PM routing (from `.specflow/`)
- **SpecFlow Expertise**: SpecFlow-specific content (from `.specflow-lib/expertise/`)

**Key Architecture (v2.5):**
All methodology is loaded directly from `.specflow-lib/` as standalone files. Personas are extracted (~20 lines each), methodology is self-contained, and expertise is domain-specific. No fragment parsing required.

## Agent Execution Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    AGENT INVOCATION                          │
│                                                              │
│  1. LOAD CONTEXT                                             │
│     ├─ Read .specflow/STATE.md (current feature, phase)      │
│     ├─ Read 0-triage.md (pillars, sequence)                  │
│     └─ Read 0-scope.md (scope level, depth guidance)         │
│                                                              │
│  2. LOAD PERSONA                                             │
│     └─ Read .specflow-lib/personas/{agent}.md                │
│        (adopt communication style, principles)               │
│                                                              │
│  3. LOAD EXPERTISE                                           │
│     └─ Read .specflow-lib/methodology/{domain}/*.md          │
│        Read .specflow-lib/expertise/{domain}/*.md            │
│        (methodology for this agent's work)                   │
│                                                              │
│  4. EXECUTE AUTONOMOUSLY                                     │
│     ├─ Apply expertise to produce output                     │
│     ├─ Match depth to scope level                            │
│     ├─ Self-validate against quality checklist               │
│     └─ Flag uncertainty if confidence < threshold            │
│                                                              │
│  5. WRITE OUTPUT                                             │
│     ├─ Write to .specflow/features/{slug}/{N}-{type}.md      │
│     ├─ Append to PROGRESS.md                                 │
│     └─ Update STATE.md (last-agent, next-agent: pm)          │
│                                                              │
│  6. RETURN TO PM                                             │
│     └─ PM reviews, routes, or escalates to user              │
└─────────────────────────────────────────────────────────────┘
```

## Methodology Loading Pattern

SpecFlow agents load methodology directly from `.specflow-lib/`.

### Direct File Loading

```
.specflow-lib/personas/{persona-name}.md
.specflow-lib/methodology/{methodology-name}.md
.specflow-lib/expertise/{domain}/{file}.md
```

### Personas

Located at `.specflow-lib/personas/`:
- `pm.md` - John, Product Manager
- `analyst.md` - Mary, Business Analyst
- `architect.md` - Winston, Architect
- `dev.md` - Amelia, Developer
- `qa.md` - Quinn, QA Engineer
- `security.md` - Jordan, Security Reviewer
- `cost.md` - Taylor, Cost Optimizer

### Methodology

Located at `.specflow-lib/methodology/`:
- Security: `stride-framework.md`, `compliance-frameworks.md`, `security-controls.md`
- Cost: `cost-methodology.md`, `optimization-strategies.md`, `pricing-models.md`
- Architecture: `decision-categories.md`, `validation-checklist.md`
- PRD: `scope-assessment.md`, `mvp-strategies.md`
- Readiness: `traceability-matrix.md`, `readiness-checklist.md`

### Expertise

Located at `.specflow-lib/expertise/`:
- `scoping/` - Scope levels, pillar selection
- `synthesis/` - Codebase analysis, requirements lock
- `review/` - Review system, skill loading
- `testing/` - Test specification, TDD methodology
- `validation/` - Readiness checklist, test criteria
- `uat/` - Browser mode, API mode, Gherkin patterns
- `skills/` - Skill detection, capabilities

### Loading Rules

1. **Read file directly** - no fragment parsing needed
2. **Personas are ~20 lines** - load entire file
3. **Methodology is self-contained** - no orchestration content
4. **Expertise is domain-specific** - load relevant files only

### What NOT to Do

- **Never** present A/P/C menus or numbered command lists to users
- **Never** halt for interactive input except via PM-controlled gates

## Standard Agent Template

```markdown
# /sf:{agent} - {Agent Name}

SpecFlow agent using BMAD {persona} expertise with automated execution.

## Activation

### Step 1: Load Context

<context>
Read in order:
1. `.specflow/STATE.md` - Get current feature slug, phase
2. `.specflow/features/{slug}/0-triage.md` - Get pillars, agent sequence
3. `.specflow/features/{slug}/0-scope.md` - Get scope level, depth guidance
4. Prior outputs as dependencies (1-spec.md, 2-architecture.md, etc.)
</context>

### Step 2: Load Persona

<persona>
Read `.specflow-lib/personas/{agent}.md` and adopt:
- **Name**: {Persona name}
- **Role**: {Role description}
- **Style**: {Communication style}
- **Principles**: {Decision-making principles}
</persona>

### Step 3: Load Expertise

<expertise>
Read methodology from `.specflow-lib/`:

**Methodology (domain expertise):**
- `.specflow-lib/methodology/{domain}/*.md` - Domain-specific frameworks

**Expertise (SpecFlow-specific):**
- `.specflow-lib/expertise/{domain}/*.md` - SpecFlow-created content (synthesis, review, validation)
- `.specflow-lib/expertise/scoping/scope-levels.md` - Scope depth definitions

**External skills (when applicable):**
- `.specflow/skills/{skill-name}/SKILL.md` - Skill-provided methodology
- Skill provides specialized techniques beyond baseline methodology

**Loading order and precedence:**
1. Methodology first (establishes domain expertise)
2. Expertise second (adds SpecFlow-specific rules)
3. External skills layer on top (adds specialized techniques)
4. Conflict resolution: explicit instructions > methodology > expertise > external

**Example for security agent:**
```markdown
# Methodology (domain expertise)
- .specflow-lib/methodology/stride-framework.md
- .specflow-lib/methodology/compliance-frameworks.md
- .specflow-lib/methodology/security-controls.md

# Expertise (SpecFlow rules)
- .specflow-lib/expertise/scoping/scope-levels.md
```
</expertise>

### Step 4: Execute

<execution>
**Scope-Matched Execution:**

| Scope Level | Output Depth | Guidance |
|-------------|--------------|----------|
| trivial | Skip or minimal | 1-2 items max |
| small | Light | 3-5 items, brief |
| medium | Standard | Full sections |
| large | Full | Comprehensive |
| complex | Deep | Multi-part, detailed |

**Self-Validation:**
Before completing, check against quality criteria from expertise.

**Uncertainty Flagging:**
If confidence < 80% on any section, add to output:
```yaml
uncertainty:
  - section: {section name}
    reason: {why uncertain}
    options: [{possible approaches}]
```
</execution>

### Step 5: Output

<output>
1. Write to `.specflow/features/{slug}/{N}-{type}.md`
2. Append to PROGRESS.md:
   ```markdown
   ## {timestamp} - {Agent} (/sf:{agent})

   **Work Done:**
   - {Summary of work}

   **Output:** `{N}-{type}.md`

   **Scope Honored:** {scope_level} → {depth applied}

   **Uncertainties:** {any flagged, or "None"}

   ---
   ```
3. Update STATE.md:
   - last-agent: {agent}
   - next-agent: pm
   - phase: review
</output>

## Routing

**Always return to PM.** Do not route directly to next agent.

PM will:
- Review output quality
- Check scope compliance
- Decide to approve, request revision, or escalate to user
- Route to next agent when ready
```

## Context Efficiency

Agents should apply context efficiency patterns to reduce context window usage.

**Load these patterns:**
- `.specflow-lib/expertise/context-efficiency/targeted-reads.md` - Section-specific file reading
- `.specflow-lib/expertise/context-efficiency/checkpoint-guidance.md` - When to /clear
- `.specflow-lib/expertise/context-efficiency/shared-patterns.md` - Common patterns (DRY)

**Key rules:**
1. Read sections, not full files (see targeted-reads.md)
2. Clear context at recommended checkpoints (see checkpoint-guidance.md)
3. Reference shared patterns instead of repeating (see shared-patterns.md)

**Context budget targets:**
- Single section read: ~100-300 tokens
- Full file reads: Avoid unless role requires (e.g., Architect reviewing full architecture)
- After requirements-lock: MANDATORY /clear before dev work

## Expertise Mapping by Agent

| Agent | Persona | Methodology + Expertise | Primary Output |
|-------|---------|-------------------------|----------------|
| `/sf:analyst` | Mary | PRD methodology + `scoping/`, `discovery/`, `requirements/`, `synthesis/` | 0-scope.md, 1.5-codebase-constraints.md, 1-spec.md |
| `/sf:architect` | Winston | Architecture methodology + `architecture/adr-template.md`, `scoping/` | 2-architecture.md |
| `/sf:security` | Jordan | Security methodology + `scoping/` | 3-security.md |
| `/sf:cost` | Taylor | Cost methodology + `scoping/` | 4-cost.md |
| `/sf:tea` | (SpecFlow) | `validation/`, `scoping/` | 5-test-plan.md |
| `/sf:dev` | Amelia | `requirements/` (constraints) | Implementation |
| `/sf:qa` | Quinn | `validation/` | Test execution |
| `/sf:review` | (SpecFlow) | `review/` + dynamic skill discovery | 8-review-output-vN.md |

**All agents** should also load `.specflow-lib/expertise/context-efficiency/` patterns.

**Note:** `/sf:review` is a dynamic skill orchestrator, not a fixed agent. It discovers review-capable skills, matches them to code content, and spawns relevant skills in parallel. See Review Lenses section below.

**v2.5 Architecture:** Agents load methodology directly from `.specflow-lib/methodology/` and `.specflow-lib/expertise/`. No fragment parsing required.

## Agent Expertise Loading

Detailed mapping of which specific files each agent loads in Step 3.

### sf-analyst.md

```markdown
# Methodology (domain expertise)
- .specflow-lib/methodology/scope-assessment.md
- .specflow-lib/methodology/mvp-strategies.md

# Expertise (Mode 1 - Scope Assessment)
- .specflow-lib/expertise/scoping/scope-levels.md
- .specflow-lib/expertise/scoping/pillar-selection.md
- .specflow-lib/expertise/scoping/risk-assessment.md
- .specflow-lib/expertise/discovery/project-classification.md

# Expertise (Mode 1.5 - Codebase Analysis)
- .specflow-lib/expertise/synthesis/codebase-analysis.md

# Expertise (Mode 2 - Spec Creation)
- .specflow-lib/expertise/requirements/boss-criteria.md
```

### sf-architect.md

```markdown
# Methodology (domain expertise)
- .specflow-lib/methodology/decision-categories.md
- .specflow-lib/methodology/validation-checklist.md

# Expertise
- .specflow-lib/expertise/architecture/adr-template.md
- .specflow-lib/expertise/scoping/scope-levels.md
```

### sf-security.md

```markdown
# Methodology (domain expertise)
- .specflow-lib/methodology/stride-framework.md
- .specflow-lib/methodology/compliance-frameworks.md
- .specflow-lib/methodology/security-controls.md

# Expertise
- .specflow-lib/expertise/scoping/scope-levels.md
```

### sf-cost.md

```markdown
# Methodology (domain expertise)
- .specflow-lib/methodology/cost-methodology.md
- .specflow-lib/methodology/optimization-strategies.md
- .specflow-lib/methodology/pricing-models.md

# Expertise
- .specflow-lib/expertise/scoping/scope-levels.md
```

### sf-tea.md (Test Engineering)

```markdown
- .specflow-lib/expertise/validation/index.md             # Overview, agent usage
- .specflow-lib/expertise/validation/test-criteria.md     # Quality standards, depth tables
- .specflow-lib/expertise/validation/traceability-matrix.md  # Requirements coverage
- .specflow-lib/expertise/scoping/scope-levels.md         # Match depth to scope
```

### sf-qa.md

```markdown
- .specflow-lib/expertise/validation/index.md             # Overview, agent usage
- .specflow-lib/expertise/validation/test-criteria.md     # Execution quality standards
- .specflow-lib/expertise/validation/readiness-checklist.md  # Pre-execution validation
```

### sf-pm.md (when gating)

```markdown
- .specflow-lib/expertise/validation/readiness-checklist.md  # Full readiness assessment
- .specflow-lib/expertise/validation/traceability-matrix.md  # Coverage validation
- .specflow-lib/expertise/elicitation/when-to-use.md         # User engagement decisions
```

### Dynamic Review System (/sf:review)

The review system is a **dynamic skill orchestrator**, not a fixed set of lenses. It discovers review-capable skills, matches them to code content, and spawns relevant skills in parallel.

**Review Orchestrator:**
```markdown
- .specflow-lib/expertise/review/index.md              # Dynamic architecture overview
- .specflow-lib/expertise/review/output-format.md      # Consolidated output structure
- .specflow-lib/expertise/review/escalation-rules.md   # PM escalation triggers
```

**Skill Discovery:**
1. Read `agents.json` → find all `source: "skill"` entries
2. For each skill, read `SKILL.md` frontmatter for `review-capable: true` and `triggers`
3. Read internal expertise `triggers.yaml` files (security, architecture)

**Content Matching:**
```python
for skill in review_capable_skills:
    if file_matches(changed_files, skill.triggers.files):
        select(skill)
    elif content_matches(changed_files, skill.triggers.patterns):
        select(skill)
```

**Skill Trigger Declaration:**
```yaml
# In SKILL.md frontmatter
---
name: sql-optimization-patterns
review-capable: true
triggers:
  files: ["*.sql", "**/migrations/**"]
  patterns: ["SELECT\\s+.*FROM", "prisma\\."]
---
```

**Internal Expertise Triggers (via pillar binding):**

When a pillar is selected in `0-scope.md`, the related review skill is invoked:
- Security pillar → Uses `.specflow-lib/methodology/stride-framework.md`
- Architecture pillar → Uses `.specflow-lib/methodology/decision-categories.md`

**Parallel Execution:**
- Each matched skill spawned via Task tool with fresh context
- Context includes: relevant files only + spec + output format
- Dev + QA fixes spawned in parallel when issues are independent

**Focused Re-Review:**
- Iteration 2+ only re-spawns skills that had findings
- Mode: VERIFY_FIXES (check specific findings, don't look for new)

**Selection Algorithm:**
```
matched = content_triggers ∪ scope_minimum ∪ pillar_required
```

**Currently Installed Review Skills:**
| Skill | File Triggers | Pattern Triggers |
|-------|---------------|------------------|
| code-review-excellence | `*.ts, *.tsx, *.js` | Always for code |
| e2e-testing-patterns | `*.test.*, *.spec.*` | `describe(`, `it(` |
| sql-optimization-patterns | `*.sql, **/migrations/**` | `SELECT`, `prisma.` |

## Loading Example

Here's how an agent loads expertise (from sf-security.md):

```markdown
### Step 3: Load Expertise

<expertise>
Read methodology:
- `.specflow-lib/methodology/stride-framework.md` - STRIDE threat modeling
- `.specflow-lib/methodology/compliance-frameworks.md` - GDPR, HIPAA, PCI-DSS, SOX, ISO 27001
- `.specflow-lib/methodology/security-controls.md` - Identity, network, data protection controls

Read expertise:
- `.specflow-lib/expertise/scoping/scope-levels.md` - Scope depth definitions

**Loading rules:**
1. Read file directly - no fragment parsing needed
2. Personas are ~20 lines - load entire file
3. Methodology is self-contained - no orchestration content
4. Expertise is domain-specific - load relevant files only
</expertise>
```

## PM's Role in the Pattern

PM is the **only agent that interacts with users** (except initial request).

```markdown
## PM Review Protocol

On receiving agent output:

1. **Read output** and check:
   - Does depth match scope?
   - Are there uncertainty flags?
   - Does quality meet checklist?

2. **Decision tree:**

   IF uncertainties flagged:
     → Evaluate if user input needed
     → If yes: Present options to user (use elicitation)
     → If no: Make PM decision, document rationale

   IF output exceeds scope:
     → Return to agent with "reduce depth" instruction

   IF output below quality:
     → Return to agent with specific feedback

   IF clean:
     → Route to next agent per sequence
     → Or proceed to dev/qa if all agents done

3. **Big Decision Triggers** (engage user):
   - scope >= large AND first pillar output
   - uncertainty flagged on critical section
   - multiple valid approaches with trade-offs
   - security/cost concerns exceed threshold
```

## Key Differences from BMAD Interactive

| Aspect | BMAD Interactive | SpecFlow Pattern |
|--------|------------------|------------------|
| User involvement | Every step (A/P/C menu) | PM-controlled gates |
| Workflow execution | Step-by-step with halts | Autonomous execution |
| Agent routing | User triggers next | PM routes automatically |
| Elicitation | Always available | PM uses selectively |
| Output location | BMAD planning_artifacts | .specflow/features/{slug}/ |
| State tracking | Frontmatter stepsCompleted | STATE.md + PROGRESS.md |

## Implementing a New Agent

1. **Create persona** in `.specflow-lib/personas/{agent}.md`
2. **Extract methodology** into `.specflow-lib/methodology/{domain}/`
3. **Add expertise** to `.specflow-lib/expertise/{domain}/`
4. **Create sf-{agent}.md** following template above
5. **Add to PM routing** in sf-pm.md
6. **Define scope-depth mapping** for the agent's output type
