# /sf:diagram - Architecture Visualization

Generate valid Excalidraw JSON for flowcharts, wireframes, dataflow diagrams, and architecture diagrams.

## Usage

```bash
/sf:diagram --type flowchart "User authentication flow"
/sf:diagram --type wireframe "Dashboard layout"
/sf:diagram --type dataflow "API request pipeline"
/sf:diagram --type architecture --from-arch  # Reads 2-architecture.md
```

**Supported Types:**
- `flowchart` - Process flows, decision trees, state machines
- `wireframe` - UI layouts, component arrangement
- `dataflow` - Data pipelines, API flows, system interactions
- `architecture` - System components (C4-style)

## Activation

### Step 1: Parse Arguments and Load Context

<argument_parsing>
**Required:**
- `--type {flowchart|wireframe|dataflow|architecture}` - Diagram type (default: flowchart)

**Optional:**
- `--from-arch` - Read `.specflow/features/{slug}/2-architecture.md` for context
- `--theme {blue|green|gray|orange}` - Color theme (default: blue)
- `description` - Free text description of what to diagram

**Validation:**
- At least one of `--from-arch` or `description` must be provided

**Context Loading:**
IF --from-arch AND .specflow/features/{slug}/2-architecture.md exists:
  Read architecture document for:
  - Components and services
  - Data flows between components
  - Key interactions
</argument_parsing>

### Step 2: Load Methodology

<methodology>
**Workflow (always load):**
Read `.specflow-lib/workflows/excalidraw-creation.md`
- Smart elicitation (extract from context before asking)
- Theme presets (Professional Blue, Success Green, etc.)
- Element building rules and build order
- JSON validation loop

Read `.specflow-lib/workflows/excalidraw-validation.md`
- Element ID generation patterns
- Required element properties (JSON examples)
- Binding rules (shape↔text, arrow↔shape)
- Layout rules (grid, spacing)
- Validation checklist

**Element Rules (always load):**
- `.specflow-lib/methodology/excalidraw-elements.md`

**Type-specific patterns:**

| Type | Methodology File |
|------|------------------|
| flowchart | `.specflow-lib/methodology/diagram-flowchart.md` |
| wireframe | `.specflow-lib/methodology/diagram-wireframe.md` |
| dataflow | `.specflow-lib/methodology/diagram-dataflow.md` |
| architecture | diagram-dataflow.md + C4 conventions |
</methodology>

**Wiring verification:** If workflow files don't exist:
```
ERROR: Missing required file: .specflow-lib/workflows/excalidraw-creation.md
Run 'npx specflow init' to install SpecFlow files.
```

---

## Step 3: Generate Diagram Structure

### Smart Elicitation (Step 0)

Before asking questions, analyze what context provides:
1. Review user's description and conversation history
2. Extract mentioned: diagram type, complexity, decision points
3. If ALL clear → skip to Layout Planning
4. If SOME clear → only ask about missing info
5. If unclear → proceed with full elicitation

**Anti-Pattern:** Don't ask questions when context already answers them.

### Process

1. **Parse Input** - Identify components, flows, relationships
2. **Map to Elements** - Convert to Excalidraw element types
3. **Apply Type-Specific Patterns**

### Type-Specific Patterns

**Flowchart:**
- Rectangles for process steps (rounded corners)
- Diamonds for decision points
- Ellipses for start/end
- Arrows with optional "Yes"/"No" labels

**Wireframe:**
- Rectangles for layout regions (no fill or light fill)
- Text for labels
- Lines for dividers
- Dashed rectangles for placeholders

**Dataflow:**
- Rounded rectangles for services/components
- Arrows with labels for data flow
- Grouped rectangles for databases
- Cloud-style shapes for external services

**Architecture (C4-style):**
- Color-coded by layer
- Arrows for dependencies
- Labels for relationship descriptions

---

## Theme Presets

| Theme | Primary Fill | Accent/Border | Decision | Text |
|-------|-------------|---------------|----------|------|
| Professional Blue | #e3f2fd | #1976d2 | #fff3e0 | #1e1e1e |
| Success Green | #e8f5e9 | #388e3c | #fff9c4 | #1e1e1e |
| Neutral Gray | #f5f5f5 | #616161 | #e0e0e0 | #1e1e1e |
| Warm Orange | #fff3e0 | #f57c00 | #ffe0b2 | #1e1e1e |

**Architecture Layer Colors:**

