# UAT Runbook: Medium Scope Workflow

**Scope:** medium
**Phases covered:** triage → scope → analyst → codebase-analysis → architect → security → tea → synthesis → dev-story → checkpoint-dev → qa-verify → checkpoint-qa → review → complete
**Estimated time:** 20-30 minutes

## Prerequisites

1. Initialize a fresh test project:
   ```bash
   mkdir /tmp/specflow-uat-medium && cd /tmp/specflow-uat-medium
   git init && npm init -y
   npx specflow init --force
   ```

2. Create source files to exercise codebase intelligence:
   ```bash
   mkdir -p src/routes src/services src/utils
   cat > src/routes/users.ts << 'EOF'
   import { UserService } from '../services/user-service';
   export function getUser(id: string) { return UserService.findById(id); }
   export function createUser(data: any) { return UserService.create(data); }
   EOF

   cat > src/services/user-service.ts << 'EOF'
   import { db } from '../utils/database';
   export class UserService {
     static findById(id: string) { return db.query('users', { id }); }
     static create(data: any) { return db.insert('users', data); }
   }
   EOF

   cat > src/utils/database.ts << 'EOF'
   export const db = {
     query: (table: string, where: any) => ({ table, where }),
     insert: (table: string, data: any) => ({ table, data }),
   };
   EOF
   ```

3. Verify initialization:
   ```bash
   ls .specflow/          # STATE.md, config.json
   ls .specflow-lib/      # personas/, expertise/, methodology/
   ls .claude/commands/    # sf-*.md files
   ```

4. Verify MCP server:
   ```
   Ask: "What specflow tools are available?"
   Expected: specflow_context, specflow_state, specflow_validate, specflow_codebase, specflow_impact
   ```

## Steps

### Step 1: Start PM with Medium Feature

Invoke:
```
/sf:pm "Add a new API endpoint for user profile updates with email validation"
```

**What to observe:**
- PM calls `specflow_state("start")` with feature description
- PM calls `specflow_context("triage")` and produces `0-triage.md`
- PM identifies scope signals: new endpoint, validation rules, 3-10 files

**Metrics to record:**
- [ ] Note `specflow_context("triage")` response time (contextAssemblyMs)
- [ ] Note total context size (contextSizes.total)

### Step 2: Verify Scope Assessment

```bash
cat .specflow/features/*/workflow-state.json | python3 -m json.tool
```

**Expected:**
- `scope`: `"medium"`
- `pillars`: includes `"security"` and `"testing"` (medium triggers both)
- `completed_phases`: includes `"triage"`, `"scope"`

### Step 3: Verify Analyst Phase (Standard Depth)

PM routes to analyst (Mary):

```bash
cat .specflow/features/*/1-spec.md
```

**Expected content for medium scope:**
- 8-12 acceptance criteria (standard depth)
- FR-IDs (FR-01 through FR-08+)
- BOSS format criteria
- Clear boundary definitions

**Metrics to record:**
- [ ] Note analyst context size (contextSizes.total)
- [ ] Note expertise size (should include requirements/ directory content)

### Step 4: Verify Codebase Analysis

PM routes to codebase-analysis:

```bash
cat .specflow/features/*/1.5-codebase-constraints.md
```

**Expected:**
- Tech stack: TypeScript, Node.js
- Existing patterns: route → service → database
- Integration points: UserService, database utility
- Symbols discovered by `specflow_codebase("scan")`

**Metrics to record:**
- [ ] Note codebase intelligence size (contextSizes.codebase)
- [ ] Verify codebase content is < 10,000 chars (truncation cap)

### Step 5: Verify Architect Phase

PM routes to architect (Winston):

```bash
cat .specflow/features/*/2-architecture.md
```

**Expected:**
- Standard architecture (not light — medium scope)
- References constraints from `1.5-codebase-constraints.md`
- API contract definition
- Data model changes

**Metrics to record:**
- [ ] Note architect context size
- [ ] Note artifact input sizes (1-spec.md + 1.5-codebase-constraints.md)

### Step 6: Verify Security Phase (Medium Pillar)

PM routes to security (Jordan). This is a key difference from small scope.

```bash
cat .specflow/features/*/3-security.md
```

**Expected for medium scope (light security):**
- STRIDE threat analysis (at least partial)
- Input validation concerns identified (email validation)
- Auth-adjacent considerations noted
- Security recommendations

**Metrics to record:**
- [ ] Note security context size
- [ ] Verify security persona loaded (security.md)

### Step 7: Verify Cost Pillar Skipping

For medium scope, cost analysis may or may not be triggered depending on signals:
```bash
ls .specflow/features/*/4-cost.md 2>/dev/null
```

**Note:** Cost is typically triggered at medium+ only if cost signals are present (new cloud resources, 3rd party services). For a simple API endpoint, cost may be skipped.

### Step 8: Verify TEA Phase

PM routes to test engineering:

```bash
cat .specflow/features/*/5-test-plan.md
```

**Expected for medium scope:**
- 6-8 test scenarios
- Covers input validation edge cases
- References FR-IDs from spec

### Step 9: Verify Synthesis (Requirements Lock)

PM synthesizes all outputs:

```bash
cat .specflow/features/*/5-requirements-lock.md
```

**Expected:**
- FR (Functional Requirements): traced from `1-spec.md`
- TC (Test Criteria): traced from `5-test-plan.md`
- SC (Success Criteria): synthesized from all inputs
- AC (Acceptance Criteria): binary, observable checks
- IP (Integration Points): from `1.5-codebase-constraints.md`

**Metrics to record:**
- [ ] Count total requirements (validation.requirementsTotal)
- [ ] Note FR-IDs present (e.g., FR-01 through FR-08)

