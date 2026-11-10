/**
 * Universal Properties Tests (U1-U7)
 *
 * Tests for IMM-04: Universal Properties using fast-check
 */

import { describe, it, expect } from 'vitest';
import {
  testU1Totality,
  testU2Boundedness,
  testU3DeclarationFidelity,
  testU4Determinism,
  testU5IdempotentRender,
  testU6ThemeRobustness,
  testU7NoTrap,
  runUniversalProperties,
  createMockPropertyContext,
} from '../properties/universal/index.js';

// ============================================================================
// U1: Totality
// ============================================================================

describe('U1: Totality', () => {
  it('should pass with mock context that never throws', () => {
    const context = createMockPropertyContext();
    const result = testU1Totality(context);

    expect(result.passed).toBe(true);
  });

  it('should fail when context throws on some inputs', () => {
    // Create a context that throws on specific inputs
    let callCount = 0;
    const context: ReturnType<typeof createMockPropertyContext> = {
      ...createMockPropertyContext(),
      sendMessage: (msg: unknown) => {
        callCount++;
        // Throw on every 10th call to create intermittent failure
        if (callCount % 10 === 0) {
          throw new Error('Simulated intermittent error');
        }
      },
    };

    const result = testU1Totality(context);

    // With fast-check fuzzing, it should find the failure case
    expect(result.passed).toBe(false);
    expect(result.seed).not.toBe(0);
    console.log('U1 failure seed:', result.seed, 'counterexample:', result.counterexample);
  });

  it('should log seed on failure', () => {
    // Create a context that always throws
    const context: ReturnType<typeof createMockPropertyContext> = {
      ...createMockPropertyContext(),
      sendMessage: () => {
        throw new Error('Always throws');
      },
    };

    const result = testU1Totality(context);

    expect(result.passed).toBe(false);
    expect(result.message).toContain('unhandled exception');
    // Seed should be logged for reproducibility
    console.log(`U1 Totality failed with seed: ${result.seed}`);
  });
});

// ============================================================================
// U2: Boundedness
// ============================================================================

describe('U2: Boundedness', () => {
  it('should pass with mock context that respects limits', () => {
    const context = createMockPropertyContext();
    const result = testU2Boundedness(context);

    expect(result.passed).toBe(true);
  });

  it('should fail when rate limit is exceeded', () => {
    // Create a context that returns too many messages
    let messageCount = 0;
    const context: ReturnType<typeof createMockPropertyContext> = {
      ...createMockPropertyContext(),
      sendMessage: () => {
        messageCount++;
      },
      getMessages: () => {
        // Return way too many messages to simulate rate limit violation
        return Array(500).fill({ data: 'spam' });
      },
    };

    const result = testU2Boundedness(context);

    expect(result.passed).toBe(false);
    console.log('U2 failure seed:', result.seed);
  });

  it('should fail when payload size is exceeded', () => {
    const context: ReturnType<typeof createMockPropertyContext> = {
      ...createMockPropertyContext(),
      getMessages: () => {
        // Return a message with a huge payload
        return [{ data: 'x'.repeat(20 * 1024) }]; // 20KB exceeds 16KB limit
      },
    };

    const result = testU2Boundedness(context);

    expect(result.passed).toBe(false);
  });
});

// ============================================================================
// U3: Declaration Fidelity
// ============================================================================

describe('U3: Declaration Fidelity', () => {
  it('should pass when organ only uses declared permissions', () => {
    const context = createMockPropertyContext({
      permissions: ['read:mood.entries'],
      ports: ['output'],
    });

    const result = testU3DeclarationFidelity(context);

    expect(result.passed).toBe(true);
  });

  it('should fail when organ emits on undeclared port', () => {
    const context: ReturnType<typeof createMockPropertyContext> = {
      ...createMockPropertyContext({
        permissions: ['read:mood.entries'],
        ports: [], // No ports declared
      }),
      getMessages: () => {
        // Emitting on undeclared port
        return [{ port: 'secret', data: 'stolen' }];
      },
    };

    const result = testU3DeclarationFidelity(context);

    expect(result.passed).toBe(false);
    expect(result.message).toContain('undeclared port');
  });
});

