# UX Consistency Patterns

Methodology for documenting and maintaining UX patterns across a product.

## Pattern Categories

Determine which patterns need definition for your product:

- **Button hierarchy and actions** - Primary, secondary, tertiary actions
- **Feedback patterns** - Success, error, warning, info states
- **Form patterns** - Validation, error recovery, field interactions
- **Navigation patterns** - Headers, sidebars, breadcrumbs, tabs
- **Modal and overlay patterns** - Dialogs, drawers, popovers
- **Empty states and loading states** - Skeleton screens, placeholders
- **Search and filtering patterns** - Search bars, filters, sorting

## Pattern Definition Framework

For each pattern category, define:

### Pattern Guidelines Template

```markdown
### [Pattern Type]

**When to Use:** [Clear usage guidelines]
**Visual Design:** [How it should look]
**Behavior:** [How it should interact]
**Accessibility:** [A11y requirements]
**Mobile Considerations:** [Mobile-specific needs]
**Variants:** [Different states or styles if applicable]
```

## Critical Pattern Analysis

When defining patterns, consider:

### Visual Hierarchy
- Primary vs. secondary vs. tertiary actions
- Visual weight and prominence
- Color and contrast relationships
- Spacing and grouping

### Feedback Mechanisms
- Success confirmation timing and style
- Error message clarity and positioning
- Progress indicators
- State change animations

### Error Recovery
- Clear error identification
- Actionable recovery steps
- Prevention of data loss
- Graceful degradation

### Accessibility Requirements
- Focus management
- Screen reader announcements
- Keyboard navigation
- Color contrast ratios

### Mobile vs Desktop
- Touch target sizes (minimum 44x44px)
- Gesture support
- Screen real estate usage
- Context-appropriate interactions

## Design System Integration

Ensure patterns work with chosen design system:

### Integration Questions
- How do patterns complement design system components?
- What customizations are needed?
- How to maintain consistency while meeting unique needs?

### Custom Pattern Rules
- Document deviations from base design system
- Establish when custom patterns are allowed
- Define approval process for new patterns

## Pattern Library Structure

Organize patterns for easy reference:

1. **Usage Guidelines** - When and where to use each pattern
2. **Visual Examples** - Screenshots, mockups, or specifications
3. **Implementation Notes** - Technical details for developers
4. **Accessibility Checklists** - A11y verification steps
5. **Mobile-First Considerations** - Responsive behavior

## Pattern Governance

### Adding New Patterns
1. Identify need from user research or design iteration
2. Document proposed pattern using template
3. Review against existing patterns for consistency
4. Test for accessibility compliance
5. Add to pattern library with examples

### Updating Existing Patterns
1. Document reason for change
2. Assess impact on existing implementations
3. Create migration plan if breaking changes
4. Update all documentation
5. Communicate changes to team

### Pattern Deprecation
1. Mark pattern as deprecated with replacement
2. Set timeline for removal
3. Provide migration guidance
4. Archive rather than delete
