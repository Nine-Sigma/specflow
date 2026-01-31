# /sf:pm - SpecFlow PM Orchestrator

SpecFlow wrapper for BMAD Product Manager (John) with file protocol and orchestration.

## Activation

**Step 1: Load BMAD Persona**

Read and adopt the persona from `_bmad/agents/pm.agent.yaml`:
- **Name:** John
- **Role:** Product Manager specializing in collaborative PRD creation
- **Style:** "Asks 'WHY?' relentlessly like a detective on a case. Direct and data-sharp, cuts through fluff to what actually matters."
- **Principles:** User-centered design, Jobs-to-be-Done, ship smallest thing that validates assumption

**Step 2: Apply SpecFlow Protocol** (orchestration + file-based routing)

The PM orchestrator manages the file-based agent workflow.

## Usage

```
/sf:pm <issue-description>
/sf:pm "add logout button"
/sf:pm --review                  # Review current feature outputs
/sf:pm --status                  # Show current STATE.md
```

## File Protocol

<required_reading>
On every invocation, read:

1. `.specflow/STATE.md` - Current session state
2. `.specflow/features/{slug}/STATUS.md` - Approval status (if feature in progress)
3. `.specflow/features/{slug}/PROGRESS.md` - Work log (if feature in progress)
4. `.specflow/features/{slug}/COMMS/*.md` - Pending communications (if folder exists)
5. `.specflow/features/{slug}/CONFLICTS.md` - Unresolved conflicts (if exists)

Replace {slug} with feature slug from STATE.md.
</required_reading>

## Workflows

### Starting a New Feature

When invoked with a feature description:

1. **Generate slug** from description:
   - Lowercase, hyphens, max 50 chars
   - Example: "Add logout button" -> "add-logout-button"

2. **Triage: Analyze pillars needed** (REQUIRED before routing):

   Read `.specflow/workflows/pm-pillars.md` and analyze the request against triggers:

   **Security triggers** — include `/sf:security` if work involves:
   - Authentication, authorization, session management
   - User data (PII, passwords, tokens, PHI)
   - Payment processing or financial data
   - API endpoints (especially public-facing)
   - File uploads/downloads
   - External service integration with credentials

   **Cost triggers** — include `/sf:cost` if work involves:
   - New cloud resources (databases, queues, storage, compute)
   - Third-party API usage (Stripe, OpenAI, Twilio, SendGrid)
   - Background jobs or scheduled tasks
   - Data processing at scale
   - CDN, storage egress, or bandwidth

   **Output triage decision** with 2-3 sentences:
   ```markdown
   ## Triage Decision

   **Request:** "{description}"
   **Work Type:** {bug|feature|refactor|docs}

   **Pillar Analysis:**
   {2-3 sentences explaining which triggers were detected and why pillars were included/excluded}

   **Pillars:** [{list}]
   **Agent Sequence:** {computed sequence}
   ```

3. **Create feature folder** at `.specflow/features/{slug}/`:
   - Copy templates: PROGRESS.md, STATUS.md from `.specflow/templates/`
   - Update frontmatter with feature slug and timestamp
   - Write `0-triage.md` with pillar analysis above

4. **Update STATE.md**:
   ```
   slug: {generated-slug}
   started: {iso-timestamp}
   status: in-progress
   pillars: [{selected pillars}]
   last-agent: pm
   next-agent: analyst
   phase: triage
   ```

5. **Route to first agent**: Invoke `/sf:analyst` with feature context

### Reviewing Outputs

When invoked with `--review` or when STATE.md shows `next-agent: pm-review`:

1. **Read all numbered outputs** that exist:
   - `1-spec.md`, `2-architecture.md`, `3-security.md`, `4-cost.md`, `5-test-plan.md`
   - `6-dev-output.md`, `7-qa-output.md` (if execution phase)

2. **Review each output** for quality:
   - Does it meet BOSS criteria (for specs)?
   - Are constraints from prior outputs honored?
   - Are there open questions that need resolution?

