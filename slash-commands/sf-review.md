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

Important: When --skills is provided, do NOT spawn skill-detector. The detection is completely bypassed.

**Common security targeting:**
- `--skills app-security` - OWASP vulnerabilities in auth, API, secrets
- `--skills database-security` - SQL injection, ORM safety, credentials
- `--skills app-security,database-security` - Full security suite

Note: Security skills have `security-capable: true` capability. PM can discover them via skill-detector with `capability_filter: security-capable`.

**Step 3: Detect Relevant Skills** (only if --skills not provided)

<detection>
Spawn skill-detector agent with context:

```markdown
Task: skill-detector

<detection_context>
## Input

capability_filter: review-capable
scope: {scope_level from 0-scope.md}
pillars: {pillars.required from 0-scope.md, as list}
changed_files:
{For each file in 6-dev-output.md Files Modified table:}
  - {file_path}
</detection_context>
```

### Parse Detection Results

Skill-detector returns markdown tables. Parse the results:

**Parsing algorithm:**
1. Find "### Matched Skills" section in output
2. Locate the table after that header (starts with | Skill |)
3. Skip the header row and separator row (| --- |)
4. For each data row:
   - Split on | character
   - Extract columns: skill name (col 1), source (col 2), reason (col 3), detail (col 4)
   - Trim whitespace from each value
   - Add to matched[] array as {name, source, reason, detail}

5. Find "### Skipped Skills" section
6. Parse table rows same way (for transparency logging)

**Example parsing:**
Input row: `| integration-review | skill | file_pattern | src/api/users.ts matched **/*.ts |`
Output: {name: "integration-review", source: "skill", reason: "file_pattern", detail: "src/api/users.ts matched **/*.ts"}

If matched is empty (table shows "(0)"):
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

Skill-detector returns `source` for each matched skill. Use this to load methodology:

**External skills (source: "skill"):**
- Load from `.specflow/skills/{skill.name}/SKILL.md`
- Read SKILL.md content and pass as methodology context
- Example: code-review-excellence, integration-review, sql-optimization-patterns

**Internal expertise (source: "internal"):**
- These are pillar-bound skills without SKILL.md
- Load from expertise library using reference pattern
- For security: load `.specflow-lib/expertise/security/stride-framework.md`
- For architecture: load `.specflow-lib/expertise/architecture/adr-template.md`

**Loading steps:**
1. For each matched skill from skill-detector:
2. Check skill.source
3. If "skill": Read `.specflow/skills/{skill.name}/SKILL.md`
4. If "internal": Use expertise library pattern for the pillar
5. Pass loaded methodology to skill Task context

### Build Per-Skill Context

For each skill in matched[]:
1. Get relevant files from skill-detector's detail field:
   - If reason is "file_pattern": Extract file from detail (e.g., "src/auth/login.ts matched *.ts")
   - If reason is "pillar_binding" or "scope_minimum": Use all changed_files
   - If reason is "code_pattern": Extract file from detail
2. Read file contents for those files only
3. Extract AC section from 1-spec.md
4. Load methodology based on skill.source (see above)
5. Load output format from .specflow-lib/expertise/review/output-format.md

### File Filtering for Skills

Not all files go to all skills. Filter based on skill-detector's reason and detail.

**Skill-detector provides:**
- skill.name: Which skill
- skill.source: "skill" or "internal"
- skill.reason: Why matched (pillar_binding, scope_minimum, file_pattern, code_pattern)
- skill.detail: Match specifics (e.g., which file matched which pattern)

**Filter logic by reason:**
1. **pillar_binding**: Skill applies to all changed files (holistic review)
2. **scope_minimum**: Skill applies to all changed files (scope-triggered)
3. **file_pattern**: Skill applies to files listed in detail (e.g., "src/api.ts matched *.ts")
4. **code_pattern**: Skill applies to files listed in detail (content matched)

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
5. Load output format from .specflow-lib/expertise/review/output-format.md

### Spawn Task for Each Skill

