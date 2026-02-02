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

### Re-Review Mode (iteration > 1 OR --verify-fixes)

When in re-review mode, the review is FOCUSED verification only.

<verify_fixes_mode>
**Trigger:** iteration > 1 OR --verify-fixes flag

**Purpose:** Verify that specific previous findings are resolved. NOT a new full review.

**Step A: Load Previous Findings**

1. Read previous `8-review-output-v{N-1}.md`
2. Extract skills_invoked from frontmatter
3. Extract finding IDs that were NOT clean
4. Filter to only skills that had findings

**Step B: Spawn Only Relevant Skills**

For each skill in skills_invoked WHERE that skill had findings:
1. Check if skill had CRITICAL, MAJOR, or MINOR findings in v{N-1}
2. If skill was clean in v{N-1}: DO NOT spawn (skip this skill)
3. If skill had findings: Spawn with VERIFY_FIXES context

Skills that were clean in previous iteration are NOT re-run. This focuses re-review on skills that actually found issues.

**Step C: Pass Verification Context to Each Skill**

When spawning skill Tasks in VERIFY_FIXES mode:

```markdown
Task: {skill.name} - Verify Fixes

<verification_context>
## Mode: VERIFY_FIXES

You are verifying that specific findings have been resolved.

## Previous Findings to Verify

| ID | Severity | Original Issue |
|----|----------|----------------|
{For each finding from this skill in v{N-1}:}
| {ID} | {severity} | {brief description} |

## Verification Instructions

For each finding above:
1. Check if the specific issue has been resolved
2. Mark as: FIXED | PARTIAL | UNRESOLVED
3. If FIXED: Explain how it was fixed
4. If PARTIAL: Explain what remains
5. If UNRESOLVED: Explain what's still wrong

## Scope Restrictions

- ONLY verify the findings listed above
- Do NOT look for new issues
- Do NOT review files outside the fix scope
- EXCEPTION: If you discover a new CRITICAL issue while verifying, report it and note "NEW_CRITICAL_DISCOVERED"

## Output Format

### {skill.name} Verification Results

| ID | Status | Notes |
|----|--------|-------|
| C-01 | FIXED | Parameterized query implemented |
| M-01 | PARTIAL | Error handling added but missing retry |
| M-02 | UNRESOLVED | Issue still present |

{If new CRITICAL discovered:}
### New Critical Finding

| ID | Location | Issue |
|----|----------|-------|
| C-NEW | file:line | {description} |

**ESCALATE:** New CRITICAL found during verification.
</verification_context>
```

**Step D: Handle Verification Results**

After skills return verification results:

1. Consolidate into 8-review-output-v{N}.md
2. Check for all FIXED: status = CLEAN
3. Check for any PARTIAL or UNRESOLVED: status = findings (loop continues)
4. Check for NEW_CRITICAL_DISCOVERED: status = ESCALATED (immediate PM escalation per REV-04)

</verify_fixes_mode>

**Important:** Re-review does NOT discover new issues. It verifies specific fixes. If you need a full new review, invoke `/sf:review` without --verify-fixes.

</parallel_spawning>

**Step 5: Consolidate Findings**

After all skills complete (outputs in `.specflow/features/{slug}/8-skill-{name}.md`), consolidate into single output.

<consolidation>
### 5.1: Collect Skill Outputs

For each spawned skill:
```bash
cat .specflow/features/{slug}/8-skill-{skill-name}.md
```

Parse each skill output:
- Extract findings tables (CRITICAL, MAJOR, MINOR)
- Extract fix instructions
- Note source skill for each finding

### 5.2: Merge Findings by Severity

**Severity order:** CRITICAL > MAJOR > MINOR

For each finding from all skills:
1. Check for duplicates (same file:line, similar issue description)
2. Deduplicate: keep first occurrence, add "also found by: {skill2, skill3}" attribution
3. Assign consolidated ID (preserve original skill ID as reference)

**Consolidated ID format:**
- C-{NN} for CRITICAL (e.g., C-01, C-02)
- M-{NN} for MAJOR
- m-{NN} for MINOR

**Deduplication rules:**
1. **Same location**: file:line match within 3 lines = potential duplicate
2. **Similar issue**: >80% text similarity in issue description = duplicate
3. **On duplicate**: Keep higher severity, attribute all finding skills
4. **Cross-skill**: If code and security find same issue, security skill's severity wins

### 5.3: Consolidate Fix Instructions

For each unique finding:
1. Merge fix instructions from all skills that found it
2. Preserve skill-specific guidance (e.g., security lens adds security-focused fix detail)
3. Order by severity (CRITICAL fixes first)

