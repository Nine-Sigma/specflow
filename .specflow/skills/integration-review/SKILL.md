---
name: integration-review
description: Detect breaking changes, circular imports, and integration issues in modified code. Use when reviewing PRs that modify exported functions, types, or module boundaries.
review-capable: true
scope-minimum: small
triggers:
  files:
    - "*.ts"
    - "*.tsx"
    - "*.js"
    - "*.jsx"
    - "*.py"
    - "*.go"
    - "src/**/*"
  patterns:
    - "export\\s+(default\\s+)?(function|const|class|interface|type)"
    - "import\\s+.*from"
    - "require\\("
    - "from\\s+['\"]"
    - "export\\s+\\{"
    - "export\\s+\\*\\s+from"
---

# Integration Review

Detect breaking changes, circular imports, and integration issues before they reach production.

## When to Use This Skill

- Reviewing PRs that modify exported functions, types, or constants
- Code changes that rename, remove, or change signatures of public interfaces
- Module restructuring (moving files, reorganizing exports)
- Adding new dependencies or imports that could create cycles
- Refactoring that touches module boundaries
- Any change to files in `src/` that export functionality

## Core Principles

### 1. Dependency Tracing

Find all callers of modified exports to identify impact scope.

**Key questions:**
- Who imports this module?
- Which functions/types are actually used by external consumers?
- Will existing callers still work after this change?

### 2. Interface Change Detection

Identify signature changes that break callers.

**Breaking change categories:**
- **Removal**: Exported function/type/constant deleted
- **Rename**: Export name changed without re-export alias
- **Signature change**: Parameters added (required), removed, or reordered
- **Type change**: Return type or parameter types modified
- **Default change**: Default parameter values altered

### 3. Circular Import Detection

Detect new imports that create dependency cycles.

**Cycle indicators:**
- Module A imports from Module B, Module B imports from Module A
- Indirect cycles through intermediate modules
- Runtime initialization order issues

## Dependency Tracing

Find all callers of modified exported functions to identify impact scope.

### Step 1: Extract Exports from Modified Files

For each modified file, identify exported symbols using Grep:

**TypeScript/JavaScript:**
```
export (function|const|class|interface|type|enum) {name}
export default (function|class|const)
export { name1, name2 }
export * from
module.exports
```

**Python:**
```
from {module} import
__all__ = [...]
def {Name}  # PascalCase = likely public
class {Name}
```

### Step 2: Find Callers of Exported Symbols

For each exported symbol, find files that import and use it:

**Find importers (Grep pattern):**
```
import .* from ['"].*{modulePath}['"]
import { {symbolName} } from
require(['"].*{modulePath}['"])
from {modulePath} import {symbolName}
```

**Find usages in importers (Grep pattern):**
```
{symbolName}\s*\(              # Function call
{symbolName}\.                 # Property access
<{symbolName}                  # JSX component
{symbolName}:                  # Type annotation
```

### Step 3: Build Caller List

Output format:
```markdown
### Callers of `{symbolName}` from `{filePath}`

| File | Line | Usage Type |
|------|------|------------|
| src/pages/profile.tsx | 23 | Function call |
| src/services/auth.ts | 156 | Property access |

Total: {N} callers in {M} files
```

**Limits:**
- Max 20 callers listed per symbol (summarize if more)
- Depth limit: Direct callers only (re-exports noted separately)

## Interface Change Detection

Detect when function signatures change in ways that break callers.

### Breaking Change Rules

**BREAKING - Must fix before merge:**

| Change Type | Before | After | Why Breaking |
|-------------|--------|-------|--------------|
| Required param added | `foo(a: string)` | `foo(a: string, b: number)` | Existing callers pass wrong arity |
| Param removed | `foo(a, b)` | `foo(a)` | Existing callers pass extra arg |
| Return type changed | `foo(): string` | `foo(): number` | Callers expect string |
| Export removed | `export function foo` | `function foo` (no export) | Callers can't import |
| Renamed export | `export { foo }` | `export { bar }` | Callers import old name |

