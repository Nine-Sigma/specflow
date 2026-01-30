# /sf:create-epics - Create Epics and Stories

Wraps BMAD `/create-epics-and-stories` with BOSS criteria.

## Usage

```
/sf:create-epics
```

## SpecFlow Context

Creates epics/stories with:
- BOSS-validated acceptance criteria
- Story points estimation
- Dependency mapping

## Prerequisites

- Architecture completed (/sf:create-architecture)

## BOSS Criteria

All acceptance criteria must be:
- **B**inary: Pass/fail (no partial credit)
- **O**bservable: Verifiable by running code
- **S**pecific: Exact values, thresholds, counts
- **S**cope-bound: This feature only

## Output Format

```markdown
## Epic: User Authentication

### Story: Login Form
**Points:** 3

**Acceptance Criteria:**
- [ ] Email field accepts valid email format (RFC 5322)
- [ ] Password field masks input with asterisks
- [ ] Submit button disabled until both fields valid
- [ ] Login API call completes in <500ms
- [ ] Invalid credentials show "Invalid email or password"
```

## Story Points

Based on complexity and criteria count:
| Criteria | Points |
|----------|--------|
| 1-4 | 1-2 |
| 5-8 | 3-5 |
| 9-12 | 6-8 |

## Related

- `/create-epics-and-stories` - Original BMAD
- `/sf:create-architecture` - Previous step
- `/sf:sprint-planning` - Next step
- `/sf:scrum` - Create in tracker
