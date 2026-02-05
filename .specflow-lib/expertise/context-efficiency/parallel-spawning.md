# Parallel Agent Spawning Patterns

This document defines patterns for spawning multiple agents or skills in parallel using the Task tool, reducing workflow execution time by running independent work concurrently.

## Principles

1. **Independence Required**: Only agents without data dependencies on each other can run in parallel
2. **Single Message, Multiple Tasks**: Spawn all parallel Tasks in one message for concurrent execution
3. **Wait for All**: Collect all Task outputs before making next routing decision
4. **Aggregate Before Presenting**: Merge and deduplicate results before presenting to user

## PM Parallel Spawning Points

| After | Parallel Agents | Condition |
|-------|-----------------|-----------|
| Architect (2-architecture.md) | Security, Cost, UX | Based on scope/pillars |
| Story Review Checkpoint | Wave 1 dev stories | Stories with no dependencies |
| Wave N stories complete | Wave N+1 dev stories | Next wave's stories |
| All Stories Complete | Wave 1 QA tickets | Tickets with no dependencies (if TEA recommends) |
| Wave N QA complete | Wave N+1 QA tickets | Next wave's tickets |

### Post-Architect Parallel Pattern

After architect writes `2-architecture.md`, PM spawns applicable pillar agents in parallel.

**Spawn Decision Matrix:**

| Pillar | Condition | Task Prompt |
|--------|-----------|-------------|
| Security | `security` in pillars.required | `/sf:security` with arch context |
| Cost | `cost` in pillars.required | `/sf:cost` with arch context |
| UX | UI-heavy detected AND medium+ scope | `/sf:ux` with spec + arch context |

**Parallel Spawn Protocol:**

```
After architect completes 2-architecture.md:

1. Read 0-scope.md to get pillars.required
2. Build spawn list based on conditions
3. Spawn all in single message:

Task(
  subagent_type="general-purpose",
  prompt="Read .specflow/features/{slug}/2-architecture.md, then execute /sf:security for this feature. Write output to 3-security.md.",
  description="Security analysis"
)

Task(
  subagent_type="general-purpose",
  prompt="Read .specflow/features/{slug}/2-architecture.md, then execute /sf:cost for this feature. Write output to 4-cost.md.",
  description="Cost analysis"
)

4. Wait for all tasks to complete
5. Aggregate results - check for cross-pillar conflicts
6. Route to TEA for test strategy, then synthesis
```

**Sequential Fallback:**

If parallel spawning fails (Task tool not available), fall back to sequential:
```
architect -> security -> cost -> ux -> tea -> synthesis
```

### Story Management Before Wave Calculation

Workflow: Create ALL stories (batch) -> Review/Adjust -> Calculate Waves -> Spawn

After creating all story files, PM presents a review checkpoint before calculating waves.

**Checkpoint Format:**

```
+------------------------------------------------------------------+
|  CHECKPOINT: Story Review                                         |
+------------------------------------------------------------------+

Created {N} stories in stories/ folder:

| ID | Story | Dependencies | Files | Complexity |
|----|-------|--------------|-------|------------|
| 1-1-auth-setup | Auth setup | none | auth.ts, middleware.ts | medium |
| 1-2-config | Config loader | none | config.ts | small |
| 2-1-rate-limit | Rate limiter | 1-1 | rate-limit.ts, auth.ts | large |

-------------------------------------------------------------------
-> Review stories. Options:
  - "approved" -- calculate waves and begin execution
  - "modify 1-2: add validation logic" -- update story scope
  - "delete 2-1" -- remove story (recalculates deps)
  - "add: implement caching layer" -- create new story
  - "split 2-1 into rate-limit-core, rate-limit-redis" -- break up large story
  - "reorder: 1-2 before 1-1" -- change dependency order
-------------------------------------------------------------------
```

**After User Response:**

1. **If modifications requested:**
   - Apply changes to story files in stories/ folder
   - Update sprint-status.yaml with modified stories
   - Re-display checkpoint with updated table

2. **If approved:**
   - Calculate waves based on dependencies and file overlap
   - Present wave plan (see Wave Calculation below)
   - Begin parallel spawning by wave

