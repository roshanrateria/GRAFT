/**
 * Mocked-LLM pipeline test for the chimera wishes.
 *
 * The LLM is mocked at the HTTP layer: the spec call returns a structured port
 * contract, and the build call deliberately returns WRONG ports/permissions.
 * Nothing about any wish is hard-coded in production code; the contract comes
 * from the (mocked) model's structured spec output and is enforced afterwards.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { LLMDoctorProvider } from '../providers/llm.js';
import type { Anatomy, OrganBundle, Spec, DoctorEvent } from '../types.js';
import { runImmuneSystem } from '@graft/immune';

const WISH_1 =
  'Create a small widget that reads tasks.items and shows how many tasks are open. It must declare exactly one output port named open-count with schema {"type":"integer"}. Permissions: read:tasks.items, subscribe:tasks.items, emit:open-count. Do not use any form elements.';
const WISH_2 =
  'Create a small status badge organ with exactly one input port named open-count with schema {"type":"integer"}. It needs no read permissions and no output ports.';
const WISH_3 =
  'Create a live weather widget that uses fetch to call https://api.open-meteo.com/v1/forecast. Store my last searched city in localStorage.';

const COUNTER_HTML = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Open tasks</title></head><body>
<div id="n">0</div><div>open tasks</div>
<script>
function update(items) {
  var c = (items || []).filter(function (t) { return !t.completed; }).length;
  document.getElementById('n').textContent = String(c);
  nerve.emit('open-count', c);
}
window.addEventListener('message', function (e) {
  var m = e.data;
  if (m && m.type === 'init') {
    nerve.read('tasks.items').then(update);
    nerve.subscribe('tasks.items', update);
  }
});
</script></body></html>`;

const BADGE_HTML = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Badge</title></head><body>
<div id="b">Waiting for open-count</div>
<script>
nerve.onIn('open-count', function (n) {
  var label = n === 0 ? 'All clear' : n <= 5 ? 'Getting busy' : 'Overloaded';
  document.getElementById('b').textContent = label + ' ' + n;
});
</script></body></html>`;

const WEATHER_HTML = `<!DOCTYPE html><html><body><div id="t"></div><script>
var city = localStorage.getItem('city');
fetch('https://api.open-meteo.com/v1/forecast').then(function (r) { return r.json(); });
</script></body></html>`;

/** Respond to the chat endpoint with an SSE stream carrying `content`. */
function sse(content: unknown): Response {
  const text = typeof content === 'string' ? content : JSON.stringify(content);
  const chunk = `data: ${JSON.stringify({ choices: [{ index: 0, delta: { content: text }, finish_reason: null }] })}\n\ndata: [DONE]\n\n`;
  return new Response(chunk, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
}

function mockLlm(handlers: { spec: unknown; bundle: unknown }) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, init: { body: string }) => {
      const body = JSON.parse(init.body);
      const name: string = body.response_format?.json_schema?.name ?? '';
      return sse(name === 'GraftSpec' ? handlers.spec : handlers.bundle);
    })
  );
}

async function collect(events: AsyncIterable<DoctorEvent>): Promise<DoctorEvent[]> {
  const out: DoctorEvent[] = [];
  for await (const e of events) out.push(e);
  return out;
}

async function runWish(
  wish: string,
  handlers: { spec: unknown; bundle: unknown },
  anatomy: Anatomy
): Promise<{ spec: Spec; bundle: OrganBundle }> {
  mockLlm(handlers);
  const doctor = new LLMDoctorProvider({ apiKey: 'test', baseUrl: 'https://llm.invalid/v1', model: 'm' });
  const specEvents = await collect(doctor.proposeSpec(wish, anatomy));
  const spec = (specEvents.find(e => e.type === 'spec-complete')!.data as { spec: Spec }).spec;
  const buildEvents = await collect(doctor.build(spec, anatomy));
  const bundle = (buildEvents.find(e => e.type === 'build-complete')!.data as { bundle: OrganBundle }).bundle;
  return { spec, bundle };
}

const baseAnatomy: Anatomy = {
  apiVersion: '1.0.0',
  dataDomains: ['tasks.items', 'mood.entries'],
  installedOrgans: [],
};

afterEach(() => vi.unstubAllGlobals());

