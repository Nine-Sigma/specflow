# /sf:pm - SpecFlow PM Orchestrator

Invoke the PM orchestrator for intelligent agent routing.

## Usage

```
/sf:pm <issue-description>
/sf:pm "add logout button"
/sf:pm "fix login bug" --type bug
```

## What This Does

The PM orchestrator:
1. Classifies work type (bug, feature, refactor, documentation)
2. Selects appropriate agents based on work type
3. Runs agents in parallel or sequentially as needed
4. Validates outputs meet quality standards

## Work Type Routing

| Work Type | Agents | Three Pillars? |
|-----------|--------|----------------|
| Bug | qa, dev | No |
| Feature | analyst, security, cost, architect, dev, qa | Yes |
| Refactor | architect, dev, qa | No |
| Documentation | analyst | No |

## Options

- `--type <type>` - Override auto-detected work type
- `--no-pillars` - Skip security and cost analysis
- `--info` - Show routing information only

## Example

For a new feature request:
```
/sf:pm "add user profile page with avatar upload"
```

PM will route through: analyst -> security -> cost -> architect -> dev -> qa

## CLI Equivalent

```bash
npx tsx src/cli.ts pm "issue description"
```

## Related

- `/sf:analyst` - Requirements analysis
- `/sf:security` - Security analysis (Jordan)
- `/sf:cost` - Cost analysis (Taylor)
- `/sf:architect` - Architecture decisions
- `/sf:dev` - Development tasks
- `/sf:qa` - Quality assurance
