# /sf:pm - SpecFlow PM Orchestrator

The PM orchestrator manages the file-based agent workflow.

## Usage

```
/sf:pm <issue-description>
/sf:pm "add logout button"
/sf:pm --review                  # Review current feature outputs
/sf:pm --status                  # Show current STATE.md
```

## File Protocol

<required_reading>
On every invocation, read:

1. `.specflow/STATE.md` - Current session state
2. `.specflow/features/{slug}/STATUS.md` - Approval status (if feature in progress)
3. `.specflow/features/{slug}/PROGRESS.md` - Work log (if feature in progress)

Replace {slug} with feature slug from STATE.md.
</required_reading>

## Workflows

### Starting a New Feature

When invoked with a feature description:

1. **Generate slug** from description:
   - Lowercase, hyphens, max 50 chars
   - Example: "Add logout button" -> "add-logout-button"

2. **Create feature folder** at `.specflow/features/{slug}/`:
   - Copy templates: PROGRESS.md, STATUS.md from `.specflow/templates/`
   - Update frontmatter with feature slug and timestamp

3. **Update STATE.md**:
   ```
   slug: {generated-slug}
   started: {iso-timestamp}
   status: in-progress
   last-agent: pm
   next-agent: analyst
   phase: triage
   ```

4. **Route to first agent**: Invoke `/sf:analyst` with feature context

### Reviewing Outputs

When invoked with `--review` or when STATE.md shows `next-agent: pm-review`:

1. **Read all numbered outputs** that exist:
   - `1-spec.md`, `2-architecture.md`, `3-security.md`, `4-cost.md`, `5-test-plan.md`
   - `6-dev-output.md`, `7-qa-output.md` (if execution phase)

2. **Review each output** for quality:
   - Does it meet BOSS criteria (for specs)?
   - Are constraints from prior outputs honored?
   - Are there open questions that need resolution?

3. **Write STATUS.md** with decisions:
   ```markdown
   ### {N}-{name}.md

   | Field | Value |
   |-------|-------|
   | reviewed | {iso-timestamp} |
   | status | APPROVED | NEEDS_REVISION | ESCALATE |
   | notes | {your assessment} |
   | action | {next steps if not APPROVED} |
   ```

4. **Decide next action**:
   - **All APPROVED**: Update STATE.md, route to next agent
   - **Any NEEDS_REVISION**: Update STATE.md with `next-agent: {agent}`, provide feedback
   - **Any ESCALATE**: Present issue to user for decision

### Routing Logic

| Current Phase | After Review | Next Agent |
|---------------|--------------|------------|
| triage | 1-spec APPROVED | architect |
| pillars | 2-architecture APPROVED | security |
| pillars | 3-security APPROVED | cost |
| pillars | 4-cost APPROVED | tea |
| pillars | 5-test-plan APPROVED | dev (begin execution) |
| execution | 6-dev-output APPROVED | qa |
| execution | 7-qa-output APPROVED | COMPLETE |

### Work Type Classification

| Work Type | Pillars Required | Agents |
|-----------|------------------|--------|
| Bug | No | analyst -> dev -> qa |
| Feature | Yes | analyst -> architect -> security -> cost -> tea -> dev -> qa |
| Refactor | Partial | analyst -> architect -> dev -> qa |
| Documentation | No | analyst only |

Override with `--type <type>`.

<output>
After orchestration:

1. Update `.specflow/STATE.md` with:
   - Current position (slug, phase, last-agent, next-agent)
   - Any decisions made

2. Update `.specflow/features/{slug}/STATUS.md` with:
   - Review decisions for each output
   - Overall feature status

3. Append to `.specflow/features/{slug}/PROGRESS.md`:
   ```
   ## {timestamp} - PM (/sf:pm)

   **Work Done:**
   - [Review/routing summary]

   **Output:** `STATUS.md updated`

   **Decisions:**
   - [Key decisions made]

   ---
   ```
</output>

## Status Values

### STATUS.md Output Reviews

| Status | Meaning | Action |
|--------|---------|--------|
| APPROVED | Output meets quality standards | Proceed to next agent |
| NEEDS_REVISION | Issues found | Return to agent with feedback |
| ESCALATE | Cannot decide | Present to user |
| PENDING | Not yet reviewed | Review needed |

### STATE.md Feature Status

| Status | Meaning |
|--------|---------|
| idle | No feature in progress |
| in-progress | Feature being worked on |
| completed | All outputs approved, feature done |
| blocked | Awaiting user input |

## Options

- `--review` - Review current feature outputs
- `--status` - Show current STATE.md
- `--type <type>` - Override auto-detected work type
- `--no-pillars` - Skip security and cost analysis (bugs, docs)
- `--info` - Show routing information only

## Example Session

```
User: /sf:pm "add user logout button"

PM:
1. Creates .specflow/features/add-user-logout-button/
2. Updates STATE.md with slug, status: in-progress
3. Routes to: /sf:analyst

[analyst runs, writes 1-spec.md]

PM (auto or via --review):
1. Reads 1-spec.md
2. Writes STATUS.md: 1-spec.md APPROVED
3. Routes to: /sf:architect

[workflow continues...]
```

## CLI Equivalent

```bash
npx tsx src/cli.ts pm "issue description"
```

## Related

- `/sf:analyst` - Requirements analysis (first pillar)
- `/sf:security` - Security analysis (Jordan)
- `/sf:cost` - Cost analysis (Taylor)
- `/sf:architect` - Architecture decisions
- `/sf:tea` - Test engineering analysis
- `/sf:dev` - Development tasks
- `/sf:qa` - Quality assurance
