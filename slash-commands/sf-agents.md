# /sf:agents - List Available Agents

Show all available SpecFlow agents.

## Usage

```
/sf:agents
```

## Agent Sources

| Source | Description | Examples |
|--------|-------------|----------|
| bmad | BMAD method agents | analyst, pm, architect, dev, qa |
| specflow | SpecFlow pillar agents | security, cost |
| custom | User-defined agents | From agents.json |

## Built-in Agents

### Core Agents
| Agent | Source | Purpose |
|-------|--------|---------|
| analyst | bmad | Product analysis |
| architect | bmad | Architecture decisions |
| pm | bmad | Project management |
| dev | bmad | Development tasks |
| qa | bmad | Quality assurance |
| tea | bmad | Test architect |
| security | specflow | Security analysis (Jordan) |
| cost | specflow | Cost estimation (Taylor) |

### Full Planning Path Agents
| Agent | Source | Purpose |
|-------|--------|---------|
| product-brief | bmad | Initial product vision |
| create-prd | bmad | Create PRD from brief |
| create-architecture | bmad | Technical architecture |
| create-epics | bmad | Break into epics/stories |
| sprint-planning | bmad | Sprint planning |
| create-story | bmad | Create story details |
| dev-story | bmad | Develop a story |
| code-review | bmad | Review code changes |

### GitHub/Tracker Operations
| Agent | Source | Purpose |
|-------|--------|---------|
| issue | specflow | GitHub issue management (gh CLI) |
| pr | specflow | Pull request management (gh CLI) |
| sync | specflow | Sync .specflow/ with tracker |
| scrum | specflow | Scrum ticket/epic management |

## Custom Agents

Add custom agents via `agents.json`:

```json
{
  "agents": {
    "scanner": {
      "source": "custom",
      "invoke": "@myorg/scanner",
      "description": "Security scanner"
    }
  }
}
```

Or use local prompts:

```json
{
  "agents": {
    "myagent": {
      "source": "custom",
      "invoke": ".specflow/agents/myagent.md",
      "description": "My custom agent"
    }
  }
}
```

## CLI Equivalent

```bash
sf agent list
sf agent <name> [args]
```

## Related

- `/sf:pm` - PM orchestrator (routes to agents)
- `/sf:pm --info` - Show routing rules
- `agents.json` - Custom agent registry
