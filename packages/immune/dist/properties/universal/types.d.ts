/**
 * Universal Property Types
 *
 * Shared types for U1-U7 property tests.
 */
import type { PropertyFailure } from '../../types.js';
/**
 * Context provided to property tests for interacting with an organ.
 */
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
    /** Get declared permissions from manifest */
    getDeclaredPermissions: () => string[];
    /** Get declared ports from manifest */
    getDeclaredPorts: () => string[];
    /** Reset organ state for fresh test run */
    reset: () => void;
}
/**
 * Result of a single property test.
 */
export interface PropertyTestResult {
    /** Whether the property passed */
    passed: boolean;
    /** Error message if failed */
    message?: string;
    /** Fast-check seed for reproduction */
    seed: number;
    /** Counterexample input if failed */
    counterexample?: unknown;
    /** Stack trace if available */
    stack?: string;
}
/**
 * Aggregate result for all universal properties.
 */
export interface UniversalPropertyResult {
    /** Whether all properties passed */
    passed: boolean;
    /** Individual property failures */
    failures: PropertyFailure[];
}
//# sourceMappingURL=types.d.ts.map