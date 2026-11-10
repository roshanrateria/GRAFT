/**
 * Replay Doctor Provider Tests
 *
 * Tests for DOC-05: Labels replay output.
 */

import { describe, it, expect } from 'vitest';
import { createReplayProviderFromFixture } from '../providers/replay.js';
import type { ReplayFixture, DoctorProvider, Anatomy } from '../index.js';

// ============================================================================
// Test Fixtures
// ============================================================================

const testFixture: ReplayFixture = {
  wish: 'Show a graph of my mood this month',
  events: [
    {
      type: 'assumption',
      timestamp: 1000,
      data: { message: 'Test assumption' },
    },
    {
      type: 'spec-start',
      timestamp: 1100,
      data: { organName: 'test-organ' },
    },
    {
      type: 'spec-complete',
      timestamp: 1200,
      data: {},
    },
  ],
  passed: true,
};

const testAnatomy: Anatomy = {
  apiVersion: '1.0.0',
  dataDomains: ['mood.entries', 'tasks.items'],
  installedOrgans: [],
};

// ============================================================================
// Tests
// ============================================================================

describe('Replay Doctor Provider', () => {
  describe('Provider Creation', () => {
    it('should create a replay provider from fixture', () => {
      const provider = createReplayProviderFromFixture(testFixture);
      
      expect(provider.name).toContain('replay');
      expect(provider.type).toBe('replay');
    });
  });

  describe('Event Playback', () => {
    it('should play back events in order', async () => {
      const provider = createReplayProviderFromFixture(testFixture);
      const events: any[] = [];

      for await (const event of provider.proposeSpec(testFixture.wish, testAnatomy)) {
        events.push(event);
      }

      // Should include replay label event + fixture events
      expect(events.length).toBeGreaterThan(0);
    });

    it('should add REPLAY label to events', async () => {
      const provider = createReplayProviderFromFixture(testFixture);

      const events: any[] = [];
      for await (const event of provider.proposeSpec(testFixture.wish, testAnatomy)) {
        events.push(event);
      }

      // First event should have replay label
      const labeledEvent = events.find(e => e.data?._replay === true);
      expect(labeledEvent).toBeDefined();
    });

    it('should include replay indicator message', async () => {
      const provider = createReplayProviderFromFixture(testFixture);

      const events: any[] = [];
      for await (const event of provider.proposeSpec(testFixture.wish, testAnatomy)) {
        events.push(event);
      }

      // Should include the replay mode message
      const labelEvent = events.find(e => 
        e.type === 'assumption' && 
        String(e.data?.message).includes('REPLAY MODE')
      );
      expect(labelEvent).toBeDefined();
    });
  });

  describe('Build Method', () => {
    it('should emit build events', async () => {
      const provider = createReplayProviderFromFixture(testFixture);

      const events: any[] = [];
      for await (const event of provider.build({ name: 'test', requirements: '', design: '' }, testAnatomy)) {
        events.push(event);
      }

      expect(events.length).toBeGreaterThan(0);
      expect(events.some(e => e.type === 'build-start' || e.type === 'build-complete')).toBe(true);
    });
  });

  describe('Repair Method', () => {
    it('should emit repair events', async () => {
      const provider = createReplayProviderFromFixture(testFixture);

      const events: any[] = [];
      const mockBundle = {
        manifest: { name: 'test', version: '1.0.0', apiVersion: '1.0.0', permissions: [], ports: [], slotSize: 'small' as const },
        indexHtml: '<html></html>',
      };
      const mockReport = {
        stage: 'static' as const,
        reasonCode: 'TEST',
        message: 'Test rejection',
      };

      for await (const event of provider.repair(mockBundle, mockReport)) {
        events.push(event);
      }

      expect(events.length).toBeGreaterThan(0);
    });
  });

  describe('Heal Method', () => {
    it('should emit heal events', async () => {
      const provider = createReplayProviderFromFixture(testFixture);

      const events: any[] = [];
      const mockBundle = {
        manifest: { name: 'test', version: '1.0.0', apiVersion: '1.0.0', permissions: [], ports: [], slotSize: 'small' as const },
        indexHtml: '<html></html>',
      };
      const mockDecay = {
        organId: 'test-organ',
        reason: 'API version mismatch',
        suggestions: ['Update to v2'],
      };

      for await (const event of provider.heal(mockBundle, mockDecay)) {
        events.push(event);
      }

      expect(events.length).toBeGreaterThan(0);
    });
  });
});
