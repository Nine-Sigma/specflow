# UAT Runbook: Copilot Integration

**Scope:** any (this runbook tests Copilot-specific integration, not scope-gated behavior)
**Phases covered:** MCP discovery, agent spawning via runSubagent, workflow completion
**Estimated time:** 20-30 minutes

## Prerequisites

1. **VS Code** with GitHub Copilot extension installed and active

2. Initialize a test project:
   ```bash
   mkdir /tmp/specflow-uat-copilot && cd /tmp/specflow-uat-copilot
   git init && npm init -y
   npx specflow init --force
   ```

3. Open the project in VS Code:
   ```bash
   code /tmp/specflow-uat-copilot
   ```

4. Verify files exist:
   ```
   .vscode/mcp.json          # Copilot MCP configuration
   .mcp.json                  # Claude Code MCP configuration
   .github/agents/            # Copilot thin agent files
   ```

5. Verify VS Code recognizes the MCP server (may need to reload window):
   - Open Command Palette → "MCP: List Servers" (or equivalent)
   - Verify specflow server appears

## Part 1: MCP Server Discovery

### Step 1: Verify MCP Configuration Files

Check both MCP config files exist and are valid:

```bash
cat .vscode/mcp.json
cat .mcp.json
```

**Verification:**
- [ ] `.vscode/mcp.json` uses `"servers"` key (Copilot convention)
- [ ] `.mcp.json` uses `"mcpServers"` key (Claude Code convention)
- [ ] Both reference the same server command (e.g., `node dist/mcp/index.js` or `npx specflow serve`)
- [ ] Both reference the same arguments and environment variables

### Step 2: Verify MCP Tools Available in Copilot

In VS Code Copilot Chat, ask:
```
What MCP tools are available?
```

Or check via the MCP tool list in Copilot's interface.

**Expected — all 5 tools present:**
- [ ] `specflow_context` — Get scoped context for a workflow phase
- [ ] `specflow_state` — Read/write workflow state
- [ ] `specflow_validate` — Validate phase output artifact
- [ ] `specflow_codebase` — Query codebase structure & dependencies
- [ ] `specflow_impact` — Blast radius analysis

**Metrics to record:**
- [ ] Time from VS Code reload to MCP tools appearing
- [ ] Any errors in VS Code Output panel → MCP channel

## Part 2: Agent File Validation

### Step 3: Verify Copilot Agent Files

```bash
ls .github/agents/
```

**Expected agents:**
- `sf-pm.md` — PM orchestrator
- `sf-analyst.md` — Requirements (Mary)
- `sf-architect.md` — Architecture (Winston)
- `sf-security.md` — Security (Jordan)
- `sf-cost.md` — Cost (Taylor)
- `sf-dev.md` — Development (Amelia)
- `sf-qa.md` — Quality (Quinn)
- `sf-tea.md` — Test Engineering
- `sf-brainstorm.md` — Structured ideation
- `sf-ux.md` — UX design (Sally)

### Step 4: Verify Agent Frontmatter

Spot-check a few agent files for correct Copilot frontmatter:

```bash
head -10 .github/agents/sf-pm.md
head -10 .github/agents/sf-analyst.md
```

**Expected frontmatter fields:**
- [ ] `user-invokable: false` for all non-PM agents (agents are spawned, not directly invoked)
- [ ] `user-invokable: true` for PM agent (entry point)
- [ ] MCP tools declared in frontmatter (references specflow_context, specflow_state, etc.)

### Step 5: Verify Agent Body Parity

Compare agent body content between Claude Code and Copilot versions:

```bash
# Claude Code version (skip frontmatter)
tail -n +3 .claude/commands/sf-analyst.md | head -20

# Copilot version (skip frontmatter)
tail -n +10 .github/agents/sf-analyst.md | head -20
```

**Expected:**
- [ ] Agent body content is identical after stripping platform-specific frontmatter
- [ ] No `runSubagent()` calls appear in `.claude/commands/` files
- [ ] No `Task(subagent_type` calls appear in `.github/agents/` files

### Step 6: Verify No Unresolved Placeholders

```bash
grep -r '{{SPAWN' .github/agents/ .claude/commands/
grep -r '<agent>' .github/agents/ .claude/commands/
grep -r '<phase>' .github/agents/ .claude/commands/
```

**Expected:**
- [ ] No matches found (all placeholders resolved to platform-specific syntax)

## Part 3: Workflow Execution via Copilot

### Step 7: Invoke PM via Copilot

In VS Code Copilot Chat, invoke:
```
@sf-pm Add a simple health check endpoint
```

**What to observe:**
- [ ] Copilot recognizes `@sf-pm` and loads the PM agent
- [ ] PM calls `specflow_context("triage")` via MCP
- [ ] PM writes `0-triage.md` to `.specflow/features/{slug}/`
- [ ] PM calls `specflow_state("start")` to initialize workflow

**Metrics to record:**
- [ ] Note if MCP tool calls are visible in Copilot's tool call display
- [ ] Note response time for first `specflow_context` call
- [ ] Note any Copilot-specific errors or warnings

### Step 8: Verify Agent Spawning

After PM completes triage and scoping, observe agent spawning:

