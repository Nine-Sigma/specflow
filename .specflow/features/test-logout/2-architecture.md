---
agent: architect
created: 2026-01-30T18:02:00Z
depends_on: ["1-spec.md"]
status: draft
---

# Test Logout Button Architecture

## Summary

Implement logout via a POST endpoint that invalidates the session and returns a redirect response.

## Key Decisions

### Decision 1: Logout Endpoint
- **Context:** Need server-side session invalidation
- **Decision:** POST /api/auth/logout endpoint
- **Consequences:** Requires form submission or fetch call (not simple link)

### Decision 2: Session Store
- **Context:** Need to invalidate session reliably
- **Decision:** Use existing Redis session store
- **Consequences:** Session deleted from Redis, not just cookie

## Component Design

```
UI: LogoutButton -> POST /api/auth/logout
                          |
                    [Auth Middleware]
                          |
                    [Session Store (Redis)]
                          |
                    [Delete session]
                          |
                    [Redirect to /login]
```

## Constraints for Downstream

- Use POST method (not GET) for logout endpoint
- Delete session from Redis, not just cookie
- Return 302 redirect to /login on success

## Open Questions

(none)