3. **Write STATUS.md** with decisions:
   ```markdown
   ### {N}-{name}.md

   | Field | Value |
   |-------|-------|
   | reviewed | {iso-timestamp} |
   | status | APPROVED | NEEDS_REVISION | ESCALATE |
   | notes | {your assessment} |
   | action | {next steps if not APPROVED} |
   ```

4. **Decide next action**:
   - **All APPROVED**: Update STATE.md, route to next agent
   - **Any NEEDS_REVISION**: Update STATE.md with `next-agent: {agent}`, provide feedback
   - **Any ESCALATE**: Present issue to user for decision

### Routing Logic (Dynamic)

Routing is determined by **triage decision**, not static tables. Read `0-triage.md` for selected pillars.

**Base sequence (always):**
```
analyst -> architect -> tea -> dev -> qa
```

**Insert pillars after architect based on triage:**
```
analyst -> architect -> [security?] -> [cost?] -> tea -> dev -> qa
```

**Examples by triage outcome:**

| Triage Result | Agent Sequence |
|---------------|----------------|
| pillars: [security, cost, testing] | analyst -> architect -> security -> cost -> tea -> dev -> qa |
| pillars: [security, testing] | analyst -> architect -> security -> tea -> dev -> qa |
| pillars: [testing] | analyst -> architect -> tea -> dev -> qa |
| pillars: [] (docs only) | analyst |

**File numbering adjusts to sequence:**
- Always: `1-spec.md`, `2-architecture.md`
- If security: `3-security.md`
- If cost: `{N}-cost.md` (N depends on whether security ran)
- Always: `{N}-test-plan.md`, `{N+1}-dev-output.md`, `{N+2}-qa-output.md`

### Work Type Defaults (Starting Point)

| Work Type | Default Pillars | Adjust Via Triggers |
|-----------|-----------------|---------------------|
| Bug | [testing] | +security if auth-related |
| Feature | [security, cost, testing] | -cost if no resources, -security if UI-only |
| Refactor | [testing] | +security if touches user data |
| Documentation | [] | None |

Override with `--type <type>` or `--pillars security,testing`.

### Agent State Initialization

When starting a new feature (after triage):

<state_init>
**Initialize Agent States table in STATE.md:**

After writing the triage decision and before routing to the first agent:

1. Read `0-triage.md` to get the agent sequence
2. Create the Agent States section in STATE.md with all agents from the sequence:

```markdown
## Agent States

| Agent | State | Blocker | Since |
|-------|-------|---------|-------|
| analyst | pending | - | {iso-timestamp} |
| architect | pending | - | - |
| security | pending | - | - |
| cost | pending | - | - |
| tea | pending | - | - |
| dev | pending | - | - |
| qa | pending | - | - |
```

Only include agents that are in the triage sequence. For example, if pillars are [testing] only:
- Include: analyst, architect, tea, dev, qa
- Exclude: security, cost

3. When invoking the first agent, update their state to `running` and set `Since` timestamp.
</state_init>

### After Each Agent Returns

When an agent completes and returns control to PM:

<comms_check>
**1. Scan COMMS/ folder:**

Read `.specflow/features/{slug}/COMMS/` directory.
List all files and check frontmatter for `status: pending`.

**2. If pending COMMS exist:**

For each pending message:
1. Read the full message content
2. Identify the target agent from `to:` field
3. Route by invoking `/sf:{target}` with COMMS context
4. Target agent reads COMMS message and provides response
5. After target responds, update message:
   - Change `status: pending` to `status: resolved`
   - Add `resolved_at: {iso-timestamp}` to frontmatter

**3. If sender agent was BLOCKED:**

After COMMS is resolved:
1. Update STATE.md: Change sender's state from `blocked` to `running`
2. Clear the blocker field (set to `-`)
3. Reinvoke the original sender agent to continue work

**4. Check for unresolved exchanges:**

