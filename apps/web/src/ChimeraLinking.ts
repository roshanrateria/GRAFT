/**
 * Chimera Linking
 *
 * Pure validation logic for chimera links plus the ledger-first link
 * creation service used by the keyboard-only linking UI (UI-04).
 *
 * Implements:
 * - CHI-01: Schema compatibility (output must satisfy the input's requirements)
 * - CHI-02: Cycle prevention (a link is rejected if it would close a loop)
 * - LED: CHIMERA_LINKED entries are appended before state mutation
 */

import { EventType, type Entry, type LedgerService } from '@graft/ledger';
import type { ChimeraLink, OrganInstance } from './stores/creatureStore.js';
import { getChainHeadHash } from './ledger/head.js';
import { hostRegistry, getLastEmittedValue } from './host/OrganRuntime.js';

// =============================================================================
// CHI-01: Schema Compatibility
// =============================================================================

interface JsonSchemaLike {
  type?: string;
  properties?: Record<string, { type?: string }>;
  required?: string[];
}

function normalizeType(type?: string): string | undefined {
  if (!type) return undefined;
  if (type === 'integer') return 'number';
  return type.toLowerCase();
}

function typesCompatible(t1?: string, t2?: string): boolean {
  if (!t1 || !t2) return true;
  return normalizeType(t1) === normalizeType(t2);
}

/**
 * Check whether an output port schema can safely feed an input port schema.
 *
 * Rules (per .kiro/specs/05-chimeras):
 * - Undeclared/empty schemas are treated as permissive.
 * - Primitive types (e.g. integer and number) are compatible.
 * - If one schema wraps a value in a single property, it can feed or receive that primitive.
 * - Every field the input REQUIRES must exist in the output with matching types.
 * - Types must match for common fields.
 */
export function schemasCompatible(
  outputSchema: object | undefined,
  inputSchema: object | undefined
): boolean {
  if (!outputSchema || !inputSchema) return true;
  if (Object.keys(outputSchema).length === 0 || Object.keys(inputSchema).length === 0) return true;

  const output = outputSchema as JsonSchemaLike;
  const input = inputSchema as JsonSchemaLike;

  const outProps = output.properties ?? {};
  const inProps = input.properties ?? {};
  const outPropKeys = Object.keys(outProps);
  const inPropKeys = Object.keys(inProps);

  const outDeclaresFields = outPropKeys.length > 0;
  const inDeclaresFields = inPropKeys.length > 0;

  // Case 1: Both are primitive types (neither declares properties)
  if (!outDeclaresFields && !inDeclaresFields) {
    if (output.type && input.type) {
      return typesCompatible(output.type, input.type);
    }
    return true;
  }

  // Case 2: One is primitive and the other is an object with a single property
  if (!outDeclaresFields && inDeclaresFields && inPropKeys.length === 1) {
    const singleInType = inProps[inPropKeys[0]]?.type;
    if (output.type && singleInType) {
      return typesCompatible(output.type, singleInType);
    }
    return true;
  }

  if (outDeclaresFields && !inDeclaresFields && outPropKeys.length === 1) {
    const singleOutType = outProps[outPropKeys[0]]?.type;
    if (input.type && singleOutType) {
      return typesCompatible(singleOutType, input.type);
    }
    return true;
  }

  // Case 3: Both declare fields or input requires specific fields
  if (outDeclaresFields) {
    // 1. Required input fields must exist in the output with matching types.
    for (const field of input.required ?? []) {
      const outField = outProps[field];
      if (!outField) return false;
      const inType = inProps[field]?.type;
      if (inType !== undefined && outField.type !== undefined && !typesCompatible(outField.type, inType)) {
        return false;
      }
    }
  }

  // 2. Common fields must have matching types.
  for (const [field, inField] of Object.entries(inProps)) {
    const outField = outProps[field];
    if (outField && inField?.type !== undefined && outField.type !== undefined) {
      if (!typesCompatible(inField.type, outField.type)) return false;
    }
  }

  return true;
}

function normalizePortName(name: string): string {
  return name.toLowerCase().replace(/[-_]/g, '');
}

/** Find the manifest port definition of an organ with tolerant naming. */
function findPort(
  organ: OrganInstance | undefined,
  portName: string,
  direction: 'in' | 'out'
): { name: string; direction: 'in' | 'out'; schema: object } | undefined {
  if (!organ?.manifest?.ports) return undefined;
  const targetNorm = normalizePortName(portName);
  return organ.manifest.ports.find(
    p => p.direction === direction && normalizePortName(p.name) === targetNorm
  );
}

// =============================================================================
// CHI-02: Cycle Prevention
// =============================================================================

/**
 * Depth-first search: is there already a directed path `from -> ... -> to`
 * through the existing links?
 */
export function hasPath(links: ChimeraLink[], from: string, to: string): boolean {
  const adjacency = new Map<string, string[]>();
  for (const link of links) {
    const list = adjacency.get(link.sourceOrganId) ?? [];
    list.push(link.targetOrganId);
    adjacency.set(link.sourceOrganId, list);
  }

  const stack = [from];
  const visited = new Set<string>();
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current === to) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    for (const next of adjacency.get(current) ?? []) {
      stack.push(next);
    }
  }
  return false;
}

/**
 * A link would create a cycle if the target can already reach the source.
 */
export function wouldCreateCycle(
  links: ChimeraLink[],
  sourceOrganId: string,
  targetOrganId: string
): boolean {
  if (sourceOrganId === targetOrganId) return true; // self-link is a cycle
  return hasPath(links, targetOrganId, sourceOrganId);
}

// =============================================================================
// Link Validation
// =============================================================================