| Layer | Color Scheme |
|-------|--------------|
| Frontend | Blue (#1976d2, #e3f2fd) |
| Backend | Purple (#7b1fa2, #f3e5f5) |
| Database | Green (#388e3c, #e8f5e9) |
| External | Orange (#f57c00, #fff3e0) |

---

## Element Patterns

### Flowchart Elements

**Process Step (Rectangle):**
```json
{
  "type": "rectangle",
  "strokeColor": "#1976d2",
  "backgroundColor": "#e3f2fd",
  "fillStyle": "solid",
  "roundness": { "type": 3, "value": 8 }
}
```

**Decision Point (Diamond):**
```json
{
  "type": "diamond",
  "strokeColor": "#f57c00",
  "backgroundColor": "#fff3e0",
  "fillStyle": "solid"
}
```

**Start/End (Ellipse):**
```json
{
  "type": "ellipse",
  "strokeColor": "#388e3c",
  "backgroundColor": "#e8f5e9",
  "fillStyle": "solid"
}
```

### Wireframe Elements

**Container (Rectangle, no fill):**
```json
{
  "type": "rectangle",
  "strokeColor": "#666666",
  "backgroundColor": "transparent",
  "fillStyle": "solid",
  "strokeWidth": 1
}
```

**Placeholder (Dashed Rectangle):**
```json
{
  "type": "rectangle",
  "strokeColor": "#999999",
  "backgroundColor": "#f5f5f5",
  "fillStyle": "hachure",
  "strokeStyle": "dashed"
}
```

### Arrow Patterns

**Standard Flow Arrow:**
```json
{
  "type": "arrow",
  "strokeColor": "#333333",
  "strokeWidth": 2,
  "startArrowhead": null,
  "endArrowhead": "arrow",
  "points": [[0, 0], [100, 0]],
  "startBinding": { "elementId": "{source-id}", "focus": 0, "gap": 10 },
  "endBinding": { "elementId": "{target-id}", "focus": 0, "gap": 10 }
}
```

---

## Architecture Auto-Generation (--from-arch)

When `--from-arch` flag is provided:

### Step 1: Read Architecture Document

Parse `.specflow/features/{slug}/2-architecture.md` for:

| Section | Extract |
|---------|---------|
| Components | Service/component names |
| Data Flow | Relationships between components |
| External Services | Third-party integrations |
| Database | Data storage elements |

### Step 2: Build Element Graph

```
For each component in architecture:
  Create element (service type based on description)
  Position using grid layout

For each relationship:
  Create arrow connecting elements
  Add label with relationship description
```

### Step 3: Apply Architecture Colors

Color-code by layer for visual clarity.

---

## Step 4: Output Excalidraw JSON

**JSON Structure:**

```json
{
  "type": "excalidraw",
  "version": 2,
  "source": "sf:diagram",
  "elements": [
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
      "roundness": { "type": 3, "value": 8 },
      "boundElements": [{ "id": "text-1", "type": "text" }],
      "groupIds": ["group-1"]
    },
    {
      "id": "text-1",
      "type": "text",
      "x": 110,
      "y": 130,
      "width": 140,
      "height": 25,
      "text": "Process Step",
      "fontSize": 16,
      "textAlign": "center",
      "verticalAlign": "middle",
      "containerId": "rect-1",
      "groupIds": ["group-1"]
    }
  ],
  "appState": {
    "viewBackgroundColor": "#ffffff"
  }
}
```

**Element ID Generation:**
- Use format: `{type}-{index}` (e.g., `rect-1`, `arrow-2`, `text-3`)
- Keep IDs deterministic for reproducibility

**Layout Positioning:**
- Start at x:100, y:100
- Horizontal spacing: 200px between elements
- Vertical spacing: 150px between rows
- Snap all coordinates to 20px grid

---

## Usage Examples

### Simple Flowchart
```
/sf:diagram --type flowchart "Login flow: enter credentials -> validate -> success/failure"
```
**Output:** Excalidraw JSON with 4 elements (start, credentials, decision, two endpoints)

### From Architecture
```
/sf:diagram --type architecture --from-arch
```
**Output:** Excalidraw JSON representing all components from 2-architecture.md

### Dashboard Wireframe
```
/sf:diagram --type wireframe "Dashboard with sidebar, main content area, and header"
```
**Output:** Excalidraw JSON with nested rectangles representing layout regions

---

## Testing

### Standalone Test
1. Run `/sf:diagram --type flowchart "Simple A -> B -> C flow"`
2. Copy JSON output
3. Paste into Excalidraw (excalidraw.com)
4. Verify: elements appear, connected, themed

### From-Arch Test
1. Ensure 2-architecture.md exists in feature folder
2. Run `/sf:diagram --type architecture --from-arch`
3. Verify: components from architecture appear as elements
4. Verify: relationships shown as arrows

---

## Related

- `/sf:architect` - Creates 2-architecture.md that --from-arch reads
- `.specflow-lib/methodology/excalidraw-elements.md` - Element creation rules
- `.specflow-lib/methodology/diagram-*.md` - Type-specific patterns
- `.specflow-lib/workflows/excalidraw-creation.md` - Creation workflow
