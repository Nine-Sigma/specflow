# Wireframe Diagrams

Patterns for creating wireframe diagrams in Excalidraw.

## UI Element Hierarchy

Build order for wireframe construction:

1. **Screen containers and frames** - Outer boundaries defining the viewport
2. **Layout sections** - Header, content area, footer divisions
3. **Navigation elements** - Menus, tabs, breadcrumbs
4. **Content blocks** - Text areas, image placeholders, cards
5. **Interactive elements** - Buttons, inputs, checkboxes
6. **Labels and annotations** - Explanatory text, callouts
7. **Flow indicators** - Arrows connecting multi-screen layouts

## Fidelity Levels

### Low Fidelity

Purpose: Quick ideation and layout exploration

- Basic geometric shapes only
- Minimal detail and styling
- Placeholder text ("Lorem ipsum" or "[Content]")
- No colors beyond grayscale
- Focus on spatial relationships

### Medium Fidelity

Purpose: Stakeholder review and iteration

- More defined element shapes
- Representative sizing and proportions
- Some visual hierarchy (font sizes, weights)
- Basic styling hints
- Actual or realistic content examples

### High Fidelity

Purpose: Development handoff and user testing

- Detailed element rendering
- Realistic sizing and spacing
- Actual content and copy
- Visual design elements (shadows, borders)
- Interactive state indicators

## Screen Types

### Desktop (Website)

- **Container**: 1920x1080 or 1440x900 common
- **Grid**: 12-column layout typical
- **Navigation**: Top bar or sidebar patterns

### Mobile App

- **Container**: 375x812 (iPhone) or 360x800 (Android)
- **Safe areas**: Account for notch, home indicator
- **Navigation**: Bottom tabs or hamburger menu

### Tablet

- **Container**: 768x1024 (iPad) or 800x1280 (Android tablet)
- **Orientation**: Consider both portrait and landscape
- **Navigation**: May combine desktop and mobile patterns

## Element Dimensions

### Default Sizes

| Element | Width | Height | Notes |
|---------|-------|--------|-------|
| Container | 800 | 600 | Main viewport |
| Header | 800 | 80 | Full width |
| Button | 120 | 40 | 4px roundness |
| Input | 300 | 40 | 4px roundness |
| Text block | Variable | Variable | 16px default font |

### Spacing

- **Grid**: 20px increments
- **Element gaps**: 40px horizontal and vertical
- **Padding**: 20px inside containers

## Color Themes

### Classic Wireframe

| Element | Color | Hex |
|---------|-------|-----|
| Background | White | #ffffff |
| Container | Light gray | #f5f5f5 |
| Border | Gray | #9e9e9e |
| Text | Dark gray | #424242 |

### High Contrast

| Element | Color | Hex |
|---------|-------|-----|
| Background | White | #ffffff |
| Container | Light gray | #eeeeee |
| Border | Black | #212121 |
| Text | Black | #000000 |

### Blueprint Style

| Element | Color | Hex |
|---------|-------|-----|
| Background | Dark blue | #1a237e |
| Container | Blue | #3949ab |
| Border | Light blue | #7986cb |
| Text | White | #ffffff |

## Multi-Screen Layouts

### Screen Arrangement

- **Horizontal**: Side-by-side for linear flows
- **Vertical**: Stacked for long scrolling contexts
- **Grid**: Matrix layout for app screen inventories

### Flow Indicators

- Use arrows to show navigation paths
- Label arrows with trigger actions ("Click", "Submit")
- Connect related screens with visual grouping
