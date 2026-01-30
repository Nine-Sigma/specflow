# /sf:dev - Development Tasks

Wraps BMAD `/dev` with TDD focus and Ralph integration.

## Usage

```
/sf:dev
/sf:dev <task-description>
```

## SpecFlow Context

This command invokes BMAD's dev with additional context:
- TDD-first approach
- Integration with Ralph loop
- Spec-driven implementation

## When to Use

- One-shot development tasks: Use `/sf:dev`
- Iterative TDD loop: Use `/sf:implement` (Ralph)

## TDD Workflow

```
1. Write test (RED)
2. Run test - fails
3. Write minimal code (GREEN)
4. Run test - passes
5. Refactor if needed
```

## Output Format

Development work follows:
- Test first (RED)
- Implement (GREEN)
- Refactor if needed

## Parallel Execution

When invoked by PM orchestrator:
- Dev and QA work in parallel
- Dev implements features
- QA writes tests simultaneously
- Checkpoint merge when both complete

## Related

- `/dev` - Original BMAD dev
- `/sf:implement` - Ralph TDD loop
- `/sf:qa` - Quality assurance (runs in parallel)
- `/sf:pm` - PM orchestrator
