# SpecFlow Agent Pattern

This document defines the standard architecture for all `/sf:*` agents.

## Core Principle

```
SpecFlow Agent = BMAD Persona + BMAD Methodology + SpecFlow Protocol
```

- **BMAD Persona**: Communication style, principles (from BMAD source agents)
- **BMAD Methodology**: Reusable frameworks, checklists (referenced via `_bmad/path#methodology-id`)
- **SpecFlow Protocol**: File locations, state tracking, PM routing (from `.specflow/`)
- **SpecFlow Expertise**: SpecFlow-specific content (from `_bmad/expertise/`)

**Key Architecture Change (v2.4):**
Agents reference BMAD source files directly using content extraction markers instead of maintaining duplicate copies in `_bmad/expertise/`. Markers separate interactive BMAD workflows (`<bmad-orchestration>`) from reusable methodology (`<bmad-methodology id="...">`) that SpecFlow agents can safely read.

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
│     └─ Read _bmad/agents/{agent}.agent.yaml                  │
│        (adopt communication style, principles)               │
│                                                              │
│  3. LOAD EXPERTISE                                           │
│     └─ Read _bmad/expertise/{domain}/*.md                    │
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

## BMAD Reference Loading Pattern

SpecFlow agents reference BMAD source methodology using a fragment-style reference pattern. This eliminates duplication while preventing agents from triggering BMAD's interactive workflows.

### Reference Syntax

```
_bmad/{path-to-file}.md#{methodology-id}
```

**Examples:**
- `_bmad/expansion-packs/cloud-architecture/agents/security-reviewer.md#stride-framework`
- `_bmad/expansion-packs/cloud-architecture/agents/cost-optimizer.md#cost-methodology`

### Content Markers in BMAD Source

BMAD source files use XML-style markers to segment content:

```markdown
<!-- In BMAD source file -->

<bmad-orchestration>
<!-- Interactive workflow content: YAML blocks, activation instructions, commands -->
<!-- SpecFlow agents SKIP this entirely -->
</bmad-orchestration>

<bmad-methodology id="methodology-name">
<!-- Reusable methodology content -->
<!-- SpecFlow agents READ this when referenced -->
</bmad-methodology>
```

### Loading Rules

When an agent specifies a reference like `_bmad/path.md#methodology-id`:

1. **Read the file** at the path before the `#`
2. **Find the methodology block** with `<bmad-methodology id="{id-after-hash}">`
3. **Read content** within that block only
4. **SKIP orchestration** - never execute content inside `<bmad-orchestration>` blocks
5. **Error on missing ID** - if the requested ID is not found, flag as ERROR (do not silently continue)

### Multiple References from Same File

Agents can reference multiple methodology blocks from a single source file:

```markdown
<expertise>
Read methodology from BMAD source:
- `_bmad/expansion-packs/cloud-architecture/agents/security-reviewer.md#stride-framework`
- `_bmad/expansion-packs/cloud-architecture/agents/security-reviewer.md#compliance-frameworks`
- `_bmad/expansion-packs/cloud-architecture/agents/security-reviewer.md#security-controls`
</expertise>
```

This reads three distinct methodology blocks from security-reviewer.md.

### Error Handling

| Condition | Behavior |
|-----------|----------|
| File not found | ERROR - cannot execute without methodology |
| Methodology ID not found | ERROR - flag missing methodology, halt |
| Orchestration block read | NEVER - agents must skip these blocks |
| Empty methodology block | WARNING - continue but log concern |

**Why ERROR on missing ID:**
Silent fallback would cause methodology drift - agents would operate without intended expertise, producing lower quality output. Fail-fast ensures issues are caught during development, not in production.

### What NOT to Do

- **Never** execute content inside `<bmad-orchestration>` blocks
- **Never** present A/P/C menus or numbered command lists to users
- **Never** halt for interactive input except via PM-controlled gates
- **Never** fallback silently when methodology is missing

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
Read `_bmad/agents/{agent}.agent.yaml` and adopt:
- **Name**: {Persona name}
- **Role**: {Role description}
- **Style**: {Communication style}
- **Principles**: {Decision-making principles}
</persona>

### Step 3: Load Expertise

<expertise>
Read methodology from two source types:

**BMAD Source (reference pattern):**
- `_bmad/{source-path}.md#{methodology-id}` - BMAD methodology blocks
- Apply loading rules: find ID, read block, skip orchestration
- ERROR if methodology ID not found

**SpecFlow-Specific (local files):**
- `_bmad/expertise/{domain}/*.md` - SpecFlow-created content (synthesis, review, validation)
- `_bmad/expertise/scoping/scope-levels.md` - Scope depth definitions

**External skills (when applicable):**
- `.specflow/skills/{skill-name}/SKILL.md` - Skill-provided methodology
- Skill provides specialized techniques beyond baseline methodology

**Loading order and precedence:**
1. BMAD source methodology first (establishes domain expertise)
2. SpecFlow expertise second (adds project-specific rules)
3. External skills layer on top (adds specialized techniques)
4. Conflict resolution: explicit instructions > BMAD source > SpecFlow > external

**Example for security agent:**
```markdown
# BMAD source (domain methodology)
- _bmad/expansion-packs/cloud-architecture/agents/security-reviewer.md#stride-framework
- _bmad/expansion-packs/cloud-architecture/agents/security-reviewer.md#compliance-frameworks
- _bmad/expansion-packs/cloud-architecture/agents/security-reviewer.md#security-controls

# SpecFlow expertise (project rules)
- _bmad/expertise/scoping/scope-levels.md
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

## Expertise Mapping by Agent

| Agent | Persona | BMAD Source + SpecFlow Expertise | Primary Output |
|-------|---------|----------------------------------|----------------|
| `/sf:analyst` | Mary | BMAD PRD workflow + `scoping/`, `discovery/`, `requirements/`, `synthesis/` | 0-scope.md, 1.5-codebase-constraints.md, 1-spec.md |
| `/sf:architect` | Winston | BMAD architecture workflow + `architecture/adr-template.md`, `scoping/` | 2-architecture.md |
| `/sf:security` | Jordan | BMAD security-reviewer agent + `scoping/` | 3-security.md |
| `/sf:cost` | Taylor | BMAD cost-optimizer agent + `scoping/` | 4-cost.md |
| `/sf:tea` | (SpecFlow) | `validation/`, `scoping/` | 5-test-plan.md |
| `/sf:dev` | Amelia | `requirements/` (constraints) | Implementation |
| `/sf:qa` | Quinn | `validation/` | Test execution |
| `/sf:review` | (SpecFlow) | `review/` + dynamic skill discovery | 8-review-output-vN.md |

**Note:** `/sf:review` is a dynamic skill orchestrator, not a fixed agent. It discovers review-capable skills, matches them to code content, and spawns relevant skills in parallel. See Review Lenses section below.

**v2.4 Architecture:** Agents reference BMAD source files directly using `_bmad/path#methodology-id` pattern. SpecFlow-specific expertise remains in `_bmad/expertise/`.

## Agent Expertise Loading

Detailed mapping of which specific files each agent loads in Step 3.

### sf-analyst.md

```markdown
# BMAD source (domain methodology)
- _bmad/workflows/2-plan-workflows/create-prd/steps-c/step-08-scoping.md#scope-assessment
- _bmad/workflows/2-plan-workflows/create-prd/steps-c/step-08-scoping.md#mvp-strategies

# SpecFlow expertise (Mode 1 - Scope Assessment)
- _bmad/expertise/scoping/scope-levels.md
- _bmad/expertise/scoping/pillar-selection.md
- _bmad/expertise/scoping/risk-assessment.md
- _bmad/expertise/discovery/project-classification.md

# SpecFlow expertise (Mode 1.5 - Codebase Analysis)
- _bmad/expertise/synthesis/codebase-analysis.md

# SpecFlow expertise (Mode 2 - Spec Creation)
- _bmad/expertise/requirements/boss-criteria.md
```

### sf-architect.md

```markdown
# BMAD source (domain methodology)
- _bmad/workflows/3-solutioning/create-architecture/steps/step-04-decisions.md#decision-categories
- _bmad/workflows/3-solutioning/create-architecture/steps/step-07-validation.md#validation-checklist

# SpecFlow expertise
- _bmad/expertise/architecture/adr-template.md
- _bmad/expertise/scoping/scope-levels.md
```

### sf-security.md

```markdown
# BMAD source (domain methodology)
- _bmad/expansion-packs/cloud-architecture/agents/security-reviewer.md#stride-framework
- _bmad/expansion-packs/cloud-architecture/agents/security-reviewer.md#compliance-frameworks
- _bmad/expansion-packs/cloud-architecture/agents/security-reviewer.md#security-controls

# SpecFlow expertise
- _bmad/expertise/scoping/scope-levels.md
```

### sf-cost.md

```markdown
# BMAD source (domain methodology)
- _bmad/expansion-packs/cloud-architecture/agents/cost-optimizer.md#cost-methodology
- _bmad/expansion-packs/cloud-architecture/agents/cost-optimizer.md#optimization-strategies
- _bmad/expansion-packs/cloud-architecture/agents/cost-optimizer.md#pricing-models

# SpecFlow expertise
- _bmad/expertise/scoping/scope-levels.md
```

### sf-tea.md (Test Engineering)

```markdown
- _bmad/expertise/validation/index.md             # Overview, agent usage
- _bmad/expertise/validation/test-criteria.md     # Quality standards, depth tables
- _bmad/expertise/validation/traceability-matrix.md  # Requirements coverage
- _bmad/expertise/scoping/scope-levels.md         # Match depth to scope
```

### sf-qa.md

```markdown
- _bmad/expertise/validation/index.md             # Overview, agent usage
- _bmad/expertise/validation/test-criteria.md     # Execution quality standards
- _bmad/expertise/validation/readiness-checklist.md  # Pre-execution validation
```

### sf-pm.md (when gating)

```markdown
- _bmad/expertise/validation/readiness-checklist.md  # Full readiness assessment
- _bmad/expertise/validation/traceability-matrix.md  # Coverage validation
- _bmad/expertise/elicitation/when-to-use.md         # User engagement decisions
```

### Dynamic Review System (/sf:review)

The review system is a **dynamic skill orchestrator**, not a fixed set of lenses. It discovers review-capable skills, matches them to code content, and spawns relevant skills in parallel.

**Review Orchestrator:**
```markdown
- _bmad/expertise/review/index.md              # Dynamic architecture overview
- _bmad/expertise/review/output-format.md      # Consolidated output structure
- _bmad/expertise/review/escalation-rules.md   # PM escalation triggers
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
- Security pillar → Uses `_bmad/expansion-packs/cloud-architecture/agents/security-reviewer.md#stride-framework`
- Architecture pillar → Uses `_bmad/workflows/3-solutioning/create-architecture/` methodology

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
Read methodology from BMAD source (skip orchestration blocks):
- `_bmad/expansion-packs/cloud-architecture/agents/security-reviewer.md#stride-framework` - STRIDE threat modeling
- `_bmad/expansion-packs/cloud-architecture/agents/security-reviewer.md#compliance-frameworks` - GDPR, HIPAA, PCI-DSS, SOX, ISO 27001
- `_bmad/expansion-packs/cloud-architecture/agents/security-reviewer.md#security-controls` - Identity, network, data protection controls

Read SpecFlow-specific expertise:
- `_bmad/expertise/scoping/scope-levels.md` - Scope depth definitions

**Loading rules:**
1. Find `<bmad-methodology id="{requested-id}">` block in the source file
2. Read content within that block only
3. SKIP any `<bmad-orchestration>` blocks entirely
4. If methodology ID not found, flag as ERROR (do not silently continue)
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

1. **Identify BMAD persona** in `_bmad/agents/`
2. **Extract expertise** into `_bmad/expertise/{domain}/`
3. **Create sf-{agent}.md** following template above
4. **Add to PM routing** in sf-pm.md
5. **Define scope-depth mapping** for the agent's output type
