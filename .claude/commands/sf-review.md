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

See: Plan 20-03 adds parallel Task tool spawning here.

For now, list matched skills:
- Skill: {name} (source: {source})
- Reason: {reason}
- Files: {files matching this skill's triggers}

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
