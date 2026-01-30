# Example Custom Agent

This is an example custom agent prompt. Replace with your own agent.

## Purpose

[Describe what this agent does]

## Input

[What context/information does this agent need]

## Output

[What does this agent produce]

## Usage

```
sf agent example
```

Or via agents.json:
```json
{
  "agents": {
    "example": {
      "source": "custom",
      "invoke": ".specflow/agents/example-agent.md",
      "description": "Example agent"
    }
  }
}
```

## Creating Custom Agents

1. Create a markdown file in `.specflow/agents/`
2. Add entry to `agents.json` at project root
3. Invoke via `sf agent <name>` or create slash command

## Agent Prompt Guidelines

- Be specific about the task
- Define clear output format
- Include examples where helpful
- Reference SpecFlow methodology (three pillars, BOSS criteria)
