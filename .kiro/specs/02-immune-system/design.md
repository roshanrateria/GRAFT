# Design: Immune System

## Architecture

```
┌─────────────────────────────────────────────────┐
│                 Organ Bundle                     │
│  manifest.json, index.html, spec.md,            │
│  properties.js                                   │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│           IMMUNE SYSTEM (4 stages)              │
│                                                  │
│  ┌─────────────────────────────────────────┐    │
│  │ Stage 1: Static Scan (server)            │    │
│  │ - acorn + acorn-walk for JS AST          │    │
│  │ - parse5 for HTML                        │    │
│  │ - Detect banned constructs               │    │
│  └──────────────────┬──────────────────────┘    │
│                     │ pass                       │
│                     ▼                            │
│  ┌─────────────────────────────────────────┐    │
│  │ Stage 2: Manifest Check (server)         │    │
│  │ - Zod schema validation                  │    │
│  │ - Permission validation                  │    │
│  │ - Port schema validation                 │    │
│  └──────────────────┬──────────────────────┘    │
│                     │ pass                       │
│                     ▼                            │
│  ┌─────────────────────────────────────────┐    │
│  │ Stage 3: Behavioral Run (browser)        │    │
│  │ - Hidden sandboxed iframe                │    │
│  │ - Measure load, errors, DOM, CSP         │    │
│  └──────────────────┬──────────────────────┘    │
│                     │ pass                       │
│                     ▼                            │
│  ┌─────────────────────────────────────────┐    │
│  │ Stage 4: Property Fuzz (browser)         │    │
│  │ - fast-check for U1-U7                   │    │
│  │ - Organ-specific properties (≥3)         │    │
│  │ - axe-core accessibility check           │    │
│  └──────────────────┬──────────────────────┘    │
│                     │                            │
└─────────────────────┼───────────────────────────┘
                      │
           ┌──────────┴──────────┐
           │ pass                │ fail
           ▼                     ▼
    ┌─────────────┐    ┌─────────────────┐
    │   PASS      │    │ Rejection Report │
    │  Report     │    │ - reason code    │
    └─────────────┘    │ - human message  │
                       │ - source line    │
                       └─────────────────┘
```

## Stage Details

### Stage 1: Static Scan
- Use `acorn` to parse JS, `acorn-walk` to traverse AST
- Use `parse5` to parse HTML
- Detect banned constructs via AST analysis (not regex)
- Report: construct type, source location (line, column)

### Stage 2: Manifest Check
- Zod schemas for manifest structure
- Validate permissions against allowed set
- Cross-reference with AST-detected calls
- Report: validation error, specific field

### Stage 3: Behavioral Run
- Create hidden iframe with same sandbox as production
- Inject organ via srcdoc with CSP
- Set up Nerve API mock with message logging
- Measure: load time, errors, DOM count, CSP reports
- Timeout: 5 seconds

### Stage 4: Property Fuzz
- fast-check with logged seed
- Run U1-U7 universal properties
- Run organ's `properties.js` (≥3 properties)
- Run axe-core accessibility scan
- Report: failing property, seed, counterexample

## Error Handling

- Any error in a stage → reject (fail closed)
- Report includes which stage failed
- Provide actionable reason (not just "failed")
