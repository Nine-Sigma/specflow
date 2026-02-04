---
name: slop-detector
description: Detect AI-generated code quality issues (duplicates, dead code, placeholders, empty catches)
review-capable: true
scope-minimum: trivial
triggers:
  files:
    - "*.ts"
    - "*.tsx"
    - "*.js"
    - "*.jsx"
    - "*.py"
    - "*.go"
    - "src/**/*"
    - "lib/**/*"
  patterns:
    - "TODO"
    - "FIXME"
    - "console\\.log"
    - "console\\.debug"
    - "print\\("
    - "// .*placeholder"
    - "pass\\s*#"
---

# Slop Detector

Detect AI-generated code quality issues using specialized static analysis tools.

## What is "AI Slop"?

AI-generated code tends to have predictable quality issues:
- Duplicated utility functions (same logic in 3+ places)
- Unused helper functions (created "just in case")
- Placeholder TODOs that never get resolved
- Console.log/print left in production code
- Empty catch blocks (swallowed errors)
- Bare except clauses (Python)
- Unused imports/exports
- Commented-out code blocks

## Tools Used

| Tool | What It Finds | Languages | Required |
|------|---------------|-----------|----------|
| ast-grep | Structural patterns (empty catch, console.log) | Any (tree-sitter) | No |
| jscpd | Duplicate code blocks | Any | No |
| knip | Unused exports/dependencies | JS/TS | No |
| vulture | Dead code | Python | No |
| ruff | Unused imports/vars | Python | No |

**Note:** Missing tools are skipped. At least one tool should be available for meaningful results.

## Tool Availability Handling

### Detection Matrix

After checking tool availability, record which tools can run:

| Tool | Check Command | Fallback |
|------|--------------|----------|
| ast-grep | `which ast-grep` | Skip structural analysis |
| jscpd | `which jscpd` | Skip duplicate detection |
| knip | `npx knip --version` | Skip unused exports (JS/TS) |
| vulture | `which vulture` | Skip dead code (Python) |
| ruff | `which ruff` | Skip unused imports (Python) |

### Minimum Requirements

The skill can run with any ONE of:
- ast-grep (structural patterns)
- jscpd (duplicates)
- knip OR vulture OR ruff (unused code)

If NO tools are available, return early:

```markdown
### slop-detector Findings

**Status:** SKIPPED - No analysis tools available

Install at least one tool:
- `npm i -g @ast-grep/cli` (recommended - covers all languages)
- `npm i -g jscpd` (duplicate detection)
- `npm i -g knip` (JS/TS unused code)
- `pip install vulture ruff` (Python)

No findings to report.
```

## Execution Methodology

### Step 1: Detect Available Tools

Check which tools are installed (non-blocking - skip missing tools):

```bash
# Check each tool
which ast-grep 2>/dev/null && echo "ast-grep: available" || echo "ast-grep: not found"
which jscpd 2>/dev/null && echo "jscpd: available" || echo "jscpd: not found"
npx knip --version 2>/dev/null && echo "knip: available" || echo "knip: not found"
which vulture 2>/dev/null && echo "vulture: available" || echo "vulture: not found"
which ruff 2>/dev/null && echo "ruff: available" || echo "ruff: not found"
```

Record available tools. If none are available, return early with note.

### Step 2: Detect Project Type

```bash
# Check for project files
ls package.json 2>/dev/null && echo "Node.js project"
ls pyproject.toml setup.py 2>/dev/null && echo "Python project"
ls go.mod 2>/dev/null && echo "Go project"
ls Cargo.toml 2>/dev/null && echo "Rust project"
```

Determine primary language(s) from changed files.

### Step 3: Run Tools

Get skill directory for pattern file references:
```bash
SKILL_DIR=".specflow/skills/slop-detector"
```

#### 3a: Run ast-grep (if available)

For TypeScript/JavaScript files:
```bash
ast-grep scan --rule "$SKILL_DIR/patterns/ts-slop.yml" {files} --json 2>/dev/null
```

