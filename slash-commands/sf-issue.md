# /sf:issue - GitHub Issue Management

Create and manage GitHub issues via gh CLI.

## Usage

```
/sf:issue create "title" "body"
/sf:issue list
/sf:issue view <number>
/sf:issue close <number>
```

## What This Does

Wraps `gh issue` commands with SpecFlow context:
- Creates issues with proper labels
- Links issues to .specflow/ specs
- Syncs issue state with local tracking

## Commands

| Command | Description |
|---------|-------------|
| create | Create new issue |
| list | List open issues |
| view | View issue details |
| close | Close issue |
| reopen | Reopen closed issue |
| edit | Edit issue title/body |

## Examples

```bash
# Create issue from spec
/sf:issue create --from-spec .specflow/specs/auth-feature.md

# List open issues
/sf:issue list --state open

# View issue details
/sf:issue view 42

# Close with comment
/sf:issue close 42 --comment "Completed in PR #45"
```

## Labels

SpecFlow auto-applies labels based on work type:
| Type | Labels |
|------|--------|
| feature | `type:feature`, `pillars:all` |
| bug | `type:bug`, `pillars:testing` |
| refactor | `type:refactor` |
| docs | `type:docs` |

## Integration

Issues are tracked in `.specflow/issues/` as JSON files:
```json
{
  "id": 42,
  "title": "Add logout button",
  "spec": ".specflow/specs/logout.md",
  "status": "open"
}
```

## gh CLI Requirements

Requires authenticated `gh` CLI:
```bash
gh auth login
```

## Related

- `/sf:pr` - Pull request management
- `/sf:sync` - Sync with tracker
- `/sf:scrum` - Full ticket management