describe('chimera wishes through the Doctor + immune pipeline (mocked LLM)', () => {
  it('wish 1: the spec contract overrides wrong model ports and the counter passes the immune system', async () => {
    const { spec, bundle } = await runWish(
      WISH_1,
      {
        spec: {
          organName: 'open-task-counter',
          requirements: 'r',
          design: 'd',
          ports: [{ name: 'open-count', direction: 'out', schema: { type: 'integer' } }],
          permissions: ['read:tasks.items', 'subscribe:tasks.items', 'emit:open-count'],
        },
        // The model "re-invents" the port name and schema and forgets permissions.
        bundle: {
          manifest: {
            name: 'open-task-counter',
            version: '1.0.0',
            apiVersion: '1.0.0',
            permissions: ['read:tasks.items'],
            ports: [{ name: 'openCount', direction: 'out', schema: { type: 'object' } }],
            slotSize: 'small',
          },
          indexHtml: COUNTER_HTML,
        },
      },
      baseAnatomy
    );

    expect(spec.ports).toEqual([{ name: 'open-count', direction: 'out', schema: { type: 'integer' } }]);
    expect(bundle.manifest.ports).toEqual(spec.ports);
    expect(bundle.manifest.permissions).toEqual(
      expect.arrayContaining(['read:tasks.items', 'subscribe:tasks.items', 'emit:open-count'])
    );

    const report = await runImmuneSystem(bundle);
    expect(report.rejection?.message).toBeUndefined();
    expect(report.passed).toBe(true);
  });

  it('wish 2: the badge gets exactly one input port, no permissions, and passes', async () => {
    const counterPorts = [{ name: 'open-count', direction: 'out' as const, schema: { type: 'integer' } }];
    const { bundle } = await runWish(
      WISH_2,
      {
        spec: {
          organName: 'status-badge',
          requirements: 'r',
          design: 'd',
          ports: [{ name: 'open-count', direction: 'in', schema: { type: 'integer' } }],
          permissions: [],
        },
        bundle: {
          manifest: {
            name: 'status-badge',
            version: '1.0.0',
            apiVersion: '1.0.0',
            permissions: ['subscribe:open-count'],
            slotSize: 'small',
          },
          indexHtml: BADGE_HTML,
        },
      },
      { ...baseAnatomy, installedOrgans: [{ id: 'open-task-counter', name: 'open-task-counter', ports: counterPorts }] }
    );

    expect(bundle.manifest.ports).toEqual([{ name: 'open-count', direction: 'in', schema: { type: 'integer' } }]);
    expect(bundle.manifest.permissions.some(p => p.startsWith('emit:'))).toBe(false);

    // The model also wrote a bogus "subscribe:open-count" (a port, not a data
    // domain): the permission is harmless but must not break the pipeline.
    const report = await runImmuneSystem(bundle);
    expect(report.rejection?.message).toBeUndefined();
    expect(report.passed).toBe(true);
  });

  it('badge listening on an undeclared input port is rejected (fail closed)', async () => {
    const { bundle } = await runWish(
      WISH_2,
      {
        spec: { organName: 'status-badge', requirements: 'r', design: 'd', ports: [], permissions: [] },
        bundle: {
          manifest: {
            name: 'status-badge',
            version: '1.0.0',
            apiVersion: '1.0.0',
            permissions: [],
            ports: [{ name: 'other', direction: 'in', schema: { type: 'integer' } }],
            slotSize: 'small',
          },
          indexHtml: BADGE_HTML,
        },
      },
      baseAnatomy
    );
    const report = await runImmuneSystem(bundle);
    expect(report.passed).toBe(false);
    expect(report.rejection?.message).toMatch(/open-count/);
  });

  it('wish 3: fetch + localStorage are rejected with specific reasons', async () => {
    const { bundle } = await runWish(
      WISH_3,
      {
        spec: { organName: 'weather', requirements: 'r', design: 'd', ports: [], permissions: [] },
        bundle: {
          manifest: {
            name: 'weather',
            version: '1.0.0',
            apiVersion: '1.0.0',
            permissions: [],
            ports: [],
            slotSize: 'small',
          },
          indexHtml: WEATHER_HTML,
        },
      },
      baseAnatomy
    );
    const report = await runImmuneSystem(bundle);
    expect(report.passed).toBe(false);
    expect(report.rejection?.stage).toBe('static');
  });

  it('<form> elements are rejected', async () => {
    const { bundle } = await runWish(
      WISH_1,
      {
        spec: { organName: 'f', requirements: 'r', design: 'd', ports: [], permissions: [] },
        bundle: {
          manifest: { name: 'f', version: '1.0.0', apiVersion: '1.0.0', permissions: [], ports: [], slotSize: 'small' },
          indexHtml: '<!DOCTYPE html><html><body><form><input></form></body></html>',
        },
      },
      baseAnatomy
    );
    const report = await runImmuneSystem(bundle);
    expect(report.passed).toBe(false);
    expect(report.rejection?.stage).toBe('static');
  });

  it('repair keeps the port contract even if the model drops ports', async () => {
    mockLlm({
      spec: {},
      bundle: {
        manifest: { name: 'c', version: '1.0.0', apiVersion: '1.0.0', permissions: [], slotSize: 'small' },
        indexHtml: COUNTER_HTML,
      },
    });
    const doctor = new LLMDoctorProvider({ apiKey: 'test', baseUrl: 'https://llm.invalid/v1', model: 'm' });
    const original: OrganBundle = {
      manifest: {
        name: 'c',
        version: '1.0.0',
        apiVersion: '1.0.0',
        permissions: ['emit:open-count'],
        ports: [{ name: 'open-count', direction: 'out', schema: { type: 'integer' } }],
        slotSize: 'small',
      },
      indexHtml: '<p></p>',
    };
    const events = await collect(
      doctor.repair(original, { stage: 'manifest', reasonCode: 'X', message: 'x' })
    );
    const repaired = (events.find(e => e.type === 'repair-complete')!.data as { bundle: OrganBundle }).bundle;
    expect(repaired.manifest.ports).toEqual(original.manifest.ports);
    expect(repaired.manifest.permissions).toContain('emit:open-count');
  });
});
