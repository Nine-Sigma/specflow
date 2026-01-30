# /sf:product-brief - Initial Product Vision

Wraps BMAD `/product-brief` with SpecFlow vision format.

## Usage

```
/sf:product-brief
/sf:product-brief "app description"
```

## SpecFlow Context

This is the first step in the full planning path. Creates initial product vision with:
- Problem statement
- Target users
- Key outcomes
- Success metrics

## Planning Path

```
/sf:product-brief -> /sf:create-prd -> /sf:create-architecture ->
/sf:create-epics -> /sf:sprint-planning -> /sf:create-story ->
/sf:dev-story -> /sf:code-review
```

## Output Format

Product brief includes:
- Vision statement
- Problem definition
- Target users and personas
- Key outcomes (measurable)
- Success criteria

## Example

```
/sf:product-brief "e-commerce platform for vintage clothing"
```

Produces:
- Vision: "Enable sustainable fashion through curated vintage..."
- Problem: "Buyers lack trusted sources for authentic vintage..."
- Target users: Collectors, fashion-conscious millennials
- Success: "10K active buyers in first year"

## Related

- `/product-brief` - Original BMAD product brief
- `/sf:create-prd` - Next step: Create PRD
- `/sf:pm` - PM orchestrator
