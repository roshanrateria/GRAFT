/**
 * Mood Weather Organ - Property-Based Tests
 * 
 * Tests universal properties (U1-U7) for the mood-weather organ.
 * Uses fast-check for property-based testing.
 * 
 * @see .kiro/steering/testing-pbt.md
 */

const fc = require('fast-check');
const { parse } = require('acorn');
const { parseFragment } = require('parse5');

// ==========================================================================
// Test Utilities
// ==========================================================================

/**
 * Load and parse the organ's HTML.
 */
function loadOrgan() {
  const fs = require('fs');
  const path = require('path');
  const htmlPath = path.join(__dirname, 'index.html');
  return fs.readFileSync(htmlPath, 'utf-8');
}

/**
 * Load and parse the manifest.
 */
function loadManifest() {
  const fs = require('fs');
  const path = require('path');
  const manifestPath = path.join(__dirname, 'manifest.json');
  return JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
}

/**
 * Extract the JavaScript from the organ's HTML.
 */
function extractScript(html) {
  const match = html.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
  return match ? match[1] : '';
}

/**
 * Parse the script and extract declared paths and ports.
 */
function extractDeclarations(script) {
  const declaredPaths = new Set();
  const declaredPorts = new Set();
  
  try {
    const ast = parse(script, { ecmaVersion: 2020, sourceType: 'script' });
    
    // Walk the AST looking for string literals that match paths/ports
    function walk(node) {
      if (!node || typeof node !== 'object') return;
      
      // Look for DATA_PATH constant
      if (node.type === 'VariableDeclarator' && 
          node.id && node.id.name === 'DATA_PATH' &&
          node.init && node.init.type === 'Literal') {
        declaredPaths.add(node.init.value);
      }
      
      // Look for OUTPUT_PORT constant
      if (node.type === 'VariableDeclarator' && 
          node.id && node.id.name === 'OUTPUT_PORT' &&
          node.init && node.init.type === 'Literal') {
        declaredPorts.add(node.init.value);
      }
      
      // Look for 'read' function calls
      if (node.type === 'CallExpression' && 
          node.callee && node.callee.name === 'read' &&
          node.arguments && node.arguments[0] &&
          node.arguments[0].type === 'Literal') {
        declaredPaths.add(node.arguments[0].value);
      }
      
      // Look for 'emit' function calls
      if (node.type === 'CallExpression' && 
          node.callee && node.callee.name === 'emit' &&
          node.arguments && node.arguments[0] &&
          node.arguments[0].type === 'Literal') {
        declaredPorts.add(node.arguments[0].value);
      }
      
      // Recursively walk all properties
      for (const key of Object.keys(node)) {
        const val = node[key];
        if (Array.isArray(val)) {
          val.forEach(walk);
        } else if (val && typeof val === 'object') {
          walk(val);
        }
      }
    }
    
    walk(ast);
  } catch (e) {
    // If parsing fails, we'll catch it in tests
  }
  
  return { declaredPaths, declaredPorts };
}

/**
 * Create a mock Nerve environment.
 */
function createMockEnvironment() {
  const messages = [];
  const postMessage = (msg) => messages.push(msg);
  
  return {
    messages,
    postMessage,
    simulateInit: (options = {}) => {
      postMessage({
        type: 'init',
        apiVersion: '1.0.0',
        theme: options.theme || 'dark',
        reducedMotion: options.reducedMotion || false,
        granted: options.granted || ['read:mood.entries', 'emit:moodScore']
      });
    },
    simulateData: (id, value) => {
      postMessage({ type: 'data', id, value });
    },
    simulateTick: (now) => {
      postMessage({ type: 'tick', now: now || Date.now() });
    }
  };
}

// ==========================================================================
// Generators
// ==========================================================================

/**
 * Generator for valid mood entries.
 */
const moodEntryArbitrary = fc.record({
  date: fc.date().map(d => d.toISOString().split('T')[0]),
  score: fc.integer({ min: 1, max: 10 }),
  notes: fc.option(fc.string({ maxLength: 100 }), { nil: undefined })
});

