# UAT Runbook: Trivial Scope Workflow

**Scope:** trivial
**Phases covered:** triage → scope → dev-story → complete
**Estimated time:** 5-10 minutes

## Prerequisites

1. Initialize a fresh test project:
   ```bash
   mkdir /tmp/specflow-uat-trivial && cd /tmp/specflow-uat-trivial
   git init && npm init -y
   npx specflow init --force
   ```

2. Verify initialization:
   ```bash
   ls .specflow/          # STATE.md, config.json
   ls .specflow-lib/      # personas/, expertise/, methodology/
   ls .claude/commands/    # sf-*.md files
   ```

3. Verify MCP server is available:
   ```
   Ask: "What specflow tools are available?"
   Expected: specflow_context, specflow_state, specflow_validate, specflow_codebase, specflow_impact
   ```

## Steps

### Step 1: Start PM with Trivial Feature

Invoke:
```
/sf:pm "Fix typo in README.md — change 'recieve' to 'receive'"
```

**What to observe:**
- PM calls `specflow_state` with action `start` and the feature description
- PM calls `specflow_context` with phase `triage`
- PM produces triage output

**Metrics to record:**
- [ ] Note `specflow_context("triage")` response time (contextAssemblyMs)
- [ ] Note persona char count from response (contextSizes.persona)
- [ ] Note total context size (contextSizes.total)

### Step 2: Verify Triage Output

Check that PM writes `0-triage.md` to `.specflow/features/{slug}/`.

```bash
ls .specflow/features/*/0-triage.md
cat .specflow/features/*/0-triage.md
```

**Expected content:**
- Feature name/description present
- Classification signals identified (single file, no logic change, < 5 lines)

### Step 3: Verify Scope Assessment

PM should automatically assess scope as `trivial`.

Check:
```bash
cat .specflow/features/*/workflow-state.json
```

**Expected state fields:**
- `phase`: progressed past `scope`
- `scope`: `"trivial"`
- `pillars`: `[]` (empty — no pillars for trivial)
- `completed_phases`: includes `"triage"` and `"scope"`

### Step 4: Verify Minimal Ceremony

For trivial scope, PM should skip:
- Analyst (no `1-spec.md`)
- Architect (no `2-architecture.md`)
- Security (no `3-security.md`)
- Cost (no `4-cost.md`)
- UX (no `1.6-ux-design.md`)
- TEA (no `5-test-plan.md`)
- Synthesis (no `5-requirements-lock.md`)

PM routes directly to dev or completes the workflow with minimal steps.

```bash
ls .specflow/features/*/
```

**Expected:** Only `0-triage.md`, `0-scope.md`, `workflow-state.json`, and possibly `6-dev-output.md` and/or `STATUS.md`.

### Step 5: Verify Workflow Completion

Check final state:
```bash
cat .specflow/features/*/workflow-state.json | python3 -m json.tool
```

**Expected:**
- `scope`: `"trivial"`
- `pillars`: `[]`
- `completed_phases`: short list (triage, scope, and any dev/review phases)
- `last_completed_at`: recent ISO timestamp

## Verification Checklist

### State Verification
- [ ] `workflow-state.json` exists in feature directory
- [ ] `scope` field equals `"trivial"`
- [ ] `pillars` field is an empty array `[]`
- [ ] `completed_phases` includes `"triage"` and `"scope"`
- [ ] `created_at` is a valid ISO timestamp
- [ ] `updated_at` is a valid ISO timestamp

### Artifact Verification
- [ ] `0-triage.md` exists and contains feature description
- [ ] `0-triage.md` has more than 50 non-whitespace characters (content quality)
- [ ] `0-scope.md` exists and indicates trivial scope
- [ ] No `1-spec.md` file exists (analyst skipped)
- [ ] No `2-architecture.md` file exists (architect skipped)
- [ ] No `3-security.md` file exists (security skipped)
- [ ] No `4-cost.md` file exists (cost skipped)
- [ ] No `5-test-plan.md` file exists (tea skipped)
- [ ] No `5-requirements-lock.md` file exists (synthesis skipped)

### MCP Tool Verification
- [ ] `specflow_context("triage")` returned persona content (non-empty string)
- [ ] `specflow_context("triage")` returned output_path pointing to `0-triage.md`
- [ ] `specflow_state` action `start` created `workflow-state.json`
- [ ] `specflow_state` action `update` set scope to `"trivial"`

### Metrics Verification
- [ ] Context assembly completed in under 5 seconds
- [ ] Total context size recorded (contextSizes.total)
- [ ] Persona content size recorded (contextSizes.persona)

## Metrics Recording Template

```json
{
  "runbook": "trivial-scope",
  "date": "YYYY-MM-DD",
  "tester": "<name>",
  "phases": {
    "triage": {
      "timing": { "contextAssemblyMs": 0 },
      "contextSizes": {
        "persona": 0,
        "expertise": 0,
        "methodology": 0,
        "artifacts": 0,
        "skills": 0,
        "codebase": 0,
        "total": 0
      }
    }
  },
  "workflow": {
    "totalWorkflowMs": 0,
    "completedPhases": [],
    "scope": "trivial",
    "pillars": []
  },
  "validation": {
    "artifactsCreated": [],
    "artifactsSkipped": ["1-spec.md", "2-architecture.md", "3-security.md", "4-cost.md", "5-test-plan.md", "5-requirements-lock.md"]
  },
  "pass": false,
  "notes": ""
}
```

Save to: `test-results/uat-trivial-<date>.json`
