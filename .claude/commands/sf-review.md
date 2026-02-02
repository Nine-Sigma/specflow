# /sf:review - Dynamic Review Orchestrator

SpecFlow review orchestrator that discovers skills, matches to content, and spawns relevant skills in parallel.

## Activation

**Step 1: Load Context**

<context>
Read in order:
1. `.specflow/STATE.md` - Get current feature slug
2. `.specflow/features/{slug}/0-scope.md` - Get scope level, pillars
3. `.specflow/features/{slug}/6-dev-output.md` - Get changed files list
4. `.specflow/features/{slug}/1-spec.md` - Get acceptance criteria for reference

Extract from 6-dev-output.md:
- Changed files from "Files Modified" table (file paths only)

Extract from 0-scope.md:
- scope_level: (trivial|small|medium|large|complex)
- pillars.required: (list of enabled pillars)
</context>

**Step 2: Check Manual Override**

If invoked with `--skills skill1,skill2`:
- Skip Step 3 (detection) entirely
- Use provided skill names directly
- Log: "Manual override: using skills {list}"
- Continue to Step 4 with provided skills
- Detection step is NOT called when --skills is provided

Important: When --skills is provided, do NOT call `sf review detect`. The detection is completely bypassed.

**Step 3: Detect Relevant Skills** (only if --skills not provided)

<detection>
Call detection via Bash tool:

```bash
sf review detect --files "{comma-separated-file-list}" --scope {scope_level} --pillars "{comma-separated-pillars}"
```

Parse JSON output:
- matched[] - Skills to spawn (name, source, path, reason, detail)
- skipped[] - Skills not relevant (for transparency log)
- context - Detection parameters used

If matched is empty:
- Log: "No skills matched for this content"
- Write 8-review-output.md with status: clean
- Return to PM with: "Review complete - no skills triggered"
</detection>

### Detection Log

After calling detection, log results for transparency:

```markdown
## Skill Detection Results

### Selected Skills ({N})
{For each matched skill:}
- **{skill.name}** ({skill.source})
  - Reason: {skill.reason}
  - Match: {skill.detail}

### Skipped Skills ({M})
{For each skipped skill:}
- {skill.name}: not relevant (no matching triggers)

### Detection Context
- Files analyzed: {N}
- Scope: {scope_level}
- Pillars: {pillars or "none"}
- Manual override: {yes/no}
```

This log is included in 8-review-output-vN.md frontmatter as `detection_log`.

**Step 4: Spawn Skills in Parallel**

<parallel_spawning>
For each matched skill from detection, spawn a Task with fresh context.

### Loading Skill Methodology

Each skill has a source type that determines where to load methodology:

**External skills (source: "skill"):**
- Load from `.specflow/skills/{skill.name}/SKILL.md`
- Read SKILL.md content and pass as methodology context
- Example: code-review-excellence, e2e-testing-patterns, sql-optimization-patterns

**Internal expertise (source: "internal"):**
- Load from `_bmad/expertise/{skill.name}/`
- For security: load `_bmad/expertise/security/stride-framework.md`
- For architecture: load `_bmad/expertise/architecture/adr-template.md`

### File Filtering for Skills

Not all files go to all skills. Filter based on detection results.

**Detection provides:**
- skill.name: Which skill
- skill.triggers.files[]: File patterns this skill cares about
- skill.triggers.patterns[]: Code patterns this skill cares about

**Filter logic:**
1. Take changed files from 6-dev-output.md
2. For each skill, keep only files that match its triggers
3. If a skill has no matching files, still include but note "triggered by scope/pillar"

Example:
- sql-optimization-patterns: Only receives .sql files and files with prisma code
- code-review-excellence: Receives all .ts/.tsx/.js files
- security: Receives auth/login/payment related files

### Build Per-Skill Context

