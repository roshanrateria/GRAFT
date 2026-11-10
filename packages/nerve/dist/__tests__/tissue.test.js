/**
 * Unit tests for Tissue Kit helpers
 *
 * Tests CSS design tokens, chart rendering utilities, and helper functions.
 */
import { describe, it, expect, vi } from 'vitest';
import { COLORS, CSS_VARS, TYPOGRAPHY, FONT_VARS, generateCSSTokenStyles, Tissue, formatValue, generateId, } from '../tissue';
// ============================================================================
// CSS Design Tokens Tests
// ============================================================================
describe('COLORS constant', () => {
    it('has all required colors', () => {
        expect(COLORS).toHaveProperty('background');
        expect(COLORS).toHaveProperty('surface');
        expect(COLORS).toHaveProperty('bone');
        expect(COLORS).toHaveProperty('brass');
        expect(COLORS).toHaveProperty('oxblood');
        expect(COLORS).toHaveProperty('veinGreen');
        expect(COLORS).toHaveProperty('alert');
    });
    it('has correct hex color values', () => {
        expect(COLORS.background).toBe('#0e0b0b');
        expect(COLORS.surface).toBe('#17120f');
        expect(COLORS.bone).toBe('#e9e1d0');
        expect(COLORS.brass).toBe('#b08d57');
        expect(COLORS.oxblood).toBe('#7a1f1f');
        expect(COLORS.veinGreen).toBe('#6f9a7d');
        expect(COLORS.alert).toBe('#c4472f');
    });
    it('colors are valid hex format', () => {
        const hexPattern = /^#[0-9a-fA-F]{6}$/;
        Object.entries(COLORS).forEach(([name, value]) => {
            expect(value).toMatch(hexPattern);
        });
    });
});
describe('CSS_VARS constant', () => {
    it('has all required CSS variable names', () => {
        expect(CSS_VARS).toHaveProperty('background');
        expect(CSS_VARS).toHaveProperty('surface');
        expect(CSS_VARS).toHaveProperty('bone');
        expect(CSS_VARS).toHaveProperty('brass');
        expect(CSS_VARS).toHaveProperty('oxblood');
        expect(CSS_VARS).toHaveProperty('veinGreen');
        expect(CSS_VARS).toHaveProperty('alert');
    });
    it('has correct CSS variable naming convention', () => {
        expect(CSS_VARS.background).toBe('--color-background');
        expect(CSS_VARS.surface).toBe('--color-surface');
        expect(CSS_VARS.bone).toBe('--color-bone');
        expect(CSS_VARS.brass).toBe('--color-brass');
        expect(CSS_VARS.oxblood).toBe('--color-oxblood');
        expect(CSS_VARS.veinGreen).toBe('--color-vein-green');
        expect(CSS_VARS.alert).toBe('--color-alert');
    });
    it('all CSS variables start with --color- prefix', () => {
        Object.entries(CSS_VARS).forEach(([name, value]) => {
            expect(value).toMatch(/^--color-/);
        });
    });
});
describe('TYPOGRAPHY constant', () => {
    it('has all required font stacks', () => {
        expect(TYPOGRAPHY).toHaveProperty('heading');
        expect(TYPOGRAPHY).toHaveProperty('body');
        expect(TYPOGRAPHY).toHaveProperty('ledger');
    });
    it('heading font includes Victorian serif fonts', () => {
        expect(TYPOGRAPHY.heading).toContain('Cormorant Garamond');
        expect(TYPOGRAPHY.heading).toContain('IM Fell English');
        expect(TYPOGRAPHY.heading).toContain('serif');
    });
    it('body font includes humanist sans-serif fonts', () => {
        expect(TYPOGRAPHY.body).toContain('sans-serif');
    });
    it('ledger font includes monospace fonts', () => {
        expect(TYPOGRAPHY.ledger).toContain('IBM Plex Mono');
        expect(TYPOGRAPHY.ledger).toContain('monospace');
    });
});
describe('FONT_VARS constant', () => {
    it('has all required font variable names', () => {
        expect(FONT_VARS).toHaveProperty('heading');
        expect(FONT_VARS).toHaveProperty('body');
        expect(FONT_VARS).toHaveProperty('ledger');
    });
    it('has correct CSS variable naming convention', () => {
        expect(FONT_VARS.heading).toBe('--font-heading');
        expect(FONT_VARS.body).toBe('--font-body');
        expect(FONT_VARS.ledger).toBe('--font-ledger');
    });
});
describe('generateCSSTokenStyles()', () => {
    it('generates valid CSS string', () => {
        const css = generateCSSTokenStyles();
        expect(css).toContain(':root');
        expect(css).toContain('{');
        expect(css).toContain('}');
    });
    it('includes all color variables', () => {
        const css = generateCSSTokenStyles();
        Object.values(CSS_VARS).forEach(varName => {
            expect(css).toContain(varName);
        });
    });
    it('includes all font variables', () => {
        const css = generateCSSTokenStyles();
        Object.values(FONT_VARS).forEach(varName => {
            expect(css).toContain(varName);
        });
    });
    it('includes all color values', () => {
        const css = generateCSSTokenStyles();
        Object.values(COLORS).forEach(colorValue => {
            expect(css).toContain(colorValue);
        });
    });
    it('includes all font stacks', () => {
        const css = generateCSSTokenStyles();
        expect(css).toContain('Cormorant Garamond');
        expect(css).toContain('IBM Plex Mono');
    });
    it('returns trimmed CSS without leading/trailing whitespace', () => {
        const css = generateCSSTokenStyles();
        expect(css.startsWith(':root')).toBe(true);
        expect(css.endsWith('}')).toBe(true);
    });
});
// ============================================================================
// Tissue.line() Tests
// ============================================================================
describe('Tissue.line()', () => {
    describe('valid SVG generation', () => {
        it('generates valid SVG with correct structure', () => {
            const data = [
                { label: 'Mon', value: 5 },
                { label: 'Tue', value: 7 },
                { label: 'Wed', value: 3 },
            ];
            const svg = Tissue.line({ data });
            expect(svg).toContain('<svg');
            expect(svg).toContain('</svg>');
            expect(svg).toContain('width="300"');
            expect(svg).toContain('height="150"');
            expect(svg).toContain('role="img"');
        });
        it('generates SVG with path element', () => {
            const data = [
                { label: 'A', value: 1 },
                { label: 'B', value: 2 },
            ];
            const svg = Tissue.line({ data });
            expect(svg).toContain('<path');
            expect(svg).toContain('d="M');
            expect(svg).toContain('stroke=');
        });
        it('includes ARIA labels for accessibility', () => {
            const data = [
                { label: 'Mon', value: 5 },
                { label: 'Tue', value: 7 },
            ];
            const svg = Tissue.line({ data });
            expect(svg).toContain('aria-label="Line chart"');
        });
    });
    describe('empty data handling', () => {
        it('handles empty data array', () => {
            const svg = Tissue.line({ data: [] });
            expect(svg).toContain('<svg');
            expect(svg).toContain('aria-label="Empty chart"');
            expect(svg).not.toContain('<path');
        });
        it('preserves width and height for empty chart', () => {
            const svg = Tissue.line({ data: [], width: 400, height: 200 });
            expect(svg).toContain('width="400"');
            expect(svg).toContain('height="200"');
        });
    });
    describe('single data point handling', () => {
        it('handles single data point', () => {
            const data = [{ label: 'Only', value: 5 }];
            const svg = Tissue.line({ data });
            expect(svg).toContain('<svg');
            expect(svg).toContain('<circle');
        });
        it('positions single point at center', () => {
            const data = [{ label: 'Only', value: 5 }];
            const svg = Tissue.line({ data, width: 100, height: 100 });
            expect(svg).toContain('cx="50"');
            expect(svg).toContain('cy="50"');
        });
    });
    describe('multiple data points handling', () => {
        it('handles two data points', () => {
            const data = [
                { label: 'A', value: 0 },
                { label: 'B', value: 10 },
            ];
            const svg = Tissue.line({ data, width: 100, height: 100 });
            expect(svg).toContain('<svg');
            expect(svg).toContain('d="M');
            expect(svg).toContain('L');
        });
        it('handles many data points', () => {
            const data = Array.from({ length: 10 }, (_, i) => ({
                label: `Day ${i + 1}`,
                value: Math.random() * 10,
            }));
            const svg = Tissue.line({ data });
            expect(svg).toContain('<svg');
            expect(svg).toContain('<path');
        });
        it('generates dots for each data point when showDots is true', () => {
            const data = [
                { label: 'Mon', value: 5 },
                { label: 'Tue', value: 7 },
                { label: 'Wed', value: 3 },
            ];
            const svg = Tissue.line({ data, showDots: true });
            const dotCount = (svg.match(/<circle/g) || []).length;
            expect(dotCount).toBe(3);
        });
        it('hides dots when showDots is false', () => {
            const data = [
                { label: 'Mon', value: 5 },
                { label: 'Tue', value: 7 },
            ];
            const svg = Tissue.line({ data, showDots: false });
            expect(svg).not.toContain('<circle');
        });
    });
    describe('width/height configuration', () => {
        it('applies custom width and height', () => {
            const data = [
                { label: 'A', value: 1 },
                { label: 'B', value: 2 },
            ];
            const svg = Tissue.line({ data, width: 500, height: 300 });
            expect(svg).toContain('width="500"');
            expect(svg).toContain('height="300"');
        });
        it('uses default width and height when not specified', () => {
            const data = [{ label: 'A', value: 1 }];
            const svg = Tissue.line({ data });
            expect(svg).toContain('width="300"');
            expect(svg).toContain('height="150"');
        });
    });
    describe('custom color configuration', () => {
        it('applies custom line color', () => {
            const data = [
                { label: 'A', value: 1 },
                { label: 'B', value: 2 },
            ];
            const svg = Tissue.line({ data, color: '#ff0000' });
            expect(svg).toContain('stroke="#ff0000"');
        });
        it('uses default veinGreen color when not specified', () => {
            const data = [
                { label: 'A', value: 1 },
                { label: 'B', value: 2 },
            ];
            const svg = Tissue.line({ data });
            expect(svg).toContain(COLORS.veinGreen);
        });
    });
    describe('grid configuration', () => {
        it('shows grid when showGrid is true', () => {
            const data = [
                { label: 'A', value: 1 },
                { label: 'B', value: 2 },
            ];
            const svg = Tissue.line({ data, showGrid: true });
            expect(svg).toContain('<line');
            expect(svg).toContain('stroke-dasharray');
        });
        it('hides grid by default', () => {
            const data = [
                { label: 'A', value: 1 },
                { label: 'B', value: 2 },
            ];
            const svg = Tissue.line({ data });
            expect(svg).not.toContain('stroke-dasharray');
        });
    });
    describe('CSS class configuration', () => {
        it('applies custom CSS class', () => {
            const data = [{ label: 'A', value: 1 }];
            const svg = Tissue.line({ data, className: 'my-chart' });
            expect(svg).toContain('class="my-chart"');
        });
    });
    describe('accessibility', () => {
        it('includes aria-label on dots', () => {
            const data = [
                { label: 'Monday', value: 5 },
                { label: 'Tuesday', value: 7 },
            ];
            const svg = Tissue.line({ data, showDots: true });
            expect(svg).toContain('aria-label="Monday: 5"');
            expect(svg).toContain('aria-label="Tuesday: 7"');
        });
        it('has role="img" on SVG', () => {
            const data = [{ label: 'A', value: 1 }];
            const svg = Tissue.line({ data });
            expect(svg).toContain('role="img"');
        });
    });
});
// ============================================================================
// Tissue.bar() Tests
// ============================================================================
describe('Tissue.bar()', () => {
    describe('valid SVG generation', () => {
        it('generates valid SVG with correct structure', () => {
            const data = [
                { label: 'Mon', value: 5 },
                { label: 'Tue', value: 7 },
                { label: 'Wed', value: 3 },
            ];
            const svg = Tissue.bar({ data });
            expect(svg).toContain('<svg');
            expect(svg).toContain('</svg>');
            expect(svg).toContain('width="300"');
            expect(svg).toContain('height="150"');
            expect(svg).toContain('role="img"');
        });
        it('generates SVG with rect elements', () => {
            const data = [
                { label: 'A', value: 1 },
                { label: 'B', value: 2 },
            ];
            const svg = Tissue.bar({ data });
            expect(svg).toContain('<rect');
        });
        it('includes ARIA labels for accessibility', () => {
            const data = [
                { label: 'Mon', value: 5 },
                { label: 'Tue', value: 7 },
            ];
            const svg = Tissue.bar({ data });
            expect(svg).toContain('aria-label="Bar chart"');
        });
    });
    describe('empty data handling', () => {
        it('handles empty data array', () => {
            const svg = Tissue.bar({ data: [] });
            expect(svg).toContain('<svg');
            expect(svg).toContain('aria-label="Empty chart"');
            expect(svg).not.toContain('<rect');
        });
        it('preserves width and height for empty chart', () => {
            const svg = Tissue.bar({ data: [], width: 400, height: 200 });
            expect(svg).toContain('width="400"');
            expect(svg).toContain('height="200"');
        });
    });
    describe('single bar handling', () => {
        it('handles single bar', () => {
            const data = [{ label: 'Only', value: 5 }];
            const svg = Tissue.bar({ data });
            expect(svg).toContain('<svg');
            expect(svg).toContain('<rect');
        });
        it('renders single bar at full height for max value', () => {
            const data = [{ label: 'Only', value: 10 }];
            const svg = Tissue.bar({ data, height: 100 });
            expect(svg).toContain('<rect');
            // Single bar should take up most of the chart height
        });
    });
    describe('multiple bars handling', () => {
        it('handles two bars', () => {
            const data = [
                { label: 'A', value: 5 },
                { label: 'B', value: 10 },
            ];
            const svg = Tissue.bar({ data });
            const rectCount = (svg.match(/<rect/g) || []).length;
            expect(rectCount).toBe(2);
        });
        it('handles many bars', () => {
            const data = Array.from({ length: 7 }, (_, i) => ({
                label: `Day ${i + 1}`,
                value: Math.random() * 10,
            }));
            const svg = Tissue.bar({ data });
            const rectCount = (svg.match(/<rect/g) || []).length;
            expect(rectCount).toBe(7);
        });
        it('includes aria-label on each bar', () => {
            const data = [
                { label: 'Monday', value: 5 },
                { label: 'Tuesday', value: 7 },
            ];
            const svg = Tissue.bar({ data });
            expect(svg).toContain('aria-label="Monday: 5"');
            expect(svg).toContain('aria-label="Tuesday: 7"');
        });
    });
    describe('width/height configuration', () => {
        it('applies custom width and height', () => {
            const data = [
                { label: 'A', value: 1 },
                { label: 'B', value: 2 },
            ];
            const svg = Tissue.bar({ data, width: 500, height: 300 });
            expect(svg).toContain('width="500"');
            expect(svg).toContain('height="300"');
        });
        it('uses default width and height when not specified', () => {
            const data = [{ label: 'A', value: 1 }];
            const svg = Tissue.bar({ data });
            expect(svg).toContain('width="300"');
            expect(svg).toContain('height="150"');
        });
    });
    describe('custom color configuration', () => {
        it('applies custom bar color', () => {
            const data = [
                { label: 'A', value: 1 },
                { label: 'B', value: 2 },
            ];
            const svg = Tissue.bar({ data, color: '#ff0000' });
            expect(svg).toContain('fill="#ff0000"');
        });
        it('uses default brass color when not specified', () => {
            const data = [
                { label: 'A', value: 1 },
                { label: 'B', value: 2 },
            ];
            const svg = Tissue.bar({ data });
            expect(svg).toContain(COLORS.brass);
        });
    });
    describe('gap configuration', () => {
        it('applies custom gap between bars', () => {
            const data = [
                { label: 'A', value: 5 },
                { label: 'B', value: 10 },
            ];
            const svg = Tissue.bar({ data, gap: 10 });
            expect(svg).toContain('<rect');
        });
    });
    describe('label configuration', () => {
        it('shows labels when showLabels is true', () => {
            const data = [
                { label: 'Mon', value: 5 },
                { label: 'Tue', value: 7 },
            ];
            const svg = Tissue.bar({ data, showLabels: true });
            expect(svg).toContain('>Mon</text>');
            expect(svg).toContain('>Tue</text>');
        });
        it('hides labels when showLabels is false', () => {
            const data = [
                { label: 'Mon', value: 5 },
                { label: 'Tue', value: 7 },
            ];
            const svg = Tissue.bar({ data, showLabels: false });
            expect(svg).not.toContain('>Mon</text>');
        });
    });
    describe('CSS class configuration', () => {
        it('applies custom CSS class', () => {
            const data = [{ label: 'A', value: 1 }];
            const svg = Tissue.bar({ data, className: 'my-bar-chart' });
            expect(svg).toContain('class="my-bar-chart"');
        });
    });
    describe('value edge cases', () => {
        it('handles zero values', () => {
            const data = [
                { label: 'A', value: 0 },
                { label: 'B', value: 0 },
            ];
            const svg = Tissue.bar({ data });
            expect(svg).toContain('<rect');
        });
        it('handles mixed zero and non-zero values', () => {
            const data = [
                { label: 'A', value: 0 },
                { label: 'B', value: 10 },
            ];
            const svg = Tissue.bar({ data });
            const rectCount = (svg.match(/<rect/g) || []).length;
            expect(rectCount).toBe(2);
        });
    });
    describe('accessibility', () => {
        it('has role="img" on SVG', () => {
            const data = [{ label: 'A', value: 1 }];
            const svg = Tissue.bar({ data });
            expect(svg).toContain('role="img"');
        });
    });
});
// ============================================================================
// Tissue.list() Tests
// ============================================================================
describe('Tissue.list()', () => {
    describe('rendering with custom render function', () => {
        it('renders items with custom render function', () => {
            const items = ['Apple', 'Banana', 'Cherry'];
            const config = {
                items,
                render: (item) => `<span>${item}</span>`,
            };
            const html = Tissue.list(config);
            expect(html).toContain('<span>Apple</span>');
            expect(html).toContain('<span>Banana</span>');
            expect(html).toContain('<span>Cherry</span>');
        });
        it('passes index to render function', () => {
            const items = ['A', 'B', 'C'];
            const indices = [];
            const config = {
                items,
                render: (item, index) => {
                    indices.push(index);
                    return item;
                },
            };
            Tissue.list(config);
            expect(indices).toEqual([0, 1, 2]);
        });
        it('renders complex objects', () => {
            const items = [
                { id: 1, title: 'Task 1' },
                { id: 2, title: 'Task 2' },
            ];
            const config = {
                items,
                render: (task) => `<div data-id="${task.id}">${task.title}</div>`,
            };
            const html = Tissue.list(config);
            expect(html).toContain('data-id="1"');
            expect(html).toContain('data-id="2"');
            expect(html).toContain('Task 1');
            expect(html).toContain('Task 2');
        });
    });
    describe('empty array handling', () => {
        it('handles empty array', () => {
            const config = {
                items: [],
                render: (item) => item,
            };
            const html = Tissue.list(config);
            expect(html).toBe('<ul class=""></ul>');
        });
    });
    describe('tag name configuration', () => {
        it('uses ul tag by default', () => {
            const config = {
                items: ['A'],
                render: (item) => item,
            };
            const html = Tissue.list(config);
            expect(html).toContain('<ul');
            expect(html).toContain('</ul>');
        });
        it('uses ol tag when ordered is true', () => {
            const config = {
                items: ['A', 'B'],
                render: (item) => item,
                ordered: true,
            };
            const html = Tissue.list(config);
            expect(html).toContain('<ol');
            expect(html).toContain('</ol>');
        });
        it('uses ul tag when ordered is false', () => {
            const config = {
                items: ['A'],
                render: (item) => item,
                ordered: false,
            };
            const html = Tissue.list(config);
            expect(html).toContain('<ul');
            expect(html).toContain('</ul>');
        });
    });
    describe('CSS class configuration', () => {
        it('applies CSS class to list container', () => {
            const config = {
                items: ['A'],
                render: (item) => item,
                className: 'my-list',
            };
            const html = Tissue.list(config);
            expect(html).toContain('class="my-list"');
        });
        it('applies CSS class to each item', () => {
            const config = {
                items: ['A', 'B'],
                render: (item) => item,
                itemClassName: 'list-item',
            };
            const html = Tissue.list(config);
            const itemCount = (html.match(/class="list-item"/g) || []).length;
            expect(itemCount).toBe(2);
        });
        it('applies both list and item classes', () => {
            const config = {
                items: ['A'],
                render: (item) => item,
                className: 'task-list',
                itemClassName: 'task-item',
            };
            const html = Tissue.list(config);
            expect(html).toContain('class="task-list"');
            expect(html).toContain('class="task-item"');
        });
    });
    describe('HTML structure', () => {
        it('wraps each item in li tags', () => {
            const config = {
                items: ['A', 'B', 'C'],
                render: (item) => item,
            };
            const html = Tissue.list(config);
            expect(html).toContain('<li class="">A</li>');
            expect(html).toContain('<li class="">B</li>');
            expect(html).toContain('<li class="">C</li>');
        });
    });
});
// ============================================================================
// Utility Functions Tests
// ============================================================================
describe('formatValue()', () => {
    describe('basic formatting', () => {
        it('formats integers correctly', () => {
            expect(formatValue(5)).toBe('5');
            expect(formatValue(10)).toBe('10');
            expect(formatValue(0)).toBe('0');
        });
        it('formats decimals with default 1 decimal place', () => {
            expect(formatValue(3.14159)).toBe('3.1');
            expect(formatValue(2.5)).toBe('2.5');
        });
        it('removes trailing zeros after decimal', () => {
            expect(formatValue(5.0)).toBe('5');
            expect(formatValue(3.00)).toBe('3');
        });
    });
    describe('custom decimal places', () => {
        it('formats with 0 decimal places', () => {
            expect(formatValue(3.7, 0)).toBe('4');
        });
        it('formats with 2 decimal places', () => {
            expect(formatValue(3.14159, 2)).toBe('3.14');
        });
        it('formats with 3 decimal places', () => {
            expect(formatValue(3.14159, 3)).toBe('3.142');
        });
    });
    describe('edge cases', () => {
        it('handles NaN', () => {
            expect(formatValue(NaN)).toBe('0');
        });
        it('handles Infinity', () => {
            expect(formatValue(Infinity)).toBe('0');
            expect(formatValue(-Infinity)).toBe('0');
        });
        it('handles negative numbers', () => {
            expect(formatValue(-5.5)).toBe('-5.5');
            expect(formatValue(-3)).toBe('-3');
        });
        it('handles very small numbers', () => {
            expect(formatValue(0.001, 3)).toBe('0.001');
        });
        it('handles very large numbers', () => {
            expect(formatValue(1000000)).toBe('1000000');
        });
    });
});
describe('generateId()', () => {
    describe('unique ID generation', () => {
        it('generates unique IDs', () => {
            const ids = new Set();
            for (let i = 0; i < 100; i++) {
                ids.add(generateId());
            }
            expect(ids.size).toBe(100);
        });
        it('generates non-empty strings', () => {
            const id = generateId();
            expect(id.length).toBeGreaterThan(0);
        });
    });
    describe('format', () => {
        it('uses crypto.randomUUID when available', () => {
            const mockRandomUUID = vi.fn().mockReturnValue('test-uuid-123');
            const originalCrypto = global.crypto;
            // @ts-expect-error - mocking crypto
            global.crypto = { randomUUID: mockRandomUUID };
            const id = generateId();
            expect(mockRandomUUID).toHaveBeenCalled();
            expect(id).toBe('test-uuid-123');
            global.crypto = originalCrypto;
        });
        it('falls back to timestamp-based ID when crypto.randomUUID not available', () => {
            const originalCrypto = global.crypto;
            // @ts-expect-error - mocking crypto
            global.crypto = undefined;
            const id = generateId();
            expect(id).toMatch(/^tissue-\d+-[a-z0-9]+$/);
            global.crypto = originalCrypto;
        });
        it('fallback ID contains tissue prefix', () => {
            const originalCrypto = global.crypto;
            // @ts-expect-error - mocking crypto
            global.crypto = undefined;
            const id = generateId();
            expect(id).toMatch(/^tissue-/);
            global.crypto = originalCrypto;
        });
    });
    describe('crypto.randomUUID format', () => {
        it('generates valid UUID format when using crypto.randomUUID', () => {
            // Only test if crypto.randomUUID is available
            if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
                const id = generateId();
                // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
                expect(id).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/);
            }
        });
    });
});
//# sourceMappingURL=tissue.test.js.map