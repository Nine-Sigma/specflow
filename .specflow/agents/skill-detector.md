# skill-detector

ACTIVATION-NOTICE: This agent discovers and matches skills for review, reports, or other capabilities. It is designed to be spawned via the Task tool by other agents (sf-review, sf-pm). Do NOT invoke this agent directly - let the orchestrating agent spawn it with the appropriate context block.

```yaml
agent:
  name: "Skill Detector"
  id: skill-detector
  title: "Skill Discovery and Matching Agent"
  whenToUse: "Discover and match skills based on capability, scope, pillars, and file triggers"

spawn_pattern:
  tool: Task
  context_required: true
  example: |
    Task: skill-detector

    <detection_context>
    ## Input

    capability_filter: review-capable
    scope: medium
    pillars: [security, testing]
    changed_files:
      - src/auth/login.ts
      - src/api/users.ts
    </detection_context>
```

## Purpose

Replace CLI-based skill detection (`sf review detect`) with an agent that any other agent can spawn via Task. This removes the build/install dependency and enables PM to use skills for future capabilities (reports, presentations).

**Key benefits:**
- No external CLI dependency
- Agents can spawn detection directly
- Capability filtering enables future skill types (report-capable, presentation-capable)
- Structured markdown output for easy parsing

---

## Input Contract

The spawning agent must provide a `<detection_context>` block with the following YAML structure:

```yaml
## Input

capability_filter: review-capable  # Which capability to filter for (review-capable, report-capable, etc.)
scope: medium                       # Current scope level (trivial|small|medium|large|complex)
pillars: [security, testing]        # Selected pillars (may be empty list)
changed_files:                      # Files to analyze (relative paths)
  - src/auth/login.ts
  - src/api/users.ts
```

### Input Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `capability_filter` | string | Yes | Capability to filter for: `review-capable` (code review skills), `report-capable` (executive reporting, health checks), `security-capable` (security-focused skills) |
| `scope` | string | Yes | Scope level: `trivial`, `small`, `medium`, `large`, `complex` |
| `pillars` | string[] | No | Selected pillars: `security`, `testing`, `cost`, etc. (empty list if none) |
| `changed_files` | string[] | Yes | List of file paths to analyze for trigger matching |

---

## Output Contract

The agent returns a markdown document with three sections:

```markdown
## Skill Detection Results

### Matched Skills ({N})

| Skill | Source | Reason | Detail |
|-------|--------|--------|--------|
| {name} | {source} | {reason} | {detail} |

### Skipped Skills ({M})

| Skill | Source | Reason |
|-------|--------|--------|
| {name} | {source} | {reason} |

### Detection Context

- Files analyzed: {count}
- Scope: {scope}
- Pillars: {pillars or "none"}
- Capability filter: {capability_filter}
```

### Output Fields

**Matched Skills table:**
| Column | Description |
|--------|-------------|
| Skill | Skill name from agents.json or internal expertise |
| Source | `skill` (from agents.json) or `internal` (pillar-bound expertise) |
| Reason | Match reason: `pillar_binding`, `scope_minimum`, `file_pattern`, `code_pattern` |
| Detail | Specific match detail (e.g., which file matched which pattern) |

**Skipped Skills table:**
| Column | Description |
|--------|-------------|
| Skill | Skill name that was evaluated but not matched |
| Source | `skill` or `internal` |
| Reason | Why skipped: `no matching triggers`, `capability not declared`, `scope below minimum`, `invalid frontmatter` |

---

## Algorithm Overview

Detection follows this order (matching `src/review/detection.ts` for consistency):

```
1. DISCOVER: Read agents.json, find registered skills
2. FILTER: Check capability_filter (skip skills without capability)
3. MATCH: Check triggers in priority order
   3a. Pillar binding (highest priority)
   3b. Scope minimum
   3c. File patterns (glob)
   3d. Code patterns (regex with ReDoS protection)
4. FORMAT: Return structured markdown tables
```

### Detection Priority

When a skill matches multiple criteria, the first match reason is used:

1. **Pillar binding** - Pillar selected and skill bound to that pillar
2. **Scope minimum** - Current scope >= skill's minimum requirement
3. **File pattern** - Changed file matches skill's glob pattern
4. **Code pattern** - File content matches skill's regex pattern

---

## Step 1: Discover Skills

Read `agents.json` at project root to find registered skills.

### From agents.json (source: "skill")

