# /sf:sprint-planning - Sprint Planning

Wraps BMAD `/sprint-planning` with capacity planning.

## Usage

```
/sf:sprint-planning
```

## SpecFlow Context

Sprint planning with:
- Capacity-based story selection
- Dependency ordering
- Risk identification

## Prerequisites

- Epics and stories created (/sf:create-epics)

## Output Format

Sprint plan includes:
- Selected stories with priority
- Capacity allocation
- Sprint goal
- Dependencies resolved

## Capacity Planning

```
Sprint Capacity: 20 points

Selected Stories:
1. Login Form (3 pts) - P1
2. Password Reset (5 pts) - P1
3. Session Management (3 pts) - P1
4. Profile Page (5 pts) - P2
5. Avatar Upload (3 pts) - P2

Total: 19 points (95% capacity)
Buffer: 1 point for bugs/unknowns
```

## Dependency Resolution

```
Login Form
    |
    v
Session Management --> Profile Page
    |                      |
    v                      v
Password Reset         Avatar Upload
```

## Risk Identification

| Risk | Mitigation |
|------|------------|
| Auth0 integration delay | Fallback to local auth |
| Image upload complexity | Scope to single format |

## Related

- `/sprint-planning` - Original BMAD
- `/sf:create-epics` - Previous step
- `/sf:create-story` - Start story cycle
- `/sf:scrum` - Track in sprint board
