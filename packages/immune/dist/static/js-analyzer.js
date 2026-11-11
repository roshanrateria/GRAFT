/**
 * JavaScript Static Analyzer
 *
 * Uses acorn + acorn-walk for AST-based banned construct detection.
 * Implements IMM-01: Banned Construct Rejection.
 */
import * as acorn from 'acorn';
import * as walk from 'acorn-walk';
// ============================================================================
// Banned Constructs Configuration
// ============================================================================
/** Global objects that should not have computed access */
const COMPUTED_ACCESS_GLOBALS = ['window', 'globalThis', 'self'];
/** Direct property accesses that are banned */
const BANNED_PROPERTY_ACCESSES = {
    // Network APIs
    fetch: 'fetch',
    XMLHttpRequest: 'xmlhttprequest',
    WebSocket: 'websocket',
    EventSource: 'eventsource',
    sendBeacon: 'send-beacon',
    Worker: 'worker',
    importScripts: 'import-scripts',
    // Storage APIs
    cookie: 'cookie-access',
    localStorage: 'local-storage',
    sessionStorage: 'session-storage',
    indexedDB: 'indexed-db',
    // Window hierarchy
    parent: 'window-parent',
    top: 'window-top',
    opener: 'window-opener',
    frames: 'window-frames',
    // Location
    location: 'location-write',
};
/** Banned global functions */
const BANNED_FUNCTIONS = {
    eval: 'eval',
    importScripts: 'import-scripts',
};
/** Banned constructors */
const BANNED_CONSTRUCTORS = {
    Function: 'new-function',
    Worker: 'worker',
    XMLHttpRequest: 'xmlhttprequest',
    WebSocket: 'websocket',
    EventSource: 'eventsource',
};
// ============================================================================
// JS Analyzer
// ============================================================================
/**
 * Analyze JavaScript code for banned constructs.
 * Uses AST analysis, not regex, to catch obfuscated cases.
 */