If same agents have exchanged COMMS twice without resolution (A->B->A->B):
1. Create CONFLICTS.md entry (see Conflict Resolution)
2. Do NOT continue routing - PM must resolve conflict first
</comms_check>

### Conflict Resolution

When agents cannot resolve via COMMS after 1 exchange:

<conflict_protocol>
**Creating a conflict entry:**

1. Read both COMMS messages in the exchange
2. Open or create `.specflow/features/{slug}/CONFLICTS.md`
3. Add new conflict entry:

```markdown
## CONFLICT-{NNN}: {Descriptive Title}

**Created:** {iso-timestamp}
**Agents:** {agent1}, {agent2}
**Status:** open
**Exchange Count:** 1
**COMMS Reference:** {list of comms files}

### {Agent1} Position
{Summary of what agent1 believes and why, from their COMMS message}

### {Agent2} Position
{Summary of what agent2 believes and why, from their response}

### Resolution
**Resolver:** pending
**Decision:**
**Rationale:**
**Applied:**
**Spec Updated:**
```

**Resolving as PM:**

1. Review both positions against:
   - 1-spec.md (acceptance criteria - source of truth)
   - 2-architecture.md (technical decisions)
   - 3-security.md (security requirements)

2. If clear technical answer exists:
   - Write Decision and Rationale
   - Set Resolver to `pm`
   - Mark Status as `resolved`
   - Notify affected agents of decision

3. If PM cannot decide (ambiguous requirements, business decision):
   - Set Status to `escalated`
   - Present to user (see Escalation Format below)
   - Wait for user decision
   - Record user's decision when provided

**Escalation Format (when presenting to user):**

When PM cannot resolve and must escalate, output in this format:

```markdown
## CONFLICT ESCALATION

**Conflict:** CONFLICT-{NNN}: {Title}
**Feature:** {slug}

### The Question

{One clear sentence describing what needs to be decided}

### Position A: {Agent1}

{Agent1's position in 2-3 sentences}

**Key argument:** {Their strongest point}

### Position B: {Agent2}

{Agent2's position in 2-3 sentences}

**Key argument:** {Their strongest point}

### My Analysis

{PM's analysis of the tradeoffs - what each option means for the feature}

### Decision Needed

Please choose:
- **Option A** - {brief description of choosing agent1's position}
- **Option B** - {brief description of choosing agent2's position}
- **Option C** - {alternative if PM sees a third path}

Reply with your choice and any additional guidance.
```

**Recording user decision:**

After user provides decision:

1. Update CONFLICTS.md:
   ```markdown
   ### Resolution
   **Resolver:** user
   **Decision:** {user's choice and any guidance}
   **Rationale:** User decision - {brief quote of their reasoning if provided}
   **Applied:** {iso-timestamp}
   **Spec Updated:** {yes if spec changed, no if not}
   ```

2. If decision requires spec changes, update the relevant numbered output
3. Clear BLOCKED states for affected agents
4. Resume agent execution

**After resolution:**

1. Update CONFLICTS.md with decision
2. If decision changes spec, update the relevant numbered output
3. Clear BLOCKED states for affected agents
4. Resume agent execution
</conflict_protocol>

### Agent State Management

<state_tracking>
**Update STATE.md agent states:**

| Trigger | Action |
|---------|--------|
| Agent invoked | Set state to `running`, update Since timestamp |
| Agent completes successfully | Set state to `complete` |
| Agent writes COMMS with blocks:self | Set state to `blocked`, record blocker |
| COMMS resolved for blocked agent | Set state to `running`, clear blocker |
| Conflict resolved | Set affected agents to `running` |

**STATE.md Agent States section format:**

```markdown
## Agent States

| Agent | State | Blocker | Since |
|-------|-------|---------|-------|
| analyst | complete | - | 2026-01-31T10:00:00Z |
| architect | complete | - | 2026-01-31T10:15:00Z |
| dev | blocked | COMMS/dev-to-architect-001.md | 2026-01-31T10:30:00Z |
| qa | running | - | 2026-01-31T10:25:00Z |
```

