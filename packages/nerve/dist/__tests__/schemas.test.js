/**
 * Unit tests for Nerve API Zod schemas
 *
 * Validates: Requirements NRV-01: Message Schema Enforcement
 *
 * Tests all message schemas for:
 * - Valid message acceptance
 * - Missing required fields
 * - Wrong types
 * - Invalid permission formats
 * - Invalid theme values
 * - Boundary conditions (negative values, etc.)
 */
import { describe, it, expect } from 'vitest';
import { ThemeSchema, PermissionSchema, InitMessageSchema, DataMessageSchema, InMessageSchema, TickMessageSchema, HostToOrganMessageSchema, HelloMessageSchema, ReadMessageSchema, EmitMessageSchema, ResizeMessageSchema, OrganToHostMessageSchema, validateHostToOrganMessage, validateOrganToHostMessage, safeValidateHostToOrganMessage, safeValidateOrganToHostMessage, } from '../schemas';
// ============================================================================
// Theme Schema Tests
// ============================================================================
describe('ThemeSchema', () => {
    it('accepts "light" theme', () => {
        expect(ThemeSchema.parse('light')).toBe('light');
    });
    it('accepts "dark" theme', () => {
        expect(ThemeSchema.parse('dark')).toBe('dark');
    });
    it('rejects invalid theme value', () => {
        const result = ThemeSchema.safeParse('invalid');
        expect(result.success).toBe(false);
    });
    it('rejects non-string theme', () => {
        const result = ThemeSchema.safeParse(123);
        expect(result.success).toBe(false);
    });
    it('rejects undefined theme', () => {
        const result = ThemeSchema.safeParse(undefined);
        expect(result.success).toBe(false);
    });
});
// ============================================================================
// Permission Schema Tests
// ============================================================================
describe('PermissionSchema', () => {
    describe('valid permission formats', () => {
        it('accepts "read:<target>" format', () => {
            expect(PermissionSchema.parse('read:/data/user')).toBe('read:/data/user');
        });
        it('accepts "emit:<target>" format', () => {
            expect(PermissionSchema.parse('emit:output')).toBe('emit:output');
        });
        it('accepts "subscribe:<target>" format', () => {
            expect(PermissionSchema.parse('subscribe:events')).toBe('subscribe:events');
        });
        it('accepts various target formats', () => {
            expect(PermissionSchema.parse('read:mood')).toBe('read:mood');
            expect(PermissionSchema.parse('emit:port-1')).toBe('emit:port-1');
            expect(PermissionSchema.parse('subscribe:/path/to/data')).toBe('subscribe:/path/to/data');
        });
    });
    describe('invalid permission formats', () => {
        it('rejects permission without colon', () => {
            const result = PermissionSchema.safeParse('readdata');
            expect(result.success).toBe(false);
        });
        it('rejects permission with invalid action', () => {
            const result = PermissionSchema.safeParse('write:data');
            expect(result.success).toBe(false);
        });
        it('rejects permission with empty target', () => {
            const result = PermissionSchema.safeParse('read:');
            expect(result.success).toBe(false);
        });
        it('rejects non-string permission', () => {
            const result = PermissionSchema.safeParse(123);
            expect(result.success).toBe(false);
        });
        it('rejects undefined permission', () => {
            const result = PermissionSchema.safeParse(undefined);
            expect(result.success).toBe(false);
        });
    });
});
// ============================================================================
// InitMessageSchema Tests (Host → Organ)
// ============================================================================
describe('InitMessageSchema', () => {
    const validInitMessage = {
        type: 'init',
        apiVersion: '1.0.0',
        theme: 'light',
        reducedMotion: false,
        granted: ['read:mood', 'emit:output'],
    };
    it('accepts valid init message', () => {
        const result = InitMessageSchema.safeParse(validInitMessage);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data).toEqual(validInitMessage);
        }
    });
    it('accepts init message with dark theme', () => {
        const message = { ...validInitMessage, theme: 'dark' };
        const result = InitMessageSchema.safeParse(message);
        expect(result.success).toBe(true);
    });
    it('accepts init message with reducedMotion true', () => {
        const message = { ...validInitMessage, reducedMotion: true };
        const result = InitMessageSchema.safeParse(message);
        expect(result.success).toBe(true);
    });
    it('accepts init message with empty granted array', () => {
        const message = { ...validInitMessage, granted: [] };
        const result = InitMessageSchema.safeParse(message);
        expect(result.success).toBe(true);
    });
    describe('missing required fields', () => {
        it('rejects missing type', () => {
            const { type, ...rest } = validInitMessage;
            const result = InitMessageSchema.safeParse(rest);
            expect(result.success).toBe(false);
        });
        it('rejects missing apiVersion', () => {
            const { apiVersion, ...rest } = validInitMessage;
            const result = InitMessageSchema.safeParse(rest);
            expect(result.success).toBe(false);
        });
        it('rejects missing theme', () => {
            const { theme, ...rest } = validInitMessage;
            const result = InitMessageSchema.safeParse(rest);
            expect(result.success).toBe(false);
        });
        it('rejects missing reducedMotion', () => {
            const { reducedMotion, ...rest } = validInitMessage;
            const result = InitMessageSchema.safeParse(rest);
            expect(result.success).toBe(false);
        });
        it('rejects missing granted', () => {
            const { granted, ...rest } = validInitMessage;
            const result = InitMessageSchema.safeParse(rest);
            expect(result.success).toBe(false);
        });
    });
    describe('wrong types', () => {
        it('rejects wrong type value', () => {
            const result = InitMessageSchema.safeParse({ ...validInitMessage, type: 'init2' });
            expect(result.success).toBe(false);
        });
        it('rejects non-string apiVersion', () => {
            const result = InitMessageSchema.safeParse({ ...validInitMessage, apiVersion: 123 });
            expect(result.success).toBe(false);
        });
        it('rejects empty apiVersion', () => {
            const result = InitMessageSchema.safeParse({ ...validInitMessage, apiVersion: '' });
            expect(result.success).toBe(false);
        });
        it('rejects non-boolean reducedMotion', () => {
            const result = InitMessageSchema.safeParse({ ...validInitMessage, reducedMotion: 'true' });
            expect(result.success).toBe(false);
        });
        it('rejects non-array granted', () => {
            const result = InitMessageSchema.safeParse({ ...validInitMessage, granted: 'read:mood' });
            expect(result.success).toBe(false);
        });
    });
    describe('invalid permission in granted array', () => {
        it('rejects invalid permission format in granted', () => {
            const result = InitMessageSchema.safeParse({
                ...validInitMessage,
                granted: ['invalid-permission'],
            });
            expect(result.success).toBe(false);
        });
        it('rejects permission with invalid action in granted', () => {
            const result = InitMessageSchema.safeParse({
                ...validInitMessage,
                granted: ['write:data'],
            });
            expect(result.success).toBe(false);
        });
    });
    describe('invalid theme values', () => {
        it('rejects invalid theme value', () => {
            const result = InitMessageSchema.safeParse({ ...validInitMessage, theme: 'blue' });
            expect(result.success).toBe(false);
        });
        it('rejects number theme', () => {
            const result = InitMessageSchema.safeParse({ ...validInitMessage, theme: 123 });
            expect(result.success).toBe(false);
        });
    });
});
// ============================================================================
// DataMessageSchema Tests (Host → Organ)
// ============================================================================
describe('DataMessageSchema', () => {
    const validDataMessage = {
        type: 'data',
        id: 'request-123',
        value: { mood: 'happy' },
    };
    it('accepts valid data message with object value', () => {
        const result = DataMessageSchema.safeParse(validDataMessage);
        expect(result.success).toBe(true);
    });
    it('accepts data message with string value', () => {
        const message = { ...validDataMessage, value: 'test string' };
        const result = DataMessageSchema.safeParse(message);
        expect(result.success).toBe(true);
    });
    it('accepts data message with number value', () => {
        const message = { ...validDataMessage, value: 42 };
        const result = DataMessageSchema.safeParse(message);
        expect(result.success).toBe(true);
    });
    it('accepts data message with null value', () => {
        const message = { ...validDataMessage, value: null };
        const result = DataMessageSchema.safeParse(message);
        expect(result.success).toBe(true);
    });
    it('accepts data message with array value', () => {
        const message = { ...validDataMessage, value: [1, 2, 3] };
        const result = DataMessageSchema.safeParse(message);
        expect(result.success).toBe(true);
    });
    it('accepts data message with undefined value', () => {
        const message = { ...validDataMessage, value: undefined };
        const result = DataMessageSchema.safeParse(message);
        expect(result.success).toBe(true);
    });
    describe('missing required fields', () => {
        it('rejects missing type', () => {
            const { type, ...rest } = validDataMessage;
            const result = DataMessageSchema.safeParse(rest);
            expect(result.success).toBe(false);
        });
        it('rejects missing id', () => {
            const { id, ...rest } = validDataMessage;
            const result = DataMessageSchema.safeParse(rest);
            expect(result.success).toBe(false);
        });
        it('rejects missing value', () => {
            const { value, ...rest } = validDataMessage;
            const result = DataMessageSchema.safeParse(rest);
            expect(result.success).toBe(false);
        });
    });
    describe('wrong types', () => {
        it('rejects wrong type value', () => {
            const result = DataMessageSchema.safeParse({ ...validDataMessage, type: 'data2' });
            expect(result.success).toBe(false);
        });
        it('rejects non-string id', () => {
            const result = DataMessageSchema.safeParse({ ...validDataMessage, id: 123 });
            expect(result.success).toBe(false);
        });
        it('rejects empty id', () => {
            const result = DataMessageSchema.safeParse({ ...validDataMessage, id: '' });
            expect(result.success).toBe(false);
        });
    });
});
// ============================================================================
// InMessageSchema Tests (Host → Organ)
// ============================================================================
describe('InMessageSchema', () => {
    const validInMessage = {
        type: 'in',
        port: 'input-1',
        payload: { data: 'test' },
    };
    it('accepts valid in message with object payload', () => {
        const result = InMessageSchema.safeParse(validInMessage);
        expect(result.success).toBe(true);
    });
    it('accepts in message with string payload', () => {
        const message = { ...validInMessage, payload: 'string payload' };
        const result = InMessageSchema.safeParse(message);
        expect(result.success).toBe(true);
    });
    it('accepts in message with number payload', () => {
        const message = { ...validInMessage, payload: 123 };
        const result = InMessageSchema.safeParse(message);
        expect(result.success).toBe(true);
    });
    it('accepts in message with null payload', () => {
        const message = { ...validInMessage, payload: null };
        const result = InMessageSchema.safeParse(message);
        expect(result.success).toBe(true);
    });
    it('accepts in message with array payload', () => {
        const message = { ...validInMessage, payload: ['a', 'b'] };
        const result = InMessageSchema.safeParse(message);
        expect(result.success).toBe(true);
    });
    describe('missing required fields', () => {
        it('rejects missing type', () => {
            const { type, ...rest } = validInMessage;
            const result = InMessageSchema.safeParse(rest);
            expect(result.success).toBe(false);
        });
        it('rejects missing port', () => {
            const { port, ...rest } = validInMessage;
            const result = InMessageSchema.safeParse(rest);
            expect(result.success).toBe(false);
        });
        it('rejects missing payload', () => {
            const { payload, ...rest } = validInMessage;
            const result = InMessageSchema.safeParse(rest);
            expect(result.success).toBe(false);
        });
    });
    describe('wrong types', () => {
        it('rejects wrong type value', () => {
            const result = InMessageSchema.safeParse({ ...validInMessage, type: 'in2' });
            expect(result.success).toBe(false);
        });
        it('rejects non-string port', () => {
            const result = InMessageSchema.safeParse({ ...validInMessage, port: 123 });
            expect(result.success).toBe(false);
        });
        it('rejects empty port', () => {
            const result = InMessageSchema.safeParse({ ...validInMessage, port: '' });
            expect(result.success).toBe(false);
        });
    });
});
// ============================================================================
// TickMessageSchema Tests (Host → Organ)
// ============================================================================
describe('TickMessageSchema', () => {
    const validTickMessage = {
        type: 'tick',
        now: 1700000000000,
    };
    it('accepts valid tick message', () => {
        const result = TickMessageSchema.safeParse(validTickMessage);
        expect(result.success).toBe(true);
    });
    it('accepts zero timestamp', () => {
        const message = { ...validTickMessage, now: 0 };
        const result = TickMessageSchema.safeParse(message);
        expect(result.success).toBe(true);
    });
    it('accepts large timestamp', () => {
        const message = { ...validTickMessage, now: 9999999999999 };
        const result = TickMessageSchema.safeParse(message);
        expect(result.success).toBe(true);
    });
    describe('missing required fields', () => {
        it('rejects missing type', () => {
            const { type, ...rest } = validTickMessage;
            const result = TickMessageSchema.safeParse(rest);
            expect(result.success).toBe(false);
        });
        it('rejects missing now', () => {
            const { now, ...rest } = validTickMessage;
            const result = TickMessageSchema.safeParse(rest);
            expect(result.success).toBe(false);
        });
    });
    describe('wrong types', () => {
        it('rejects wrong type value', () => {
            const result = TickMessageSchema.safeParse({ ...validTickMessage, type: 'tick2' });
            expect(result.success).toBe(false);
        });
        it('rejects non-number now', () => {
            const result = TickMessageSchema.safeParse({ ...validTickMessage, now: '12345' });
            expect(result.success).toBe(false);
        });
        it('rejects float now', () => {
            const result = TickMessageSchema.safeParse({ ...validTickMessage, now: 1234.56 });
            expect(result.success).toBe(false);
        });
    });
    describe('negative timestamp', () => {
        it('rejects negative timestamp', () => {
            const result = TickMessageSchema.safeParse({ ...validTickMessage, now: -1 });
            expect(result.success).toBe(false);
        });
        it('rejects large negative timestamp', () => {
            const result = TickMessageSchema.safeParse({ ...validTickMessage, now: -1000000 });
            expect(result.success).toBe(false);
        });
    });
});
// ============================================================================
// HostToOrganMessageSchema Tests (Union)
// ============================================================================
describe('HostToOrganMessageSchema', () => {
    it('accepts valid init message', () => {
        const message = {
            type: 'init',
            apiVersion: '1.0.0',
            theme: 'light',
            reducedMotion: false,
            granted: ['read:mood'],
        };
        const result = HostToOrganMessageSchema.safeParse(message);
        expect(result.success).toBe(true);
    });
    it('accepts valid data message', () => {
        const message = { type: 'data', id: '123', value: 'test' };
        const result = HostToOrganMessageSchema.safeParse(message);
        expect(result.success).toBe(true);
    });
    it('accepts valid in message', () => {
        const message = { type: 'in', port: 'input', payload: {} };
        const result = HostToOrganMessageSchema.safeParse(message);
        expect(result.success).toBe(true);
    });
    it('accepts valid tick message', () => {
        const message = { type: 'tick', now: 1700000000000 };
        const result = HostToOrganMessageSchema.safeParse(message);
        expect(result.success).toBe(true);
    });
    it('rejects unknown message type', () => {
        const message = { type: 'unknown' };
        const result = HostToOrganMessageSchema.safeParse(message);
        expect(result.success).toBe(false);
    });
    it('rejects non-object input', () => {
        const result = HostToOrganMessageSchema.safeParse('not an object');
        expect(result.success).toBe(false);
    });
    it('rejects null input', () => {
        const result = HostToOrganMessageSchema.safeParse(null);
        expect(result.success).toBe(false);
    });
});
// ============================================================================
// HelloMessageSchema Tests (Organ → Host)
// ============================================================================
describe('HelloMessageSchema', () => {
    const validHelloMessage = {
        type: 'hello',
        apiVersion: '1.0.0',
    };
    it('accepts valid hello message', () => {
        const result = HelloMessageSchema.safeParse(validHelloMessage);
        expect(result.success).toBe(true);
    });
    it('accepts hello message with different apiVersion', () => {
        const message = { ...validHelloMessage, apiVersion: '2.0.0' };
        const result = HelloMessageSchema.safeParse(message);
        expect(result.success).toBe(true);
    });
    describe('missing required fields', () => {
        it('rejects missing type', () => {
            const { type, ...rest } = validHelloMessage;
            const result = HelloMessageSchema.safeParse(rest);
            expect(result.success).toBe(false);
        });
        it('rejects missing apiVersion', () => {
            const { apiVersion, ...rest } = validHelloMessage;
            const result = HelloMessageSchema.safeParse(rest);
            expect(result.success).toBe(false);
        });
    });
    describe('wrong types', () => {
        it('rejects wrong type value', () => {
            const result = HelloMessageSchema.safeParse({ ...validHelloMessage, type: 'hello2' });
            expect(result.success).toBe(false);
        });
        it('rejects non-string apiVersion', () => {
            const result = HelloMessageSchema.safeParse({ ...validHelloMessage, apiVersion: 123 });
            expect(result.success).toBe(false);
        });
        it('rejects empty apiVersion', () => {
            const result = HelloMessageSchema.safeParse({ ...validHelloMessage, apiVersion: '' });
            expect(result.success).toBe(false);
        });
    });
});
// ============================================================================
// ReadMessageSchema Tests (Organ → Host)
// ============================================================================
describe('ReadMessageSchema', () => {
    const validReadMessage = {
        type: 'read',
        id: 'request-1',
        path: '/data/user',
    };
    it('accepts valid read message', () => {
        const result = ReadMessageSchema.safeParse(validReadMessage);
        expect(result.success).toBe(true);
    });
    it('accepts read message with simple path', () => {
        const message = { ...validReadMessage, path: 'mood' };
        const result = ReadMessageSchema.safeParse(message);
        expect(result.success).toBe(true);
    });
    describe('missing required fields', () => {
        it('rejects missing type', () => {
            const { type, ...rest } = validReadMessage;
            const result = ReadMessageSchema.safeParse(rest);
            expect(result.success).toBe(false);
        });
        it('rejects missing id', () => {
            const { id, ...rest } = validReadMessage;
            const result = ReadMessageSchema.safeParse(rest);
            expect(result.success).toBe(false);
        });
        it('rejects missing path', () => {
            const { path, ...rest } = validReadMessage;
            const result = ReadMessageSchema.safeParse(rest);
            expect(result.success).toBe(false);
        });
    });
    describe('wrong types', () => {
        it('rejects wrong type value', () => {
            const result = ReadMessageSchema.safeParse({ ...validReadMessage, type: 'read2' });
            expect(result.success).toBe(false);
        });
        it('rejects non-string id', () => {
            const result = ReadMessageSchema.safeParse({ ...validReadMessage, id: 123 });
            expect(result.success).toBe(false);
        });
        it('rejects empty id', () => {
            const result = ReadMessageSchema.safeParse({ ...validReadMessage, id: '' });
            expect(result.success).toBe(false);
        });
        it('rejects non-string path', () => {
            const result = ReadMessageSchema.safeParse({ ...validReadMessage, path: 123 });
            expect(result.success).toBe(false);
        });
        it('rejects empty path', () => {
            const result = ReadMessageSchema.safeParse({ ...validReadMessage, path: '' });
            expect(result.success).toBe(false);
        });
    });
});
// ============================================================================
// EmitMessageSchema Tests (Organ → Host)
// ============================================================================
describe('EmitMessageSchema', () => {
    const validEmitMessage = {
        type: 'emit',
        port: 'output-1',
        payload: { result: 'success' },
    };
    it('accepts valid emit message with object payload', () => {
        const result = EmitMessageSchema.safeParse(validEmitMessage);
        expect(result.success).toBe(true);
    });
    it('accepts emit message with string payload', () => {
        const message = { ...validEmitMessage, payload: 'emitted string' };
        const result = EmitMessageSchema.safeParse(message);
        expect(result.success).toBe(true);
    });
    it('accepts emit message with number payload', () => {
        const message = { ...validEmitMessage, payload: 42 };
        const result = EmitMessageSchema.safeParse(message);
        expect(result.success).toBe(true);
    });
    it('accepts emit message with null payload', () => {
        const message = { ...validEmitMessage, payload: null };
        const result = EmitMessageSchema.safeParse(message);
        expect(result.success).toBe(true);
    });
    it('accepts emit message with array payload', () => {
        const message = { ...validEmitMessage, payload: [1, 2, 3] };
        const result = EmitMessageSchema.safeParse(message);
        expect(result.success).toBe(true);
    });
    describe('missing required fields', () => {
        it('rejects missing type', () => {
            const { type, ...rest } = validEmitMessage;
            const result = EmitMessageSchema.safeParse(rest);
            expect(result.success).toBe(false);
        });
        it('rejects missing port', () => {
            const { port, ...rest } = validEmitMessage;
            const result = EmitMessageSchema.safeParse(rest);
            expect(result.success).toBe(false);
        });
        it('rejects missing payload', () => {
            const { payload, ...rest } = validEmitMessage;
            const result = EmitMessageSchema.safeParse(rest);
            expect(result.success).toBe(false);
        });
    });
    describe('wrong types', () => {
        it('rejects wrong type value', () => {
            const result = EmitMessageSchema.safeParse({ ...validEmitMessage, type: 'emit2' });
            expect(result.success).toBe(false);
        });
        it('rejects non-string port', () => {
            const result = EmitMessageSchema.safeParse({ ...validEmitMessage, port: 123 });
            expect(result.success).toBe(false);
        });
        it('rejects empty port', () => {
            const result = EmitMessageSchema.safeParse({ ...validEmitMessage, port: '' });
            expect(result.success).toBe(false);
        });
    });
});
// ============================================================================
// ResizeMessageSchema Tests (Organ → Host)
// ============================================================================
describe('ResizeMessageSchema', () => {
    const validResizeMessage = {
        type: 'resize',
        height: 400,
    };
    it('accepts valid resize message', () => {
        const result = ResizeMessageSchema.safeParse(validResizeMessage);
        expect(result.success).toBe(true);
    });
    it('accepts resize message with height 1', () => {
        const message = { ...validResizeMessage, height: 1 };
        const result = ResizeMessageSchema.safeParse(message);
        expect(result.success).toBe(true);
    });
    it('accepts resize message with large height', () => {
        const message = { ...validResizeMessage, height: 10000 };
        const result = ResizeMessageSchema.safeParse(message);
        expect(result.success).toBe(true);
    });
    describe('missing required fields', () => {
        it('rejects missing type', () => {
            const { type, ...rest } = validResizeMessage;
            const result = ResizeMessageSchema.safeParse(rest);
            expect(result.success).toBe(false);
        });
        it('rejects missing height', () => {
            const { height, ...rest } = validResizeMessage;
            const result = ResizeMessageSchema.safeParse(rest);
            expect(result.success).toBe(false);
        });
    });
    describe('wrong types', () => {
        it('rejects wrong type value', () => {
            const result = ResizeMessageSchema.safeParse({ ...validResizeMessage, type: 'resize2' });
            expect(result.success).toBe(false);
        });
        it('rejects non-number height', () => {
            const result = ResizeMessageSchema.safeParse({ ...validResizeMessage, height: '400' });
            expect(result.success).toBe(false);
        });
        it('rejects float height', () => {
            const result = ResizeMessageSchema.safeParse({ ...validResizeMessage, height: 400.5 });
            expect(result.success).toBe(false);
        });
    });
    describe('negative height', () => {
        it('rejects negative height', () => {
            const result = ResizeMessageSchema.safeParse({ ...validResizeMessage, height: -1 });
            expect(result.success).toBe(false);
        });
        it('rejects zero height', () => {
            const result = ResizeMessageSchema.safeParse({ ...validResizeMessage, height: 0 });
            expect(result.success).toBe(false);
        });
        it('rejects large negative height', () => {
            const result = ResizeMessageSchema.safeParse({ ...validResizeMessage, height: -100 });
            expect(result.success).toBe(false);
        });
    });
});
// ============================================================================
// OrganToHostMessageSchema Tests (Union)
// ============================================================================
describe('OrganToHostMessageSchema', () => {
    it('accepts valid hello message', () => {
        const message = { type: 'hello', apiVersion: '1.0.0' };
        const result = OrganToHostMessageSchema.safeParse(message);
        expect(result.success).toBe(true);
    });
    it('accepts valid read message', () => {
        const message = { type: 'read', id: '123', path: '/data' };
        const result = OrganToHostMessageSchema.safeParse(message);
        expect(result.success).toBe(true);
    });
    it('accepts valid emit message', () => {
        const message = { type: 'emit', port: 'output', payload: {} };
        const result = OrganToHostMessageSchema.safeParse(message);
        expect(result.success).toBe(true);
    });
    it('accepts valid resize message', () => {
        const message = { type: 'resize', height: 400 };
        const result = OrganToHostMessageSchema.safeParse(message);
        expect(result.success).toBe(true);
    });
    it('rejects unknown message type', () => {
        const message = { type: 'unknown' };
        const result = OrganToHostMessageSchema.safeParse(message);
        expect(result.success).toBe(false);
    });
    it('rejects non-object input', () => {
        const result = OrganToHostMessageSchema.safeParse('not an object');
        expect(result.success).toBe(false);
    });
    it('rejects null input', () => {
        const result = OrganToHostMessageSchema.safeParse(null);
        expect(result.success).toBe(false);
    });
});
// ============================================================================
// Validation Helper Function Tests
// ============================================================================
describe('validateHostToOrganMessage', () => {
    it('returns parsed message for valid input', () => {
        const message = {
            type: 'tick',
            now: 1700000000000,
        };
        const result = validateHostToOrganMessage(message);
        expect(result).toEqual(message);
    });
    it('throws ZodError for invalid input', () => {
        const message = { type: 'tick', now: -1 };
        expect(() => validateHostToOrganMessage(message)).toThrow();
    });
});
describe('validateOrganToHostMessage', () => {
    it('returns parsed message for valid input', () => {
        const message = {
            type: 'hello',
            apiVersion: '1.0.0',
        };
        const result = validateOrganToHostMessage(message);
        expect(result).toEqual(message);
    });
    it('throws ZodError for invalid input', () => {
        const message = { type: 'resize', height: -1 };
        expect(() => validateOrganToHostMessage(message)).toThrow();
    });
});
describe('safeValidateHostToOrganMessage', () => {
    it('returns success result for valid input', () => {
        const message = {
            type: 'data',
            id: '123',
            value: 'test',
        };
        const result = safeValidateHostToOrganMessage(message);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data).toEqual(message);
        }
    });
    it('returns failure result for invalid input', () => {
        const message = { type: 'invalid' };
        const result = safeValidateHostToOrganMessage(message);
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeDefined();
        }
    });
});
describe('safeValidateOrganToHostMessage', () => {
    it('returns success result for valid input', () => {
        const message = {
            type: 'emit',
            port: 'output',
            payload: null,
        };
        const result = safeValidateOrganToHostMessage(message);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data).toEqual(message);
        }
    });
    it('returns failure result for invalid input', () => {
        const message = { type: 'invalid' };
        const result = safeValidateOrganToHostMessage(message);
        expect(result.success).toBe(false);
        if (!result.success) {
            expect(result.error).toBeDefined();
        }
    });
});
//# sourceMappingURL=schemas.test.js.map