For Python files:
```bash
ast-grep scan --rule "$SKILL_DIR/patterns/py-slop.yml" {files} --json 2>/dev/null
```

If pattern files don't exist or ast-grep unavailable, use inline patterns:
```bash
ast-grep --lang typescript -p 'catch ($_) { }' {files}
ast-grep --lang typescript -p 'console.log($$$)' {files}
ast-grep --lang python -p 'except: pass' {files}
ast-grep --lang python -p 'print($$$)' {files}
```

#### 3b: Run jscpd (if available)

```bash
jscpd --config "$SKILL_DIR/config/jscpd.json" {files} --reporters json 2>/dev/null
```

Or with defaults:
```bash
jscpd --min-lines 5 --min-tokens 50 --reporters json {files}
```

#### 3c: Run knip (if available, JS/TS projects only)

```bash
npx knip --include exports,dependencies --no-exit-code 2>/dev/null
```

#### 3d: Run vulture (if available, Python projects only)

```bash
vulture {files} --min-confidence 80 2>/dev/null
```

#### 3e: Run ruff (if available, Python projects only)

```bash
ruff check {files} --select=F401,F841,F811 --output-format=json 2>/dev/null
```

### Step 4: Map Tool Output to Findings

| Tool Finding | Severity | ID Prefix | Example |
|--------------|----------|-----------|---------|
| Empty catch block | MAJOR | SLOP-EC | `catch (e) { }` |
| Console.log in prod | MINOR | SLOP-CL | `console.log("debug")` |
| Unresolved TODO | MINOR | SLOP-TD | `// TODO: fix later` |
| Duplicate code (>10 lines) | MAJOR | SLOP-DUP | 15 lines duplicated |
| Duplicate code (5-10 lines) | MINOR | SLOP-DUP | 7 lines duplicated |
| Unused export | MINOR | SLOP-UN | `export function unused()` |
| Dead function | MAJOR | SLOP-DEAD | Function never called |
| Bare except (Python) | MAJOR | SLOP-ERR | `except: pass` |
| Debug print statement | MINOR | SLOP-DBG | `print("debug")` |
| Unused import | MINOR | SLOP-IMP | `import unused` |

### Step 5: Return Findings

Output in standard skill format for sf-review consolidation:

```markdown
### slop-detector Findings

| ID | Location | Issue | AC Reference | Severity |
|----|----------|-------|--------------|----------|
| SLOP-EC-01 | src/auth.ts:45 | Empty catch block swallows errors | AC-?? | MAJOR |
| SLOP-DUP-01 | src/utils.ts:12-24 | Duplicate of src/helpers.ts:5-17 (87% similar) | AC-?? | MAJOR |
| SLOP-CL-01 | src/api.ts:89 | console.log left in production code | AC-?? | MINOR |

### SLOP-EC-01: Empty catch block
**What's wrong:** Error is caught but not handled, silently failing
**How to fix:** Add error handling (log, rethrow, or recover)
**Files to change:** src/auth.ts

### SLOP-DUP-01: Duplicate code block
**What's wrong:** Same logic duplicated in two files (87% similar)
**How to fix:** Extract to shared utility function
**Files to change:** src/utils.ts, src/helpers.ts

### SLOP-CL-01: Console.log in production
**What's wrong:** Debug statement left in code
**How to fix:** Remove console.log or use proper logging
**Files to change:** src/api.ts
```

## Routing

All slop-detector findings route to **Dev** (never QA):
- Code quality issues are Dev responsibility
- Dev fixes in existing review loop
- Re-review verifies fixes

## Tool Output Parsing

### ast-grep Output Format

ast-grep with `--json` outputs:
```json
[
  {
    "text": "catch (e) { }",
    "range": {
      "start": {"line": 45, "column": 4},
      "end": {"line": 45, "column": 17}
    },
    "file": "src/auth.ts",
    "rule_id": "empty-catch-block",
    "message": "Empty catch block swallows errors silently",
    "severity": "error"
  }
]
```

