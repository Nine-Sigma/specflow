---
version: 1.0
updated: ${timestamp}
---

# SpecFlow Session State

## Current Feature

| Field | Value |
|-------|-------|
| slug | ${feature-slug} |
| started | ${iso-timestamp} |
| status | ${not-started|in-progress|completed|blocked} |

## Position

| Field | Value |
|-------|-------|
| last-agent | ${agent-name or none} |
| next-agent | ${agent-name or pm-review} |
| phase | ${triage|pillars|execution|review} |

## Decisions Made

${bulleted-list-of-key-decisions}

## Blockers

${bulleted-list-or-none}

## Context Notes

${free-form-notes-from-pm-or-user}
