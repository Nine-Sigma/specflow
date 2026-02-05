<!--
Story Template - BMAD Format
See: .specflow-lib/methodology/story-format.md
Requirements: WRK-13
-->
---
story_id: {epic}-{story}-{slug}
epic: {epic_number}
story: {story_number}
status: pending
created: {iso-timestamp}
depends_on: []
parallel_safe: false
estimated_points: 0
---

# Story {epic}.{story}: {Title}

## User Story

As a **{role}**,
I want **{goal}**,
So that **{benefit}**.

## Acceptance Criteria

<!-- BOSS: Binary, Observable, Specific, Scope-bound -->
- [ ] AC-01: {criterion}
- [ ] AC-02: {criterion}
- [ ] AC-03: {criterion}

## Technical Context

**From requirements-lock:**
{relevant FRs, TCs, SCs from 5-requirements-lock.md}

**From codebase-constraints:**
{relevant IPs from 1.5-codebase-constraints.md}

## Dependencies

- {list of story IDs this depends on, or "None (first story in epic)"}

## Dev Notes

{Implementation notes added by dev during work}

## Out of Scope

{Items explicitly NOT included in this story}
