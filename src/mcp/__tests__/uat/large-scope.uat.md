# UAT Runbook: Large Scope Workflow

**Scope:** large
**Phases covered:** triage → scope → analyst → codebase-analysis → architect → security → cost → ux → tea → synthesis → story-generation → dev-story (waves) → checkpoint-dev → qa-verify → checkpoint-qa → review → complete
**Estimated time:** 30-45 minutes

## Prerequisites

1. Initialize a fresh test project:
   ```bash
   mkdir /tmp/specflow-uat-large && cd /tmp/specflow-uat-large
   git init && npm init -y
   npx specflow init --force
   ```

2. Create a realistic source structure:
   ```bash
   mkdir -p src/{routes,services,models,utils,middleware,config}

   cat > src/routes/auth.ts << 'EOF'
   import { AuthService } from '../services/auth-service';
   import { validate } from '../middleware/validation';
   export function login(req: any) { return AuthService.authenticate(req.body); }
   export function register(req: any) { return AuthService.register(req.body); }
   EOF

   cat > src/services/auth-service.ts << 'EOF'
   import { UserModel } from '../models/user';
   import { hashPassword } from '../utils/crypto';
   export class AuthService {
     static authenticate(creds: any) { return UserModel.findByEmail(creds.email); }
     static register(data: any) { return UserModel.create({ ...data, password: hashPassword(data.password) }); }
   }
   EOF

   cat > src/models/user.ts << 'EOF'
   export class UserModel {
     static findByEmail(email: string) { return { email }; }
     static create(data: any) { return data; }
     static findById(id: string) { return { id }; }
   }
   EOF

   cat > src/utils/crypto.ts << 'EOF'
   export function hashPassword(pw: string): string { return pw; }
   export function verifyPassword(pw: string, hash: string): boolean { return pw === hash; }
   EOF

   cat > src/middleware/validation.ts << 'EOF'
   export function validate(schema: any) { return (req: any, _: any, next: any) => next(); }
   EOF

   cat > src/config/database.ts << 'EOF'
   export const dbConfig = { host: 'localhost', port: 5432, database: 'app' };
   EOF
   ```

3. Verify initialization and MCP availability.

## Steps

### Step 1: Start PM with Large Feature

Invoke:
```
/sf:pm "Add payment processing integration with Stripe — support one-time charges, subscription management, webhook handling, and a billing dashboard for users"
```

**What to observe:**
- PM identifies large scope signals: new feature area, payment/PII handling, external service, 10+ files, multiple user roles
- PM calls `specflow_state("start")`

**Metrics to record:**
- [ ] Note `specflow_context("triage")` context size and response time

### Step 2: Verify Scope Assessment

```bash
cat .specflow/features/*/workflow-state.json | python3 -m json.tool
```

**Expected:**
- `scope`: `"large"`
- `pillars`: includes `"security"`, `"cost"`, `"testing"` (all pillars for large)
- `completed_phases`: includes `"triage"`, `"scope"`

### Step 3: Verify Analyst Phase (Full Depth)

```bash
cat .specflow/features/*/1-spec.md
```

**Expected for large scope:**
- 15+ acceptance criteria (full spec depth)
- FR-IDs covering payment flows, subscriptions, webhooks, dashboard
- BOSS format criteria
- Multiple user role considerations

### Step 4: Verify Codebase Analysis

```bash
cat .specflow/features/*/1.5-codebase-constraints.md
```

**Expected:**
- Full tech stack: TypeScript, existing auth patterns
- Integration points: AuthService, UserModel, middleware
- Symbols discovered including cross-file call chains

### Step 5: Verify Architect Phase (Full Depth)

```bash
cat .specflow/features/*/2-architecture.md
```

**Expected for large scope:**
- Full architecture with component diagrams
- API contracts for payment endpoints
- Data model for billing/subscription tables
- Integration design for Stripe API
- Webhook handling architecture
- ADRs (Architecture Decision Records) if applicable

**Metrics to record:**
- [ ] Note architect context size (contextSizes.total)
- [ ] Verify codebase intelligence included in context (contextSizes.codebase > 0)

### Step 6: Verify Security Phase (Full STRIDE)

```bash
cat .specflow/features/*/3-security.md
```

**Expected for large scope (full STRIDE):**
- **S**poofing: payment identity verification
- **T**ampering: transaction data integrity
- **R**epudiation: audit trail for payments
- **I**nformation disclosure: PII/PCI protection
- **D**enial of service: rate limiting on payment endpoints
- **E**levation of privilege: billing admin access control
- Mitigation strategies for each threat

