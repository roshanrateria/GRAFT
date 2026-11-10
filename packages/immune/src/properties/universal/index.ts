/**
 * Universal Properties Index
 *
 * Exports all U1-U7 property tests and utilities.
 */

export type { PropertyContext, PropertyTestResult, UniversalPropertyResult } from './types.js';

export { testU1Totality } from './u1-totality.js';
export { testU2Boundedness } from './u2-boundedness.js';
export { testU3DeclarationFidelity } from './u3-declaration-fidelity.js';
export { testU4Determinism } from './u4-determinism.js';
export { testU5IdempotentRender } from './u5-idempotent-render.js';
export { testU6ThemeRobustness } from './u6-theme-robustness.js';
export { testU7NoTrap } from './u7-no-trap.js';

import type { PropertyFailure } from '../../types.js';
import type { PropertyContext, PropertyTestResult } from './types.js';
import { testU1Totality } from './u1-totality.js';
import { testU2Boundedness } from './u2-boundedness.js';
import { testU3DeclarationFidelity } from './u3-declaration-fidelity.js';
import { testU4Determinism } from './u4-determinism.js';
import { testU5IdempotentRender } from './u5-idempotent-render.js';
import { testU6ThemeRobustness } from './u6-theme-robustness.js';
import { testU7NoTrap } from './u7-no-trap.js';

/**
 * Run all universal properties (U1-U7) against an organ.
 */
export function runUniversalProperties(context: PropertyContext): {
  passed: boolean;
  failures: PropertyFailure[];
} {
  const failures: PropertyFailure[] = [];

  // U1: Totality
  const u1Result = testU1Totality(context);
  if (!u1Result.passed) {
    failures.push({
      propertyId: 'U1',
      message: u1Result.message || 'U1 Totality failed',
      seed: u1Result.seed,
      counterexample: u1Result.counterexample,
      stack: u1Result.stack,
    });
  }

  // U2: Boundedness
  const u2Result = testU2Boundedness(context);
  if (!u2Result.passed) {
    failures.push({
      propertyId: 'U2',
      message: u2Result.message || 'U2 Boundedness failed',
      seed: u2Result.seed,
      counterexample: u2Result.counterexample,
      stack: u2Result.stack,
    });
  }

  // U3: Declaration Fidelity
  const u3Result = testU3DeclarationFidelity(context);
  if (!u3Result.passed) {
    failures.push({
      propertyId: 'U3',
      message: u3Result.message || 'U3 Declaration Fidelity failed',
      seed: u3Result.seed,
      counterexample: u3Result.counterexample,
      stack: u3Result.stack,
    });
  }

  // U4: Determinism
  const u4Result = testU4Determinism(context);
  if (!u4Result.passed) {
    failures.push({
      propertyId: 'U4',
      message: u4Result.message || 'U4 Determinism failed',
      seed: u4Result.seed,
      counterexample: u4Result.counterexample,
      stack: u4Result.stack,
    });
  }

  // U5: Idempotent Render
  const u5Result = testU5IdempotentRender(context);
  if (!u5Result.passed) {
    failures.push({
      propertyId: 'U5',
      message: u5Result.message || 'U5 Idempotent Render failed',
      seed: u5Result.seed,
      counterexample: u5Result.counterexample,
      stack: u5Result.stack,
    });
  }

  // U6: Theme Robustness
  const u6Result = testU6ThemeRobustness(context);
  if (!u6Result.passed) {
    failures.push({
      propertyId: 'U6',
      message: u6Result.message || 'U6 Theme Robustness failed',
      seed: u6Result.seed,
      counterexample: u6Result.counterexample,
      stack: u6Result.stack,
    });
  }

  // U7: No Trap
  const u7Result = testU7NoTrap(context);
  if (!u7Result.passed) {
    failures.push({
      propertyId: 'U7',
      message: u7Result.message || 'U7 No Trap failed',
      seed: u7Result.seed,
      counterexample: u7Result.counterexample,
      stack: u7Result.stack,
    });
  }

  return {
    passed: failures.length === 0,
    failures,
  };
}

/**
 * Create a mock property context for testing.
 */
export function createMockPropertyContext(
  options: {
    permissions?: string[];
    ports?: string[];
    interactive?: boolean;
  } = {}
): PropertyContext {
  const messages: unknown[] = [];
  let domSnapshot = '';
  let nowValue = Date.now();
  let randomValue = Math.random();
  const focusableElements: string[] = [];
  
  const permissions = options.permissions || [];
  const ports = options.ports || [];
  const interactive = options.interactive || false;

  return {
    sendMessage: (msg: unknown) => {
      messages.push(msg);
    },
    getMessages: () => [...messages],
    getDOMSnapshot: () => domSnapshot,
    setNow: (now: number) => {
      nowValue = now;
    },
    setRandom: (value: number) => {
      randomValue = value;
    },
    isInteractive: () => interactive,
    getFocusableElements: () => [...focusableElements],
    simulateKeyboard: (key: string) => {
      // No-op in mock
    },
    getDeclaredPermissions: () => [...permissions],
    getDeclaredPorts: () => [...ports],
    reset: () => {
      messages.length = 0;
      domSnapshot = '';
    },
  };
}