**Parsing logic:**
```
FOR each match in ast-grep output:
  id = generate_id(rule_id)  # SLOP-EC-01, SLOP-CL-01, etc.
  location = "{file}:{range.start.line}"
  issue = message
  severity = map_severity(severity)  # error -> MAJOR, warning -> MINOR

  ADD to findings table
```

**Severity mapping:**
| ast-grep severity | Finding severity |
|-------------------|------------------|
| error | MAJOR |
| warning | MINOR |
| hint | MINOR |

### jscpd Output Format

jscpd with `--reporters json` outputs to `jscpd-report/jscpd-report.json`:
```json
{
  "duplicates": [
    {
      "format": "typescript",
      "lines": 12,
      "tokens": 87,
      "firstFile": {
        "name": "src/utils.ts",
        "start": 10,
        "end": 22
      },
      "secondFile": {
        "name": "src/helpers.ts",
        "start": 5,
        "end": 17
      },
      "fragment": "function helper(x) {\n  return x * 2;\n}"
    }
  ],
  "statistics": {
    "total": {"lines": 1500},
    "duplicates": {"lines": 24, "percentage": "1.6%"}
  }
}
```

**Parsing logic:**
```
FOR each duplicate in jscpd output:
  id = "SLOP-DUP-{N}"
  location = "{firstFile.name}:{firstFile.start}-{firstFile.end}"
  lines = duplicate.lines

  IF lines > 10:
    severity = MAJOR
  ELSE:
    severity = MINOR

  issue = "Duplicate of {secondFile.name}:{secondFile.start}-{secondFile.end} ({lines} lines)"

  ADD to findings table
```

### knip Output Format

knip outputs text format (use `--reporter json` if available):
```
Unused exports:
  src/utils.ts: helperFunc, unusedConst
Unused dependencies:
  lodash, moment
```

**Parsing logic:**
```
FOR each "Unused exports" line:
  id = "SLOP-UN-{N}"
  location = file path
  severity = MINOR
  issue = "Unused export: {symbol}"
```

### vulture Output Format

vulture outputs text:
```
src/helpers.py:45: unused function 'old_helper' (60% confidence)
src/utils.py:12: unused variable 'temp' (80% confidence)
```

**Parsing logic:**
```
FOR each vulture line:
  PARSE: {file}:{line}: unused {type} '{name}' ({confidence}% confidence)

  IF confidence >= 80:
    id = "SLOP-DEAD-{N}"
    location = "{file}:{line}"
    severity = MAJOR if type == "function" else MINOR
    issue = "Dead {type}: {name}"
```

### ruff Output Format

ruff with `--output-format=json`:
```json
[
  {
    "code": "F401",
    "message": "'os' imported but unused",
    "filename": "src/main.py",
    "location": {"row": 1, "column": 1}
  }
]
```

**Parsing logic:**
```
FOR each ruff issue:
  IF code in [F401, F841, F811]:
    id = "SLOP-IMP-{N}" if F401 else "SLOP-VAR-{N}"
    location = "{filename}:{location.row}"
    severity = MINOR
    issue = message
```

## Error Handling

### Tool Execution Errors

If a tool fails, log and continue with other tools:

```
TRY: run ast-grep
  IF exit_code != 0:
    LOG: "ast-grep failed: {stderr}"
    CONTINUE  # Don't fail the whole skill

TRY: run jscpd
  IF exit_code != 0:
    LOG: "jscpd failed: {stderr}"
    CONTINUE

# ... same for other tools
```

### Common Error Cases

| Error | Cause | Handling |
|-------|-------|----------|
| Tool not found | Not installed | Skip tool, suggest install |
| Pattern file not found | Skill incomplete | Use inline patterns |
| Permission denied | File access | Skip file, log warning |
| Timeout | Large codebase | Limit file count per run |
| Invalid JSON | Tool bug | Log error, skip tool output |

### Error Summary in Output

If any tools failed, include in findings output:

```markdown
### slop-detector Findings

**Tools Status:**
- ast-grep: OK (15 files scanned)
- jscpd: FAILED (timeout after 60s)
- knip: SKIPPED (not installed)
- vulture: OK (8 files scanned)

[... findings table ...]
```