# Excalidraw Creation Workflow

Extracted from BMAD create-flowchart workflow for SpecFlow `/sf:diagram` command.

## Smart Elicitation (Step 0)

Before asking questions, analyze what context already provides:

1. Review the user's description and conversation history
2. Extract any mentioned: diagram type, complexity, decision points
3. If ALL requirements clear → skip to Layout Planning
4. If SOME requirements clear → only ask about missing info
5. If requirements unclear → proceed with full elicitation

**Anti-Pattern:** Don't ask questions when context already answers them.

## Requirements Gathering

### Type Selection

| Type | Use For |
|------|---------|
| flowchart | Process flows, decision trees, state machines |
| wireframe | UI layouts, component arrangement |
| dataflow | Data pipelines, API flows, system interactions |
| architecture | System components (C4-style) |

### Complexity Assessment

| Complexity | Steps | Decision Points |
|------------|-------|-----------------|
| Simple | 3-5 | 0-2 |
| Medium | 6-10 | 2-4 |
| Complex | 11-20 | 4-6 |
| Very Complex | 20+ | 6+ |

## Theme Presets

| Theme | Primary Fill | Accent/Border | Decision | Text |
|-------|-------------|---------------|----------|------|
| Professional Blue | #e3f2fd | #1976d2 | #fff3e0 | #1e1e1e |
| Success Green | #e8f5e9 | #388e3c | #fff9c4 | #1e1e1e |
| Neutral Gray | #f5f5f5 | #616161 | #e0e0e0 | #1e1e1e |
| Warm Orange | #fff3e0 | #f57c00 | #ffe0b2 | #1e1e1e |

**Default:** Professional Blue

### Theme Application

- **Shapes**: `backgroundColor` from theme primary fill
- **Borders**: `strokeColor` from theme accent
- **Text**: `strokeColor` = "#1e1e1e" (dark text)
- **Arrows**: `strokeColor` from theme accent
- **Decision shapes**: Use decision color

## Layout Planning

Before building, confirm structure with user:

1. List all steps and decision points
2. Show planned structure
3. Confirm: "Structure looks correct?"
4. Adjust if needed

## Element Building

### Build Order

1. Start point (ellipse) with label
2. Each process step (rectangle) with label
3. Each decision point (diamond) with label
4. End point (ellipse) with label
5. Connect all with bound arrows

### Element Creation Rules

**For Each Shape with Label:**

1. Generate unique IDs: shape-id, text-id, group-id
2. Create shape with `groupIds: [group-id]`
3. Calculate text width: `(text.length × fontSize × 0.6) + 20`, round to nearest 10
4. Create text element with:
   - `containerId: shape-id`
   - `groupIds: [group-id]` (SAME as shape)
   - `textAlign: "center"`
   - `verticalAlign: "middle"`
5. Add `boundElements` to shape referencing text

**For Each Arrow:**

1. Determine arrow type needed:
   - Straight: For forward flow (left-to-right, top-to-bottom)
   - Elbow: For upward flow, backward flow, or complex routing
2. Create arrow with `startBinding` and `endBinding`
3. Set `startBinding.elementId` to source shape ID
4. Set `endBinding.elementId` to target shape ID
5. Set `gap: 10` for both bindings
6. If elbow arrow, add intermediate points for direction changes
7. Update `boundElements` on both connected shapes

**Alignment:**

- Snap all x, y to 20px grid
- Align shapes vertically (same x for vertical flow)
- Space elements: 60px between shapes

## Validation

### JSON Syntax Validation

```bash
node -e "JSON.parse(require('fs').readFileSync('file.excalidraw', 'utf8')); console.log('Valid')"
```

**If validation fails:**

1. Read error message (shows position)
2. Fix syntax error (missing comma, bracket, quote)
3. Re-run validation
4. Repeat until passes

**NEVER delete file on validation failure - always fix.**

### Content Validation

- [ ] All shapes have labels
- [ ] All arrows have bindings
- [ ] groupIds match between shape and text
- [ ] containerId on text matches shape id
- [ ] boundElements arrays populated
- [ ] All elements snapped to 20px grid
- [ ] Theme colors applied consistently

## JSON Output Structure

```json
{
  "type": "excalidraw",
  "version": 2,
  "source": "sf:diagram",
  "elements": [
    // shapes, text, arrows
  ],
  "appState": {
    "viewBackgroundColor": "#ffffff"
  }
}
```

## Type-Specific Patterns

### Flowchart

- Rectangles for process steps (rounded corners)
- Diamonds for decision points
- Ellipses for start/end
- Arrows with optional "Yes"/"No" labels

### Wireframe

- Rectangles for layout regions (no fill or light fill)
- Text for labels
- Lines for dividers
- Dashed rectangles for placeholders

### Dataflow

- Rounded rectangles for services/components
- Arrows with labels for data flow
- Grouped rectangles for databases (cylinder effect)
- Cloud-style shapes for external services

### Architecture (C4-style)

- Color-coded by layer:
  - Frontend: Blue (#1976d2, #e3f2fd)
  - Backend: Purple (#7b1fa2, #f3e5f5)
  - Database: Green (#388e3c, #e8f5e9)
  - External: Orange (#f57c00, #fff3e0)
- Arrows for dependencies
- Labels for relationship descriptions
