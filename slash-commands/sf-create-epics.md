# /sf:create-epics - Create Epics and Stories

Wraps BMAD `/create-epics-and-stories` with BOSS criteria.

## Usage

```
/sf:create-epics
```

## SpecFlow Context

<!-- Requirements: WRK-27, WRK-28 -->

**Required Reading:**
- `.specflow/features/{slug}/5-requirements-lock.md` - Source requirements
- `.specflow/features/{slug}/sprint-status.yaml` - Work tracker (if exists)
- `.specflow/features/{slug}/1.5-codebase-constraints.md` - Integration points

Creates epics/stories with:
- BOSS-validated acceptance criteria
- Story points estimation
- Dependency mapping
- **Sprint-status integration** (WRK-27)

## Prerequisites

- Requirements lock approved (5-requirements-lock.md exists and is frozen)
- Scope >= medium (small scope skips story generation)

## BOSS Criteria

All acceptance criteria must be:
- **B**inary: Pass/fail (no partial credit)
- **O**bservable: Verifiable by running code
- **S**pecific: Exact values, thresholds, counts
- **S**cope-bound: This feature only

## Output Format

### 5.5-epics.md

```markdown
---
feature: {slug}
created: {iso-timestamp}
source: 5-requirements-lock.md
total_stories: {count}
total_points: {sum}
---

# Epic Breakdown: {Feature Name}

## Requirements Coverage

| FR | Epic | Stories |
|----|------|---------|
| FR-01 | 1 | 1-1, 1-2 |
| FR-02 | 1 | 1-3 |
| FR-03 | 2 | 2-1 |

## Epic 1: {Name}

**Goal:** {Brief description}

**Stories:**
1. Story 1.1: {Title} ({points} pts)
2. Story 1.2: {Title} ({points} pts)
3. Story 1.3: {Title} ({points} pts)

**FR Coverage:** FR-01, FR-02
**Dependencies:** None (first epic)

## Epic 2: {Name}

**Goal:** {Brief description}

**Stories:**
1. Story 2.1: {Title} ({points} pts)

**FR Coverage:** FR-03
**Dependencies:** Epic 1 (requires auth infrastructure)
```

### Story Files (BMAD Format)

Story files are written to `.specflow/features/{slug}/stories/{epic}-{story}-{slug}.md`

See template: `.specflow/templates/story.md`

## Story Points

Based on complexity and criteria count:
| Criteria | Points |
|----------|--------|
| 1-4 | 1-2 |
| 5-8 | 3-5 |
| 9-12 | 6-8 |

## Sprint Status Integration

After generating epics, update sprint-status.yaml:

1. **Mark epic generation complete:**
   ```yaml
   analysis:
     - id: requirements-lock
       status: done
       completed_at: {timestamp}
   ```

2. **Add planned stories (headers only):**
   ```yaml
   stories:
     - id: 1-1-{slug}
       epic: 1
       story: 1
       title: "{from epics}"
       file: stories/1-1-{slug}.md
       status: pending
       parallel_safe: false
       depends_on: []
   ```

3. **Note:** Only the first story file is created immediately.
   Subsequent story files created incrementally by PM.

## BMAD Story Format (WRK-28)

Story files use BMAD format from `.specflow/templates/story.md`:

- Frontmatter with story_id, epic, story, status, depends_on, parallel_safe
- User story (As a... I want... So that...)
- Acceptance criteria (BOSS validated)
- Technical context (from requirements-lock and codebase-constraints)
- Dependencies (other story IDs)
- Out of scope items

## Related

- `/create-epics-and-stories` - Original BMAD
- `/sf:create-architecture` - Previous step
- `/sf:sprint-planning` - Next step
- `/sf:scrum` - Create in tracker