/** Reason a chimera link was rejected */
export type LinkRejectionReason =
  | 'self_link'
  | 'unknown_organ'
  | 'unknown_port'
  | 'schema_incompatible'
  | 'cycle'
  | 'duplicate';

export interface LinkValidation {
  valid: boolean;
  reason?: LinkRejectionReason;
  /** Human-readable sentence for UI display */
  message?: string;
}

/**
 * Validate a prospective chimera link against the current state.
 * Pure function - no side effects.
 */
export function validateLink(
  links: ChimeraLink[],
  organs: Map<string, OrganInstance>,
  sourceOrganId: string,
  sourcePort: string,
  targetOrganId: string,
  targetPort: string
): LinkValidation {
  if (sourceOrganId === targetOrganId) {
    return {
      valid: false,
      reason: 'self_link',
      message: 'An organ cannot link to itself.',
    };
  }

  const source = organs.get(sourceOrganId);
  const target = organs.get(targetOrganId);
  if (!source || !target) {
    return {
      valid: false,
      reason: 'unknown_organ',
      message: 'Source or target organ is not installed.',
    };
  }

  const sourcePortDef = findPort(source, sourcePort, 'out');
  const targetPortDef = findPort(target, targetPort, 'in');
  if (!sourcePortDef || !targetPortDef) {
    return {
      valid: false,
      reason: 'unknown_port',
      message: 'Ports must be an output port of the source and an input port of the target.',
    };
  }

  if (!schemasCompatible(sourcePortDef.schema, targetPortDef.schema)) {
    return {
      valid: false,
      reason: 'schema_incompatible',
      message: `Output schema of ${sourceOrganId}:${sourcePort} is not compatible with input schema of ${targetOrganId}:${targetPort}.`,
    };
  }

  if (wouldCreateCycle(links, sourceOrganId, targetOrganId)) {
    return {
      valid: false,
      reason: 'cycle',
      message: 'Linking these ports would create a cycle.',
    };
  }

  const duplicate = links.some(
    l =>
      l.sourceOrganId === sourceOrganId &&
      l.sourcePort === sourcePort &&
      l.targetOrganId === targetOrganId &&
      l.targetPort === targetPort
  );
  if (duplicate) {
    return {
      valid: false,
      reason: 'duplicate',
      message: 'These ports are already linked.',
    };
  }

  return { valid: true };
}

// =============================================================================
// Compatible Target Enumeration (UI-04 highlighting)
// =============================================================================

/**
 * All input ports that can legally receive data from the given output port.
 * Used to highlight targets while keyboard-linking is active.
 */
export function getCompatibleTargets(
  links: ChimeraLink[],
  organs: Map<string, OrganInstance>,
  sourceOrganId: string,
  sourcePort: string
): Array<{ organId: string; port: string }> {
  const targets: Array<{ organId: string; port: string }> = [];

  organs.forEach((organ, organId) => {
    if (organId === sourceOrganId) return;
    for (const port of organ.manifest.ports) {
      if (port.direction !== 'in') continue;
      const { valid } = validateLink(
        links,
        organs,
        sourceOrganId,
        sourcePort,
        organId,
        port.name
      );
      if (valid) {
        targets.push({ organId, port: port.name });
      }
    }
  });

  return targets;
}

// =============================================================================
// Ledger-First Link Creation
// =============================================================================

export interface CreateLinkResult {
  success: boolean;
  error?: string;
  linkId?: string;
}

/**
 * Create a chimera link atomically:
 * 1. Validate (CHI-01, CHI-02, duplicates)
 * 2. Append CHIMERA_LINKED ledger entry (LED: ledger first)
 * 3. Mutate the store
 * On ledger failure the link is NOT created (fail closed).
 */
export async function createChimeraLink(
  deps: {
    ledgerService: LedgerService;
    getState: () => {
      chimeraLinks: ChimeraLink[];
      organs: Map<string, OrganInstance>;
    };
    setState: (state: Partial<{ chimeraLinks: ChimeraLink[] }>) => void;
  },
  sourceOrganId: string,
  sourcePort: string,
  targetOrganId: string,
  targetPort: string
): Promise<CreateLinkResult> {
  const state = deps.getState();
  const validation = validateLink(
    state.chimeraLinks,
    state.organs,
    sourceOrganId,
    sourcePort,
    targetOrganId,
    targetPort
  );

  if (!validation.valid) {
    return {
      success: false,
      error: validation.message ?? 'Link rejected',
    };
  }

  const link: ChimeraLink = {
    id: `link-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    sourceOrganId,
    sourcePort,
    targetOrganId,
    targetPort,
  };

  // LED: append the CHIMERA_LINKED entry before mutating state.
  try {
    const prevHash = await getChainHeadHash(deps.ledgerService);
    const entry: Omit<Entry, 'hash'> = {
      id: `chimera_linked-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ts: Date.now(),
      organ_id: sourceOrganId,
      event: EventType.CHIMERA_LINKED,
      payload_json: JSON.stringify({
        action: 'created',
        linkId: link.id,
        sourceOrganId,
        sourcePort,
        targetOrganId,
        targetPort,
      }),
      prev_hash: prevHash,
    };
    await deps.ledgerService.append(entry);
  } catch (error) {
    return {
      success: false,
      error: `Failed to write ledger entry: ${error instanceof Error ? error.message : String(error)}`,
    };
  }

  deps.setState({ chimeraLinks: [...state.chimeraLinks, link] });

  // Route any currently cached emitted value from the source port to the target port
  try {
    const initialValue = getLastEmittedValue(sourceOrganId, sourcePort);
    if (initialValue !== undefined) {
      hostRegistry.get(targetOrganId)?.sendIn(targetPort, initialValue);
    }
  } catch {
    // Non-fatal if target host is not yet mounted
  }

  return { success: true, linkId: link.id };
}