export function analyzeJavaScript(code, filename = 'index.js') {
    const constructs = [];
    try {
        // Parse the code
        const ast = acorn.parse(code, {
            ecmaVersion: 2022,
            sourceType: 'module',
            locations: true,
        });
        // Walk the AST and detect banned constructs
        walk.simple(ast, {
            // Detect eval, Function constructor, import()
            CallExpression(node) {
                checkCallExpression(node, code, filename, constructs);
            },
            // Detect new Function, new Worker, etc.
            NewExpression(node) {
                checkNewExpression(node, code, filename, constructs);
            },
            // Detect window.fetch, localStorage, etc.
            MemberExpression(node) {
                checkMemberExpression(node, code, filename, constructs);
            },
            // Detect dynamic import()
            ImportExpression(node) {
                constructs.push({
                    type: 'dynamic-import',
                    reason: 'Dynamic import() is not allowed',
                    location: createLocation(filename, node.loc),
                });
            },
            // Detect setTimeout/setInterval with string argument
            Identifier(node) {
                checkIdentifier(node, code, filename, constructs);
            },
            // Detect assignment to location
            AssignmentExpression(node) {
                checkAssignmentExpression(node, code, filename, constructs);
            },
            // Detect Date and Math.random usage
            VariableDeclarator(node) {
                checkVariableDeclarator(node, code, filename, constructs);
            },
            // Detect infinite loops (while(true), while(1), for(;;))
            WhileStatement(node) {
                checkWhileStatement(node, code, filename, constructs);
            },
            ForStatement(node) {
                checkForStatement(node, code, filename, constructs);
            },
        });
        return {
            passed: constructs.length === 0,
            constructs,
        };
    }
    catch (error) {
        return {
            passed: false,
            constructs: [],
            error: {
                code: 'IMM_STATIC_PARSE_ERROR',
                message: `Failed to parse JavaScript: ${error instanceof Error ? error.message : String(error)}`,
            },
        };
    }
}
// ============================================================================
// AST Node Checkers
// ============================================================================
function checkCallExpression(node, code, filename, constructs) {
    // Check for eval()
    if (node.callee.type === 'Identifier' && node.callee.name === 'eval') {
        constructs.push({
            type: 'eval',
            reason: 'eval() is not allowed',
            location: createLocation(filename, node.loc),
        });
    }
    // Check for fetch() as a global function call
    if (node.callee.type === 'Identifier' && node.callee.name === 'fetch') {
        constructs.push({
            type: 'fetch',
            reason: 'fetch() is not allowed',
            location: createLocation(filename, node.loc),
        });
    }
    // Check for setTimeout/setInterval with string
    if (node.callee.type === 'Identifier' &&
        (node.callee.name === 'setTimeout' || node.callee.name === 'setInterval')) {
        if (node.arguments.length > 0) {
            const arg = node.arguments[0];
            if (arg.type === 'Literal' && typeof arg.value === 'string') {
                constructs.push({
                    type: node.callee.name === 'setTimeout' ? 'settimeout-string' : 'setinterval-string',
                    reason: `${node.callee.name} with string argument is not allowed`,
                    location: createLocation(filename, node.loc),
                });
            }
        }
    }
    // Check for window.location write via call
    if (node.callee.type === 'MemberExpression' &&
        node.callee.object.type === 'Identifier' &&
        COMPUTED_ACCESS_GLOBALS.includes(node.callee.object.name)) {
        if (node.callee.property.type === 'Identifier' && node.callee.property.name === 'assign') {
            constructs.push({
                type: 'location-write',
                reason: 'location.assign() is not allowed',
                location: createLocation(filename, node.loc),
            });
        }
    }
}
function checkNewExpression(node, code, filename, constructs) {
    if (node.callee.type === 'Identifier') {
        const name = node.callee.name;
        const type = BANNED_CONSTRUCTORS[name];
        if (type) {
            constructs.push({
                type,
                reason: `new ${name}() is not allowed`,
                location: createLocation(filename, node.loc),
            });
        }
    }
}
function checkMemberExpression(node, code, filename, constructs) {
    // Check for computed access on window/globalThis/self
    if (node.computed && node.object.type === 'Identifier' && COMPUTED_ACCESS_GLOBALS.includes(node.object.name)) {
        constructs.push({
            type: 'computed-window-access',
            reason: `Computed access on ${node.object.name} is not allowed (catches obfuscated access)`,
            location: createLocation(filename, node.loc),
        });
        return; // Don't check further if this is computed access
    }
    // Check for direct banned property access on window/globalThis/self
    if (!node.computed &&
        node.object.type === 'Identifier' &&
        COMPUTED_ACCESS_GLOBALS.includes(node.object.name) &&
        node.property.type === 'Identifier') {
        const propName = node.property.name;
        const type = BANNED_PROPERTY_ACCESSES[propName];
        if (type) {
            // Special case: location read is OK, write is not (checked separately)
            if (propName === 'location') {
                // Will be caught by assignment check
                return;
            }
            constructs.push({
                type,
                reason: `${node.object.name}.${propName} is not allowed`,
                location: createLocation(filename, node.loc),
            });
        }
    }
    // Check for document.cookie
    if (!node.computed &&
        node.object.type === 'MemberExpression' &&
        node.object.object.type === 'Identifier' &&
        node.object.object.name === 'document' &&
        node.object.property.type === 'Identifier' &&
        node.object.property.name === 'cookie') {
        constructs.push({
            type: 'cookie-access',
            reason: 'document.cookie is not allowed',
            location: createLocation(filename, node.loc),
        });
    }
    // Check for just the document.cookie member expression (when it's the outer node)
    if (!node.computed &&
        node.object.type === 'Identifier' &&
        node.object.name === 'document' &&
        node.property.type === 'Identifier' &&
        node.property.name === 'cookie') {
        constructs.push({
            type: 'cookie-access',
            reason: 'document.cookie is not allowed',
            location: createLocation(filename, node.loc),
        });
    }
    // Check for localStorage/sessionStorage (standalone)
    if (!node.computed &&
        node.object.type === 'Identifier' &&
        (node.object.name === 'localStorage' || node.object.name === 'sessionStorage')) {
        const type = node.object.name === 'localStorage' ? 'local-storage' : 'session-storage';
        constructs.push({
            type,
            reason: `${node.object.name} is not allowed`,
            location: createLocation(filename, node.loc),
        });
    }
    // Check for Date.now() or new Date() (direct usage)
    if (node.object.type === 'Identifier' &&
        node.object.name === 'Date' &&
        node.property.type === 'Identifier' &&
        node.property.name === 'now') {
        constructs.push({
            type: 'direct-date',
            reason: 'Direct Date usage is not allowed. Use nerve.now() instead',
            location: createLocation(filename, node.loc),
        });
    }
    // Check for Math.random()
    if (node.object.type === 'Identifier' &&
        node.object.name === 'Math' &&
        node.property.type === 'Identifier' &&
        node.property.name === 'random') {
        constructs.push({
            type: 'direct-random',
            reason: 'Math.random() is not allowed. Use nerve.random() instead',
            location: createLocation(filename, node.loc),
        });
    }
}
function checkIdentifier(node, code, filename, constructs) {
    // This is handled in other checkers
}
function checkAssignmentExpression(node, code, filename, constructs) {
    // Check for location.href = ... or location = ...
    if (node.left.type === 'MemberExpression' &&
        node.left.object.type === 'Identifier' &&
        node.left.object.name === 'location' &&
        node.left.property.type === 'Identifier') {
        constructs.push({
            type: 'location-write',
            reason: 'Writing to location is not allowed',
            location: createLocation(filename, node.loc),
        });
    }
}
function checkVariableDeclarator(node, code, filename, constructs) {
    // Check for const date = Date or similar
    if (node.init && node.init.type === 'Identifier' && node.init.name === 'Date') {
        constructs.push({
            type: 'direct-date',
            reason: 'Direct Date reference is not allowed. Use nerve.now() instead',
            location: createLocation(filename, node.loc),
        });
    }
}
function checkWhileStatement(node, code, filename, constructs) {
    // Check for while(true) or while(1)
    if (node.test) {
        const isTrueLiteral = (node.test.type === 'Literal' && node.test.value === true) ||
            (node.test.type === 'Literal' && node.test.value === 1);
        if (isTrueLiteral) {
            constructs.push({
                type: 'infinite-loop',
                reason: 'Infinite while(true) loop detected - can freeze the organ',
                location: createLocation(filename, node.loc),
            });
        }
    }
}
function checkForStatement(node, code, filename, constructs) {
    // Check for for(;;) infinite loop
    if (!node.test && !node.update) {
        constructs.push({
            type: 'infinite-loop',
            reason: 'Infinite for(;;) loop detected - can freeze the organ',
            location: createLocation(filename, node.loc),
        });
    }
}
// ============================================================================
// Helpers
// ============================================================================
function createLocation(filename, loc) {
    if (!loc) {
        return { file: filename, line: 0 };
    }
    return {
        file: filename,
        line: loc.start.line,
        column: loc.start.column,
    };
}
//# sourceMappingURL=js-analyzer.js.map