# 05: Chimeras

## Overview

Chimeras are organs linked by ports. One organ's output becomes another organ's input.

---

## Requirements

### CHI-01: Schema Compatibility [PBT]
THE SYSTEM SHALL only allow links between ports with compatible schemas.

### CHI-02: Cycle Prevention [PBT]
THE SYSTEM SHALL reject any link that would create a cycle.

### CHI-03: Link Cleanup [EX]
WHEN a linked organ is amputated, THE SYSTEM SHALL remove its links.

---

## Port Types

### Output Ports
Organs declare output ports with JSON schemas:
```json
{
  "ports": {
    "out": {
      "type": "object",
      "properties": {
        "moodScore": { "type": "number" }
      }
    }
  }
}
```

### Input Ports
Organs declare input ports with expected schemas:
```json
{
  "ports": {
    "in": {
      "type": "object",
      "properties": {
        "moodScore": { "type": "number" }
      }
    }
  }
}
```

## Linking Rules

### Schema Compatibility
Two schemas are compatible if the output schema is a subset of the input schema:
- All required fields in input exist in output
- Types match for common fields
- Output can be safely passed to input

### Cycle Detection
A link creates a cycle if there's already a path from the target back to the source.

Example:
```
A.out → B.in
B.out → C.in
C.out → A.in  // REJECTED: would create cycle A → B → C → A
```

## Chimera Mode UI

### Mouse
- Drag thread from output port to input port
- Visual feedback during drag
- Drop highlights compatible ports

### Keyboard
1. Select output port (Tab to focus, Enter to select)
2. System highlights compatible input ports
3. Tab to navigate, Enter to link
4. Escape to cancel

### Visual
- Threads rendered as SVG paths
- Animated pulse showing data flow direction
- Color indicates health (vein-green for active)
