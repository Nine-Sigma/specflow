# UX Accessibility

Methodology for responsive and accessible design.

## Responsive Design Principles

### Desktop Strategy
- Use extra screen real estate effectively
- Multi-column layouts for information density
- Side navigation for complex hierarchies
- Desktop-specific features (hover states, keyboard shortcuts)

### Tablet Strategy
- Simplified layouts with touch optimization
- Gesture and touch interaction support
- Balanced information density
- Landscape vs. portrait considerations

### Mobile Strategy
- Bottom navigation or hamburger menu decisions
- Content collapse and prioritization
- Critical information first (mobile-first)
- Thumb-zone accessibility

## Breakpoint Strategy

### Standard Breakpoints
| Breakpoint | Range | Typical Use |
|------------|-------|-------------|
| Mobile | 320px - 767px | Single column, stacked content |
| Tablet | 768px - 1023px | Two columns, simplified navigation |
| Desktop | 1024px+ | Full layouts, multi-column |

### Implementation Approach
- **Mobile-first**: Start with smallest, enhance upward
- **Desktop-first**: Start with full layout, simplify downward
- **Content-out**: Let content determine breakpoints

## WCAG Compliance

### Compliance Levels

| Level | Description | When to Use |
|-------|-------------|-------------|
| **Level A** | Essential accessibility | Minimum legal compliance |
| **Level AA** | Industry standard | Recommended for most products |
| **Level AAA** | Exceptional accessibility | Specialized applications |

### Key WCAG Requirements

#### Perceivable
- Color contrast ratios (4.5:1 for normal text, 3:1 for large text)
- Text alternatives for non-text content
- Captions and audio descriptions
- Content adaptable to different presentations

#### Operable
- Keyboard accessibility (all functionality via keyboard)
- Sufficient time for reading and interaction
- No content that causes seizures
- Navigable and findable content

#### Understandable
- Readable and predictable content
- Input assistance and error prevention
- Consistent navigation and identification

#### Robust
- Compatible with current and future technologies
- Valid, parseable markup
- Proper ARIA implementation

## Accessibility Testing

### Automated Testing
- axe-core or similar scanning tools
- Lighthouse accessibility audits
- CI/CD integration for regression prevention

### Manual Testing

#### Screen Reader Testing
- VoiceOver (macOS/iOS)
- NVDA (Windows)
- JAWS (Windows)
- TalkBack (Android)

#### Keyboard Navigation Testing
- Tab order logic
- Focus visibility
- Skip links functionality
- Escape key behavior in modals

#### Visual Testing
- Color blindness simulation (protanopia, deuteranopia, tritanopia)
- High contrast mode
- Zoom to 200% minimum
- Text scaling

## Assistive Technology Considerations

### Screen Readers
- Semantic HTML structure
- Meaningful heading hierarchy
- Descriptive link text
- ARIA labels for non-text elements

### Keyboard Users
- Logical tab order
- Visible focus indicators
- Skip navigation links
- No keyboard traps

### Motor Impairments
- Touch target sizes (minimum 44x44px)
- Adequate spacing between targets
- Alternative input methods
- No time limits or generous extensions

### Cognitive Considerations
- Clear, simple language
- Consistent navigation
- Error prevention and recovery
- Progress indicators

## Inclusive Design Patterns

### Form Accessibility
- Associated labels for all inputs
- Clear error identification
- Required field indication
- Autocomplete support

### Navigation Accessibility
- Skip to main content link
- Consistent navigation placement
- Breadcrumbs for orientation
- Active state indication

### Media Accessibility
- Captions for video
- Transcripts for audio
- Alt text for images
- Audio descriptions for video

### Interactive Element Accessibility
- Clear affordances
- State changes announced
- Adequate feedback
- Undo capabilities

## Implementation Guidelines

### Responsive Development
- Use relative units (rem, %, vw, vh) over fixed pixels
- Implement mobile-first media queries
- Test touch targets and gesture areas
- Optimize images and assets for different devices

### Accessibility Development
- Semantic HTML as foundation
- ARIA only when HTML is insufficient
- Keyboard navigation implementation
- Focus management and skip links
- High contrast mode support

### Testing Checklist
- [ ] Passes automated accessibility scan
- [ ] Keyboard navigable without mouse
- [ ] Screen reader announces content correctly
- [ ] Color contrast meets WCAG requirements
- [ ] Touch targets meet size requirements
- [ ] Responsive across breakpoints
- [ ] Zoom to 200% maintains usability
