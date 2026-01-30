# Assertion Templates

Reference guide for mapping BOSS criteria to test assertions.
Used by: criteria-reviewer.md for suggesting assertion-ready rewrites.

---

## Equality Assertions

Use when criterion specifies exact value match.

| Criterion Pattern | Assertion Template | Example |
|-------------------|-------------------|---------|
| "X equals Y" | expect(X).toBe(Y) | "Status code equals 200" |
| "X is Y" | expect(X).toBe(Y) | "User role is 'admin'" |
| "X returns Y" | expect(fn()).toBe(Y) | "Function returns true" |
| "X has value Y" | expect(X).toBe(Y) | "Field has value 'active'" |
| "X is set to Y" | expect(X).toBe(Y) | "Config is set to 'production'" |

---

## Comparison Assertions

Use when criterion specifies thresholds or ranges.

| Criterion Pattern | Assertion Template | Example |
|-------------------|-------------------|---------|
| "X is greater than Y" | expect(X).toBeGreaterThan(Y) | "Response time < 2s" |
| "X is less than Y" | expect(X).toBeLessThan(Y) | "Error count < 10" |
| "X is at least Y" | expect(X).toBeGreaterThanOrEqual(Y) | "Items >= 1" |
| "X is at most Y" | expect(X).toBeLessThanOrEqual(Y) | "Retries <= 3" |
| "X is between A and B" | expect(X).toBeGreaterThan(A); expect(X).toBeLessThan(B) | "Score 0-100" |

---

## Collection Assertions

Use when criterion specifies containment or membership.

| Criterion Pattern | Assertion Template | Example |
|-------------------|-------------------|---------|
| "X contains Y" | expect(X).toContain(Y) | "List contains item" |
| "X includes Y" | expect(X).toContain(Y) | "Response includes field" |
| "X has length N" | expect(X).toHaveLength(N) | "Results has 10 items" |
| "X is empty" | expect(X).toHaveLength(0) | "Error list is empty" |
| "X is not empty" | expect(X.length).toBeGreaterThan(0) | "Results returned" |
| "X has property Y" | expect(X).toHaveProperty('Y') | "User has email property" |

---

## State Assertions

Use when criterion specifies boolean or existence state.

| Criterion Pattern | Assertion Template | Example |
|-------------------|-------------------|---------|
| "X exists" | expect(X).toBeDefined() | "User record exists" |
| "X does not exist" | expect(X).toBeUndefined() | "Deleted record not found" |
| "X is null" | expect(X).toBeNull() | "Optional field is null" |
| "X is visible" | expect(element).toBeVisible() | "Error message visible" |
| "X is hidden" | expect(element).not.toBeVisible() | "Loading spinner hidden" |
| "X is enabled" | expect(X.disabled).toBe(false) | "Submit button enabled" |
| "X is disabled" | expect(X.disabled).toBe(true) | "Button disabled during load" |
| "X is true" | expect(X).toBeTruthy() | "Feature flag is true" |
| "X is false" | expect(X).toBeFalsy() | "Debug mode is false" |

---

## Error Assertions

Use when criterion specifies error handling.

| Criterion Pattern | Assertion Template | Example |
|-------------------|-------------------|---------|
| "X throws error" | expect(fn).toThrow() | "Invalid input throws" |
| "X throws error with message" | expect(fn).toThrow('message') | "Throws 'Invalid email'" |
| "X returns error code N" | expect(response.status).toBe(N) | "Returns 401 for invalid token" |
| "X displays error message" | expect(element.text).toContain(msg) | "Shows 'Invalid email'" |
| "X rejects with error" | await expect(promise).rejects.toThrow() | "Promise rejects on failure" |
| "X does not throw" | expect(fn).not.toThrow() | "Valid input does not throw" |

---

## Async Assertions

Use when criterion involves timing or async operations.

| Criterion Pattern | Assertion Template | Example |
|-------------------|-------------------|---------|
| "X completes within Y" | await expect(fn).resolves; expect(duration).toBeLessThan(Y) | "API responds in < 2s" |
| "X eventually shows Y" | await waitFor(() => expect(X).toContain(Y)) | "Toast appears" |
| "X resolves to Y" | await expect(promise).resolves.toBe(Y) | "Fetch resolves to data" |
| "X completes successfully" | await expect(promise).resolves.toBeDefined() | "Operation completes" |
| "X times out after Y" | await expect(fn).rejects.toThrow(/timeout/) | "Request times out" |

---

## Pattern Matching Assertions

Use when criterion specifies format or pattern.

| Criterion Pattern | Assertion Template | Example |
|-------------------|-------------------|---------|
| "X matches pattern" | expect(X).toMatch(/pattern/) | "Email matches format" |
| "X starts with Y" | expect(X).toMatch(/^Y/) | "URL starts with https" |
| "X ends with Y" | expect(X).toMatch(/Y$/) | "File ends with .json" |
| "X is valid email" | expect(X).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/) | "Email is valid format" |
| "X is valid UUID" | expect(X).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-/) | "ID is valid UUID" |

---

## HTTP Response Assertions

Use when criterion specifies API response behavior.

| Criterion Pattern | Assertion Template | Example |
|-------------------|-------------------|---------|
| "API returns status N" | expect(response.status).toBe(N) | "API returns 200" |
| "Response has header X" | expect(response.headers).toHaveProperty('X') | "Has Content-Type header" |
| "Response body contains X" | expect(response.body).toContain(X) | "Body contains user ID" |
| "Response is JSON" | expect(response.headers['content-type']).toContain('json') | "Response is JSON" |
| "Response time < N ms" | expect(responseTime).toBeLessThan(N) | "Response under 200ms" |

---

## Usage Notes

### Combining Assertions

Complex criteria may require multiple assertions:

```javascript
// Criterion: "User is authenticated and has admin role"
expect(session.userId).toBeDefined();
expect(session.role).toBe('admin');
```

### Negative Assertions

Use `.not` modifier for negative conditions:

```javascript
// Criterion: "Password is not stored in plain text"
expect(user.password).not.toBe(plainTextPassword);
```

### Custom Matchers

For domain-specific assertions, create custom matchers:

```javascript
// Criterion: "Price is valid currency format"
expect(price).toBeValidCurrency(); // Custom matcher
```

---

*Template version: 1.0*
*For use with: criteria-reviewer.md*
*Reference: assertion-ready validation section*
