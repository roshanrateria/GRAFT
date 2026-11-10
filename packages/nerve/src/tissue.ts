/**
 * Tissue Kit - Tiny helpers for organ rendering
 *
 * The host injects this kit into every organ's sandbox.
 * Provides CSS design tokens and chart rendering utilities.
 *
 * @see .kiro/steering/design-theatre.md
 */

// ============================================================================
// Design Tokens - CSS Custom Properties
// ============================================================================

/**
 * Color tokens from the Victorian anatomical theatre theme.
 * These values match the CSS custom properties in design-theatre.md.
 */
export const COLORS = {
  /** Deep black background */
  background: '#0e0b0b',
  /** Warm dark surface */
  surface: '#17120f',
  /** Cream/off-white for text */
  bone: '#e9e1d0',
  /** Metallic accent */
  brass: '#b08d57',
  /** Deep red accent */
  oxblood: '#7a1f1f',
  /** Healthy/good state indicator */
  veinGreen: '#6f9a7d',
  /** Alert/error indicator */
  alert: '#c4472f',
} as const;

/**
 * CSS variable names for design tokens.
 * Use these to reference CSS custom properties in JavaScript.
 */
export const CSS_VARS = {
  background: '--color-background',
  surface: '--color-surface',
  bone: '--color-bone',
  brass: '--color-brass',
  oxblood: '--color-oxblood',
  veinGreen: '--color-vein-green',
  alert: '--color-alert',
} as const;

/**
 * Typography tokens for the anatomical theatre theme.
 */
export const TYPOGRAPHY = {
  /** Victorian serif for headings (Cormorant Garamond or IM Fell English) */
  heading: "'Cormorant Garamond', 'IM Fell English', Georgia, serif",
  /** Humanist sans-serif for body text */
  body: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
  /** Monospace for ledger/code (IBM Plex Mono) */
  ledger: "'IBM Plex Mono', 'Consolas', 'Monaco', monospace",
} as const;

/**
 * Font family CSS variable names.
 */
export const FONT_VARS = {
  heading: '--font-heading',
  body: '--font-body',
  ledger: '--font-ledger',
} as const;

/**
 * Generate CSS custom property definitions for injection.
 * Returns a string of CSS that can be injected into the organ's iframe.
 */
export function generateCSSTokenStyles(): string {
  return `
:root {
  ${CSS_VARS.background}: ${COLORS.background};
  ${CSS_VARS.surface}: ${COLORS.surface};
  ${CSS_VARS.bone}: ${COLORS.bone};
  ${CSS_VARS.brass}: ${COLORS.brass};
  ${CSS_VARS.oxblood}: ${COLORS.oxblood};
  ${CSS_VARS.veinGreen}: ${COLORS.veinGreen};
  ${CSS_VARS.alert}: ${COLORS.alert};
  ${FONT_VARS.heading}: ${TYPOGRAPHY.heading};
  ${FONT_VARS.body}: ${TYPOGRAPHY.body};
  ${FONT_VARS.ledger}: ${TYPOGRAPHY.ledger};
}
`.trim();
}

// ============================================================================
// Chart Data Types
// ============================================================================

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

// ============================================================================
// Tissue Kit Namespace
// ============================================================================

/**
 * Tissue Kit helpers for organ rendering.
 * Provides utilities for charts and common UI patterns.
 */
