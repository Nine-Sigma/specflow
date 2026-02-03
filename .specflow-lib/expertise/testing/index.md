# Testing Expertise

Extracted testing methodology for TEA (Test Engineering Analyst) and QA agents. Provides TDD workflow guidance, test specification formats, and traceability patterns.

## Purpose

Enable test-driven development workflows where:
- TEA writes test **specifications** (WHAT to test)
- QA writes test **implementations** (HOW to test) for integration/E2E/API tests
- Dev writes unit test implementations during internal TDD

## Contents

| File | Purpose | When to Use |
|------|---------|-------------|
| [test-specification.md](test-specification.md) | Test spec format for TEA output | TEA writing 5-test-plan.md |
| [traceability-matrix.md](traceability-matrix.md) | AC-to-test mapping format | TEA and PM validation |

## TDD Workflow Overview

### Role Separation

| Role | Responsibility | Writes |
|------|----------------|--------|
| TEA | Analyze ACs, determine test strategy | Test specifications, traceability matrix |
| QA | Implement behavior tests (qa-first path) | Integration, E2E, API tests |
| Dev | Implement code + unit tests | Unit tests, feature code |

### Flow Determination

TEA outputs `recommended_flow` based on test level analysis:

| recommended_flow | When | QA Involvement |
|------------------|------|----------------|
| `qa-first` | Integration/E2E/API tests needed | QA writes tests before Dev implements |
| `dev-only` | Unit tests only, or trivial scope | Dev does internal TDD, QA skipped |

### Workflow Paths

**qa-first path:**
```
TEA (specs) -> PM (validate) -> QA (write tests) -> Dev (implement) -> QA (verify)
```

**dev-only path:**
```
TEA (specs) -> PM (validate) -> Dev (implement + unit tests) -> PM (review)
```

## Agent Usage

### TEA (Test Engineering Analyst)

```markdown
Load and apply:
- `.specflow-lib/expertise/testing/test-specification.md` - How to write test specs
- `.specflow-lib/expertise/testing/traceability-matrix.md` - AC-to-test mapping
- `.specflow-lib/expertise/validation/test-criteria.md` - Scope-based test depth
```

### QA (Quality Assurance)

```markdown
Load and apply:
- `.specflow-lib/expertise/testing/test-specification.md` - Read specs to implement
- `.specflow-lib/expertise/validation/test-criteria.md` - Test quality standards
```

## Scope-Based Application

| Scope | TEA Effort | QA Involvement |
|-------|------------|----------------|
| trivial | Minimal spec | None (dev-only) |
| small | Light spec | None (dev-only) |
| medium | Standard spec | qa-first if integration needed |
| large | Full spec | qa-first |
| complex | Deep spec | qa-first with phased testing |