**Fix instruction format:**
```markdown
### {ID}: {Issue Title}

**Found by:** {skill1}, {skill2}
**What's wrong:** {consolidated explanation}
**How to fix:** {merged instructions}
**Files to change:** {unique file list}
```

### 5.4: Build Consolidated Output

Create finding summary:
```markdown
## Findings Summary

| Severity | Count | Skills Contributing |
|----------|-------|---------------------|
| CRITICAL | {N}   | {skill list}        |
| MAJOR    | {N}   | {skill list}        |
| MINOR    | {N}   | {skill list}        |

Total unique findings: {N}
Duplicates merged: {N}
```
</consolidation>

### 5.5: Route Categorization

<routing>
Categorize each finding for routing to Dev or QA:

**Dev Issues (route to /sf:dev):**
- Security vulnerabilities
- Code quality issues
- Logic errors
- Performance problems
- Architecture concerns
- API design issues

**QA Issues (route to /sf:qa):**
- Test coverage gaps
- Test quality issues
- Flaky test identification
- Missing test scenarios
- Test assertion weaknesses

**Classification table:**
| Finding ID | Severity | Type | Route To | Independent? |
|------------|----------|------|----------|--------------|
| C-01 | CRITICAL | Security | Dev | Yes |
| M-01 | MAJOR | Test gap | QA | Yes |
| M-02 | MAJOR | Logic error | Dev | Yes |
| m-01 | MINOR | Naming | Dev | Yes |

**Independence check:**
- "Independent? Yes" = Can be fixed without affecting other findings
- "Independent? No" = Fix may impact other findings (e.g., refactor affects tests)

**Parallel routing decision:**
```
IF all_dev_issues_independent AND all_qa_issues_independent:
    route_parallel = true  # Dev and QA can work simultaneously
ELSE:
    route_parallel = false  # Route Dev first, then QA
    note_dependencies = [list of dependent pairs]
```

**Routing summary:**
```markdown
## Route Decision

**Dev Issues:** {count} ({list IDs})
**QA Issues:** {count} ({list IDs})
**Parallel Safe:** Yes|No
**Dependencies:** {list or "None"}
```
</routing>

**Step 6: Check Escalation and Return**

<escalation>
After consolidation, check escalation triggers before returning to PM.

### 6.1: Check CRITICAL Findings

```
IF any finding.severity == CRITICAL AND iteration >= 2:
    status = ESCALATED
    trigger = "CRITICAL finding persists after remediation"
    # Do not route to Dev/QA - go directly to PM
```

**Why iteration 2:** Give Dev one chance to fix. If CRITICAL still present after fix attempt, PM must review.

### 6.2: Check Max Iterations

```
IF iteration >= 3 AND status == findings:
    status = ESCALATED
    trigger = "Max iterations reached (3) with findings remaining"
    # Include full history in escalation
```

### 6.3: Check AC Reference

```
FOR each finding:
    IF finding.ac_reference == "AC-??" OR finding.ac_reference is null:
        flag_for_pm = true
        note = "Finding {ID} has no AC mapping - scope clarification needed"
```

If any finding lacks AC reference, include note in PM return (may be out of scope).

### 6.4: Determine Final Status

| Condition | Status | Next |
|-----------|--------|------|
| No findings | CLEAN | Return to PM, ready for merge |
| Findings exist, iteration < 3, no CRITICAL (or iteration 1) | NEEDS_FIXES | Route to Dev/QA |
| CRITICAL after iteration 2 | ESCALATED | Return to PM with escalation |
| Iteration >= 3 with findings | ESCALATED | Return to PM with escalation |

### 6.5: Write Final Output

Write to `.specflow/features/{slug}/8-review-output-v{N}.md`:

```yaml
---
agent: review
created: {iso-timestamp}
version: v{N}
status: {clean|findings|escalated}
scope_level: {from 0-scope.md}
iteration: {N}
skills_invoked: [{skill list}]
detection_log: |
  {detection results from Step 3}
route_decision:
  dev_issues: [{IDs}]
  qa_issues: [{IDs}]
  parallel_safe: {true|false}
---
```

**Body structure:**
```markdown
# {Feature Name} - Review v{N}

## Summary

{2-3 sentence summary: N findings by severity, skills that found them, overall assessment}

## Findings Summary

| Severity | Count | Skills |
|----------|-------|--------|
| CRITICAL | {N} | {list} |
| MAJOR | {N} | {list} |
| MINOR | {N} | {list} |

## Findings

### CRITICAL (blocks merge)

{Table of CRITICAL findings}

### MAJOR (should fix)

{Table of MAJOR findings}

### MINOR (nice to have)

{Table of MINOR findings}

## Fix Instructions

{Consolidated fix instructions by finding ID}

## Route Decision

{Dev vs QA routing table and parallel decision}

## Verification

{Checklist for verifying fixes}
```