**Metrics to record:**
- [ ] Note security context size
- [ ] Verify STRIDE methodology loaded (methodology content > 0)

### Step 7: Verify Cost Phase (Full Breakdown)

This is a key difference from medium scope — large scope triggers cost analysis.

```bash
cat .specflow/features/*/4-cost.md
```

**Expected for large scope:**
- Stripe API cost breakdown (per-transaction fees)
- Infrastructure cost estimates (database, compute)
- 3rd party service costs
- Total cost projections

**Metrics to record:**
- [ ] Note cost context size
- [ ] Verify cost persona loaded (cost.md)

### Step 8: Verify UX Phase (if triggered)

For payment/dashboard features, UX may be triggered:

```bash
cat .specflow/features/*/1.6-ux-design.md 2>/dev/null
```

**Expected for large scope (if UX present):**
- All 9 UX methodology files loaded (large scope = full depth)
- User journeys for payment flow and dashboard
- Component strategy
- Accessibility considerations

### Step 9: Verify TEA Phase (Full Depth)

```bash
cat .specflow/features/*/5-test-plan.md
```

**Expected for large scope:**
- 10-15 test scenarios
- Payment flow tests (happy path, failures, edge cases)
- Webhook handling tests
- Subscription lifecycle tests
- Dashboard UI tests

### Step 10: Verify Synthesis (Requirements Lock)

```bash
cat .specflow/features/*/5-requirements-lock.md
```

**Expected:**
- Comprehensive FR list (15+ requirements)
- TC traced from all previous outputs
- SC synthesized from security + cost + test findings
- AC binary and observable
- IP from codebase constraints

**Metrics to record:**
- [ ] Count total FR-IDs (validation.requirementsTotal)
- [ ] Count total TC-IDs
- [ ] Count total AC-IDs

### Step 11: Verify Wave-Based Execution

For large scope, stories may be grouped into execution waves:

```bash
cat .specflow/features/*/sprint-status.yaml 2>/dev/null
```

**Expected (if wave execution):**
- Stories grouped by dependency
- Wave assignments (wave 1, wave 2, etc.)
- No circular dependencies
- Status tracking per story

Check PM uses `specflow_state("waves")` or `specflow_state("next-wave")`:
- [ ] PM calls wave management to determine execution order
- [ ] Stories in wave 1 have no dependencies on other stories
- [ ] Later waves depend only on earlier wave stories

### Step 12: Verify Dev Phase with Checkpoint

```bash
cat .specflow/features/*/6-dev-output.md
```

**Expected:**
- References all FR-IDs from requirements lock
- Implementation spans multiple files/modules

**Checkpoint verification:**
```bash
cat .specflow/features/*/drift/checkpoint-dev.md 2>/dev/null
```

**Expected:**
- Coverage report: which FR-IDs are addressed
- Any drift detected (unknown IDs, missing coverage)
- Pass/fail determination

**Metrics to record:**
- [ ] Note requirement coverage rate (validation.coverageRate)
- [ ] Record any drift events
- [ ] Note checkpoint timing

### Step 13: Verify QA Phase with Checkpoint

```bash
cat .specflow/features/*/7-qa-output.md
```

**Checkpoint verification:**
```bash
cat .specflow/features/*/drift/checkpoint-qa.md 2>/dev/null
```

### Step 14: Verify Review Phase

```bash
cat .specflow/features/*/8-review-output.md
```

**Expected:**
- Comprehensive review covering all pillars
- Security review findings
- Cost review findings
- Test coverage assessment
- Final recommendation

### Step 15: Verify Workflow Completion

```bash
cat .specflow/features/*/workflow-state.json | python3 -m json.tool
```

**Expected:**
- `scope`: `"large"`
- `pillars`: `["security", "cost", "testing"]` (or similar)
- `completed_phases`: comprehensive list of all phases
- `last_completed_at`: recent timestamp

## Verification Checklist

### State Verification
- [ ] `workflow-state.json` exists
- [ ] `scope` equals `"large"`
- [ ] `pillars` includes `"security"`, `"cost"`, and `"testing"`
- [ ] `completed_phases` includes all pillar phases (security, cost, tea)
- [ ] `completed_phases` includes checkpoint phases
- [ ] `completed_phases` count is 12+ phases