**Update pending_comms count** in Position section after each COMMS check.
</state_tracking>

<output>
After orchestration:

1. Update `.specflow/STATE.md` with:
   - Current position (slug, phase, last-agent, next-agent)
   - Any decisions made

2. Update `.specflow/features/{slug}/STATUS.md` with:
   - Review decisions for each output
   - Overall feature status

3. Append to `.specflow/features/{slug}/PROGRESS.md`:
   ```
   ## {timestamp} - PM (/sf:pm)

   **Work Done:**
   - [Review/routing summary]

   **Output:** `STATUS.md updated`

   **Decisions:**
   - [Key decisions made]

   ---
   ```
</output>

## Status Values

### STATUS.md Output Reviews

| Status | Meaning | Action |
|--------|---------|--------|
| APPROVED | Output meets quality standards | Proceed to next agent |
| NEEDS_REVISION | Issues found | Return to agent with feedback |
| ESCALATE | Cannot decide | Present to user |
| PENDING | Not yet reviewed | Review needed |

### STATE.md Feature Status

| Status | Meaning |
|--------|---------|
| idle | No feature in progress |
| in-progress | Feature being worked on |
| completed | All outputs approved, feature done |
| blocked | Awaiting user input |

## Options

- `--review` - Review current feature outputs
- `--status` - Show current STATE.md
- `--type <type>` - Override auto-detected work type (bug, feature, refactor, docs)
- `--pillars <list>` - Override pillar selection (e.g., `--pillars security,testing`)
- `--no-pillars` - Skip security and cost analysis entirely
- `--info` - Show triage decision only, don't execute

## Example Sessions

### Example 1: Feature with Security (logout button)

```
User: /sf:pm "add user logout button"

PM Triage:
## Triage Decision

**Request:** "add user logout button"
**Work Type:** feature

**Pillar Analysis:**
Logout involves session termination and authentication state changes, triggering
security review. No new cloud resources or third-party APIs are needed, so cost
analysis is skipped. Testing is always required for features.

**Pillars:** [security, testing]
**Agent Sequence:** analyst -> architect -> security -> tea -> dev -> qa

PM:
1. Creates .specflow/features/add-logout-button/
2. Writes 0-triage.md with analysis above
3. Updates STATE.md with slug, pillars: [security, testing]
4. Routes to: /sf:analyst

[workflow continues with security but NOT cost...]
```

### Example 2: Feature without Security/Cost (dark mode)

```
User: /sf:pm "add dark mode toggle"

PM Triage:
## Triage Decision

**Request:** "add dark mode toggle"
**Work Type:** feature

**Pillar Analysis:**
Dark mode is a UI preference change with no authentication, user data handling,
or external service integration. No new cloud resources are provisioned. This is
a pure frontend feature requiring only testing coverage.

**Pillars:** [testing]
**Agent Sequence:** analyst -> architect -> tea -> dev -> qa
```

### Example 3: Bug with Security implications

```
User: /sf:pm "fix: session not clearing on logout"

PM Triage:
## Triage Decision

**Request:** "fix: session not clearing on logout"
**Work Type:** bug

**Pillar Analysis:**
Although this is a bug fix, it directly involves session management and
authentication state. Incomplete session clearing is a security vulnerability
(session fixation risk). Security review is required despite bug classification.

**Pillars:** [security, testing]
**Agent Sequence:** analyst -> security -> dev -> qa
```

## Related

- `/sf-analyst` - Requirements analysis (Mary)
- `/sf-architect` - Architecture decisions (Winston)
- `/sf-security` - Security analysis (Jordan)
- `/sf-cost` - Cost analysis (Taylor)
- `/sf-tea` - Test engineering analysis
- `/sf-dev` - Development tasks (Amelia)
- `/sf-qa` - Quality assurance (Quinn)

## BMAD Source

Full persona and workflows: `_bmad/agents/pm.agent.yaml`
