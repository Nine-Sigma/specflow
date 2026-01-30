# /sf:create-story - Create Story Details

Wraps BMAD `/create-story` with acceptance criteria format.

## Usage

```
/sf:create-story <story-id>
```

## SpecFlow Context

Creates detailed story with:
- BOSS acceptance criteria
- Gherkin scenarios (min 6)
- Technical notes

## Story Cycle

```
/sf:create-story -> /sf:tea -> /sf:dev-story -> /sf:code-review
```

## Output Format

Story includes:
- User story format
- Acceptance criteria (BOSS)
- Gherkin scenarios
- Out of scope items

## Example

```markdown
# Story: Login Form

## User Story
As a registered user, I want to log in with my email and password,
so that I can access my account.

## Acceptance Criteria
- [ ] Email validates against RFC 5322 pattern
- [ ] Password requires minimum 8 characters
- [ ] Failed login returns 401 with message "Invalid credentials"
- [ ] Successful login sets HttpOnly cookie with 24h expiry
- [ ] Rate limit: 5 attempts per minute per IP

## Gherkin Scenarios

### Happy Path
Scenario: Login with valid credentials
  Given a registered user "test@example.com"
  When they submit password "ValidPass123!"
  Then they receive a 200 response
  And session cookie is set

### Error Case
Scenario: Login with wrong password
  Given a registered user "test@example.com"
  When they submit password "WrongPass"
  Then they receive a 401 response
  And message is "Invalid credentials"
```

## Related

- `/create-story` - Original BMAD
- `/sf:tea` - Next step: Test architecture
- `/sf:sprint-planning` - Parent sprint