### Artifact Verification (All Phases)
- [ ] `0-triage.md` exists with >50 non-whitespace chars
- [ ] `0-scope.md` exists indicating large scope
- [ ] `1-spec.md` exists with 15+ acceptance criteria
- [ ] `1.5-codebase-constraints.md` exists with tech stack
- [ ] `2-architecture.md` exists with full design + API contracts
- [ ] `3-security.md` exists with STRIDE analysis (6 categories)
- [ ] `4-cost.md` exists with cost breakdown
- [ ] `5-test-plan.md` exists with 10-15 test scenarios
- [ ] `5-requirements-lock.md` exists with FR/TC/SC/AC/IP
- [ ] `6-dev-output.md` exists referencing FR-IDs
- [ ] `7-qa-output.md` exists
- [ ] `8-review-output.md` exists

### Requirements Lock Coverage
- [ ] `5-requirements-lock.md` has 15+ FR entries
- [ ] All FR-IDs in `6-dev-output.md` exist in `5-requirements-lock.md`
- [ ] All FR-IDs in `7-qa-output.md` exist in `5-requirements-lock.md`
- [ ] No invented IDs appear in dev or QA output

### Drift Detection
- [ ] `drift/` directory exists
- [ ] `drift/checkpoint-dev.md` exists
- [ ] `drift/checkpoint-qa.md` exists
- [ ] Checkpoint reports show coverage assessment
- [ ] Any drift-fix phases (if triggered) did not introduce new IDs

### Wave Execution (if applicable)
- [ ] `sprint-status.yaml` exists (for multi-story features)
- [ ] Stories assigned to waves
- [ ] Wave 1 stories have no intra-wave dependencies
- [ ] No circular dependencies detected

### Context Size Expectations
- [ ] Analyst context: 5,000-15,000 chars
- [ ] Architect context: 15,000-35,000 chars (includes codebase intel)
- [ ] Security context: 10,000-25,000 chars (includes STRIDE methodology)
- [ ] Cost context: 5,000-15,000 chars
- [ ] Dev context: 20,000-50,000 chars (largest — all artifacts + codebase)
- [ ] No individual artifact exceeds 30,000 chars (truncation cap)
- [ ] Total skills payload < 50,000 chars

### MCP Tool Usage
- [ ] `specflow_context` called for every active phase
- [ ] `specflow_state("update")` set scope to `"large"` with all pillars
- [ ] `specflow_validate` called at checkpoint-dev and checkpoint-qa
- [ ] `specflow_codebase("scan")` called during codebase-analysis
- [ ] `specflow_codebase("symbols")` or `specflow_impact` called during dev phase
- [ ] `specflow_state("waves")` or `specflow_state("next-wave")` called (if wave execution)

## Metrics Recording Template

```json
{
  "runbook": "large-scope",
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
    "cost": {
      "timing": { "contextAssemblyMs": 0 },
      "contextSizes": { "persona": 0, "expertise": 0, "methodology": 0, "artifacts": 0, "skills": 0, "codebase": 0, "total": 0 }
    },
    "ux": {
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
      "contextSizes": { "total": 0 },
      "validation": { "requirementsCovered": 0, "requirementsTotal": 0, "coverageRate": 0, "driftDetected": false }
    },
    "qa-verify": {
      "timing": { "contextAssemblyMs": 0 },
      "contextSizes": { "persona": 0, "expertise": 0, "methodology": 0, "artifacts": 0, "skills": 0, "codebase": 0, "total": 0 }
    },
    "checkpoint-qa": {
      "timing": { "contextAssemblyMs": 0, "validationMs": 0 },
      "contextSizes": { "total": 0 },
      "validation": { "requirementsCovered": 0, "requirementsTotal": 0, "coverageRate": 0, "driftDetected": false }
    },
    "review": {
      "timing": { "contextAssemblyMs": 0 },
      "contextSizes": { "persona": 0, "expertise": 0, "methodology": 0, "artifacts": 0, "skills": 0, "codebase": 0, "total": 0 }
    }
  },
  "workflow": {
    "totalWorkflowMs": 0,
    "completedPhases": [],
    "stateTransitionCount": 0,
    "scope": "large",
    "pillars": ["security", "cost", "testing"]
  },
  "validation": {
    "requirementsCovered": 0,
    "requirementsTotal": 0,
    "coverageRate": 0,
    "driftEventsDetected": 0,
    "unknownReferences": []
  },
  "truncation": {
    "artifactsTruncated": false,
    "skillsCapped": false,
    "codebaseTruncated": false,
    "impactTruncated": false,
    "warnings": []
  },
  "waves": {
    "totalWaves": 0,
    "totalStories": 0,
    "circularDepsDetected": false
  },
  "pass": false,
  "notes": ""
}
```

Save to: `test-results/uat-large-<date>.json`
