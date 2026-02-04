# Excalidraw Elements

Core rules for creating Excalidraw diagram elements.

## Shape with Label Pattern

### Unique ID Generation

Create three distinct identifiers per element:
- **shape-id**: Unique identifier for the shape element
- **text-id**: Unique identifier for the label text element
- **group-id**: Shared identifier linking shape and text

### Shape Creation

1. Create shape with `groupIds: [group-id]` to associate with its label
2. Link text via `boundElements` array referencing the text-id
3. Both shape and text share the same group-id

### Text Calculation

For label text within shapes:

- **Width formula**: `(text.length * fontSize * 0.6) + 20`, rounded to nearest 10
- Set `containerId: shape-id` to bind text to its container
- Apply `groupIds: [group-id]` matching the shape's group
- Configure alignment:
  - `textAlign: "center"`
  - `verticalAlign: "middle"`

## Arrow Creation Pattern

### Arrow Type Selection

Choose arrow type based on flow direction:

| Direction | Arrow Type | Use Case |
|-----------|------------|----------|
| Left-to-right | Straight | Primary horizontal flow |
| Top-to-bottom | Straight | Primary vertical flow |
| Upward | Elbow | Return flows, exceptions |
| Backward | Elbow | Loops, iterations |
| Complex | Elbow | Multiple direction changes |

### Binding Configuration

Connect arrows to shapes using bindings:

- `startBinding.elementId` - Source shape identifier
- `endBinding.elementId` - Target shape identifier
- `gap: 10` for both binding endpoints (visual separation)

### Complex Routing

For elbow arrows requiring direction changes:
- Add intermediate points to create corners
- Points define the arrow path between start and end
- Each point is relative to the arrow's origin

## Alignment and Spacing

### Grid Alignment

- **Grid Snap**: All x, y coordinates align to 20px increments
- Round coordinates: `Math.round(value / 20) * 20`

### Vertical Flow Alignment

- Same x-coordinate for vertically aligned elements
- Consistent left edge for left-aligned flows
- Center alignment: same center x-coordinate

### Element Spacing

- **Default separation**: 60px between shapes
- **Flowchart vertical**: 100px between rows
- **Flowchart horizontal**: 180px between columns
- **Wireframe**: 40px between elements
- **Dataflow**: 120px vertical, 200px horizontal

## Element Hierarchy

### Build Order

Construct diagrams in this sequence for proper layering:

1. Container/frame elements (if any)
2. Primary shapes (processes, components)
3. Secondary shapes (decisions, data stores)
4. Labels and annotations
5. Arrows and connectors (last, so they bind to existing shapes)

### Bound Elements Array

Each shape tracks its connections:

```json
{
  "boundElements": [
    { "id": "text-id", "type": "text" },
    { "id": "arrow-1-id", "type": "arrow" },
    { "id": "arrow-2-id", "type": "arrow" }
  ]
}
```

## Color Theming

### Theme Application

Apply colors consistently:
- **backgroundColor**: Fill color for shapes
- **strokeColor**: Border/outline color
- **Decisions**: Often use accent color to highlight
- **Text**: Use high-contrast color for readability

### Common Color Schemes

| Scheme | Primary Fill | Accent/Border | Decision | Text |
|--------|--------------|---------------|----------|------|
| Professional Blue | #e3f2fd | #1976d2 | #fff3e0 | #1e1e1e |
| Success Green | #e8f5e9 | #388e3c | #fff9c4 | #1e1e1e |
| Neutral Gray | #f5f5f5 | #616161 | #e0e0e0 | #1e1e1e |