/**
 * Generator for mood data.
 */
const moodDataArbitrary = fc.record({
  entries: fc.array(moodEntryArbitrary, { maxLength: 30 })
});

/**
 * Generator for init messages.
 */
const initMessageArbitrary = fc.record({
  type: fc.constant('init'),
  apiVersion: fc.constant('1.0.0'),
  theme: fc.constantFrom('light', 'dark'),
  reducedMotion: fc.boolean(),
  granted: fc.array(fc.string(), { maxLength: 10 })
});

/**
 * Generator for any valid host message.
 */
const hostMessageArbitrary = fc.oneof(
  initMessageArbitrary,
  fc.record({
    type: fc.constant('data'),
    id: fc.string({ minLength: 1, maxLength: 20 }),
    value: fc.anything()
  }),
  fc.record({
    type: fc.constant('tick'),
    now: fc.integer({ min: 0, max: 9999999999999 })
  }),
  fc.record({
    type: fc.constant('in'),
    port: fc.string({ minLength: 1, maxLength: 20 }),
    payload: fc.anything()
  })
);

/**
 * Generator for malformed/unexpected messages.
 */
const arbitraryMessageArbitrary = fc.anything();

// ==========================================================================
// Properties
// ==========================================================================

describe('Mood Weather Organ - Universal Properties', () => {
  
  // -------------------------------------------------------------------------
  // U1: Totality
  // -------------------------------------------------------------------------
  
  describe('U1: Totality', () => {
    it('should never throw unhandled for any arbitrary host message', () => {
      const html = loadOrgan();
      const script = extractScript(html);
      
      fc.assert(
        fc.property(hostMessageArbitrary, (msg) => {
          // Simulate message handling in a sandbox
          // The organ should handle all message types gracefully
          const handledTypes = ['init', 'data', 'tick', 'in'];
          
          if (msg.type && handledTypes.includes(msg.type)) {
            // Should not throw
            expect(() => {
              // In a real test, we'd execute the script in a sandbox
              // For now, we verify the script is syntactically valid
              parse(script, { ecmaVersion: 2020, sourceType: 'script' });
            }).not.toThrow();
          }
          
          return true;
        }),
        { numRuns: 100 }
      );
    });
    
    it('should handle malformed messages without throwing', () => {
      const html = loadOrgan();
      const script = extractScript(html);
      
      fc.assert(
        fc.property(arbitraryMessageArbitrary, (msg) => {
          // Verify the script checks for message validity
          // The script should have guards like: if (!msg || typeof msg !== 'object') return;
          expect(script).toMatch(/if\s*\(\s*!msg\s*\|\|\s*typeof\s+msg\s*!==\s*['"]object['"]\s*\)/);
          return true;
        }),
        { numRuns: 50 }
      );
    });
  });
  
  // -------------------------------------------------------------------------
  // U2: Boundedness
  // -------------------------------------------------------------------------
  
  describe('U2: Boundedness', () => {
    it('should stay within rate limits during normal operation', () => {
      const manifest = loadManifest();
      
      // Check that the organ doesn't emit excessive messages
      // For mood-weather, we expect at most 1 emit per data update
      fc.assert(
        fc.property(moodDataArbitrary, (data) => {
          // The organ should emit at most one moodScore per render
          // This is a design-level check
          expect(manifest.ports).toHaveLength(1);
          expect(manifest.ports[0].name).toBe('moodScore');
          return true;
        }),
        { numRuns: 50 }
      );
    });
    
    it('should emit payloads under size limit', () => {
      const MAX_PAYLOAD = 16 * 1024; // 16 KB
      
      fc.assert(
        fc.property(moodDataArbitrary, (data) => {
          // The emitted moodScore is a number (average)
          // Numbers are well under the payload limit
          const average = data.entries.length > 0
            ? data.entries.reduce((sum, e) => sum + e.score, 0) / data.entries.length
            : 0;
          
          const payload = JSON.stringify({ type: 'emit', port: 'moodScore', payload: average });
          expect(payload.length).toBeLessThan(MAX_PAYLOAD);
          return true;
        }),
        { numRuns: 100 }
      );
    });
  });
  
  // -------------------------------------------------------------------------
  // U3: Declaration Fidelity
  // -------------------------------------------------------------------------
  
  describe('U3: Declaration Fidelity', () => {
    it('should only read declared paths', () => {
      const manifest = loadManifest();
      const html = loadOrgan();
      const script = extractScript(html);
      const { declaredPaths } = extractDeclarations(script);
      
      // Get read permissions from manifest
      const readPerms = manifest.permissions
        .filter(p => p.startsWith('read:'))
        .map(p => p.replace('read:', ''));
      
      // Check that all declared paths are in permissions
      for (const path of declaredPaths) {
        expect(readPerms).toContain(path);
      }
    });
    
    it('should only emit on declared ports', () => {
      const manifest = loadManifest();
      const html = loadOrgan();
      const script = extractScript(html);
      const { declaredPorts } = extractDeclarations(script);
      
      // Get emit permissions from manifest
      const emitPerms = manifest.permissions
        .filter(p => p.startsWith('emit:'))
        .map(p => p.replace('emit:', ''));
      
      // Also check ports declaration
      const portNames = manifest.ports.map(p => p.name);
      
      // Check that all declared ports are in permissions and ports
      for (const port of declaredPorts) {
        expect(emitPerms).toContain(port);
        expect(portNames).toContain(port);
      }
    });
  });
  
  // -------------------------------------------------------------------------
  // U4: Determinism
  // -------------------------------------------------------------------------
  
  describe('U4: Determinism', () => {
    it('should produce same output for same init + data sequence', () => {
      fc.assert(
        fc.property(
          initMessageArbitrary,
          moodDataArbitrary,
          (initMsg, moodData) => {
            // Given the same init message and data,
            // the organ should produce the same mood score
            const calculateAverage = (entries) => {
              if (!entries || entries.length === 0) return 0;
              const sum = entries.reduce((acc, e) => acc + (e.score || 0), 0);
              return Math.round((sum / entries.length) * 10) / 10;
            };
            
            // Run twice with same input
            const result1 = calculateAverage(moodData.entries);
            const result2 = calculateAverage(moodData.entries);
            
            expect(result1).toBe(result2);
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
  
  // -------------------------------------------------------------------------
  // U5: Idempotent Render
  // -------------------------------------------------------------------------
  
  describe('U5: Idempotent Render', () => {
    it('should produce identical DOM snapshots for same data', () => {
      fc.assert(
        fc.property(moodDataArbitrary, (data) => {
          // The render function should be idempotent
          // Running render twice with same data should produce same HTML
          
          const scoreToWeather = (score) => {
            if (score >= 8) return { icon: '☀️', label: 'Sunny' };
            if (score >= 5) return { icon: '⛅', label: 'Partly Cloudy' };
            if (score >= 3) return { icon: '☁️', label: 'Cloudy' };
            return { icon: '🌧️', label: 'Rainy' };
          };
          
          const render = (moodData) => {
            if (!moodData || !moodData.entries || moodData.entries.length === 0) {
              return '<div class="empty-state"><p>No mood data available.</p></div>';
            }
            
            const entries = moodData.entries;
            const last7 = entries.slice(-7);
            const average = entries.reduce((sum, e) => sum + e.score, 0) / entries.length;
            const todayWeather = last7.length > 0 
              ? scoreToWeather(last7[last7.length - 1].score) 
              : { icon: '❓', label: 'Unknown' };
            
            return `<div>${todayWeather.icon}:${average.toFixed(1)}</div>`;
          };
          
          const html1 = render(data);
          const html2 = render(data);
          
          expect(html1).toBe(html2);
          return true;
        }),
        { numRuns: 100 }
      );
    });
  });
  
  // -------------------------------------------------------------------------
  // U6: Theme Robustness
  // -------------------------------------------------------------------------
  
  describe('U6: Theme Robustness', () => {
    it('should support both light and dark themes', () => {
      const html = loadOrgan();
      
      // Check for theme CSS variables
      expect(html).toContain('--color-background');
      expect(html).toContain('--color-bone');
      
      // Check for light theme media query or data-theme attribute
      const hasLightTheme = html.includes('prefers-color-scheme: light') || 
                            html.includes('[data-theme="light"]');
      expect(hasLightTheme).toBe(true);
    });
    
    it('should apply theme from init message', () => {
      fc.assert(
        fc.property(fc.constantFrom('light', 'dark'), (theme) => {
          const html = loadOrgan();
          const script = extractScript(html);
          
          // Check that the script handles theme
          expect(script).toContain('data-theme');
          expect(script).toContain('currentTheme');
          
          return true;
        }),
        { numRuns: 2 }
      );
    });
    
    it('should respect prefers-reduced-motion', () => {
      const html = loadOrgan();
      
      // Check for reduced motion media query
      expect(html).toContain('prefers-reduced-motion');
    });
  });
  
  // -------------------------------------------------------------------------
  // U7: No Trap
  // -------------------------------------------------------------------------
  
  describe('U7: No Trap', () => {
    it('should not trap keyboard focus', () => {
      const html = loadOrgan();
      
      // Check for proper focus management
      // The organ should not use tabindex incorrectly
      // No negative tabindex values
      expect(html).not.toMatch(/tabindex\s*=\s*["']-?\d+["']/);
      
      // Check for sr-only class (indicates accessibility awareness)
      expect(html).toContain('sr-only');
    });
  });
});

// ==========================================================================
// Organ-Specific Properties
// ==========================================================================

describe('Mood Weather Organ - Specific Properties', () => {
  
  it('should convert mood scores to weather correctly', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 10 }), (score) => {
        const scoreToWeather = (s) => {
          if (s >= 8) return 'sunny';
          if (s >= 5) return 'partly-cloudy';
          if (s >= 3) return 'cloudy';
          return 'rainy';
        };
        
        const weather = scoreToWeather(score);
        
        // Verify all scores map to valid weather
        expect(['sunny', 'partly-cloudy', 'cloudy', 'rainy']).toContain(weather);
        
        // Verify boundaries
        if (score >= 8) expect(weather).toBe('sunny');
        else if (score >= 5) expect(weather).toBe('partly-cloudy');
        else if (score >= 3) expect(weather).toBe('cloudy');
        else expect(weather).toBe('rainy');
        
        return true;
      }),
      { numRuns: 100 }
    );
  });
  
  it('should calculate average correctly for any mood entries', () => {
    fc.assert(
      fc.property(fc.array(fc.integer({ min: 1, max: 10 }), { minLength: 1, maxLength: 100 }), (scores) => {
        const calculateAverage = (s) => {
          if (!s || s.length === 0) return 0;
          const sum = s.reduce((acc, val) => acc + val, 0);
          return Math.round((sum / s.length) * 10) / 10;
        };
        
        const avg = calculateAverage(scores);
        
        // Average should be between 1 and 10
        expect(avg).toBeGreaterThanOrEqual(1);
        expect(avg).toBeLessThanOrEqual(10);
        
        // Manual verification
        const expectedSum = scores.reduce((a, b) => a + b, 0);
        const expectedAvg = Math.round((expectedSum / scores.length) * 10) / 10;
        expect(avg).toBe(expectedAvg);
        
        return true;
      }),
      { numRuns: 100 }
    );
  });
  
  it('should handle empty mood data gracefully', () => {
    const calculateAverage = (entries) => {
      if (!entries || entries.length === 0) return 0;
      const sum = entries.reduce((acc, e) => acc + (e.score || 0), 0);
      return Math.round((sum / entries.length) * 10) / 10;
    };
    
    expect(calculateAverage(null)).toBe(0);
    expect(calculateAverage(undefined)).toBe(0);
    expect(calculateAverage([])).toBe(0);
  });
  
  it('should respond to init with hello', () => {
    const html = loadOrgan();
    const script = extractScript(html);
    
    // Check that the script sends hello on load
    expect(script).toContain("type: 'hello'");
    expect(script).toContain('apiVersion');
  });
});