### Dev Stories Wave Parallel Spawning

After requirements-lock approved and stories generated, PM spawns dev stories by wave.

**Wave Execution Protocol:**

```
# Example: Wave 1 has 3 parallel-safe stories

Task(
  subagent_type="general-purpose",
  prompt="Execute /sf:dev-story 1-1-auth-setup for feature {slug}. Read story file, implement, run tests, mark done.",
  description="Dev story 1-1-auth-setup"
)

Task(
  subagent_type="general-purpose",
  prompt="Execute /sf:dev-story 1-2-config for feature {slug}. Read story file, implement, run tests, mark done.",
  description="Dev story 1-2-config"
)

Task(
  subagent_type="general-purpose",
  prompt="Execute /sf:dev-story 2-1-identifier for feature {slug}. Read story file, implement, run tests, mark done.",
  description="Dev story 2-1-identifier"
)
```

**Protocol Steps:**

1. Get Wave 1 stories from sprint-status.yaml (stories with `wave: 1`)
2. Spawn all Wave 1 in single message using Task tool
3. Wait for all Wave 1 to complete
4. Update sprint-status.yaml with completed stories
5. Spawn Wave 2 stories in parallel (repeat)
6. Continue until all waves complete

**Conflict Detection:**

Before spawning wave, validate parallel safety:
- No file overlap between stories in same wave
- No model/data conflicts
- If conflict detected, move story to next wave

### QA Decision (TEA-Informed)

Not every feature needs QA tickets. PM reads TEA's test strategy to determine QA needs.

**Step 1: Read TEA test_levels**

```python
test_levels = 5-test-plan.md frontmatter.test_levels
# Example: ["unit", "integration", "e2e"]
# Or: ["unit"] only
# Or: [] empty
```

**Step 2: Apply QA Decision Matrix**

| test_levels | QA Action |
|-------------|-----------|
| `[]` empty | Skip QA -> Route to Review |
| `["unit"]` only | Skip QA tickets (dev handles unit tests) -> Route to Review |
| includes `integration` | Generate integration QA ticket |
| includes `e2e` | Generate e2e QA ticket |
| includes `uat` | Generate UAT ticket (uat-execution skill with browser-use/API) |
| includes `security` | Generate security QA ticket |
| includes `performance` | Generate performance QA ticket |
| includes `accessibility` | Generate accessibility QA ticket |

**UAT Ticket Details:**

When `test_levels` includes `uat`:
- Create QA ticket with type: `uat`
- QA invokes `uat-execution` skill
- Skill auto-detects mode: browser (UI) or API
- Executes Gherkin scenarios from 5-test-plan.md
- Captures evidence (screenshots for browser, responses for API)

**Step 3: Route Decision**

```python
if len(test_levels) == 0 or test_levels == ["unit"]:
    # Dev already ran unit tests, skip QA phase
    route_to_review()
else:
    # Generate only the ticket types TEA recommends
    generate_qa_tickets(test_levels)
    spawn_qa_by_wave()
```

### QA Tickets Wave Parallel Spawning (If QA Needed)

After all dev stories complete AND test_levels requires QA, PM spawns QA tickets by wave.

**Wave Execution Protocol:**

```
# Example: Wave 1 has 2 parallel QA tickets

Task(
  subagent_type="general-purpose",
  prompt="Execute /sf:qa --ticket QA-001-integration for feature {slug}. Run test suite, capture results, mark done.",
  description="QA ticket QA-001"
)

Task(
  subagent_type="general-purpose",
  prompt="Execute /sf:qa --ticket QA-002-e2e for feature {slug}. Run test suite, capture results, mark done.",
  description="QA ticket QA-002"
)
```

**Protocol Steps:**

1. Get Wave 1 QA tickets from sprint-status.yaml (tickets with `wave: 1`)
2. Spawn all Wave 1 in single message using Task tool
3. Wait for all Wave 1 to complete
4. Update sprint-status.yaml with completed tickets
5. Spawn Wave 2 tickets in parallel (repeat)
6. Route to Review after all QA waves complete

**QA Wave Grouping:**

