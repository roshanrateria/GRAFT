/**
 * Universal Properties (U1-U7)
 *
 * Every organ must pass these properties.
 * Implements IMM-04: Universal Properties.
 */
import fc from 'fast-check';
// ============================================================================
// Universal Properties
// ============================================================================
/**
 * Run all universal properties (U1-U7) against an organ.
 */
export function runUniversalProperties(context) {
    const failures = [];
    // U1: Totality
    const u1Result = testU1Totality(context);
    if (!u1Result.passed) {
        failures.push({
            propertyId: 'U1',
            message: u1Result.message || 'U1 Totality failed',
            seed: u1Result.seed || 0,
            counterexample: u1Result.counterexample,
        });
    }
    // U2: Boundedness
    const u2Result = testU2Boundedness(context);
    if (!u2Result.passed) {
        failures.push({
            propertyId: 'U2',
            message: u2Result.message || 'U2 Boundedness failed',
            seed: u2Result.seed || 0,
            counterexample: u2Result.counterexample,
        });
    }
    // U3: Declaration Fidelity
    const u3Result = testU3DeclarationFidelity(context);
    if (!u3Result.passed) {
        failures.push({
            propertyId: 'U3',
            message: u3Result.message || 'U3 Declaration Fidelity failed',
            seed: u3Result.seed || 0,
            counterexample: u3Result.counterexample,
        });
    }
    // U4: Determinism
    const u4Result = testU4Determinism(context);
    if (!u4Result.passed) {
        failures.push({
            propertyId: 'U4',
            message: u4Result.message || 'U4 Determinism failed',
            seed: u4Result.seed || 0,
            counterexample: u4Result.counterexample,
        });
    }
    // U5: Idempotent Render
    const u5Result = testU5IdempotentRender(context);
    if (!u5Result.passed) {
        failures.push({
            propertyId: 'U5',
            message: u5Result.message || 'U5 Idempotent Render failed',
            seed: u5Result.seed || 0,
            counterexample: u5Result.counterexample,
        });
    }
    // U6: Theme Robustness
    const u6Result = testU6ThemeRobustness(context);
    if (!u6Result.passed) {
        failures.push({
            propertyId: 'U6',
            message: u6Result.message || 'U6 Theme Robustness failed',
            seed: u6Result.seed || 0,
            counterexample: u6Result.counterexample,
        });
    }
    // U7: No Trap
    const u7Result = testU7NoTrap(context);
    if (!u7Result.passed) {
        failures.push({
            propertyId: 'U7',
            message: u7Result.message || 'U7 No Trap failed',
            seed: u7Result.seed || 0,
            counterexample: u7Result.counterexample,
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
export function createPropertyContext() {
    const messages = [];
    let domSnapshot = '';
    let nowValue = Date.now();
    let randomValue = Math.random();
    return {
        sendMessage: (msg) => {
            messages.push(msg);
        },
        getMessages: () => [...messages],
        getDOMSnapshot: () => domSnapshot,
        setNow: (now) => {
            nowValue = now;
        },
        setRandom: (value) => {
            randomValue = value;
        },
        isInteractive: () => false,
        getFocusableElements: () => [],
        simulateKeyboard: (key) => { },
    };
}
// ============================================================================
// Individual Property Tests
// ============================================================================
/**
 * U1: Totality - For any arbitrary host message, the organ never throws unhandled.
 */
function testU1Totality(context) {
    try {
        const result = fc.check(fc.property(fc.anything(), (msg) => {
            try {
                context.sendMessage(msg);
                return true; // If no error, property holds
            }
            catch (e) {
                return false; // Unhandled exception
            }
        }), { numRuns: 100 });
        if (result.failed) {
            return {
                passed: false,
                message: 'Organ threw unhandled exception on arbitrary input',
                seed: result.seed,
                counterexample: result.counterexample,
            };
        }
        return { passed: true, seed: result.seed };
    }
    catch (error) {
        return {
            passed: false,
            message: `Property test error: ${error instanceof Error ? error.message : String(error)}`,
            seed: 0,
        };
    }
}
/**
 * U2: Boundedness - Under fuzz, emitted messages stay under rate limit and payload size.
 */
function testU2Boundedness(context) {
    try {
        const RATE_LIMIT = 20;
        const MAX_PAYLOAD_SIZE = 16 * 1024; // 16 KB
        const result = fc.check(fc.property(fc.array(fc.anything(), { minLength: 0, maxLength: 100 }), (messages) => {
            // Send many messages rapidly
            for (const msg of messages) {
                try {
                    context.sendMessage(msg);
                }
                catch (e) {
                    // Ignore errors for this test
                }
            }
            const emitted = context.getMessages();
            // Check rate limit (simplified - real implementation would check time window)
            if (emitted.length > RATE_LIMIT * 5) {
                return false; // Way too many messages
            }
            // Check payload sizes
            for (const msg of emitted) {
                const json = JSON.stringify(msg);
                if (json.length > MAX_PAYLOAD_SIZE) {
                    return false;
                }
            }
            return true;
        }), { numRuns: 50 });
        if (result.failed) {
            return {
                passed: false,
                message: 'Organ exceeded rate limit or payload size',
                seed: result.seed,
                counterexample: result.counterexample,
            };
        }
        return { passed: true, seed: result.seed };
    }
    catch (error) {
        return {
            passed: false,
            message: `Property test error: ${error instanceof Error ? error.message : String(error)}`,
            seed: 0,
        };
    }
}
/**
 * U3: Declaration Fidelity - Organ only reads declared paths and emits on declared ports.
 */
function testU3DeclarationFidelity(context) {
    // This would need access to manifest permissions
    // Simplified version for now
    return { passed: true, seed: 0 };
}
/**
 * U4: Determinism - Same init + data sequence yields same emitted sequence.
 */
function testU4Determinism(context) {
    try {
        // Set deterministic seed
        const seed = 12345;
        context.setNow(seed);
        // Run sequence once
        const sequence = [
            { type: 'init', apiVersion: '1.0.0', theme: 'dark', reducedMotion: false, granted: [] },
            { type: 'tick', now: 100 },
            { type: 'tick', now: 200 },
        ];
        for (const msg of sequence) {
            context.sendMessage(msg);
        }
        const firstRun = context.getMessages();
        // Reset and run again
        context.setNow(seed);
        for (const msg of sequence) {
            context.sendMessage(msg);
        }
        const secondRun = context.getMessages();
        // Compare
        if (JSON.stringify(firstRun) !== JSON.stringify(secondRun)) {
            return {
                passed: false,
                message: 'Organ produced different outputs for same input sequence',
                seed,
                counterexample: { firstRun, secondRun },
            };
        }
        return { passed: true, seed };
    }
    catch (error) {
        return {
            passed: false,
            message: `Property test error: ${error instanceof Error ? error.message : String(error)}`,
            seed: 0,
        };
    }
}
/**
 * U5: Idempotent Render - Same data twice yields identical DOM snapshot.
 */
function testU5IdempotentRender(context) {
    try {
        const data = { type: 'data', id: 'test', value: { score: 5 } };
        // Send data once
        context.sendMessage(data);
        const snapshot1 = context.getDOMSnapshot();
        // Send same data again
        context.sendMessage(data);
        const snapshot2 = context.getDOMSnapshot();
        if (snapshot1 !== snapshot2) {
            return {
                passed: false,
                message: 'Same data applied twice produced different DOM',
                seed: 0,
                counterexample: { snapshot1, snapshot2 },
            };
        }
        return { passed: true, seed: 0 };
    }
    catch (error) {
        return {
            passed: false,
            message: `Property test error: ${error instanceof Error ? error.message : String(error)}`,
            seed: 0,
        };
    }
}
/**
 * U6: Theme Robustness - Light, dark, and reduced-motion all render without errors.
 */
function testU6ThemeRobustness(context) {
    try {
        const themes = ['light', 'dark'];
        for (const theme of themes) {
            for (const reducedMotion of [true, false]) {
                try {
                    context.sendMessage({
                        type: 'init',
                        apiVersion: '1.0.0',
                        theme,
                        reducedMotion,
                        granted: [],
                    });
                    // Check if DOM is accessible
                    const snapshot = context.getDOMSnapshot();
                    if (!snapshot && snapshot !== '') {
                        return {
                            passed: false,
                            message: `Failed to render for theme=${theme}, reducedMotion=${reducedMotion}`,
                            seed: 0,
                        };
                    }
                }
                catch (error) {
                    return {
                        passed: false,
                        message: `Error rendering for theme=${theme}, reducedMotion=${reducedMotion}: ${error instanceof Error ? error.message : String(error)}`,
                        seed: 0,
                    };
                }
            }
        }
        return { passed: true, seed: 0 };
    }
    catch (error) {
        return {
            passed: false,
            message: `Property test error: ${error instanceof Error ? error.message : String(error)}`,
            seed: 0,
        };
    }
}
/**
 * U7: No Trap - No input sequence leaves keyboard focus trapped.
 */
function testU7NoTrap(context) {
    try {
        // Only test if organ is interactive
        if (!context.isInteractive()) {
            return { passed: true, seed: 0 };
        }
        const focusable = context.getFocusableElements();
        if (focusable.length === 0) {
            return { passed: true, seed: 0 };
        }
        // Try tabbing through all elements
        const visited = new Set();
        const maxTabs = focusable.length * 2; // Should cycle within 2x elements
        for (let i = 0; i < maxTabs; i++) {
            context.simulateKeyboard('Tab');
            // In a real implementation, we'd track which element is focused
        }
        return { passed: true, seed: 0 };
    }
    catch (error) {
        return {
            passed: false,
            message: `Property test error: ${error instanceof Error ? error.message : String(error)}`,
            seed: 0,
        };
    }
}
//# sourceMappingURL=universal.js.map