```markdown
Task: {skill.name} Review

<skill_context>
## Skill Methodology

{For external skills:}
{Content of .specflow/skills/{skill.name}/SKILL.md}

{For internal expertise:}
{Content of relevant .specflow-lib/expertise/{skill.name}/ files}

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

### Step 4.5: Test Skills Special Handling

When `test-execution` or `uat-execution` skills are matched, apply special handling.

<test_skill_handling>

**Test Skills Requirements:**

| Skill | When Matched | Required Inputs | Special Context |
|-------|--------------|-----------------|-----------------|
| test-execution | All scopes (scope-minimum: trivial) | 6-dev-output.md (changed files) | Scope level for coverage threshold |
| uat-execution | Small+ scopes (scope-minimum: small) | 5-test-plan.md (Gherkin scenarios), 6-dev-output.md | Mode detection (browser/api) |

**Building Test Skill Context:**

For test-execution:
1. Extract changed files from 6-dev-output.md "Files Modified" table
2. Pass scope level for coverage threshold lookup
3. No additional AC mapping needed (tests verify AC indirectly)

For uat-execution:
1. Read 5-test-plan.md for Gherkin scenarios
2. Analyze changed files for mode detection (browser vs API)
3. Include prerequisite check (server running, tools available)

**Test skill spawn context:**

```markdown
Task: test-execution

<test_context>
## Scope
scope_level: {scope from 0-scope.md}

## Changed Files
{From 6-dev-output.md Files Modified table}
- src/auth.ts
- src/session.ts

## Instructions
1. Detect test framework (vitest/jest/pytest/go)
2. Run tests related to changed files
3. Check coverage against scope threshold
4. Report findings in standard format
</test_context>
```

```markdown
Task: uat-execution

<uat_context>
## Scope
scope_level: {scope from 0-scope.md}

## Changed Files
{From 6-dev-output.md}
- src/pages/login.tsx
- src/api/auth.ts

## Test Plan Gherkin
{Extract from 5-test-plan.md}

## Mode Detection
{Analyze files + Gherkin patterns}
browser_indicators: {count}
api_indicators: {count}
mode: browser | api | mixed

## Instructions
1. Check prerequisites (server, tools)
2. Execute Gherkin scenarios
3. Capture evidence
4. Report findings with severity
</uat_context>
```

</test_skill_handling>

### Re-Review Mode (iteration > 1 OR --verify-fixes)

When in re-review mode, the review is FOCUSED verification only.

<verify_fixes_mode>
**Trigger:** iteration > 1 OR --verify-fixes flag

**Purpose:** Verify that specific previous findings are resolved. NOT a new full review.

### VERIFY_ONLY Mode (Pure Verification)

When re-reviewing after fixes:

**VERIFY_ONLY mode - Review MUST NOT:**
- Modify any code files
- Modify any test files
- Make "helpful" fixes
- Expand scope beyond original findings

**VERIFY_ONLY mode - Review MUST:**
- Read original findings from prior review version
- Check if each finding was addressed
- Report status per finding (FIXED | NOT_FIXED | PARTIALLY_FIXED)
- If NOT_FIXED, route back to Dev/QA with specific guidance

**If Review discovers new issues during verification:**
- Do NOT fix them
- Do NOT add to current iteration
- Note in output: "NEW_ISSUE_DISCOVERED: {description}"
- PM decides whether to create new review iteration or defer

This prevents Review from doing Dev's job and maintains separation of concerns.

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

**Integration Review Issues (from integration-review skill):**
- ALWAYS route to Dev (never QA)
- Interface changes affecting callers
- Circular import risks
- Breaking export changes

Integration issues are code structure issues, not test issues. Even test-related callers route to Dev because the fix is in the source code, not the tests.

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

### 5.5b: Test Skill Finding Integration

<test_skill_findings>
When consolidating findings from test-execution and uat-execution skills, apply special severity mapping.

**Test Execution Severity Mapping:**

| Finding Type | Severity | Rationale |
|--------------|----------|-----------|
| Test failure | CRITICAL | Code does not pass tests - blocks merge |
| Coverage below threshold | MAJOR | New code lacks test coverage |
| Flaky test (passes on retry) | MINOR | Test stability concern |
| Framework detection failure | MAJOR | Cannot run tests at all |

**UAT Execution Severity Mapping:**

| Finding Type | Severity | Rationale |
|--------------|----------|-----------|
| Happy path scenario fails | CRITICAL | Core user journey broken |
| Error path scenario fails | MAJOR | Error handling incomplete |
| Scenario execution blocked | MAJOR | Cannot verify acceptance |
| Flaky scenario | MINOR | Test environment instability |

**ID Format:**
- T-{NN} for test-execution findings (e.g., T-01, T-02)
- UAT-{NN} for uat-execution findings (e.g., UAT-01, UAT-02)

**Test Finding Routing:**

All test-execution and uat-execution findings route to **Dev** (never QA):

- **Test failures** = code issue (Dev must make tests pass)
- **Coverage gaps** = missing unit tests (Dev writes them)
- **UAT failures** = application logic issue (Dev fixes)
- **Flaky tests** = code or test instability (Dev investigates)

**Rationale:** Even if QA wrote the failing tests (TDD mode), Dev is responsible for making them pass. Tests are the spec; code must conform.

**Consolidation with other skills:**

When test findings overlap with code review findings:
1. Test failure takes precedence (concrete evidence)
2. Code review finding becomes "supporting context"
3. Merge fix instructions (test provides verification, code review provides fix approach)

Example:
```markdown
### C-01: Authentication returns wrong status code