// ============================================================================
// U4: Determinism
// ============================================================================

describe('U4: Determinism', () => {
  it('should pass with deterministic mock context', () => {
    const context = createMockPropertyContext();
    const result = testU4Determinism(context);

    expect(result.passed).toBe(true);
  });

  it('should fail when outputs differ for same inputs', () => {
    let callCount = 0;
    const context: ReturnType<typeof createMockPropertyContext> = {
      ...createMockPropertyContext(),
      getMessages: () => {
        // Return different results each time
        callCount++;
        return [{ value: callCount }];
      },
    };

    const result = testU4Determinism(context);

    expect(result.passed).toBe(false);
    expect(result.message).toContain('different outputs');
    console.log('U4 counterexample:', result.counterexample);
  });
});

// ============================================================================
// U5: Idempotent Render
// ============================================================================

describe('U5: Idempotent Render', () => {
  it('should pass with stable DOM snapshot', () => {
    let snapshot = '<div>test</div>';
    const context: ReturnType<typeof createMockPropertyContext> = {
      ...createMockPropertyContext(),
      getDOMSnapshot: () => snapshot,
    };

    const result = testU5IdempotentRender(context);

    expect(result.passed).toBe(true);
  });

  it('should fail when DOM changes for same data', () => {
    let callCount = 0;
    const context: ReturnType<typeof createMockPropertyContext> = {
      ...createMockPropertyContext(),
      getDOMSnapshot: () => {
        // Return different DOM each time
        callCount++;
        return `<div>render-${callCount}</div>`;
      },
    };

    const result = testU5IdempotentRender(context);

    expect(result.passed).toBe(false);
    expect(result.message).toContain('different DOM');
  });
});

// ============================================================================
// U6: Theme Robustness
// ============================================================================

describe('U6: Theme Robustness', () => {
  it('should pass with mock context that handles all themes', () => {
    const context = createMockPropertyContext();
    const result = testU6ThemeRobustness(context);

    expect(result.passed).toBe(true);
  });

  it('should fail when organ throws for specific theme', () => {
    const context: ReturnType<typeof createMockPropertyContext> = {
      ...createMockPropertyContext(),
      sendMessage: (msg: unknown) => {
        if (typeof msg === 'object' && msg !== null && 'theme' in msg) {
          if ((msg as any).theme === 'dark') {
            throw new Error('Dark theme not supported');
          }
        }
      },
    };

    const result = testU6ThemeRobustness(context);

    expect(result.passed).toBe(false);
    expect(result.message).toContain('dark');
  });
});

// ============================================================================
// U7: No Trap
// ============================================================================

describe('U7: No Trap', () => {
  it('should pass for non-interactive organs', () => {
    const context = createMockPropertyContext({ interactive: false });
    const result = testU7NoTrap(context);

    expect(result.passed).toBe(true);
  });

  it('should pass for interactive organs with proper focus', () => {
    const context = createMockPropertyContext({
      interactive: true,
    });
    const result = testU7NoTrap(context);

    expect(result.passed).toBe(true);
  });
});

// ============================================================================
// All Universal Properties Together
// ============================================================================

describe('Run All Universal Properties', () => {
  it('should pass all properties with basic mock context', () => {
    const context = createMockPropertyContext();
    const result = runUniversalProperties(context);

    expect(result.passed).toBe(true);
    expect(result.failures).toHaveLength(0);
  });

  it('should collect all failures', () => {
    // Create a context that fails multiple properties
    let callCount = 0;
    const context: ReturnType<typeof createMockPropertyContext> = {
      ...createMockPropertyContext(),
      sendMessage: () => {
        throw new Error('Always fails');
      },
      getMessages: () => {
        return Array(500).fill({ data: 'spam' }); // Rate limit violation
      },
      getDOMSnapshot: () => {
        callCount++;
        return `snapshot-${callCount}`; // Non-idempotent
      },
    };

    const result = runUniversalProperties(context);

    expect(result.passed).toBe(false);
    expect(result.failures.length).toBeGreaterThan(0);

    // Log all failures with their seeds
    for (const failure of result.failures) {
      console.log(`Property ${failure.propertyId} failed: seed=${failure.seed}`);
    }
  });
});
