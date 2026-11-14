/**
 * Crew Provider Tests
 *
 * Tests for the Crew Doctor provider's configuration and not-configured
 * behavior. Full integration tests would require running Crew Gateway.
 */

import { describe, it, expect } from 'vitest';
import { CrewDoctorProvider, createCrewProvider } from '../providers/crew.js';

/**
 * Restore an env var after a test touched it.
 * `process.env.X = undefined` sets the literal string "undefined" in Node,
 * so an originally-absent variable must be deleted, not assigned.
 */
function restoreEnv(name: string, original: string | undefined): void {
  if (original === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = original;
  }
}

describe('CrewDoctorProvider', () => {
  describe('constructor', () => {
    it('should create provider with default config', () => {
      const provider = new CrewDoctorProvider();
      expect(provider.name).toContain('crew:graft-doctor');
      expect(provider.type).toBe('crew');
    });

    it('should accept custom configuration', () => {
      const provider = new CrewDoctorProvider({
        gatewayUrl: 'http://custom:9999',
        botName: 'custom-doctor',
        timeout: 120000,
      });
      expect(provider.name).toContain('crew:custom-doctor');
      expect(provider.name).toContain('http://custom:9999');
    });

    it('should use environment variables', () => {
      const originalUrl = process.env.KIROCREW_GATEWAY_URL;
      const originalToken = process.env.KIROCREW_TOKEN;

      process.env.KIROCREW_GATEWAY_URL = 'http://env-crew:8888';
      process.env.KIROCREW_TOKEN = 'test-token';

      const provider = new CrewDoctorProvider();
      expect(provider.name).toContain('http://env-crew:8888');

      restoreEnv('KIROCREW_GATEWAY_URL', originalUrl);
      restoreEnv('KIROCREW_TOKEN', originalToken);
    });
  });

  describe('isConfigured', () => {
    it('should return false without token', () => {
      const originalToken = process.env.KIROCREW_TOKEN;
      delete process.env.KIROCREW_TOKEN;

      const provider = new CrewDoctorProvider();
      expect(provider.isConfigured()).toBe(false);

      restoreEnv('KIROCREW_TOKEN', originalToken);
    });

    it('should return true with token', () => {
      const provider = new CrewDoctorProvider({ token: 'test-token' });
      expect(provider.isConfigured()).toBe(true);
    });
  });

  describe('proposeSpec', () => {
    it('should yield error when not configured', async () => {
      const provider = new CrewDoctorProvider();
      const events = [];
      for await (const event of provider.proposeSpec('test wish', {
        apiVersion: '1.0.0',
        dataDomains: ['mood'],
        installedOrgans: [],
      })) {
        events.push(event);
      }

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('error');
      expect((events[0].data as { code: string }).code).toBe('CREW_NOT_CONFIGURED');
    });
  });

  describe('build', () => {
    it('should yield error when not configured', async () => {
      const provider = new CrewDoctorProvider();
      const events = [];
      for await (const event of provider.build(
        { name: 'test', requirements: 'req', design: 'design' },
        { apiVersion: '1.0.0', dataDomains: [], installedOrgans: [] }
      )) {
        events.push(event);
      }

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('error');
    });
  });

  describe('repair', () => {
    it('should yield error when not configured', async () => {
      const provider = new CrewDoctorProvider();
      const events = [];
      for await (const event of provider.repair(
        {
          manifest: { name: 'test', version: '1.0', apiVersion: '1.0', permissions: [], ports: [], slotSize: 'medium' },
          indexHtml: '<html></html>',
        },
        { stage: 'static', reasonCode: 'TEST', message: 'Test rejection' }
      )) {
        events.push(event);
      }

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('error');
    });
  });

  describe('heal', () => {
    it('should yield error when not configured', async () => {
      const provider = new CrewDoctorProvider();
      const events = [];
      for await (const event of provider.heal(
        {
          manifest: { name: 'test', version: '1.0', apiVersion: '1.0', permissions: [], ports: [], slotSize: 'medium' },
          indexHtml: '<html></html>',
        },
        { organId: 'test-organ', reason: 'API version mismatch', suggestions: ['Update to v2'] }
      )) {
        events.push(event);
      }

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('error');
    });
  });
});

describe('createCrewProvider', () => {
  it('should create CrewDoctorProvider instance', () => {
    const provider = createCrewProvider();
    expect(provider).toBeInstanceOf(CrewDoctorProvider);
  });

  it('should pass configuration to provider', () => {
    const provider = createCrewProvider({ botName: 'custom-bot' });
    expect(provider.name).toContain('custom-bot');
  });
});