**Found by:** test-execution, code-review-excellence
**Test Evidence:** T-01 - `should return 401 for invalid credentials` FAIL
**Code Analysis:** Login function returns 500 instead of 401
**How to fix:** Update error handling in src/auth/login.ts to return proper status
**Verification:** Run test `npm test -- src/auth/login.test.ts`
```

</test_skill_findings>

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

### 6.1b: Check BREAKING Status from Integration Review

```
IF any finding from integration-review has status == BREAKING:
    status = NEEDS_USER_DECISION
    trigger = "BREAKING change detected - callers will fail"
    # Present to user with options:
    # 1. Approve with migration plan
    # 2. Request Dev to add backward compatibility
    # 3. Abort merge
```

BREAKING changes from integration-review are like CRITICAL security issues - they cannot be auto-fixed without user input because they affect external callers.

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

**If NEEDS_USER_DECISION (BREAKING detected):**
```markdown
**BREAKING CHANGE DETECTED**

Feature: {slug}
Review Iteration: {N}
Source: integration-review skill

## Breaking Changes Found

{Table of BREAKING changes with callers affected}

## Impact Assessment

- Files affected: {N}
- Callers that will break: {list}
- Migration effort: {estimate}

## Decision Needed

1. **Approve with migration plan** - Merge now, update callers in follow-up PR
2. **Request backward compatibility** - Dev adds optional params/deprecation
3. **Abort merge** - Rework to avoid breaking change

Select option (1, 2, or 3):

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

### 7.3b: Test Skill Re-Run in Verify Fixes Mode

<test_skill_rerun>
When re-running test-execution or uat-execution skills in verify-fixes mode, apply targeted verification.

**Test-execution Verify Fixes:**

```markdown
Task: test-execution - Verify Fixes

<verification_context>
## Mode: VERIFY_FIXES

## Previous Test Findings
| ID | Severity | Original Issue |
|----|----------|----------------|
| T-01 | CRITICAL | Test 'should logout' failed |
| T-02 | MAJOR | Coverage 58% below 70% threshold |

## Verification Steps
1. Run ONLY the affected tests (from previous T-* findings)
2. Check if each previously failing test now passes
3. Re-check coverage on changed files
4. Report status for each finding

## Output Format
| ID | Status | Notes |
|----|--------|-------|
| T-01 | FIXED | Test now passes |
| T-02 | FIXED | Coverage 72% meets threshold |

OR

| ID | Status | Notes |
|----|--------|-------|
| T-01 | UNRESOLVED | Test still fails: expected 200, got 401 |
| T-02 | PARTIAL | Coverage 65%, improved but still below 70% |
</verification_context>
```

**UAT-execution Verify Fixes:**

```markdown
Task: uat-execution - Verify Fixes

<verification_context>
## Mode: VERIFY_FIXES

## Previous UAT Findings
| ID | Severity | Scenario | Issue |
|----|----------|----------|-------|
| UAT-01 | CRITICAL | User logs in successfully | Wrong redirect |
| UAT-03 | MAJOR | Invalid password rejected | No error message |

## Verification Steps
1. Re-run ONLY the previously failing scenarios
2. Do NOT run passing scenarios (avoid flaky noise)
3. Capture fresh evidence for comparison
4. Report status for each finding

## Output Format
| ID | Status | Notes | Evidence |
|----|--------|-------|----------|
| UAT-01 | FIXED | Correct redirect to /dashboard | evidence/v2/login-01.png |
| UAT-03 | FIXED | Error message "Invalid credentials" shown | evidence/v2/login-02.png |
</verification_context>
```

**New Findings During Re-Run:**

Test skills in verify-fixes mode may discover NEW failures that were not in the original findings. This happens when:
- Dev's fix broke something else (regression)
- New test coverage reveals new bug
- Previously passing scenario now fails

Handle as:
```
IF test skill reports NEW_CRITICAL_DISCOVERED:
    Add to findings as NEW_CRITICAL
    Status = NEEDS_FIXES (not ESCALATED on first occurrence)
    Note: "Regression discovered during verification"
```

