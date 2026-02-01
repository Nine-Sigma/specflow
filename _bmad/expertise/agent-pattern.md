# SpecFlow Agent Pattern

This document defines the standard architecture for all `/sf:*` agents.

## Core Principle

```
SpecFlow Agent = BMAD Persona + BMAD Expertise + SpecFlow Protocol
```

- **BMAD Persona**: Communication style, principles (from `_bmad/agents/*.yaml`)
- **BMAD Expertise**: Methodology, frameworks, checklists (from `_bmad/expertise/`)
- **SpecFlow Protocol**: File locations, state tracking, PM routing (from `.specflow/`)

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
Read and apply methodology from:
- `_bmad/expertise/{domain}/{relevant-file}.md`
- `_bmad/expertise/{domain}/quality-checklist.md`
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

| Agent | Persona | Expertise Folders | Primary Output |
|-------|---------|-------------------|----------------|
| `/sf:analyst` | Mary | `discovery/`, `requirements/`, `scoping/` | 0-scope.md, 1-spec.md |
| `/sf:architect` | Winston | `architecture/`, `scoping/` | 2-architecture.md |
| `/sf:security` | Jordan | `security/`, `scoping/` | 3-security.md |
| `/sf:cost` | Taylor | `cost/`, `scoping/` | 4-cost.md |
| `/sf:tea` | (SpecFlow) | `validation/`, `scoping/` | 5-test-plan.md |
| `/sf:dev` | Amelia | `requirements/` (constraints) | Implementation |
| `/sf:qa` | Quinn | `validation/` | Test execution |

## Agent Expertise Loading

Detailed mapping of which specific files each agent loads in Step 3.

### sf-analyst.md

**Mode 1 (Scope Assessment):**
```markdown
- _bmad/expertise/scoping/scope-levels.md      # Determine scope level
- _bmad/expertise/scoping/pillar-selection.md  # Which pillars needed
- _bmad/expertise/scoping/mvp-strategies.md    # MVP boundaries
- _bmad/expertise/scoping/risk-assessment.md   # Risk factors
- _bmad/expertise/discovery/project-classification.md  # Classify project
```

**Mode 2 (Spec Creation):**
```markdown
- _bmad/expertise/requirements/boss-criteria.md  # Write acceptance criteria
```

### sf-architect.md

```markdown
- _bmad/expertise/architecture/index.md            # Overview, scope-based depth
- _bmad/expertise/architecture/decision-categories.md  # 5 decision domains
- _bmad/expertise/architecture/adr-template.md     # ADR format (complex scope)
- _bmad/expertise/architecture/validation-checklist.md  # 40-item validation
- _bmad/expertise/scoping/scope-levels.md          # Match depth to scope
```

### sf-security.md

```markdown
- _bmad/expertise/security/index.md           # Overview, scope-based depth
- _bmad/expertise/security/stride-framework.md    # STRIDE threat categories
- _bmad/expertise/security/security-controls.md   # 5 control checklists
- _bmad/expertise/security/compliance-patterns.md # GDPR, HIPAA, PCI-DSS, etc.
- _bmad/expertise/scoping/scope-levels.md         # Match depth to scope
```

### sf-cost.md

```markdown
- _bmad/expertise/cost/index.md               # Overview, scope-based depth
- _bmad/expertise/cost/cost-methodology.md    # 5-step analysis process
- _bmad/expertise/cost/optimization-strategies.md  # Compute, storage, network
- _bmad/expertise/cost/pricing-models.md      # AWS, Azure, GCP patterns
- _bmad/expertise/scoping/scope-levels.md     # Match depth to scope
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

## Loading Example

Here's how an agent loads expertise (from sf-security.md):

```markdown
### Step 3: Load Expertise

<expertise>
Read and apply methodology from:
- `_bmad/expertise/security/index.md` - Overview and scope-based analysis depth
- `_bmad/expertise/security/stride-framework.md` - STRIDE threat categories and analysis process
- `_bmad/expertise/security/security-controls.md` - 5 control category checklists
- `_bmad/expertise/security/compliance-patterns.md` - GDPR, HIPAA, PCI-DSS, SOX, ISO 27001 (if applicable)
- `_bmad/expertise/scoping/scope-levels.md` - Scope depth definitions
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
