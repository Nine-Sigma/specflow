# Smart Test Selection

Only run tests affected by changes, not the entire suite.

## Why Smart Selection

Running all tests on every change is wasteful:
- Large test suites take minutes (or hours)
- Unrelated tests don't provide signal
- Slow feedback kills developer flow

Smart selection runs only tests affected by the changed files.

## Detection Methods

### 1. Direct Imports

Test directly imports the changed file:

```typescript
// src/auth.ts (CHANGED)
export function logout() { ... }

// src/auth.test.ts (SELECTED)
import { logout } from './auth';
```

### 2. Transitive Dependencies

Test imports a module that imports the changed file:

```typescript
// src/session.ts (CHANGED)
export function clearSession() { ... }

// src/auth.ts (imports session)
import { clearSession } from './session';

// src/auth.test.ts (SELECTED - transitive dep)
import { logout } from './auth';
```

### 3. Pattern Matching

Test filename matches changed filename:

```
src/auth.ts (CHANGED) -> src/auth.test.ts (SELECTED)
src/api/users.ts (CHANGED) -> src/api/users.test.ts (SELECTED)
```

### 4. Fallback

If detection produces zero tests, run entire suite as safety fallback.

## Framework Commands

| Framework | Smart Selection Command |
|-----------|------------------------|
| Vitest | `vitest related <files> --run` |
| Jest | `jest --findRelatedTests <files>` |
| Pytest | `pytest-testmon` or explicit test list |
| Go | `go test -run <pattern>` |

**Important:** Use `vitest related` (NOT `--changed` which has bugs).

The `--changed` flag in Vitest has known issues with detecting changes correctly. The `related` command explicitly accepts file paths and is more reliable.

## Algorithm

```
INPUT: changed_files from 6-dev-output.md
OUTPUT: affected_tests list

affected_tests = []

for test in all_tests:
  # Method 1: Direct imports
  if test.imports_any(changed_files):
    affected_tests.add(test)
    continue

  # Method 2: Transitive deps (1 level)
  for dep in test.imports():
    if dep.imports_any(changed_files):
      affected_tests.add(test)
      break

  # Method 3: Pattern matching
  for changed_file in changed_files:
    if test.name.startswith(changed_file.basename):
      affected_tests.add(test)
      break

# Method 4: Fallback
if affected_tests.empty():
  affected_tests = all_tests
  log("Warning: No affected tests found, running all")

return affected_tests
```

## Finding Changed Files

Extract from `6-dev-output.md` "Files Modified" table:

```markdown
## Files Modified

| File | Action | Lines Changed |
|------|--------|---------------|
| src/auth.ts | Modified | +45, -12 |
| src/session.ts | Added | +78 |
```

Parse the File column to get: `['src/auth.ts', 'src/session.ts']`

## Example Output

```bash
# Get changed files
CHANGED="src/auth.ts,src/session.ts"

# Vitest smart selection
vitest related src/auth.ts src/session.ts --run --coverage

# Output shows only affected tests:
#  auth.test.ts
#  session.test.ts
#  login-flow.integration.test.ts  (imports auth)
```

## Limitations

- Deep transitive deps (3+ levels) may be missed
- Dynamic imports not traced
- Monkey patching / runtime dependency injection not detected
