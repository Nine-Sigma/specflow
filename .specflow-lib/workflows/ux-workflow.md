# UX Workflow for SpecFlow

Extracted and adapted from BMAD create-ux-design workflow for `/sf:ux` command.

## Scope-Based Step Selection

SpecFlow adapts the 14-step BMAD workflow based on feature scope:

| Scope | Steps to Execute | Depth |
|-------|-----------------|-------|
| small | 01-init, 03-core, 10-journeys (basic), 14-complete | Light UX |
| medium | + 02-discovery, 07-defining, 11-component, 12-patterns, 13-responsive | Standard UX |
| large+ | All 14 steps | Full UX |

## Step Overview

| Step | Name | Purpose | Scope |
|------|------|---------|-------|
| 01 | Init | Load context, set mode | All |
| 02 | Discovery | UX elicitation questions | medium+ |
| 03 | Core Experience | Define essential UX | All |
| 04 | Emotional Response | Emotional design | large+ |
| 05 | Inspiration | Design references | large+ |
| 06 | Design System | System alignment | large+ |
| 07 | Defining Experience | Experience definition | medium+ |
| 08 | Visual Foundation | Visual design basis | large+ |
| 09 | Design Directions | Design options | large+ |
| 10 | User Journeys | Map user flows | All |
| 11 | Component Strategy | Component selection | medium+ |
| 12 | UX Patterns | Pattern application | medium+ |
| 13 | Responsive/Accessibility | WCAG compliance | medium+ |
| 14 | Complete | Final output | All |

## Step 02: Discovery (medium+ scope)

UX discovery elicitation to understand project context, users, and design challenges.

### Discovery Questions

**Project Context:**
- What are you building? (1-2 sentences)
- Who is this for? (target audience)
- What makes this special or different? (unique value)
- What's the main thing users will do? (core action)

**User Understanding:**
- What problem are users trying to solve?
- What frustrates them with current solutions?
- What would make them say "this is exactly what I needed"?
- How tech-savvy are your target users?
- What devices will they use most?
- When/where will they use this product?

**Design Challenges:**
- Platform-specific considerations
- Complex user flows or interactions
- Technical constraints affecting UX

**Design Opportunities:**
- Areas where great UX creates competitive advantage
- Opportunities for innovative UX patterns

## Step 03: Core Experience (all scopes)

Define the core user experience, platform requirements, and effortless interactions.

### Core Experience Definition

**Core User Action:**
- What's the ONE thing users will do most frequently?
- What user action is absolutely critical to get right?
- What should be completely effortless for users?
- If we nail one interaction, everything else follows - what is it?

**Platform Requirements:**
- Web, mobile app, desktop, or multiple platforms?
- Primarily touch-based or mouse/keyboard?
- Platform constraints or capabilities to leverage?
- Offline functionality needs?

**Effortless Interactions:**
- What user actions should feel completely natural?
- Where do users struggle with similar products?
- What interaction, if made effortless, creates delight?
- What should happen automatically without user intervention?
- Where can we eliminate steps competitors require?

**Critical Success Moments:**
- When does user realize "this is better"?
- When does user feel successful or accomplished?
- What interaction, if failed, ruins the experience?
- What are the make-or-break user flows?

### Experience Principles

Extract 4-5 guiding principles based on:
- Core action focus
- Effortless interactions
- Platform considerations
- Critical success moments

## Step 10: User Journeys (all scopes)

Design detailed user journey flows for critical interactions.

### Journey Mapping

**Entry Points:** How users arrive
**Primary Flow:** Happy path steps
**Decision Points:** Where users choose
**Exit Points:** Task completion
**Error States:** Recovery paths

### Journey Template

| Step | User Action | System Response | Emotion |
|------|-------------|-----------------|---------|
| 1 | {action} | {response} | {feeling} |
| 2 | {action} | {response} | {feeling} |
| ... | ... | ... | ... |

### Flow Design Questions

For each critical journey:
- How do users start this journey? (entry point)
- What information do they need at each step?
- What decisions do they need to make?
- How do they know they're progressing successfully?
- What does success look like for this journey?
- Where might they get confused or stuck?
- How do they recover from errors?

### Flow Optimization

- Minimize steps to value (getting users to success quickly)
- Reduce cognitive load at each decision point
- Provide clear feedback and progress indicators
- Create moments of delight or accomplishment
- Handle edge cases and error recovery gracefully

### Journey Patterns

Extract reusable patterns:
- Navigation patterns
- Decision patterns
- Feedback patterns

## Step 11: Component Strategy (medium+ scope)

Define component library strategy and custom component needs.

### Component Analysis

| Component | Purpose | Exists? | Reuse/Create |
|-----------|---------|---------|--------------|
| {name} | {what it does} | Yes/No | Reuse/Create |

### Selection Criteria

- Prefer existing components (design system alignment)
- Create new only when no match exists
- Document rationale for new components

### Component Specification Template

```markdown
### [Component Name]

**Purpose:** [Clear purpose statement]
**Usage:** [When and how to use]
**States:** [All possible states with descriptions]
**Variants:** [Different sizes/styles if applicable]
**Accessibility:** [ARIA labels, keyboard navigation]
**Interaction Behavior:** [How users interact]
```

## Output Template

### Standard Sections

1. **Executive Summary** (Sally's storytelling)
2. **User Journey** (primary flow, decisions, errors)
3. **Component Strategy** (table + interaction patterns)
4. **Accessibility Requirements** (WCAG level by scope)
5. **For Architect** (technical considerations, integration points)

### Scope-Based Sections

| Section | small | medium | large+ |
|---------|-------|--------|--------|
| Executive Summary | Brief | Standard | Detailed |
| User Journey | Basic | Complete | + Edge cases |
| Component Strategy | Key only | Full table | + Rationale |
| Accessibility | WCAG A | WCAG AA | WCAG AAA |
| For Architect | Minimal | Standard | Comprehensive |

## For Architect Section

Bridge UX design to technical implementation:

### Technical Considerations
- State management implications
- Data flow requirements
- Real-time requirements (WebSocket, polling, etc.)
- Performance constraints (lazy loading, pagination)

### Integration Points
- Existing components to reuse
- New components to create
- API endpoints required
- Events/callbacks needed

### UX Constraints for Architecture

| Constraint | Technical Implication |
|------------|----------------------|
| 200ms response time | Optimistic UI or skeleton loaders |
| Offline capability | Service worker, local storage |
| Accessibility | ARIA attributes, keyboard nav |
