# /sf:analyst - Requirements Analysis

Wraps BMAD `/analyst` with SpecFlow requirements format.

## Usage

```
/sf:analyst
/sf:analyst <feature-description>
```

## SpecFlow Context

This command invokes BMAD's analyst with additional context:
- Output in SpecFlow requirements format
- User stories with BOSS-ready acceptance criteria
- Integration with three-pillar workflow

## Output Format

Analysis produces:
- User stories in standard format
- Acceptance criteria (BOSS: Binary, Observable, Specific, Scope-bound)
- Success metrics
- Out of scope items

## BOSS Criteria

All acceptance criteria must be:
- **B**inary: Pass/fail (no partial credit)
- **O**bservable: Verifiable by running code
- **S**pecific: Exact values, thresholds, counts
- **S**cope-bound: This feature only

## Example

```
/sf:analyst "user authentication with social login"
```

Produces:
- User story: "As a user, I want to log in with Google..."
- Acceptance criteria: "Login completes in <3 seconds"
- Success metrics: "99.9% uptime for auth service"

## Related

- `/analyst` - Original BMAD analyst
- `/sf:pm` - PM orchestrator (routes to analyst)
- `/sf:create-prd` - Next step in planning path