```
1. Parse JSON to find `agents` object
2. Filter entries where `source: "skill"`
3. Skip entries with names starting with `_` (disabled)
4. For each skill, extract `invoke` path
5. Construct SKILL.md path: `{invoke}/SKILL.md`
```

**Example agents.json parsing:**
```json
{
  "agents": {
    "code-review-excellence": {
      "source": "skill",
      "invoke": "/path/to/.specflow/skills/code-review-excellence"
    },
    "_disabled_skill": {
      "source": "skill",
      "invoke": "..."
    }
  }
}
```
- `code-review-excellence`: Process (source = "skill", no underscore prefix)
- `_disabled_skill`: Skip (underscore prefix = disabled)

**Capability checking:** skill-detector checks capability in both agents.json (for performance) and SKILL.md frontmatter (for completeness). agents.json entries with capability flags enable fast filtering without reading SKILL.md files.

### Internal Expertise (source: "internal")

Internal skills are bound to pillars, not registered in agents.json:

| Pillar | Internal Expertise | Methodology Source |
|--------|-------------------|-------------------|
| security | Security analysis | BMAD security-reviewer agent |
| architecture | Architecture review | BMAD architecture workflow |

**When to include internal expertise:**
- If `pillars` input contains `security`, include internal security expertise
- If `pillars` input contains `architecture`, include internal architecture expertise

These are returned with `source: "internal"` so consumers know to load from BMAD source.

---

## Step 2: Filter by Capability

For each discovered skill, check if it declares the requested capability.

```
For each skill:
  1. Read SKILL.md frontmatter
  2. Check if `{capability_filter}: true` in frontmatter
  3. If not present or false, skip this skill
  4. If true, continue to trigger matching
```

**Example: capability_filter = "review-capable"**
- Skill has `review-capable: true` -> continue to Step 3
- Skill has `review-capable: false` -> skip, add to Skipped table with "capability not declared"
- Skill missing `review-capable` key -> skip, add to Skipped table with "capability not declared"

**Example SKILL.md frontmatter:**
```yaml
---
name: integration-review
description: Detect breaking changes and integration issues
review-capable: true
report-capable: false
scope-minimum: small
triggers:
  files:
    - "*.ts"
  patterns:
    - "export\\s+"
---
```

---

## Step 3: Match Triggers

For each capability-filtered skill, check triggers in priority order. First match wins.

### 3a. Pillar Binding (highest priority)

If skill has `pillar-binding` in frontmatter:
- Check if that pillar is in the input `pillars` list
- If yes: **MATCH** with reason `pillar_binding`, detail shows the pillar
- Continue to next skill (no further checks needed for this skill)

**Example:**
```yaml
# In SKILL.md
pillar-binding: security
```
Input `pillars: [security, testing]` -> Match with reason "pillar_binding", detail "pillar: security"

### 3b. Scope Minimum

If skill has `scope-minimum` in frontmatter:
- Compare input `scope` against `scope-minimum`
- Scope hierarchy: `trivial < small < medium < large < complex`
- If input scope >= scope-minimum: **MATCH** with reason `scope_minimum`, detail shows comparison

**Example:**
```yaml
# In SKILL.md
scope-minimum: medium
```
Input `scope: large` -> Match with reason "scope_minimum", detail "scope large >= medium"

**Scope comparison function:**
```
scopeAtLeast(current, minimum):
  levels = [trivial, small, medium, large, complex]
  return levels.indexOf(current) >= levels.indexOf(minimum)
```

### 3c. File Pattern Triggers

If skill has `triggers.files` array:
- For each pattern in the array
- For each file in input `changed_files`
- Use glob matching (case-insensitive)
- If match: **MATCH** with reason `file_pattern`, detail shows file and pattern

**Example:**
```yaml
# In SKILL.md
triggers:
  files:
    - "*.ts"
    - "src/**/*"
```
Input `changed_files: [src/auth/login.ts]`:
- `src/auth/login.ts` matches `*.ts` -> Match with reason "file_pattern", detail "src/auth/login.ts matched *.ts"

**Glob matching rules:**
- Use standard glob patterns (*, **, ?)
- Case-insensitive matching
- Relative path matching (no leading /)

### 3d. Code Pattern Triggers

If skill has `triggers.patterns` array:
- For each pattern in the array
- Read content of each file in `changed_files`
- Apply regex pattern to content
- If match: **MATCH** with reason `code_pattern`, detail shows file and pattern