export const Tissue = {
  // ---------------------------------------------------------------------------
  // Line Chart Helper
  // ---------------------------------------------------------------------------

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
  line(config: LineChartConfig): string {
    const {
      data,
      width = 300,
      height = 150,
      color = COLORS.veinGreen,
      showDots = true,
      showGrid = false,
      className,
    } = config;

    if (data.length === 0) {
      return `<svg width="${width}" height="${height}" class="${className || ''}" role="img" aria-label="Empty chart"></svg>`;
    }

    const padding = 20;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const values = data.map(d => d.value);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal || 1;

    const points = data.map((d, i) => {
      // For single point, center it; otherwise spread across chart width
      const x = data.length === 1
        ? width / 2
        : padding + (i / (data.length - 1)) * chartWidth;
      // For single point, center vertically; otherwise use value-based position
      const y = data.length === 1
        ? height / 2
        : padding + chartHeight - ((d.value - minVal) / range) * chartHeight;
      return { x, y, ...d };
    });

    const pathD = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
      .join(' ');

    const dots = showDots
      ? points
          .map(
            p => `<circle cx="${p.x}" cy="${p.y}" r="3" fill="${color}" aria-label="${p.label}: ${p.value}"/>`
          )
          .join('\n')
      : '';

    const grid = showGrid
      ? Array.from({ length: 5 }, (_, i) => {
          const y = padding + (i / 4) * chartHeight;
          return `<line x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" stroke="var(${CSS_VARS.bone})" stroke-opacity="0.2" stroke-dasharray="4"/>`;
        }).join('\n')
      : '';

    const labels = data
      .slice(0, Math.min(data.length, 7))
      .map((d, i) => {
        const x = padding + (i / (data.length - 1 || 1)) * chartWidth;
        return `<text x="${x}" y="${height - 4}" text-anchor="middle" font-size="10" fill="var(${CSS_VARS.bone})" opacity="0.7">${d.label}</text>`;
      })
      .join('\n');

    return `
<svg width="${width}" height="${height}" class="${className || ''}" role="img" aria-label="Line chart">
  ${grid}
  <path d="${pathD}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  ${dots}
  ${labels}
</svg>`.trim();
  },

  // ---------------------------------------------------------------------------
  // Bar Chart Helper
  // ---------------------------------------------------------------------------

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
  bar(config: BarChartConfig): string {
    const {
      data,
      width = 300,
      height = 150,
      color = COLORS.brass,
      gap = 4,
      showLabels = true,
      className,
    } = config;

    if (data.length === 0) {
      return `<svg width="${width}" height="${height}" class="${className || ''}" role="img" aria-label="Empty chart"></svg>`;
    }

    const padding = 20;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const maxVal = Math.max(...data.map(d => d.value));
    const barWidth = (chartWidth - gap * (data.length - 1)) / data.length;

    const bars = data
      .map((d, i) => {
        const x = padding + i * (barWidth + gap);
        const barHeight = maxVal > 0 ? (d.value / maxVal) * chartHeight : 0;
        const y = padding + chartHeight - barHeight;

        const label = showLabels
          ? `<text x="${x + barWidth / 2}" y="${height - 4}" text-anchor="middle" font-size="10" fill="var(${CSS_VARS.bone})" opacity="0.7">${d.label}</text>`
          : '';

        return `
  <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="${color}" rx="2" aria-label="${d.label}: ${d.value}"/>
  ${label}`;
      })
      .join('\n');

    return `
<svg width="${width}" height="${height}" class="${className || ''}" role="img" aria-label="Bar chart">
  ${bars}
</svg>`.trim();
  },

  // ---------------------------------------------------------------------------
  // List Rendering Helper
  // ---------------------------------------------------------------------------

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
  list<T>(config: ListConfig<T>): string {
    const {
      items,
      render,
      className,
      itemClassName,
      ordered = false,
    } = config;

    const tag = ordered ? 'ol' : 'ul';
    const itemElements = items
      .map((item, index) => `<li class="${itemClassName || ''}">${render(item, index)}</li>`)
      .join('\n');

    return `<${tag} class="${className || ''}">${itemElements}</${tag}>`;
  },
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format a number for display in charts.
 * Rounds to specified decimal places and handles edge cases.
 */
export function formatValue(value: number, decimals: number = 1): string {
  if (!Number.isFinite(value)) return '0';
  return value.toFixed(decimals).replace(/\.0+$/, '');
}

/**
 * Generate a simple unique ID for chart elements.
 * Uses crypto.randomUUID if available, falls back to timestamp-based ID.
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `tissue-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
