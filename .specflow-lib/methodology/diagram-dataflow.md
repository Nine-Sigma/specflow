# Data Flow Diagrams

Patterns for creating data flow diagrams (DFD) in Excalidraw.

## Process Elements

### Creation Rules

- **Numbering**: Hierarchical format (1.0, 2.0, 2.1, etc.)
- **Naming**: Verb phrases describing the action
- **Shape**: Circles or ellipses with process numbers
- **Labeling**: Process number above, name below (or combined)

### Constraints

- Processes must have both inputs AND outputs
- Cannot have process-to-process direct flows
- Data must flow through data stores or external entities

## Data Store Elements

### Creation Rules

- **Naming**: Noun phrases describing stored information
- **Identification**: Label as D1, D2, D3, etc.
- **Shape**: Parallel lines (open-ended rectangle) or rectangle
- **Labeling**: ID prefix with descriptive name (e.g., "D1: Customer Records")

### Constraints

- Cannot receive direct flows from other data stores
- Must be accessed through processes
- Data stores are passive (they don't initiate flows)

## External Entities

### Creation Rules

- **Position**: At diagram edges (outside system boundary)
- **Shape**: Rectangles with bold/thick borders
- **Naming**: Noun phrases (e.g., "Customer", "Payment Gateway")

### Constraints

- Cannot flow directly to other external entities
- Represent sources or destinations outside the system
- Initiate or receive system flows but don't process data

## Flow Rules

### Arrow Requirements

- All arrows require descriptive labels
- Arrow direction indicates data movement direction
- Labels describe the data being transferred (not the action)

### Labeling Convention

| Good Labels | Poor Labels |
|-------------|-------------|
| "Order Details" | "Send" |
| "Customer Info" | "Process" |
| "Payment Confirmation" | "Data" |

### Flow Patterns

- Follow left-to-right or top-to-bottom primary flow
- Minimize arrow crossings
- Use consistent arrow styles throughout

## Prohibited Flows

These direct connections are NOT allowed in DFDs:

| From | To | Why Invalid |
|------|-----|-------------|
| External Entity | External Entity | No processing occurs |
| Data Store | Data Store | No transformation happens |
| Process | Process | Missing data specification |

All flows must be labeled with the data being transferred.

## Build Sequence

Construct data flow diagrams in this order:

1. **External entities** - Place at diagram edges first
2. **Processes** - Add numbered processes in flow order
3. **Data stores** - Position between related processes
4. **Data flows** - Connect with labeled arrows

## Layout Optimization

### Positioning

| Element Type | Placement |
|--------------|-----------|
| External entities | Diagram edges (top, sides) |
| Processes | Center area, following data flow |
| Data stores | Between processes that read/write |

### Spacing

- **Vertical**: 120px between elements
- **Horizontal**: 200px between elements
- **Grid**: 20px alignment

### Minimizing Complexity

- Minimize arrow crossings
- Group related processes
- Use consistent left-to-right flow where possible
- Consider decomposition for complex diagrams

## DFD Levels

### Level 0 (Context Diagram)

- Single process representing entire system
- All external entities shown
- High-level data flows only
- Used for system scope definition

### Level 1

- Major processes decomposed
- Primary data stores shown
- More detailed data flows
- Typical working level for analysis

### Level 2+

- Further decomposition of complex processes
- Detailed sub-process flows
- Used when Level 1 is insufficient

## Color Conventions

### Standard DFD Colors

| Element | Fill | Border |
|---------|------|--------|
| Process | Light blue (#e3f2fd) | Blue (#1976d2) |
| Data Store | Light green (#e8f5e9) | Green (#388e3c) |
| External Entity | Light purple (#f3e5f5) | Purple (#7b1fa2) |
| Data Flow | None | Blue (#1976d2) |
