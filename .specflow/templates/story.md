---
story_id: "{story_id}"
epic: {epic_number}
story: {story_number}
title: "{title}"
status: pending
parallel_safe: {true|false}
depends_on: []
estimated_points: {points}
test_command: "{test_command}"
created_at: "{iso-timestamp}"
---

# Story: {title}

## User Story

As a {user_type},
I want to {action},
So that {benefit}.

## Acceptance Criteria

<!-- BOSS: Binary, Observable, Specific, Scope-bound -->

- [ ] AC-01: {criterion}
- [ ] AC-02: {criterion}
- [ ] AC-03: {criterion}

## Interface Contract

<!-- Only include for stories that other stories depend on -->
<!-- Specifies exact function signatures, types, exports -->

```typescript
// {file_path}
export {function_signature};
```

## Technical Context

### Source Requirements
- FR-{N}: {requirement from lock}
- TC-{N}: {constraint from lock}

### Integration Points
- IP-{N}: {file} - {interface}

### Codebase Patterns
{Relevant patterns from 1.5-codebase-constraints.md}

## Dependencies

| Story ID | What It Provides |
|----------|------------------|
| {dep_id} | {what this story needs from it} |

## Out of Scope

- {Item explicitly not in this story}

## Dev Notes

<!-- Filled in during implementation -->

## Test Evidence

<!-- Filled in during TDD: test outputs proving AC complete -->
