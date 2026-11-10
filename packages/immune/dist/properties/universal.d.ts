/**
 * Universal Properties (U1-U7)
 *
 * Every organ must pass these properties.
 * Implements IMM-04: Universal Properties.
 */
import type { PropertyResult } from '../types.js';
export interface PropertyContext {
    /** Send a message to the organ */
    sendMessage: (msg: unknown) => void;
    /** Get messages sent by organ */
    getMessages: () => unknown[];
    /** Get current DOM snapshot */
    getDOMSnapshot: () => string;
    /** Inject time value */
    setNow: (now: number) => void;
    /** Inject random value */
    setRandom: (value: number) => void;
    /** Check if organ is interactive */
    isInteractive: () => boolean;
    /** Get keyboard-focusable elements */
    getFocusableElements: () => string[];
    /** Simulate keyboard input */
    simulateKeyboard: (key: string) => void;
}
/**
 * Run all universal properties (U1-U7) against an organ.
 */
export declare function runUniversalProperties(context: PropertyContext): PropertyResult;
/**
 * Create a mock property context for testing.
 */
export declare function createPropertyContext(): PropertyContext;
//# sourceMappingURL=universal.d.ts.map