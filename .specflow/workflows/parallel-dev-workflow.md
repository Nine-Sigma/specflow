# Parallel Development Workflow

**Purpose:** Coordinate Dev and QA agents working in parallel toward a shared spec

## Overview

Dev and QA work in isolated git worktrees, merging at defined checkpoints. Drift detection ensures alignment with acceptance criteria. Conflicts are resolved through a tiered system.

## Workflow Stages

### 1. Initialization
```bash
scripts/parallel-coordinator.sh start <feature>
```
- Creates isolated worktrees for Dev and QA
- Generates baseline tests from spec Gherkin scenarios
- Initializes execution state

### 2. Parallel Work
- **Dev worktree:** `.specflow/worktrees/<feature>/dev`
- **QA worktree:** `.specflow/worktrees/<feature>/qa`
- Both agents work independently
- QA restricted to test files only (enforced at merge)

### 3. Checkpoints

#### Component Complete
```bash
scripts/checkpoint-merge.sh signal <feature> dev component-complete
scripts/checkpoint-merge.sh signal <feature> qa component-complete
```
When both signal, checkpoint merge triggers:
1. QA scope validation
2. Drift detection
3. Dev changes merged
4. QA changes merged
5. Integration tests run
6. Worktrees rebased

#### Feature Complete
Same process, plus E2E tests.

### 4. Drift Handling

| Drift Type | Response |
|------------|----------|
| Aligned | Proceed normally |
| Missing (invalid) | Guidance generated, Dev continues |
| Exceeds Spec (valid) | PM notified, merge continues |

### 5. Conflict Resolution

| Tier | Trigger | Handler |
|------|---------|---------|
| Auto | File conflict | Dev wins src/, QA wins tests/ |
| PM | Logic disagreement after 2 attempts | PM decides, updates spec |
| User | PM escalates | User makes final call |

## Commands Reference

| Command | Description |
|---------|-------------|
| `parallel-coordinator.sh start <feature>` | Initialize parallel work |
| `parallel-coordinator.sh cleanup <feature>` | Remove worktrees |
| `checkpoint-merge.sh signal <feature> <agent> <checkpoint>` | Signal checkpoint ready |
| `checkpoint-merge.sh merge <feature> <checkpoint>` | Force merge |
| `checkpoint-merge.sh merge <feature> <checkpoint> --skip-drift-check` | Emergency merge (skip drift) |
| `drift-detector.sh detect <feature> <checkpoint>` | Run drift detection |
| `drift-detector.sh list-handoffs [agent]` | List pending handoffs |
| `conflict-resolver.sh resolve <feature> <conflict_id>` | Resolve conflict |
| `conflict-resolver.sh pm-decision <feature> <conflict_id> <decision>` | Apply PM decision |

## File Locations

| File | Purpose |
|------|---------|
| `.specflow/worktrees/<feature>/` | Isolated worktrees |
| `.specflow/execution/<feature>/state.json` | Execution state |
| `.specflow/execution/<feature>/drift-reports/` | Drift analysis |
| `.specflow/execution/<feature>/merge-results/` | Checkpoint results |
| `.specflow/execution/<feature>/conflicts/` | Active conflicts |
| `.specflow/handoffs/pm-conflict-*.md` | PM conflict escalations |
| `.specflow/handoffs/pm-improvement-*.md` | PM improvement escalations |
| `.specflow/handoffs/pm-drift-*.md` | PM drift escalations |
| `.specflow/handoffs/dev-guidance-*.md` | Dev guidance handoffs |

## Script Sourcing Order

Scripts must be sourced in the correct order to avoid circular dependencies:

1. **parallel-coordinator.sh** - Base script, standalone (no sources)
2. **sync-manager.sh** - Standalone (no sources from Phase 9)
3. **drift-detector.sh** - Sources: parallel-coordinator.sh, sync-manager.sh
4. **conflict-resolver.sh** - Sources: parallel-coordinator.sh, sync-manager.sh
5. **checkpoint-merge.sh** - Sources: parallel-coordinator.sh, sync-manager.sh, drift-detector.sh, conflict-resolver.sh

```bash
# In checkpoint-merge.sh:
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/parallel-coordinator.sh"
source "$SCRIPT_DIR/sync-manager.sh"
source "$SCRIPT_DIR/drift-detector.sh"
source "$SCRIPT_DIR/conflict-resolver.sh"
```

## Sourcing Diagram

```
               parallel-coordinator.sh
               (standalone - no deps)
                    |
    +---------------+---------------+
    |               |               |
    v               v               v
drift-detector  conflict-resolver  checkpoint-merge
(sources p-c,   (sources p-c,     (sources all above)
 sync-manager)   sync-manager)
```

## Conflict Resolution Flow

```
                   Merge Conflict Detected
                           |
                           v
                  +------------------+
                  | create_conflict() |
                  +------------------+
                           |
                           v
                  +------------------+
                  | resolve_conflict()|
                  +------------------+
                           |
              +------------+------------+
              |            |            |
              v            v            v
         File Conflict  Logic Conflict  Spec Conflict
              |            |            |
              v            v            v
         Auto-resolve   Clarification  Clarification
         (ownership)    Request        Request
              |            |            |
              v            v            v
           RESOLVED    Attempt < 2?  Attempt < 2?
                         |  |          |  |
                     yes |  | no   yes |  | no
                         v  v          v  v
                    Request  Escalate  Request  Escalate
                    Clarify  to PM     Clarify  to PM
                           |            |
                           v            v
                    +------------------+
                    | escalate_to_pm() |
                    +------------------+
                           |
                    PM decides?
                     |       |
                 yes |       | no (escalate)
                     v       v
              apply_pm_     escalate_to_user()
              decision()          |
                     |            v
                     |    User decides
                     |            |
                     v            v
               RESOLVED      apply_pm_decision()
                                  |
                                  v
                              RESOLVED
```

## Ticket Updates Throughout

At each stage, tickets are updated via `sync_ticket_comments` or `tracker_add_comment`:

1. **Conflict Created** - Ticket notified of conflict
2. **Clarification Requested** - Ticket notified, link to clarification file
3. **Escalated to PM** - Ticket notified, link to PM handoff
4. **Escalated to User** - Ticket notified, PM was unable to resolve
5. **Resolved** - Ticket notified with resolution type and affected files
6. **Spec Updated** - Ticket notified of criterion changes

---

*SpecFlow Workflow: parallel-dev-workflow*
*Related: parallel-coordinator.sh, checkpoint-merge.sh, drift-detector.sh, conflict-resolver.sh*
