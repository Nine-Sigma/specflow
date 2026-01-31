---
version: 1.1
updated: ${timestamp}
---

<!--
STATE.md Template
=================
Location: .specflow/features/{slug}/STATE.md

Purpose: Track feature progress, agent states, and pending communications.
Updated by: PM and agents after each phase transition or COMMS change.

Version history:
- 1.0: Initial (current feature, position, decisions, blockers, notes)
- 1.1: Added Agent States, Pending Communications, pending_comms field
-->

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
| pending_comms | ${count-or-zero} |

## Agent States

<!--
Track state of each agent working on this feature.
States: running, blocked, complete
Blocker: COMMS filename that's blocking the agent, or dash if none
-->

| Agent | State | Blocker | Since |
|-------|-------|---------|-------|
| ${agent-name} | ${running|blocked|complete} | ${blocker-file-or-dash} | ${iso-timestamp} |

## Pending Communications

<!--
Track unresolved COMMS messages requiring PM routing.
Age: Time since message was created (e.g., "5m", "2h")
-->

| File | From | To | Status | Age |
|------|------|-----|--------|-----|
| ${comms-filename} | ${from-agent} | ${to-agent} | ${pending|resolved} | ${time-ago} |

## Decisions Made

${bulleted-list-of-key-decisions}

## Blockers

${bulleted-list-or-none}

## Context Notes

${free-form-notes-from-pm-or-user}