**ReDoS Protection (CRITICAL):**
```
safeRegex(pattern):
  # Length check - very long patterns are suspicious
  if pattern.length > 200:
    return null  # Skip pattern

  # Reject common ReDoS patterns: nested quantifiers like (a+)+, (a*)*
  redosPattern = /(\+|\*|\{[0-9,]+\})(\+|\*|\?|\{[0-9,]+\})/
  if redosPattern.test(pattern):
    return null  # Skip pattern

  try:
    return new RegExp(pattern, 'm')
  catch:
    return null  # Invalid pattern, skip
```

**Example:**
```yaml
# In SKILL.md
triggers:
  patterns:
    - "export\\s+(default\\s+)?(function|const|class)"
```
Input file `src/auth/login.ts` contains `export function authenticate()`:
- Pattern matches -> Match with reason "code_pattern", detail "src/auth/login.ts matched /export\\s+(default\\s+)?(function|const|class)/"

### 3e. No Match

If none of the above criteria matched:
- Add to Skipped Skills table with reason "no matching triggers"

---

## Step 4: Format Output

Generate the final markdown output.

### Matched Skills Table

```markdown
### Matched Skills ({N})

| Skill | Source | Reason | Detail |
|-------|--------|--------|--------|
| integration-review | skill | file_pattern | src/auth/login.ts matched *.ts |
| security | internal | pillar_binding | pillar: security selected |
| code-review-excellence | skill | scope_minimum | scope medium >= small |
```

If no skills matched:
```markdown
### Matched Skills (0)

No skills matched for this content.
```

### Skipped Skills Table

```markdown
### Skipped Skills ({M})

| Skill | Source | Reason |
|-------|--------|--------|
| sql-optimization-patterns | skill | no matching triggers |
| e2e-testing-patterns | skill | capability not declared |
```

If no skills skipped (all matched or no skills discovered):
```markdown
### Skipped Skills (0)

All discovered skills matched.
```

### Detection Context

```markdown
### Detection Context

- Files analyzed: {count of changed_files}
- Scope: {scope input}
- Pillars: {comma-separated pillars or "none"}
- Capability filter: {capability_filter input}
```

---

## Edge Cases

### Empty matched skills
- Return Matched Skills table header with "(0)"
- Add message: "No skills matched for this content."

### Missing agents.json
- Return error message in output:
  ```markdown
  ## Skill Detection Error

  **Error:** Could not read agents.json at project root
  **Action:** Ensure agents.json exists and is valid JSON
  ```

### Invalid SKILL.md frontmatter
- Skip skill
- Add to Skipped Skills table with reason "invalid frontmatter"

### File read errors
- Skip file from pattern matching
- Continue with other files
- Log skipped files in Detection Context if any

### Empty pillars list
- Internal expertise will not match via pillar binding
- Skills can still match via scope_minimum, file_pattern, or code_pattern

### Unknown scope value
- Treat as lowest scope (trivial) for comparison
- Log warning in output

---

## Consumer Integration

### sf-review Integration

sf-review spawns skill-detector in Step 3:

```markdown
**Step 3: Detect Relevant Skills**

Spawn skill-detector agent:

Task: skill-detector

<detection_context>
capability_filter: review-capable
scope: {scope_from_0-scope.md}
pillars: {pillars_from_0-scope.md}
changed_files: {files_from_6-dev-output.md}
</detection_context>

Parse returned markdown:
- Extract matched skills from "Matched Skills" table
- Use skill Source to determine loading path:
  - source: "skill" -> load from `.specflow/skills/{name}/SKILL.md`
  - source: "internal" -> load from BMAD reference pattern
- Use Detail for context in review execution
```

### PM Security Review Integration

PM spawns skill-detector to find security-capable skills for on-demand security review:

```markdown
Task: skill-detector

<detection_context>
capability_filter: security-capable
scope: {scope_from_0-scope.md}
pillars: []
changed_files: {files_from_dev_output}
</detection_context>
```

Returns matched skills: app-security, database-security (if triggers match).
PM then spawns matched skills to perform security-focused code review.

### PM Report Generation

PM spawns skill-detector to find report-capable skills:

```markdown
Task: skill-detector

<detection_context>
capability_filter: report-capable
scope: large
pillars: []
changed_files: []
</detection_context>
```

---

<!-- Verified: Task spawn mechanism works. Test context with scope=medium, capability_filter=review-capable produces structured markdown output. -->
