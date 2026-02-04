# Flowchart Diagrams

Patterns for creating flowchart diagrams in Excalidraw.

## Shape Types

### Start/End Points

- **Shape**: Ellipse
- **Dimensions**: 120x60 pixels
- **Labels**: "Start" and "End" typically
- **Usage**: Entry and exit points of the flow

### Process Steps

- **Shape**: Rectangle with rounded corners
- **Dimensions**: 160x80 pixels
- **Roundness**: 8px corner radius
- **Labels**: Action descriptions (verb phrases)
- **Usage**: Operations, tasks, activities

### Decision Nodes

- **Shape**: Diamond (rotated square)
- **Dimensions**: 140x100 pixels
- **Labels**: Questions or conditions
- **Usage**: Yes/No branches, conditional logic

## Build Sequence

Construct flowcharts in this order:

1. **Start point** - Ellipse with "Start" label at top
2. **Process steps** - Rectangles with action labels
3. **Decision nodes** - Diamonds with condition labels
4. **End point** - Ellipse with "End" label at bottom
5. **Arrows** - Connect elements following the flow

## Flow Direction

### Primary Flow Patterns

| Pattern | Direction | Use Case |
|---------|-----------|----------|
| Top-to-bottom | Vertical | Standard process flows |
| Left-to-right | Horizontal | Timeline-based flows |
| Combined | Both | Complex multi-path flows |

### Decision Branch Conventions

Consistent branching improves readability:

- **Yes path**: Continue right or down (primary flow)
- **No path**: Branch left or continue alternate direction
- **Alternative**: Yes down, No right (also common)

Pick one convention and apply consistently throughout the diagram.

## Layout Optimization

### Spacing

- **Vertical spacing**: 100px between rows
- **Horizontal spacing**: 180px between columns
- **Grid snap**: 20px increments

### Alignment

- **Linear flows**: Align centers vertically or horizontally
- **Branches**: Maintain consistent horizontal offset for decision paths
- **Merge points**: Align returning paths with main flow

### Complexity Considerations

| Complexity | Steps | Decisions | Layout Approach |
|------------|-------|-----------|-----------------|
| Simple | 3-5 | 0-2 | Single column |
| Medium | 6-10 | 2-4 | Multiple columns for branches |
| Complex | 11-20 | 5+ | Subflows, swimlanes |
| Very Complex | 20+ | Many | Split into multiple diagrams |

## Color Usage

### Default Scheme

| Element | Fill Color | Border |
|---------|------------|--------|
| Start/End | Light blue (#e3f2fd) | Blue (#1976d2) |
| Process | Light blue (#e3f2fd) | Blue (#1976d2) |
| Decision | Light orange (#fff3e0) | Blue (#1976d2) |
| Arrows | None | Blue (#1976d2) |

### Highlighting

Use accent colors to emphasize:
- Critical decision points
- Error handling paths
- Key process steps
- Loop indicators

## Arrow Patterns

### Standard Connections

- **Sequential**: Straight arrows between vertically stacked elements
- **Branches**: Straight arrows for forward/down, elbow for sideways
- **Loops**: Elbow arrows curving back to earlier steps

### Binding

All arrows connect to shapes via bindings:
- Arrows "snap" to shape edges
- Gap of 10px between arrow end and shape
- Bound arrows move with their connected shapes
