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

## Output Status

After analysis, report one of:

| Status | Meaning |
|--------|---------|
| SAFE | No breaking changes or integration risks detected |
| RISKS_IDENTIFIED | Potential issues found that need review |
| BREAKING | Definite breaking changes that will affect callers |

## Route Decision

All findings from integration review route to **Dev** (not QA).

Integration issues are code structure problems that Dev must fix. QA cannot test around broken imports or circular dependencies.

**Severity mapping:**
- CRITICAL: Breaking change with known callers, circular import causing runtime error
- MAJOR: Potential breaking change, possible cycle that may cause issues
- MINOR: Style issues in exports, unnecessary re-exports
