# UAT Runbook: Small Scope Workflow

**Scope:** small
**Phases covered:** triage → scope → analyst → codebase-analysis → architect → tea → synthesis → dev-story → qa-verify → review → complete
**Estimated time:** 10-15 minutes

## Prerequisites

1. Initialize a fresh test project:
   ```bash
   mkdir /tmp/specflow-uat-small && cd /tmp/specflow-uat-small
   git init && npm init -y
   npx specflow init --force
   ```

2. Create a minimal source file so codebase intelligence has something to scan:
   ```bash
   mkdir src
   cat > src/index.ts << 'EOF'
   export function greet(name: string): string {
     return `Hello, ${name}!`;
   }
   EOF
   ```

3. Verify initialization:
   ```bash
   ls .specflow/          # STATE.md, config.json
   ls .specflow-lib/      # personas/, expertise/, methodology/
   ls .claude/commands/    # sf-*.md files
   ```

4. Verify MCP server is available:
   ```
   Ask: "What specflow tools are available?"
   Expected: specflow_context, specflow_state, specflow_validate, specflow_codebase, specflow_impact
   ```

## Steps

### Step 1: Start PM with Small Feature

Invoke:
```
/sf:pm "Add a logout button to the user profile page"
```

**What to observe:**
- PM calls `specflow_state` with action `start`
- PM calls `specflow_context("triage")` and produces `0-triage.md`
- PM assesses scope as `small`

**Metrics to record:**
- [ ] Note `specflow_context("triage")` response time
- [ ] Note total context size from triage phase

### Step 2: Verify Scope Assessment

```bash
cat .specflow/features/*/workflow-state.json | python3 -m json.tool
```

**Expected:**
- `scope`: `"small"`
- `pillars`: `["testing"]` (only testing pillar for small scope)
- `completed_phases`: includes `"triage"`, `"scope"`

### Step 3: Verify Analyst Phase

PM should route to analyst (Mary). Check:
- PM calls `specflow_context("analyst")`
- Analyst writes `1-spec.md`

```bash
cat .specflow/features/*/1-spec.md
```

**Expected content:**
- Requirements with BOSS format (Binary, Observable, Specific, Scope-bound)
- 3-5 acceptance criteria (light spec depth for small scope)
- FR-IDs (e.g., FR-01, FR-02)

**Metrics to record:**
- [ ] Note analyst context size (contextSizes.total)
- [ ] Note persona size (should be analyst.md content)
- [ ] Note expertise size (should include requirements/ content)

### Step 4: Verify Codebase Analysis

PM routes to codebase-analysis phase. Check:
- PM calls `specflow_context("codebase-analysis")`
- PM calls `specflow_codebase` with action `scan`
- Analyst writes `1.5-codebase-constraints.md`

```bash
cat .specflow/features/*/1.5-codebase-constraints.md
```

**Expected content:**
- Tech stack identified (TypeScript, Node.js)
- Existing patterns documented
- Integration points identified

### Step 5: Verify Architect Phase

PM routes to architect (Winston). Check:
- PM calls `specflow_context("architect")`
- Context includes `1-spec.md` and `1.5-codebase-constraints.md` as input artifacts
- Architect writes `2-architecture.md`

```bash
cat .specflow/features/*/2-architecture.md
```

**Expected content:**
- Light architecture (small scope — no deep design needed)
- References codebase constraints from `1.5-codebase-constraints.md`

**Metrics to record:**
- [ ] Note architect context size
- [ ] Note artifact sizes (input artifacts from previous phases)

### Step 6: Verify Pillar Skipping

For small scope, security and cost pillars should be skipped:
- [ ] No `3-security.md` created
- [ ] No `4-cost.md` created
- [ ] No `1.6-ux-design.md` created

### Step 7: Verify TEA Phase

PM routes to test engineering (TEA). Check:
- PM calls `specflow_context("tea")`
- TEA writes `5-test-plan.md`

```bash
cat .specflow/features/*/5-test-plan.md
```

**Expected content:**
- 2-3 test scenarios (small scope depth)
- References requirements from `1-spec.md`

### Step 8: Verify Synthesis Phase

PM synthesizes requirements lock:
- PM calls `specflow_context("synthesis")`
- PM writes `5-requirements-lock.md`

```bash
cat .specflow/features/*/5-requirements-lock.md
```

**Expected content:**
- FR (Functional Requirements) with IDs
- TC (Test Criteria) traced to FRs
- SC (Success Criteria)
- AC (Acceptance Criteria)

**Metrics to record:**
- [ ] Note total requirement count (validation.requirementsTotal)

### Step 9: Verify Dev Phase

PM routes to dev (Amelia):
- PM calls `specflow_context("dev-story")`
- Dev writes `6-dev-output.md`

```bash
cat .specflow/features/*/6-dev-output.md
```

**Expected content:**
- Implementation references FR-IDs from `5-requirements-lock.md`
- Code changes described

