# BOSS Acceptance Criteria

Standard for writing acceptance criteria in SpecFlow.

## The BOSS Framework

All acceptance criteria MUST be:

### **B**inary
- Pass/fail only, no partial credit
- Can be answered with YES or NO
- "Is this done?" has a clear answer

❌ "System should be fast"
✅ "Page loads in under 2 seconds"

### **O**bservable
- Verifiable by running code
- Can be tested (manual or automated)
- Evidence can be captured (screenshot, log, response)

❌ "Code is clean"
✅ "All functions have < 20 lines"

### **S**pecific
- Exact values, thresholds, counts
- No ambiguous terms (fast, good, easy)
- Numbers where possible

❌ "Handles many users"
✅ "Supports 100 concurrent users"

### **S**cope-bound
- This feature only, not system-wide
- Achievable in this iteration
- Not dependent on future work

❌ "All forms validate input"
✅ "Password reset form validates email format"

## AC Writing Template

```markdown
- [ ] AC-{N}: Given {precondition}, when {action}, then {observable outcome}
```

**Examples:**

```markdown
- [ ] AC-01: Given a valid email, when user submits reset request, then email is sent within 30 seconds
- [ ] AC-02: Given an invalid email format, when user submits, then error message "Invalid email" displays
- [ ] AC-03: Given a non-existent email, when user submits, then same success message shows (no enumeration)
```

## AC Count by Scope

| Scope | AC Count | Focus |
|-------|----------|-------|
| trivial | 1-2 | Just the change |
| small | 3-5 | Happy path + 1 error |
| medium | 8-12 | Full coverage |
| large | 15+ | Comprehensive |
| complex | 20+ | Multi-phase |

## Common AC Categories

### Functional (Required)
- Happy path completion
- Input validation
- Error handling
- State changes

### Security (When Applicable)
- Authentication checks
- Authorization checks
- Input sanitization
- Rate limiting

### Performance (When Applicable)
- Response time thresholds
- Concurrent user support
- Resource limits

### Accessibility (When Applicable)
- Keyboard navigation
- Screen reader support
- Color contrast

## Anti-Patterns

❌ **Vague criteria**
"System handles errors gracefully"

✅ **Specific criteria**
"When API returns 500, user sees 'Service unavailable, try again' message"

---

❌ **Implementation details**
"Uses Redis for caching"

✅ **Behavioral outcome**
"Subsequent requests return in < 100ms"

---

❌ **Multiple conditions**
"User can log in with email or username and see dashboard"

✅ **Single condition each**
"AC-01: User can log in with email"
"AC-02: User can log in with username"
"AC-03: After login, user sees dashboard"

---

❌ **Untestable**
"Code is well-structured"

✅ **Testable**
"No function exceeds cyclomatic complexity of 10"
