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

## Output

### Step 1: Write 5.5-epics.md

Write epic breakdown to `.specflow/features/{slug}/5.5-epics.md`

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

### Step 2: Create Story Files

For each story in the epic breakdown:

1. Create stories/ folder if not exists:
   ```bash
   mkdir -p .specflow/features/{slug}/stories/
   ```

2. Create story file from template:
   - Read `.specflow/templates/story.md`
   - Fill in story_id, epic, story, title, status, parallel_safe, depends_on
   - Fill in acceptance criteria from epic breakdown
   - Add interface contract for stories with dependents
   - Write to `.specflow/features/{slug}/stories/{story_id}.md`

3. Example story file path:
   - Epic 1, Story 1, "redis-client" -> `stories/1-1-redis-client.md`
   - Epic 2, Story 3, "headers" -> `stories/2-3-headers.md`

### Step 3: Update sprint-status.yaml

Add all stories to sprint-status:

```yaml
stories:
  - id: 1-1-redis-client
    epic: 1
    story: 1
    title: "Redis Client Setup"
    file: stories/1-1-redis-client.md
    status: pending
    parallel_safe: true
    depends_on: []
```

### Verification

After epic generation:
- [ ] 5.5-epics.md exists with epic/story breakdown
- [ ] stories/ folder exists
- [ ] One story file per story in epics
- [ ] sprint-status.yaml lists all stories with file paths

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

3. **Note:** All story files are created at once after epic generation.
   See Step 2 above for story file creation process.

## BMAD Story Format (WRK-28)

Story files use BMAD format from `.specflow/templates/story.md`:

- Frontmatter with story_id, epic, story, status, depends_on, parallel_safe
- User story (As a... I want... So that...)
- Acceptance criteria (BOSS validated)
- Technical context (from requirements-lock and codebase-constraints)
- Dependencies (other story IDs)
- Out of scope items

## Notes

- **All story files created at once** (not incrementally)
- Story files can be refined by PM before routing to dev
- Interface contracts added for stories with dependents
- Test command auto-detected from project config

## Related

- `/create-epics-and-stories` - Original BMAD
- `/sf:create-architecture` - Previous step
- `/sf:sprint-planning` - Next step
- `/sf:scrum` - Create in tracker
