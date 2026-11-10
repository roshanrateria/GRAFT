/**
 * Behavioral Harness
 *
 * Browser-based sandbox for runtime organ verification.
 * Implements Stage 3: Behavioral Run.
 */
import type { BehavioralResult, BehavioralMetrics } from '../types.js';
/**
 * Run behavioral checks on an organ in a sandboxed iframe.
 * NOTE: This is designed to be called from browser context.
 * Server-side, this returns a placeholder that needs browser execution.
 */
export declare function runBehavioralCheck(indexHtml: string, manifest: any): BehavioralResult;
/**
 * Create a sandboxed iframe for organ testing.
 * Returns iframe element and message channel.
 */
export declare function createSandboxedIframe(indexHtml: string): {
    iframe: HTMLIFrameElement;
    cleanup: () => void;
} | null;
/**
 * Measure behavioral metrics from a sandboxed iframe.
 */
export declare function measureBehavioralMetrics(iframe: HTMLIFrameElement, timeout?: number): Promise<BehavioralMetrics>;
/**
 * Validate behavioral metrics against limits.
 */
export declare function validateBehavioralMetrics(metrics: BehavioralMetrics): {
    passed: boolean;
    violations: string[];
};
//# sourceMappingURL=index.d.ts.map