# /sf:implement - Implementation Loop (Ralph)

Start a TDD implementation loop using Ralph.

## Usage

```
/sf:implement
/sf:implement --max 5
```

## What This Does

Ralph runs a TDD (Test-Driven Development) loop:
1. Run tests to see what fails
2. Fix one failing test
3. Run tests again
4. Repeat until all tests pass or max iterations reached

## Completion

Ralph completes when:
- All tests pass, OR
- Max iterations reached (default: 10)

The loop outputs `<promise>COMPLETE</promise>` when done.

## Options

- `--tool <claude|aider|cursor>` - AI tool to use (default: claude)
- `--max <n>` - Maximum iterations (default: 10)

## Workflow

```
         +--------+
         | START  |
         +----+---+
              |
              v
    +---------+---------+
    |    Run Tests      |
    +---------+---------+
              |
    +---------+---------+
    | All Pass? --------+---> COMPLETE
    +---------+---------+
              | No
              v
    +---------+---------+
    | Fix One Test      |
    +---------+---------+
              |
              v
    +---------+---------+
    | Max Iterations? --+---> STOP
    +---------+---------+
              | No
              +--------> Run Tests
```

## When to Use

- After spec is approved by PM
- When implementing a feature with tests defined
- For TDD-style development

## Related

- `/sf:pm` - Start with PM orchestration
- `/sf:dev` - BMAD dev agent for one-shot tasks
- `/sf:qa` - QA for test scenario generation
