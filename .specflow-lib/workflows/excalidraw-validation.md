# Excalidraw Validation Rules

Extracted from BMAD Excalidraw resources for SpecFlow `/sf:diagram` command.

## Element ID Generation

Use deterministic IDs for reproducibility:

- Shapes: `{type}-{index}` (e.g., `rect-1`, `diamond-2`)
- Text: `text-{index}` (e.g., `text-1`)
- Arrows: `arrow-{index}` (e.g., `arrow-1`)
- Groups: `group-{index}` (e.g., `group-1`)

## Text Width Calculation

For text elements inside shapes (labels):

```
text_width = (text.length × fontSize × 0.6) + 20
```

Round to nearest 10 for grid alignment.

## Required Element Properties

### Rectangle (Process Step)

```json
{
  "id": "rect-1",
  "type": "rectangle",
  "x": 100,
  "y": 100,
  "width": 160,
  "height": 80,
  "strokeColor": "#1976d2",
  "backgroundColor": "#e3f2fd",
  "fillStyle": "solid",
  "strokeWidth": 2,
  "roughness": 0,
  "opacity": 100,
  "roundness": { "type": 3, "value": 8 },
  "boundElements": [{ "id": "text-1", "type": "text" }],
  "groupIds": ["group-1"]
}
```

### Diamond (Decision Point)

```json
{
  "id": "diamond-1",
  "type": "diamond",
  "x": 100,
  "y": 100,
  "width": 120,
  "height": 80,
  "strokeColor": "#f57c00",
  "backgroundColor": "#fff3e0",
  "fillStyle": "solid",
  "strokeWidth": 2,
  "roughness": 0,
  "opacity": 100,
  "boundElements": [{ "id": "text-2", "type": "text" }],
  "groupIds": ["group-2"]
}
```

### Ellipse (Start/End)

```json
{
  "id": "ellipse-1",
  "type": "ellipse",
  "x": 100,
  "y": 100,
  "width": 100,
  "height": 60,
  "strokeColor": "#388e3c",
  "backgroundColor": "#e8f5e9",
  "fillStyle": "solid",
  "strokeWidth": 2,
  "roughness": 0,
  "opacity": 100,
  "boundElements": [{ "id": "text-3", "type": "text" }],
  "groupIds": ["group-3"]
}
```

### Text (Label)

```json
{
  "id": "text-1",
  "type": "text",
  "x": 110,
  "y": 130,
  "width": 140,
  "height": 25,
  "text": "Process Step",
  "fontSize": 16,
  "fontFamily": 1,
  "textAlign": "center",
  "verticalAlign": "middle",
  "strokeColor": "#1e1e1e",
  "containerId": "rect-1",
  "groupIds": ["group-1"]
}
```

### Arrow (Connection)

```json
{
  "id": "arrow-1",
  "type": "arrow",
  "x": 260,
  "y": 140,
  "width": 140,
  "height": 0,
  "strokeColor": "#333333",
  "strokeWidth": 2,
  "roughness": 0,
  "opacity": 100,
  "startArrowhead": null,
  "endArrowhead": "arrow",
  "points": [[0, 0], [140, 0]],
  "startBinding": { "elementId": "rect-1", "focus": 0, "gap": 10 },
  "endBinding": { "elementId": "rect-2", "focus": 0, "gap": 10 }
}
```

## Binding Rules

### Shape → Text Binding

- Shape has `boundElements: [{ "id": "text-id", "type": "text" }]`
- Text has `containerId: "shape-id"`
- Both have same `groupIds` array

### Arrow → Shape Binding

- Arrow has `startBinding.elementId` = source shape ID
- Arrow has `endBinding.elementId` = target shape ID
- Both shapes have `boundElements: [{ "id": "arrow-id", "type": "arrow" }]`

## Layout Rules

### Grid Alignment

- Snap all x, y coordinates to 20px grid
- Formula: `Math.round(value / 20) * 20`
- Example: x=103 → x=100, y=87 → y=80

### Spacing

- Horizontal: 200px between elements
- Vertical: 150px between rows
- Arrow gap: 10px from shape edge

### Build Order

1. Start point (top or left)
2. Process steps (in sequence)
3. Decision points (with branches)
4. End points
5. Arrows (after all shapes positioned)

## Validation Checklist

### Structure

- [ ] JSON is valid (parseable)
- [ ] Has `type: "excalidraw"`
- [ ] Has `version: 2`
- [ ] Has `elements` array
- [ ] Has `appState` with `viewBackgroundColor`

### Elements

- [ ] Every shape has unique ID
- [ ] Every shape with text has `boundElements`
- [ ] Every text has `containerId` matching shape
- [ ] Every arrow has `startBinding` and `endBinding`
- [ ] All `groupIds` arrays match between shape and text

### Layout

- [ ] All coordinates on 20px grid
- [ ] No overlapping elements
- [ ] Arrows connect to correct shapes
- [ ] Labels centered in shapes

### Theme

- [ ] Theme colors applied consistently
- [ ] All shapes use theme primary fill
- [ ] All borders use theme accent
- [ ] Text color is readable (#1e1e1e)

### Cleanup

- [ ] No elements with `isDeleted: true`
- [ ] No unused elements
- [ ] All IDs are unique