**Re-Run Scope Control:**

Test skills in verify-fixes mode ONLY verify previous findings. They do not:
- Run full test suite (only affected tests)
- Run all Gherkin scenarios (only failed ones)
- Check coverage on unrelated files
- Look for new issues (except obvious regressions)

This keeps re-review fast and focused.

</test_skill_rerun>

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
- `.specflow-lib/expertise/review/index.md` - Dynamic architecture overview
- `.specflow-lib/expertise/review/output-format.md` - Output structure
- `.specflow-lib/expertise/review/escalation-rules.md` - When to escalate
- `.specflow-lib/expertise/review/feedback-loop.md` - Fix routing protocol
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

## Complete Review Flow

The full review cycle with fix loop:

```
Initial Review (iteration 1):
  Step 1: Load Context
  Step 2: Check Manual Override
  Step 3: Detect Relevant Skills
  Step 4: Spawn Skills in Parallel
  Step 5: Consolidate Findings
  Step 5.5: Route Categorization
  Step 6: Check Escalation
    IF CLEAN: Return to PM
    IF ESCALATED: Return to PM with escalation
    IF NEEDS_FIXES: Continue to Step 7

Fix Loop (iterations 2-3):
  Step 7: Route Fixes
    IF parallel_safe: Spawn Dev + QA in parallel
    ELSE: Spawn Dev, then QA sequentially
    Wait for fixes complete

  Re-Review (iteration N+1):
  Step 3: VERIFY_FIXES mode (only skills with findings)
  Step 4: Spawn verification Tasks
  Step 5: Consolidate verification results
  Step 6: Check Escalation
    IF CLEAN: Return to PM
    IF ESCALATED (CRITICAL persists OR max iterations): Return to PM
    IF NEEDS_FIXES AND iteration < 3: Loop back to Step 7
```

### Iteration Limits

| Iteration | What Happens |
|-----------|--------------|
| 1 | Full review, findings written to v1 |
| 2 | Focused re-review after fixes, v2 |
| 3 | Final re-review, v3 OR escalate |

After iteration 3 with findings: ESCALATE to PM (max iterations reached).

### Status Meanings

| Status | Definition | Next Action |
|--------|------------|-------------|
| CLEAN | No findings OR all previous findings FIXED | Return to PM, ready for merge |
| NEEDS_FIXES | Has findings, iteration < 3 | Route to Step 7 (fix loop) |
| ESCALATED | CRITICAL after iteration 2 OR iteration >= 3 with findings | Return to PM for decision |
| NEEDS_USER_DECISION | BREAKING detected from integration-review | Return to PM with options |

### Output Versioning (REV-05)

Review writes versioned outputs to track iteration history:
- `8-review-output-v1.md` - Initial review findings
- `8-review-output-v2.md` - After first fix iteration
- `8-review-output-v3.md` - After second fix iteration (or escalate)

Each version includes:
- status in frontmatter (clean | findings | escalated)
- iteration number
- skills_invoked list
- Finding history reference

## Integration with Drift Detection (Phase 23)

<drift_integration>

Review and PM have distinct checkpoint responsibilities. Understanding the boundary prevents confusion about who owns what.

### Review Checkpoint Owns

Review owns the fix loop and these concerns:

| Concern | Owner | Why |
|---------|-------|-----|
| Test pass/fail | Review | Automated verification, objective result |
| UAT pass/fail | Review | Automated verification, Gherkin scenarios |
| Code quality findings | Review | Skills evaluate, fix loop resolves |
| Integration issues | Review | Breaking changes are code issues |
| Coverage thresholds | Review | Measurable, enforceable |

**Test Failures are NOT Drift**

A failing test is not "drift from spec" - it's a code bug. Review handles it through the fix loop:

```
Test fails -> CRITICAL finding -> Route to Dev -> Dev fixes -> Re-verify
```

No PM involvement unless:
- CRITICAL persists after 2 iterations
- Max iterations (3) reached
- BREAKING change requires user decision

### PM Checkpoint Owns (Phase 23)

PM checkpoints verify spec alignment, not code correctness:

| Concern | Owner | Why |
|---------|-------|-----|
| TEA test plan alignment | PM | Does plan match 1-spec.md? |
| QA test coverage | PM | Do tests cover all AC? |
| Dev implementation scope | PM | Did Dev implement the right thing? |
| Requirement completeness | PM | Are all AC addressed? |