Functional tests (unit, integration, e2e) run in Wave 1.
Security and performance tests run in Wave 2 (after functional tests pass).

## Review Parallel Spawning Points

| Trigger | Parallel Skills | Condition |
|---------|-----------------|-----------|
| Code review | code-review-excellence, slop-detection | Always parallel |
| Drift check | semantic-drift, integration-review | If drift checkpoint |
| Full security | app-security, database-security | If --security flag |

### Scope-Based Parallel Skills

| Scope | Always Parallel | Conditional |
|-------|-----------------|-------------|
| small | code-review-excellence | - |
| medium | code-review-excellence, slop-detection | integration-review (if API) |
| large | code-review-excellence, slop-detection, integration-review | app-security (if auth), database-security (if DB) |
| complex | All above + semantic-drift | Full security suite |

### Skill Parallel Pattern

After skill-detector returns matched skills:

```
Spawn in parallel (single message, multiple Task calls):

Task(
  subagent_type="general-purpose",
  prompt="Execute code-review-excellence skill for feature {slug}. Review changed files, write findings.",
  description="Code review"
)

Task(
  subagent_type="general-purpose",
  prompt="Execute slop-detection skill for feature {slug}. Detect slop patterns, write findings.",
  description="Slop detection"
)

Task(
  subagent_type="general-purpose",
  prompt="Execute app-security skill for feature {slug}. Check OWASP vulnerabilities, write findings.",
  description="Security review"
)

Wait for all -> Merge findings -> Write 8-review-output.md
```

## Task Tool Call Format

Standard format for parallel Task spawning:

```
# Single message with multiple parallel Task calls:

Task(
  subagent_type="general-purpose",
  prompt="Read and execute /sf:security for feature {slug}...",
  description="Security analysis"
)

Task(
  subagent_type="general-purpose",
  prompt="Read and execute /sf:cost for feature {slug}...",
  description="Cost analysis"
)
```

**Key Parameters:**

- `subagent_type`: Always "general-purpose" for agent commands
- `prompt`: Full instruction including context and command
- `description`: Brief label for logging and status

## Aggregation Patterns

### PM Pillar Aggregation

After parallel pillar agents complete:

1. Read all pillar outputs:
   - 3-security.md (security findings, mitigations)
   - 4-cost.md (estimates, constraints)
   - 1.6-ux-design.md (component strategy)

2. Check for conflicts:
   - Security constraint vs cost optimization?
   - UX requirement vs security requirement?

3. Flag conflicts for user decision if found

4. Merge constraints into synthesis input

### Review Findings Aggregation

After parallel skills complete:

1. Collect skill outputs from `.specflow/features/{slug}/8-skill-{name}.md`

2. Merge findings by severity (CRITICAL > MAJOR > MINOR)

3. Deduplicate:
   - Same file:line within 3 lines = potential duplicate
   - >80% text similarity = duplicate
   - Keep higher severity, attribute all finding skills

4. Sort by severity (critical first)

5. Write combined output to 8-review-output.md

## Anti-Patterns

| Anti-Pattern | Problem | Solution |
|--------------|---------|----------|
| Sequential when independent | Wastes time | Spawn in parallel |
| Parallel with dependencies | Race conditions | Wait for dependencies first |
| Not waiting for all | Loses outputs | Always wait for all Tasks |
| Spawning too many | Context fragmentation | Group by wave, limit concurrency |

## Wave Calculation Algorithm

```python
def calculate_waves(items):
    """Group items into parallel-safe waves based on dependencies."""
    waves = []
    completed = set()
    remaining = [i for i in items if i.status == 'pending']

    while remaining:
        # Find items where all deps are satisfied
        wave = []
        for item in remaining:
            deps_met = all(d in completed for d in item.depends_on)
            if deps_met:
                wave.append(item)

        if not wave:
            # Stuck - circular dependency or unmet external dep
            escalate_to_user("Cannot progress: check dependencies")
            break

        waves.append(wave)
        remaining = [i for i in remaining if i not in wave]
        completed.update(i.id for i in wave)

    return waves
```

Same algorithm applies to both stories and QA tickets.