**Expected behavior:**
- [ ] PM spawns analyst via `runSubagent()` (visible in Copilot's agent call chain)
- [ ] Spawned analyst loads its own context via `specflow_context("analyst")`
- [ ] Analyst writes `1-spec.md` to the feature directory
- [ ] Analyst returns to PM (agents don't route directly to other agents)

**Metrics to record:**
- [ ] Note agent spawn time (from PM decision to agent response)
- [ ] Note context sizes per spawned agent (compare to Claude Code UAT metrics)
- [ ] Record any agent spawn failures or errors

### Step 9: Verify State Continuity

After multiple agents have executed:

```bash
cat .specflow/features/*/workflow-state.json | python3 -m json.tool
```

**Expected:**
- [ ] `phase` reflects current position in workflow
- [ ] `completed_phases` accumulates correctly across agent boundaries
- [ ] `scope` and `pillars` persist through agent handoffs
- [ ] `last_agent` tracks the most recent agent

### Step 10: Complete the Workflow

Let PM continue routing through remaining phases until completion.

```bash
cat .specflow/features/*/workflow-state.json | python3 -m json.tool
```

**Expected:**
- [ ] Workflow reaches completion (or reaches a stopping point)
- [ ] All expected artifacts exist
- [ ] State reflects all completed phases

## Part 4: Platform Parity Comparison

### Step 11: Compare Artifact Quality

If you've already run a UAT for the same scope level using Claude Code, compare:

| Metric | Claude Code | Copilot | Match? |
|--------|-------------|---------|--------|
| Artifacts created | | | |
| Scope assessed | | | |
| Pillars triggered | | | |
| FR count in lock | | | |
| Phases completed | | | |
| Total workflow time | | | |

### Step 12: Compare Context Sizes

Record per-phase context sizes and compare to Claude Code baseline:

| Phase | Claude Code (chars) | Copilot (chars) | Delta (%) |
|-------|---------------------|-----------------|-----------|
| triage | | | |
| analyst | | | |
| architect | | | |
| dev-story | | | |

**Expected:**
- [ ] Context sizes are within 5% of each other (same content, same MCP server)
- [ ] Any delta is explained by platform-specific content (frontmatter differences)

## Verification Checklist

### MCP Discovery
- [ ] `.vscode/mcp.json` exists with `"servers"` key
- [ ] `.mcp.json` exists with `"mcpServers"` key
- [ ] Both configs reference identical server command
- [ ] All 5 specflow MCP tools visible in Copilot
- [ ] MCP server starts without errors in VS Code

### Agent Files
- [ ] All expected `.github/agents/sf-*.md` files exist
- [ ] PM agent has `user-invokable: true`
- [ ] Non-PM agents have `user-invokable: false`
- [ ] MCP tools declared in agent frontmatter
- [ ] Agent body parity with `.claude/commands/` (after stripping frontmatter)
- [ ] No unresolved `{{SPAWN}}` or `{{SPAWN:phase}}` placeholders
- [ ] No `runSubagent()` in Claude files
- [ ] No `Task(subagent_type` in Copilot files

### Workflow Execution
- [ ] PM invokable via `@sf-pm` in Copilot Chat
- [ ] PM loads context via `specflow_context` MCP tool
- [ ] PM creates workflow state via `specflow_state`
- [ ] PM spawns agents via `runSubagent()` calls
- [ ] Spawned agents load their own context via MCP
- [ ] Spawned agents write output artifacts
- [ ] State persists correctly across agent handoffs
- [ ] Workflow completes successfully (or reaches reasonable stopping point)

### Platform Parity
- [ ] Same scope assessed for same feature description
- [ ] Same pillars triggered
- [ ] Artifact count matches Claude Code (same phases produce same files)
- [ ] Context sizes within 5% of Claude Code baseline
- [ ] No Copilot-specific errors that don't occur in Claude Code

### Copilot-Specific Issues
- [ ] No MCP connection timeouts during workflow
- [ ] No agent spawn failures
- [ ] No frontmatter parsing errors
- [ ] VS Code Output panel (MCP channel) shows no errors

## Metrics Recording Template

```json
{
  "runbook": "copilot-integration",
  "date": "YYYY-MM-DD",
  "tester": "<name>",
  "platform": "copilot",
  "environment": {
    "vscodeVersion": "",
    "copilotVersion": "",
    "nodeVersion": "",
    "os": ""
  },
  "mcpDiscovery": {
    "serverStartTimeMs": 0,
    "toolsDiscovered": 0,
    "discoveryErrors": []
  },
  "agentValidation": {
    "totalAgentFiles": 0,
    "frontmatterValid": 0,
    "bodyParityChecked": 0,
    "unresolvedPlaceholders": 0,
    "spawnSyntaxViolations": 0
  },
  "workflow": {
    "featureDescription": "",
    "scopeAssessed": "",
    "pillarsTriggered": [],
    "completedPhases": [],
    "totalWorkflowMs": 0,
    "agentSpawnsObserved": 0,
    "agentSpawnFailures": 0
  },
  "perPhaseMetrics": {
    "triage": {
      "contextSizeChars": 0,
      "responseTimeMs": 0,
      "agentSpawnedBy": "user"
    },
    "analyst": {
      "contextSizeChars": 0,
      "responseTimeMs": 0,
      "agentSpawnedBy": "pm"
    }
  },
  "parity": {
    "contextSizeDeltaPercent": 0,
    "artifactCountMatch": false,
    "scopeMatch": false,
    "pillarMatch": false,
    "notes": ""
  },
  "issues": [],
  "pass": false,
  "notes": ""
}
```

Save to: `test-results/uat-copilot-<date>.json`