For each skill in matched[]:
1. Identify relevant files (files matching this skill's triggers)
2. Read file contents for those files only
3. Extract AC section from 1-spec.md
4. Load methodology (SKILL.md or expertise files based on source)
5. Load output format from _bmad/expertise/review/output-format.md

### Spawn Task for Each Skill

```markdown
Task: {skill.name} Review

<skill_context>
## Skill Methodology

{For external skills:}
{Content of .specflow/skills/{skill.name}/SKILL.md}

{For internal expertise:}
{Content of relevant _bmad/expertise/{skill.name}/ files}

## Files to Review

{List only files matching this skill's triggers:}
- {file1.ts} (matched: {trigger detail})
- {file2.ts} (matched: {trigger detail})

## File Contents

{For each file above, include content:}
### {file1.ts}
```{language}
{file content}
```

## Acceptance Criteria Reference

{Extract AC section from 1-spec.md}

## Output Instructions

Write your findings following this format:

### {skill.name} Findings

| ID | Location | Issue | AC Reference | Severity |
|----|----------|-------|--------------|----------|
| {prefix}-01 | file:line | {description} | AC-XX | {severity} |

For each finding, add:
### {ID}: {Issue Title}
**What's wrong:** {explanation}
**How to fix:** {specific instructions}
**Files to change:** {list}

Severity guide:
- CRITICAL: Security vulnerability, data loss, crashes
- MAJOR: Performance issue, incomplete feature, edge case failures
- MINOR: Style, naming, minor optimization

</skill_context>

Instructions: Review the provided files using {skill.name} methodology. Find issues, write findings in the format above. Be specific about locations and fixes.
```

### Parallel Execution

Spawn ALL skill Tasks at once (do not wait between them). The Task tool will execute them in parallel.

After all Tasks complete, collect their outputs for consolidation (Step 5).

### Re-Review Mode (iteration > 1)

When `--verify-fixes` is set or iteration > 1:

1. Read previous `8-review-output-v{N-1}.md`
2. Extract skills_invoked from frontmatter
3. Only spawn skills that had findings (status != clean for that skill)
4. Pass additional context to each Task:

```markdown
## Previous Findings to Verify

{List finding IDs from previous iteration for this skill}

Mode: VERIFY_FIXES
- Only check that specific findings above are resolved
- Do NOT look for new issues (unless CRITICAL severity discovered)
- Mark each previous finding as: FIXED | PARTIAL | UNRESOLVED
```

**Re-review filtering:**
- If a skill had no findings in v{N-1}, do NOT spawn it again
- This focuses re-review on skills that actually found issues
- Reduces unnecessary work and context bloat

</parallel_spawning>

**Step 5: Consolidate Findings**

See: Plan 20-04 adds finding consolidation here.

## Options

- `--skills skill1,skill2` - Manual override: specify skills to run, bypasses detection (Step 3 is skipped entirely)
- `--iteration N` - Specify iteration number (default: 1, used for re-review)
- `--verify-fixes` - Re-review mode: only check specific findings from previous iteration

## File Protocol

<required_reading>
On every invocation, read:
1. `.specflow/STATE.md` - Current feature context
2. `.specflow/features/{slug}/0-scope.md` - Scope and pillars
3. `.specflow/features/{slug}/6-dev-output.md` - Dev implementation details
4. `.specflow/features/{slug}/1-spec.md` - Acceptance criteria
5. Previous review outputs if iteration > 1: `8-review-output-v{N-1}.md`
</required_reading>

<expertise>
Load review methodology:
- `_bmad/expertise/review/index.md` - Dynamic architecture overview
- `_bmad/expertise/review/output-format.md` - Output structure
- `_bmad/expertise/review/escalation-rules.md` - When to escalate
- `_bmad/expertise/review/feedback-loop.md` - Fix routing protocol
</expertise>

## Output Frontmatter

The 8-review-output-vN.md file has this frontmatter:

```yaml
---
agent: review
created: {iso-timestamp}
version: v{N}
status: findings|clean|escalated
scope_level: {from 0-scope.md}
iteration: {N}
skills_invoked: [skill1, skill2, ...]
detection_log: |
  - skill1: matched (file_pattern: *.ts)
  - skill2: matched (code_pattern: SELECT)
  - skill3: skipped (no triggers)
---
```

<output>
After review:
1. Write findings to `.specflow/features/{slug}/8-review-output-v{N}.md`
2. Update `.specflow/features/{slug}/PROGRESS.md` with review summary
3. Return to PM with status: CLEAN | NEEDS_FIXES | ESCALATED
</output>

## Related

- `/sf:pm` - PM orchestrator (routes review outputs)
- `/sf:dev` - Development (receives fix requests)
- `/sf:qa` - Quality assurance (receives test fix requests)
- `_bmad/expertise/review/` - Review expertise folder