**Drift = Spec Mismatch**

PM drift detection catches:
- Dev implemented feature X but spec says Y
- Tests verify wrong behavior
- AC coverage gaps (missing scenarios)

### Flow Diagram

```
                    Feature Implementation
                            |
                            v
                    +-------+--------+
                    |   PM routes    |
                    |   to agents    |
                    +-------+--------+
                            |
        +-------------------+-------------------+
        |                   |                   |
        v                   v                   v
    +-------+          +--------+          +-------+
    |  TEA  |          |   QA   |          |  Dev  |
    +-------+          +--------+          +-------+
        |                   |                   |
        v                   v                   v
    +-------+          +--------+          +-------+
    | PM    |          | PM     |          | PM    |
    | check |          | check  |          | check |
    +-------+          +--------+          +-------+
        |                   |                   |
        +-------------------+-------------------+
                            |
                            v
                    +-------+--------+
                    |    Review      |<----+
                    | (code quality) |     |
                    +-------+--------+     |
                            |              |
                    +-------+--------+     |
                    | Test/UAT pass? |     |
                    +-------+--------+     |
                            |              |
              Yes +---------+---------+ No |
                  |                   |    |
                  v                   v    |
            +---------+         +--------+ |
            | CLEAN   |         | Fix    | |
            | to PM   |         | Loop   +-+
            +---------+         +--------+
```

### When Review Escalates to PM

Review only escalates to PM when automated fix loop is exhausted:

| Trigger | Escalation Reason | PM Action |
|---------|-------------------|-----------|
| CRITICAL persists (iter >= 2) | Dev couldn't fix after 1 attempt | Override, re-route, or escalate to user |
| Max iterations (3) | Fix loop exhausted | Override, re-route, or escalate to user |
| BREAKING detected | Requires user decision | Present options to user |
| NEW_CRITICAL_DISCOVERED | Regression, needs visibility | Add to fix loop or escalate |

### Drift vs Test Failure Classification

Apply file-based heuristics (same as PM classification):

| Signal | Classification | Confidence |
|--------|----------------|------------|
| Test file unchanged since QA wrote it AND test fails | CODE_ISSUE | HIGH |
| Test assertion value differs from AC specification | TEST_DRIFT | HIGH |
| Dev output claims AC implemented but test fails on that AC | CODE_ISSUE | HIGH |
| Test expects different endpoint/status than AC specifies | TEST_DRIFT | HIGH |
| Test checks wrong behavior (action mismatch) | TEST_DRIFT | HIGH |
| Implementation returns unexpected status code | CODE_ISSUE | MEDIUM |
| Implementation does wrong action entirely | DRIFT | MEDIUM |
| None of the above | NEEDS_MANUAL_CLASSIFICATION | LOW |

**Heuristic Application:**

When test failure occurs during review:
1. Apply heuristics in order
2. First HIGH confidence match determines classification
3. If MEDIUM matches only, include evidence in routing
4. If no match, escalate to PM with both options

**Routing Based on Classification:**

| Classification | Route To | Action |
|----------------|----------|--------|
| CODE_ISSUE | Dev | Fix implementation to pass test |
| TEST_DRIFT | QA | Fix test to match AC |
| DRIFT | PM | Re-evaluate requirements |
| NEEDS_MANUAL | PM | Present evidence, request decision |

**Example Situations:**

| Situation | Type | Owner | Resolution |
|-----------|------|-------|------------|
| "Dev built logout but spec says password reset" | Drift | PM | Re-route to Dev with clarification |
| "Logout test fails: expected 200, got 401" | Bug | Review | Fix loop to Dev |
| "QA tests don't cover AC-03" | Drift | PM | Route to QA for test addition |
| "Coverage 58% below 70% threshold" | Finding | Review | Fix loop to Dev |
| "UAT scenario: user sees error message" | Bug | Review | Fix loop to Dev |
| "TEA plan missing security testing" | Drift | PM | Route to TEA |

### Key Principle

**Review is autonomous for code correctness.**

PM only gets involved for:
- Spec alignment questions (drift)
- Fix loop exhaustion (escalation)
- User decisions (breaking changes)

This keeps the fix loop fast (no PM round-trip) while preserving PM oversight for scope and requirement questions.

</drift_integration>

## Related

- `/sf:pm` - PM orchestrator (routes review outputs)
- `/sf:dev` - Development (receives fix requests)
- `/sf:qa` - Quality assurance (receives test fix requests)
- `.specflow-lib/expertise/review/` - Review expertise folder
