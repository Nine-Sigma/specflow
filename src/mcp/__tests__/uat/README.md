# SpecFlow UAT Runbooks

Manual user acceptance testing runbooks for validating SpecFlow workflows end-to-end with real LLM agent execution.

## Setup

### Prerequisites

- Node.js 20+
- SpecFlow installed: `npx specflow init --force`
- MCP server running: `npx specflow serve` (or started by IDE)
- Claude Code CLI or VS Code with Copilot (depending on runbook)

### Project State

Before starting any runbook:

1. Initialize a fresh test project:
   ```bash
   mkdir /tmp/specflow-uat && cd /tmp/specflow-uat
   git init && npm init -y
   npx specflow init --force
   ```

2. Verify initialization:
   ```bash
   ls .specflow/          # Should contain STATE.md, config.json
   ls .specflow-lib/      # Should contain personas/, expertise/, methodology/
   ls .claude/commands/    # Should contain sf-*.md files
   ```

3. Verify MCP server:
   ```bash
   # In Claude Code, the server starts automatically via .mcp.json
   # Verify tools are available by asking: "What specflow tools are available?"
   ```

## Metrics Recording Format

Record metrics at each step using this JSON structure (compatible with TestMetrics interface):

```json
{
  "phase": "<phase-name>",
  "scope": "<scope-level>",
  "timing": {
    "contextAssemblyMs": "<note from MCP response time>",
    "totalWorkflowMs": "<wall clock for full workflow>"
  },
  "contextSizes": {
    "persona": "<char count from response>",
    "expertise": "<char count>",
    "artifacts": "<char count>",
    "total": "<sum>"
  },
  "validation": {
    "requirementsCovered": "<count>",
    "requirementsTotal": "<count>",
    "coverageRate": "<percentage>"
  }
}
```

Save metrics to `test-results/uat-<scope>-<date>.json` for comparison with automated baselines.

## Runbook Index

| Runbook | Scope | Phases Covered | Est. Time |
|---------|-------|----------------|-----------|
| [trivial-scope.uat.md](./trivial-scope.uat.md) | trivial | triage → dev | 5-10 min |
| [small-scope.uat.md](./small-scope.uat.md) | small | triage → tea → dev | 10-15 min |
| [medium-scope.uat.md](./medium-scope.uat.md) | medium | full pipeline - cost/ux | 20-30 min |
| [large-scope.uat.md](./large-scope.uat.md) | large | full pipeline + waves | 30-45 min |
| [copilot-integration.uat.md](./copilot-integration.uat.md) | any | Copilot-specific | 20-30 min |

## Pass/Fail Criteria

A runbook passes when ALL verification checklist items are checked. Any unchecked item is a failure that should be investigated and reported.
