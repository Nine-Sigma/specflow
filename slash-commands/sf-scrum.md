# /sf:scrum - Scrum Ticket Management

Manage epics, stories, and tickets across trackers.

## Usage

```
/sf:scrum
/sf:scrum create-epic "Epic title"
/sf:scrum create-story --epic 42 "Story title"
/sf:scrum sprint-board
```

## What This Does

Full scrum workflow via tracker utilities:
1. Creates epics from /sf:create-epics output
2. Breaks epics into stories
3. Manages sprint board
4. Tracks velocity

## Commands

| Command | Description |
|---------|-------------|
| create-epic | Create epic in tracker |
| create-story | Create story under epic |
| sprint-board | Show current sprint |
| backlog | Show prioritized backlog |
| velocity | Show team velocity |
| burndown | Show sprint burndown |

## Tracker Integration

Uses `src/trackers/` utilities:

| Tracker | Epic Type | Story Type |
|---------|-----------|------------|
| GitHub | Issue + `epic` label | Issue + `story` label |
| Jira | Epic issue type | Story issue type |
| Linear | Project | Issue |

## Workflow

```
/sf:create-epics -> /sf:scrum create-epic -> /sf:scrum create-story
                                                    |
                                                    v
                                          /sf:sprint-planning
                                                    |
                                                    v
                                          /sf:scrum sprint-board
```

## Examples

```bash
# Create epic from spec
/sf:scrum create-epic "User Authentication" --from-spec .specflow/specs/auth.md

# Add stories to epic
/sf:scrum create-story --epic AUTH-1 "Login form"
/sf:scrum create-story --epic AUTH-1 "Password reset"

# View sprint
/sf:scrum sprint-board

# Check velocity
/sf:scrum velocity --sprints 5
```

## Sprint Board

```
Current Sprint: Sprint 5 (Jan 15-29)
Capacity: 20 points | Committed: 18 points

TODO (6 pts)       IN PROGRESS (8 pts)    DONE (4 pts)
-----------        -------------------    ------------
[ ] Profile (5)    [>] Login (3)          [x] Setup (2)
[ ] Avatar (1)     [>] Session (5)        [x] Config (2)
```

## Story Points

Tracked via:
- GitHub: Projects API or `points:N` label
- Jira: Story points field
- Linear: Estimate field

## Related

- `/sf:create-epics` - Generate epics from architecture
- `/sf:sprint-planning` - Plan sprints
- `/sf:sync` - Sync with tracker
- `/sf:issue` - Individual issue management
