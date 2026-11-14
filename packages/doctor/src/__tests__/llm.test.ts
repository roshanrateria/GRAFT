/**
 * Tests for LLM Doctor Provider
 *
 * Tests the LLM adapter for live Doctor calls.
 */

import { describe, it, expect } from 'vitest';
import { LLMDoctorProvider, createLLMProvider } from '../providers/llm.js';
import type { Anatomy, Spec } from '../types.js';

describe('LLM Doctor Provider', () => {
  const anatomy: Anatomy = {
    apiVersion: '1.0.0',
    dataDomains: ['tasks', 'mood', 'notes'],
    installedOrgans: [],
  };

  describe('configuration', () => {
    it('is not configured when no API key provided', () => {
      const provider = new LLMDoctorProvider({
        apiKey: undefined,
        baseUrl: 'https://api.example.com/v1',
        model: 'test-model',
      });

      expect(provider.isConfigured()).toBe(false);
      expect(provider.type).toBe('llm');
      expect(provider.name).toBe('llm:test-model');
    });

    it('is configured when API key is provided', () => {
      const provider = new LLMDoctorProvider({
        apiKey: 'test-key',
        baseUrl: 'https://api.example.com/v1',
        model: 'test-model',
      });

      expect(provider.isConfigured()).toBe(true);
    });

    it('uses environment variables as defaults', () => {
      const originalKey = process.env.LLM_API_KEY;
      const originalUrl = process.env.LLM_BASE_URL;
      const originalModel = process.env.DOCTOR_MODEL;

      process.env.LLM_API_KEY = 'env-key';
      process.env.LLM_BASE_URL = 'https://env.example.com/v1';
      process.env.DOCTOR_MODEL = 'env-model';

      const provider = new LLMDoctorProvider();

      expect(provider.isConfigured()).toBe(true);
      expect(provider.name).toBe('llm:env-model');

      // Restore
      if (originalKey) process.env.LLM_API_KEY = originalKey;
      else delete process.env.LLM_API_KEY;
      if (originalUrl) process.env.LLM_BASE_URL = originalUrl;
      else delete process.env.LLM_BASE_URL;
      if (originalModel) process.env.DOCTOR_MODEL = originalModel;
      else delete process.env.DOCTOR_MODEL;
    });
  });

  describe('graceful failure', () => {
    it('yields error event when not configured on proposeSpec', async () => {
      const provider = new LLMDoctorProvider({
        apiKey: undefined,
      });

      const events: any[] = [];
      for await (const event of provider.proposeSpec('test wish', anatomy)) {
        events.push(event);
      }

      expect(events.length).toBeGreaterThan(0);
      expect(events[events.length - 1].type).toBe('error');
      expect(events[events.length - 1].data.code).toBe('MISSING_API_KEY');
    });

    it('yields error event when not configured on build', async () => {
      const provider = new LLMDoctorProvider({
        apiKey: undefined,
      });

      const spec: Spec = {
        name: 'test-organ',
        requirements: 'TEST-01: Test requirement',
        design: 'Test design',
      };

      const events: any[] = [];
      for await (const event of provider.build(spec, anatomy)) {
        events.push(event);
      }

      expect(events.length).toBeGreaterThan(0);
      expect(events[events.length - 1].type).toBe('error');
      expect(events[events.length - 1].data.code).toBe('MISSING_API_KEY');
    });

    it('yields error event when not configured on repair', async () => {
      const provider = new LLMDoctorProvider({
        apiKey: undefined,
      });

      const bundle = {
        manifest: {
          name: 'test',
          version: '1.0.0',
          apiVersion: '1.0.0',
          permissions: [],
          ports: [],
          slotSize: 'medium' as const,
        },
        indexHtml: '<html></html>',
      };

      const report = {
        stage: 'static',
        reasonCode: 'SYNTAX_ERROR',
        message: 'Test error',
      };

      const events: any[] = [];
      for await (const event of provider.repair(bundle, report)) {
        events.push(event);
      }

      expect(events.length).toBeGreaterThan(0);
      expect(events[events.length - 1].type).toBe('error');
    });

    it('yields error event when not configured on heal', async () => {
      const provider = new LLMDoctorProvider({
        apiKey: undefined,
      });

      const bundle = {
        manifest: {
          name: 'test',
          version: '1.0.0',
          apiVersion: '1.0.0',
          permissions: [],
          ports: [],
          slotSize: 'medium' as const,
        },
        indexHtml: '<html></html>',
      };

      const decay = {
        organId: 'test-organ',
        reason: 'API version mismatch',
        suggestions: ['Update organ'],
      };

      const events: any[] = [];
      for await (const event of provider.heal(bundle, decay)) {
        events.push(event);
      }

      expect(events.length).toBeGreaterThan(0);
      expect(events[events.length - 1].type).toBe('error');
    });
  });

  describe('factory', () => {
    it('creates provider via factory function', () => {
      const provider = createLLMProvider({ apiKey: 'test-key' });
      expect(provider.type).toBe('llm');
      expect((provider as LLMDoctorProvider).isConfigured()).toBe(true);
    });
  });
});

// Live test - only runs when LLM_API_KEY is set
describe('LLM Live Test', () => {
  const apiKey = process.env.LLM_API_KEY;

  it.skipIf(!apiKey)('makes live LLM call for wish #1 (task-counter)', async () => {
    const provider = createLLMProvider();

    const anatomy: Anatomy = {
      apiVersion: '1.0.0',
      dataDomains: ['tasks', 'mood', 'notes'],
      installedOrgans: [],
    };

    const wish = 'Count my overdue tasks and warn me when there are more than five';

    const events: any[] = [];
    for await (const event of provider.proposeSpec(wish, anatomy)) {
      events.push(event);
      console.log(`Event: ${event.type}`, event.data);
    }

    // Should have received spec events
    const specComplete = events.find(e => e.type === 'spec-complete');
    expect(specComplete).toBeDefined();
    expect(specComplete?.data?.spec?.name).toBeDefined();
  }, 60000);
});