### Step 10: Verify QA and Review

PM runs QA verification and review:
- QA writes `7-qa-output.md`
- Review writes `8-review-output.md`

### Step 11: Verify Sprint Status (if applicable)

If the workflow generated stories:
```bash
cat .specflow/features/*/sprint-status.yaml 2>/dev/null
```

**Expected (if present):**
- Stories listed with status
- No circular dependencies

### Step 12: Verify Workflow Completion

```bash
cat .specflow/features/*/workflow-state.json | python3 -m json.tool
```

**Expected:**
- `scope`: `"small"`
- `pillars`: `["testing"]`
- `completed_phases`: includes all executed phases
- `last_completed_at`: recent timestamp

## Verification Checklist

### State Verification
- [ ] `workflow-state.json` exists in feature directory
- [ ] `scope` field equals `"small"`
- [ ] `pillars` includes `"testing"`
- [ ] `pillars` does NOT include `"security"` or `"cost"`
- [ ] `completed_phases` includes `"triage"`, `"scope"`, `"analyst"`
- [ ] `completed_phases` includes `"tea"` and `"synthesis"`
- [ ] `created_at` and `updated_at` are valid ISO timestamps

### Artifact Verification
- [ ] `0-triage.md` exists with >50 non-whitespace chars
- [ ] `0-scope.md` exists and indicates small scope
- [ ] `1-spec.md` exists with FR-IDs (e.g., FR-01)
- [ ] `1.5-codebase-constraints.md` exists with tech stack info
- [ ] `2-architecture.md` exists (light depth)
- [ ] `5-test-plan.md` exists with 2-3 test scenarios
- [ ] `5-requirements-lock.md` exists with FR/TC/SC/AC sections
- [ ] `6-dev-output.md` exists referencing FR-IDs
- [ ] No `3-security.md` (security skipped)
- [ ] No `4-cost.md` (cost skipped)
- [ ] No `1.6-ux-design.md` (UX skipped)

### MCP Tool Verification
- [ ] `specflow_context` called for each active phase
- [ ] `specflow_state("update")` set scope to `"small"` and pillars to `["testing"]`
- [ ] `specflow_validate` called after dev output (if checkpoint active)
- [ ] `specflow_codebase("scan")` called during codebase-analysis phase

### Content Quality
- [ ] `1-spec.md` uses BOSS format for acceptance criteria
- [ ] `5-requirements-lock.md` has traceable FR → TC → AC links
- [ ] `6-dev-output.md` references IDs from `5-requirements-lock.md`

## Metrics Recording Template

```json
{
  "runbook": "small-scope",
  "date": "YYYY-MM-DD",
  "tester": "<name>",
  "phases": {
    "triage": {
      "timing": { "contextAssemblyMs": 0 },
      "contextSizes": { "persona": 0, "expertise": 0, "methodology": 0, "artifacts": 0, "skills": 0, "codebase": 0, "total": 0 }
    },
    "analyst": {
      "timing": { "contextAssemblyMs": 0 },
      "contextSizes": { "persona": 0, "expertise": 0, "methodology": 0, "artifacts": 0, "skills": 0, "codebase": 0, "total": 0 }
    },
    "codebase-analysis": {
      "timing": { "contextAssemblyMs": 0 },
      "contextSizes": { "persona": 0, "expertise": 0, "methodology": 0, "artifacts": 0, "skills": 0, "codebase": 0, "total": 0 }
    },
    "architect": {
      "timing": { "contextAssemblyMs": 0 },
      "contextSizes": { "persona": 0, "expertise": 0, "methodology": 0, "artifacts": 0, "skills": 0, "codebase": 0, "total": 0 }
    },
    "tea": {
      "timing": { "contextAssemblyMs": 0 },
      "contextSizes": { "persona": 0, "expertise": 0, "methodology": 0, "artifacts": 0, "skills": 0, "codebase": 0, "total": 0 }
    },
    "synthesis": {
      "timing": { "contextAssemblyMs": 0 },
      "contextSizes": { "persona": 0, "expertise": 0, "methodology": 0, "artifacts": 0, "skills": 0, "codebase": 0, "total": 0 }
    },
    "dev-story": {
      "timing": { "contextAssemblyMs": 0 },
      "contextSizes": { "persona": 0, "expertise": 0, "methodology": 0, "artifacts": 0, "skills": 0, "codebase": 0, "total": 0 }
    }
  },
  "workflow": {
    "totalWorkflowMs": 0,
    "completedPhases": [],
    "scope": "small",
    "pillars": ["testing"]
  },
  "validation": {
    "requirementsCovered": 0,
    "requirementsTotal": 0,
    "coverageRate": 0,
    "artifactsCreated": [],
    "artifactsSkipped": ["3-security.md", "4-cost.md", "1.6-ux-design.md"]
  },
  "pass": false,
  "notes": ""
}
```

Save to: `test-results/uat-small-<date>.json`
