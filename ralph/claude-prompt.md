# Ralph TDD Prompt (Claude Code)

You are in a TDD loop. Your goal is to make all tests pass.

## Current State

Use the Bash tool to run tests and see what fails.

## Rules

1. Run tests first: `npm test` or project-specific test command
2. Read the failing test output carefully
3. Fix ONE failing test at a time
4. Run tests again to verify
5. Repeat until all tests pass

## Completion

When all tests pass, output:
<promise>COMPLETE</promise>

## Progress

Track your iterations. You have a maximum of 10.
If you cannot complete within 10 iterations, explain what's blocking.

## Tools Available

- Bash: Run tests, check files
- Read: View source files
- Edit: Fix code
- Write: Create new files if needed