### Step 10: Verify Dev Phase and Checkpoint

PM routes to dev (Amelia), then runs checkpoint:

```bash
cat .specflow/features/*/6-dev-output.md
```

**Expected:**
- References FR-IDs from `5-requirements-lock.md`
- Implementation traces to requirements

**Drift detection checkpoint:**
```bash
cat .specflow/features/*/drift/checkpoint-dev.md 2>/dev/null
```

**Expected:**
- If no drift: checkpoint passes, proceeds to QA
- If drift detected: PM routes to `drift-fix-dev` phase

**Metrics to record:**
- [ ] Note requirement coverage rate (validation.coverageRate)
- [ ] Record any unknown FR references found

### Step 11: Verify QA Phase and Checkpoint

PM routes to QA (Quinn), then runs checkpoint:

```bash
cat .specflow/features/*/7-qa-output.md
```

**Drift detection checkpoint:**
```bash
cat .specflow/features/*/drift/checkpoint-qa.md 2>/dev/null
```

### Step 12: Verify Review Phase

PM runs final review:

```bash
cat .specflow/features/*/8-review-output.md
```

### Step 13: Verify Workflow Completion

```bash
cat .specflow/features/*/workflow-state.json | python3 -m json.tool
```

**Expected:**
- `scope`: `"medium"`
- `pillars`: includes `"security"` and `"testing"`
- `completed_phases`: includes all executed phases (triage, scope, analyst, codebase-analysis, architect, security, tea, synthesis, dev-story, checkpoint-dev, qa-verify, checkpoint-qa, review)
- `last_completed_at`: recent timestamp

## Verification Checklist

### State Verification
- [ ] `workflow-state.json` exists
- [ ] `scope` equals `"medium"`
- [ ] `pillars` includes `"security"`
- [ ] `pillars` includes `"testing"`
- [ ] `completed_phases` includes `"analyst"`, `"architect"`, `"security"`, `"tea"`, `"synthesis"`
- [ ] `completed_phases` includes `"checkpoint-dev"` and `"checkpoint-qa"`

### Artifact Verification
- [ ] `0-triage.md` exists with >50 non-whitespace chars
- [ ] `0-scope.md` exists indicating medium scope
- [ ] `1-spec.md` exists with 8-12 acceptance criteria and FR-IDs
- [ ] `1.5-codebase-constraints.md` exists with tech stack info
- [ ] `2-architecture.md` exists with API contract
- [ ] `3-security.md` exists with STRIDE analysis
- [ ] `5-test-plan.md` exists with 6-8 test scenarios
- [ ] `5-requirements-lock.md` exists with FR/TC/SC/AC/IP sections
- [ ] `6-dev-output.md` exists referencing FR-IDs from lock
- [ ] `7-qa-output.md` exists
- [ ] `8-review-output.md` exists

### Drift Detection Verification
- [ ] `drift/` directory exists in feature directory
- [ ] `drift/checkpoint-dev.md` exists (or checkpoint was clean)
- [ ] `drift/checkpoint-qa.md` exists (or checkpoint was clean)
- [ ] No unknown FR-IDs in dev output (all trace to requirements-lock)
- [ ] No invented requirement IDs in any drift-fix output

### Context Size Expectations
- [ ] Triage context: < 5,000 chars (minimal — just persona + expertise)
- [ ] Analyst context: 5,000-15,000 chars (persona + expertise + triage artifact)
- [ ] Architect context: 10,000-25,000 chars (persona + expertise + spec + constraints)
- [ ] Security context: 5,000-20,000 chars (persona + STRIDE methodology + artifacts)
- [ ] Dev context: 15,000-40,000 chars (persona + requirements-lock + architecture + codebase)
- [ ] No individual context exceeds 100,000 chars total

### MCP Tool Usage
- [ ] `specflow_context` called for each active phase
- [ ] `specflow_state("update")` correctly set scope and pillars
- [ ] `specflow_validate` called at checkpoint-dev and checkpoint-qa
- [ ] `specflow_codebase("scan")` called during codebase-analysis
- [ ] `specflow_codebase("symbols")` called during architect or dev phase

## Metrics Recording Template

```json
{
  "runbook": "medium-scope",
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
    "security": {
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
    },
    "checkpoint-dev": {
      "timing": { "contextAssemblyMs": 0, "validationMs": 0 },
      "contextSizes": { "total": 0 }
    },
    "qa-verify": {
      "timing": { "contextAssemblyMs": 0 },
      "contextSizes": { "persona": 0, "expertise": 0, "methodology": 0, "artifacts": 0, "skills": 0, "codebase": 0, "total": 0 }
    },
    "checkpoint-qa": {
      "timing": { "contextAssemblyMs": 0, "validationMs": 0 },
      "contextSizes": { "total": 0 }
    },
    "review": {
      "timing": { "contextAssemblyMs": 0 },
      "contextSizes": { "persona": 0, "expertise": 0, "methodology": 0, "artifacts": 0, "skills": 0, "codebase": 0, "total": 0 }
    }
  },
  "workflow": {
    "totalWorkflowMs": 0,
    "completedPhases": [],
    "scope": "medium",
    "pillars": ["security", "testing"]
  },
  "validation": {
    "requirementsCovered": 0,
    "requirementsTotal": 0,
    "coverageRate": 0,
    "driftDetected": false,
    "unknownReferences": []
  },
  "truncation": {
    "artifactsTruncated": false,
    "skillsCapped": false,
    "codebaseTruncated": false
  },
  "pass": false,
  "notes": ""
}
```

Save to: `test-results/uat-medium-<date>.json`
