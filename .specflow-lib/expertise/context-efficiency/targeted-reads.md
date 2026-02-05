# Targeted Section Reading Patterns

Patterns for reading specific sections of files rather than full files to reduce context window usage.

## Core Principle

**Read sections, not files.** Most SpecFlow artifacts are structured with clear headers. Reading a specific section is ~60% cheaper than reading the full file.

## Section Read Syntax

When reading files, use section-specific comments in your approach:

```
Read ## Acceptance Criteria section from requirements-lock.md
Read TC-01 through TC-05 from requirements-lock.md
Read STRIDE table from 3-security.md
Read ADR-001 section from 2-architecture.md
```

**Implementation:** Use Read tool with offset/limit for large files, or grep section headers to locate content.

## File-Specific Read Patterns

| File | Common Sections | When to Read Full |
|------|-----------------|-------------------|
| `5-requirements-lock.md` | AC section only, TC table only, SC section only | Never - always use sections |
| `2-architecture.md` | Specific ADR by ID, Key Files table, Component diagram | Only for architect role doing full review |
| `3-security.md` | STRIDE table, Threats section, Mitigations list | Only if security concerns flagged |
| `5-test-plan.md` | Test Matrix section, Test Types table | Only for QA role doing full execution |
| `1-spec.md` | Requirements table, Scope section | Only for analyst role updating spec |
| `0-triage.md` | Pillars section, Sequence section | Usually read full (small file ~50 lines) |
| `0-scope.md` | Scope level, Risk factors | Usually read full (small file ~40 lines) |
| `STATE.md` | Current feature, Phase status | Usually read full (context file) |

## Role-Specific Read Patterns

### Dev Role

Read only what's needed for implementation:

```markdown
1. TC constraints from requirements-lock.md (Technical Constraints table only)
2. IP integration points from requirements-lock.md (Integration Points section only)
3. Relevant ADR from architecture.md (specific ADR section, not all ADRs)
4. Key Files table from architecture.md (file locations only)
```

**Skip:** Security STRIDE table (already baked into TC), full spec prose, test matrix

### QA Role

Read only what's needed for test execution:

```markdown
1. AC list from requirements-lock.md (Acceptance Criteria table only)
2. Test Types from test-plan.md (Test Types section only)
3. Security constraints from security.md (Constraints section only, not full STRIDE)
4. Relevant TC IDs from requirements-lock.md (specific TCs referenced in AC)
```

**Skip:** Full architecture ADRs, implementation details, spec rationale

### Review Role

Read only what's needed for reviewing specific findings:

```markdown
1. Specific finding by ID (e.g., read SEC-001 section only)
2. Relevant code section (file + line range, not full file)
3. Related AC if behavior is questioned (specific AC-ID only)
4. Related TC if implementation is questioned (specific TC-ID only)
```

**Skip:** Full test plan, full architecture, unrelated findings

## Context Budget Guidance

### Token Targets

| Section Type | Target Tokens | Max Before Extraction |
|--------------|---------------|----------------------|
| Single AC item | 50-100 | 150 |
| Single TC row | 50-100 | 150 |
| Single ADR | 200-400 | 600 |
| Section (e.g., Threats) | 100-300 | 500 |
| Table (e.g., STRIDE) | 200-400 | 600 |

### When Section Exceeds Budget

If a section exceeds its token budget:

1. **Extract only relevant rows/items** - not the full table
2. **Summarize in comments** - "TC-01 through TC-05 cover auth; TC-06 covers rate limiting"
3. **Reference by ID** - "See TC-06 for rate limiting constraints" without copying full content

### Example: Large STRIDE Table

Instead of:
```
Read full STRIDE table (600+ tokens)
```

Do:
```
Read Spoofing row only from STRIDE table (~80 tokens)
Read Tampering row only if data modification is relevant (~80 tokens)
```

## Anti-Patterns to Avoid

### 1. Reading Full Files When Sections Suffice

**Bad:**
```
Read 5-requirements-lock.md (full file)
```

**Good:**
```
Read ## Acceptance Criteria from 5-requirements-lock.md
Read TC-01, TC-03 from Technical Constraints table
```

### 2. Reading All ADRs When Only One Is Relevant

**Bad:**
```
Read 2-architecture.md to find database decision
```

**Good:**
```
Grep for "database" in 2-architecture.md headers
Read ADR-003: Database Selection section only
```

### 3. Reading Full Test Plan When Only Test Types Needed

**Bad:**
```
Read 5-test-plan.md (includes all test cases)
```

**Good:**
```
Read ## Test Types section from 5-test-plan.md
```

### 4. Reading Entire Security Analysis for Single Threat

**Bad:**
```
Read 3-security.md to check authentication threats
```

**Good:**
```
Read ## Spoofing section from 3-security.md
Read ## Elevation of Privilege section if auth-related
```

### 5. Reading All Prior Agent Outputs

**Bad:**
```
Read 0-triage.md, 0-scope.md, 1-spec.md, 1.5-codebase-constraints.md,
2-architecture.md, 3-security.md, 4-cost.md, 5-test-plan.md, 5-requirements-lock.md
```

**Good:**
```
Read STATE.md for current context
Read relevant sections from requirements-lock.md (synthesis of all prior)
Read specific ADR if implementation question
```

## Implementation Notes

### Using Read Tool Efficiently

For files with known structure:
1. Read first 30 lines to find section headers
2. Note line numbers for target sections
3. Read specific line ranges with offset/limit

For files with unknown structure:
1. Use Grep to find section header
2. Read from that line number with reasonable limit
3. Adjust if section is larger than expected

### Combining with Context Summarization

For handoffs between agents, summarize instead of passing full sections:

```yaml
# Instead of copying full TC table
technical_constraints_summary:
  auth: "JWT with 15-min expiry, refresh rotation"
  rate_limiting: "100 req/min per user, 1000 req/min global"
  database: "PostgreSQL with row-level security"
```

This reduces a 500-token table to ~50 tokens.
