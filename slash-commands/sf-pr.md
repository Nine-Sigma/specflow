# /sf:pr - Pull Request Management

Create and manage pull requests via gh CLI.

## Usage

```
/sf:pr create
/sf:pr list
/sf:pr view <number>
/sf:pr merge <number>
```

## What This Does

Wraps `gh pr` commands with SpecFlow context:
- Creates PRs with spec references
- Adds three-pillar checklist to PR body
- Links PRs to issues

## PR Template

PRs include:
- Summary of changes
- Linked issue(s)
- Three-pillar checklist:
  - [ ] Security reviewed
  - [ ] Cost impact assessed
  - [ ] Tests passing

## Commands

| Command | Description |
|---------|-------------|
| create | Create new PR |
| list | List open PRs |
| view | View PR details |
| merge | Merge PR |
| checks | View CI checks |
| review | Request review |

## Examples

```bash
# Create PR linking to issue
/sf:pr create --issue 42

# Create with three-pillar checklist
/sf:pr create --title "Add login form" --pillars

# View PR with checks
/sf:pr view 15 --checks

# Merge after approval (squash)
/sf:pr merge 15 --squash
```

## PR Body Template

```markdown
## Summary
[What this PR does]

## Linked Issues
Closes #42

## Three Pillars Checklist
- [ ] Security: STRIDE analysis complete
- [ ] Cost: No unexpected infrastructure costs
- [ ] Testing: All acceptance criteria pass

## Changes
- [Key change 1]
- [Key change 2]
```

## gh CLI Requirements

Requires authenticated `gh` CLI:
```bash
gh auth login
```

## Related

- `/sf:issue` - Issue management
- `/sf:code-review` - Before creating PR
- `/sf:sync` - Sync with tracker