**SAFE - No caller impact:**

| Change Type | Before | After | Why Safe |
|-------------|--------|-------|----------|
| Optional param added | `foo(a: string)` | `foo(a: string, b?: number)` | Existing calls still valid |
| Param default added | `foo(a, b)` | `foo(a, b = 10)` | Existing calls still valid |
| Implementation change | `return a + b` | `return a + b + c` | Signature unchanged |
| New export added | (nothing) | `export function bar` | New, no existing callers |

### Detection Algorithm

1. **For each modified file with exports:**
   - Extract old signature (from git diff `---` lines)
   - Extract new signature (from git diff `+++` lines)
   - Compare: params (count, types, optionality), return type, export status

2. **Flag as BREAKING if:**
   - Required parameter count increased
   - Required parameter count decreased
   - Parameter type changed (strict: same name, different type)
   - Return type changed
   - Export statement removed

3. **Output format:**
```markdown
### Interface Change: `{functionName}` in `{filePath}`

**Status:** BREAKING | SAFE

**Change:**
- Before: `function foo(a: string): number`
- After: `function foo(a: string, b: number): number`

**Impact:** Required parameter added - {N} callers will fail

**Callers to update:**
{List from Dependency Tracing}
```

### Limitations

- Type inference not performed (compare literal types only)
- Generic constraints not deeply analyzed
- Overloads: each signature compared independently

## Circular Import Detection

Detect when new imports create circular dependencies.

### Detection Algorithm

1. **For each new import added in modified files:**
   - Extract imported module path
   - Check if that module imports back to current file
   - Check transitive imports (A -> B -> C -> A) with depth limit of 5

2. **Using Grep to trace:**
   ```
   # In modified file (A), find new import of B
   import .* from ['"].*{moduleB}['"]

   # In B, check for import of A
   import .* from ['"].*{moduleA}['"]
   ```

3. **Severity classification:**
   - **HIGH:** Value imports creating runtime cycle
   - **MEDIUM:** Mixed value and type imports
   - **LOW:** Type-only imports (`import type`) - usually safe

### Output Format

```markdown
### Circular Import: `{fileA}` <-> `{fileB}`

**Severity:** HIGH | MEDIUM | LOW

**Cycle Path:**
1. `src/utils/index.ts` imports `src/helpers/format.ts`
2. `src/helpers/format.ts` imports `src/utils/index.ts`

**Risk:** May cause undefined at runtime depending on load order

**Recommendation:**
- Extract shared code to third module
- Convert to type-only import if possible
- Verify load order doesn't cause issues
```

### Limitations

- Dynamic imports (`import()`) not traced
- Re-exports via barrel files may obscure cycles
- Monorepo workspace imports not resolved

---

## Output Format

The skill produces a findings document for sf-review consolidation.

### Status Determination

| Findings | Status |
|----------|--------|
| No issues found | SAFE |
| Warnings only (LOW severity circulars, indirect callers) | RISKS_IDENTIFIED |
| Any BREAKING interface change | BREAKING |
| Any HIGH severity circular | BREAKING |

### Full Output Template

```markdown
# Integration Review Findings

## Status: SAFE | RISKS_IDENTIFIED | BREAKING

## Summary

{1-2 sentences: X exports analyzed, Y callers found, Z interface changes detected}

## Breaking Changes

| ID | Location | Issue | Callers Affected |
|----|----------|-------|------------------|
| B-01 | src/api/users.ts:45 | Parameter removed from `getUser()` | 3 files |

{For each breaking change, include detailed section}

## Risks Identified

| ID | Location | Issue | Severity |
|----|----------|-------|----------|
| R-01 | src/utils/index.ts | Circular import with src/helpers | MEDIUM |

{For each risk, include detailed section}

## Safe Changes

{List of analyzed exports that are safe - no caller impact}

## Route Decision

**Route to:** Dev
**Reason:** Integration issues are code issues, not test issues

{All integration review findings route to Dev, never QA}
```
