/**
 * Tissue Kit - Tiny helpers for organ rendering
 *
 * The host injects this kit into every organ's sandbox.
 * Provides CSS design tokens and chart rendering utilities.
 *
 * @see .kiro/steering/design-theatre.md
 */
/**
 * Color tokens from the Victorian anatomical theatre theme.
 * These values match the CSS custom properties in design-theatre.md.
 */
export declare const COLORS: {
    /** Deep black background */
    readonly background: "#0e0b0b";
    /** Warm dark surface */
    readonly surface: "#17120f";
    /** Cream/off-white for text */
    readonly bone: "#e9e1d0";
    /** Metallic accent */
    readonly brass: "#b08d57";
    /** Deep red accent */
    readonly oxblood: "#7a1f1f";
    /** Healthy/good state indicator */
    readonly veinGreen: "#6f9a7d";
    /** Alert/error indicator */
    readonly alert: "#c4472f";
};
/**
 * CSS variable names for design tokens.
 * Use these to reference CSS custom properties in JavaScript.
 */
export declare const CSS_VARS: {
    readonly background: "--color-background";
    readonly surface: "--color-surface";
    readonly bone: "--color-bone";
    readonly brass: "--color-brass";
    readonly oxblood: "--color-oxblood";
    readonly veinGreen: "--color-vein-green";
    readonly alert: "--color-alert";
};
/**
 * Typography tokens for the anatomical theatre theme.
 */
export declare const TYPOGRAPHY: {
    /** Victorian serif for headings (Cormorant Garamond or IM Fell English) */
    readonly heading: "'Cormorant Garamond', 'IM Fell English', Georgia, serif";
    /** Humanist sans-serif for body text */
    readonly body: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif";
    /** Monospace for ledger/code (IBM Plex Mono) */
    readonly ledger: "'IBM Plex Mono', 'Consolas', 'Monaco', monospace";
};
/**
 * Font family CSS variable names.
 */
export declare const FONT_VARS: {
    readonly heading: "--font-heading";
    readonly body: "--font-body";
    readonly ledger: "--font-ledger";
};
/**
 * Generate CSS custom property definitions for injection.
 * Returns a string of CSS that can be injected into the organ's iframe.
 */
export declare function generateCSSTokenStyles(): string;
/** A single data point for charts */
export interface DataPoint {
    /** Label for the data point (e.g., date, category) */
    label: string;
    /** Numeric value */
    value: number;
}
/** Configuration for line charts */
export interface LineChartConfig {
    /** Chart data points */
    data: DataPoint[];
    /** Width in pixels (default: 300) */
    width?: number;
    /** Height in pixels (default: 150) */
    height?: number;
    /** Line color (default: veinGreen) */
    color?: string;
    /** Show dots at data points (default: true) */
    showDots?: boolean;
    /** Show grid lines (default: false) */
    showGrid?: boolean;
    /** Custom CSS class */
    className?: string;
}
/** Configuration for bar charts */
export interface BarChartConfig {
    /** Chart data points */
    data: DataPoint[];
    /** Width in pixels (default: 300) */
    width?: number;
    /** Height in pixels (default: 150) */
    height?: number;
    /** Bar color (default: brass) */
    color?: string;
    /** Bar width in pixels (default: auto-calculated) */
    barWidth?: number;
    /** Gap between bars in pixels (default: 4) */
    gap?: number;
    /** Show value labels (default: true) */
    showLabels?: boolean;
    /** Custom CSS class */
    className?: string;
}
/** Configuration for list rendering */
export interface ListConfig<T> {
    /** Items to render */
    items: T[];
    /** Render function for each item */
    render: (item: T, index: number) => string;
    /** Custom CSS class for the list container */
    className?: string;
    /** Custom CSS class for each item */
    itemClassName?: string;
    /** Ordered list (default: false = unordered) */
    ordered?: boolean;
}
/**
 * Tissue Kit helpers for organ rendering.
 * Provides utilities for charts and common UI patterns.
 */
export declare const Tissue: {
    /**
     * Render a simple SVG line chart.
     * Useful for trend visualization (e.g., mood over time).
     *
     * @example
     * ```typescript
     * const chart = Tissue.line({
     *   data: [
     *     { label: 'Mon', value: 7 },
     *     { label: 'Tue', value: 5 },
     *     { label: 'Wed', value: 8 },
     *   ],
     *   width: 200,
     *   height: 100,
     * });
     * ```
     */
    line(config: LineChartConfig): string;
    /**
     * Render a simple SVG bar chart.
     * Useful for comparisons (e.g., habit completion by day).
     *
     * @example
     * ```typescript
     * const chart = Tissue.bar({
     *   data: [
     *     { label: 'Mon', value: 3 },
     *     { label: 'Tue', value: 5 },
     *     { label: 'Wed', value: 2 },
     *   ],
     *   width: 200,
     *   height: 100,
     * });
     * ```
     */
    bar(config: BarChartConfig): string;
    /**
     * Render a list of items with a custom render function.
     * Useful for rendering structured data lists.
     *
     * @example
     * ```typescript
     * const list = Tissue.list({
     *   items: tasks,
     *   render: (task) => `<span>${task.title}</span>`,
     *   className: 'task-list',
     * });
     * ```
     */
    list<T>(config: ListConfig<T>): string;
};
/**
 * Format a number for display in charts.
 * Rounds to specified decimal places and handles edge cases.
 */
export declare function formatValue(value: number, decimals?: number): string;
/**
 * Generate a simple unique ID for chart elements.
 * Uses crypto.randomUUID if available, falls back to timestamp-based ID.
 */
export declare function generateId(): string;
//# sourceMappingURL=tissue.d.ts.map