### 6.6: Return to PM

**If CLEAN:**
```markdown
**Review Complete**

Feature: {slug}
Status: CLEAN
Iteration: {N}
Skills: {list}

No findings. Ready for merge.

next-agent: pm
```

**If NEEDS_FIXES:**
```markdown
**Review Complete**

Feature: {slug}
Status: NEEDS_FIXES
Iteration: {N}
Skills: {list}

Findings: {N} CRITICAL, {N} MAJOR, {N} MINOR
Output: 8-review-output-v{N}.md

Route Decision:
- Dev: {count} issues ({IDs})
- QA: {count} issues ({IDs})
- Parallel: {Yes|No}

next-agent: pm
```

**If ESCALATED:**
```markdown
**ESCALATE TO PM**

Feature: {slug}
Review Iteration: {N}
Trigger: {escalation trigger from 6.1-6.3}

## Issue Summary

{2-3 sentence summary of what happened and why escalation is needed}

## Review Recommendation

{What Review thinks should happen}

## Supporting Evidence

### Findings History

| Version | Findings | Status |
|---------|----------|--------|
| v1 | {list} | {Fixed/Partial/Unresolved} |
| v{N} | {list} | Current |

### Relevant Files

- `8-review-output-v1.md`: Initial review
- `8-review-output-v{N}.md`: Current state

## Decision Needed

{Specific question for PM}

Options:
1. Override and approve (accept remaining findings)
2. Route back for targeted fixes with guidance
3. Escalate to user for decision

next-agent: pm
```
</escalation>

**Step 7: Route Fixes** (only if status == NEEDS_FIXES)

<fix_routing>
After consolidation and before returning to PM, route fixes to Dev/QA.

### 7.1: Read Route Decision

From 8-review-output-v{N}.md frontmatter:
- dev_issues: [{IDs}]
- qa_issues: [{IDs}]
- parallel_safe: {true|false}

### 7.2: Build Fix Context

For Dev issues, create fix context:
```markdown
**Fix Request from Review**

Feature: {feature-slug}
Iteration: {N}
Review Output: `.specflow/features/{slug}/8-review-output-v{N}.md`
Priority: CRITICAL first, then MAJOR

## Findings to Address

| ID | Severity | Brief Description |
|----|----------|-------------------|
{For each dev_issue:}
| {ID} | {severity} | {one-line summary} |

## Instructions

1. Read full finding details in `8-review-output-v{N}.md`
2. Apply fixes following the Fix Instructions section
3. Write versioned output (`6-dev-output-v{N+1}.md`)
4. Confirm fixes complete

## Scope

This fix request is LIMITED to the findings listed above. Do not:
- Refactor unrelated code
- Add features not in the original spec
- Change architecture without escalation
```

For QA issues, create matching fix context (7-qa-output-v{N+1}.md).

### 7.3: Route Based on Independence

**Case 1: No findings** (should not reach Step 7)
```
IF dev_issues.length == 0 AND qa_issues.length == 0:
    # Should have been caught in Step 6 as CLEAN
    status = CLEAN
    return to PM
```

**Case 2: Dev only**
```
IF qa_issues.length == 0 AND dev_issues.length > 0:
    Spawn single Task: /sf:dev with fix context
    Wait for completion
    Proceed to re-review (Step 3 with --verify-fixes)
```

**Case 3: QA only**
```
IF dev_issues.length == 0 AND qa_issues.length > 0:
    Spawn single Task: /sf:qa with fix context
    Wait for completion
    Proceed to re-review (Step 3 with --verify-fixes)
```

**Case 4: Both - Parallel** (parallel_safe == true)
```
IF parallel_safe == true:
    Spawn Task: /sf:dev with dev fix context
    Spawn Task: /sf:qa with qa fix context
    # Both run simultaneously
    Wait for both to complete
    Proceed to re-review
```

**Case 5: Both - Sequential** (parallel_safe == false)
```
IF parallel_safe == false:
    # Default: Dev first (code fixes may affect tests)
    Spawn Task: /sf:dev with fix context
    Wait for completion
    Spawn Task: /sf:qa with fix context
    Wait for completion
    Proceed to re-review
```

### 7.4: After Fixes Complete

After Dev/QA complete their fixes:
1. Read versioned outputs (6-dev-output-v{N+1}.md, 7-qa-output-v{N+1}.md)
2. Increment iteration counter
3. Loop back to Step 3 (detection) with --verify-fixes mode
4. Repeat until CLEAN or max iterations (Step 6 handles escalation)

</fix_routing>

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
