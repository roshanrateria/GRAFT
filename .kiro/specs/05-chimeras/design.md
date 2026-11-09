# Design: Chimeras

## Architecture

```
┌──────────────────────────────────────────────────┐
│                   Creature                        │
│                                                   │
│  ┌─────────┐         ┌─────────┐                │
│  │ Organ A │         │ Organ B │                │
│  │         │         │         │                │
│  │  [out] ─┼────────►│ [in]    │                │
│  │         │         │         │                │
│  └─────────┘         └────┬────┘                │
│                           │                      │
│                           ▼                      │
│                    ┌─────────┐                   │
│                    │ Organ C │                   │
│                    │         │                   │
│                    │ [in]    │                   │
│                    └─────────┘                   │
│                                                   │
│  ┌────────────────────────────────────────────┐  │
│  │           Chimera Router                    │  │
│  │  - Route emit() to linked organ's in()     │  │
│  │  - Enforce rate limit per link             │  │
│  │  - Detect and reject cycles                │  │
│  └────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

## Components

### Link Registry
```typescript
interface LinkRegistry {
  links: Map<LinkId, Link>;
  
  add(source: OrganId, sourcePort: string, 
      target: OrganId, targetPort: string): LinkId;
  
  remove(linkId: LinkId): void;
  
  getLinksForOrgan(organId: OrganId): Link[];
  
  wouldCreateCycle(source: OrganId, target: OrganId): boolean;
}

interface Link {
  id: LinkId;
  source: OrganId;
  sourcePort: string;
  target: OrganId;
  targetPort: string;
  schema: JSONSchema;
}
```

### Schema Compatibility Checker
```typescript
function isCompatible(output: JSONSchema, input: JSONSchema): boolean {
  // Check that output is a valid input for input schema
  // - Required fields present
  // - Types match
  // - Constraints satisfied
}
```

### Cycle Detector
```typescript
function wouldCreateCycle(
  graph: Map<OrganId, OrganId[]>,
  source: OrganId,
  target: OrganId
): boolean {
  // BFS/DFS from target to see if we can reach source
  const visited = new Set<OrganId>();
  const queue = [target];
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === source) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    
    const targets = graph.get(current) || [];
    queue.push(...targets);
  }
  
  return false;
}
```

## Message Flow

1. Organ A calls `nerve.emit('out', payload)`
2. Chimera Router receives message
3. Router finds links from A.out
4. For each link, route to target organ
5. Call `nerve.in('in', payload)` on target
6. Rate limit enforced per link

## Rate Limiting

Each link has its own rate limit bucket (20 msg/sec). Violations quarantine the source organ.
