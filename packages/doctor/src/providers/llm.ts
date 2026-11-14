/**
 * LLM Doctor Provider
 *
 * Makes direct HTTP calls to an LLM API (OpenAI-compatible).
 * Configured by LLM_BASE_URL, LLM_API_KEY, and DOCTOR_MODEL environment variables.
 *
 * Implements DOC-02: Provider-agnostic LLM wrapper.
 */

import type {
  DoctorProvider,
  DoctorEvent,
  OrganBundle,
  Anatomy,
  Spec,
  RejectionReport,
  DecayReport,
} from '../types.js';
import { applyContract, normalizePorts, normalizePermissions } from '../contract.js';

// ============================================================================
// LLM Configuration
// ============================================================================

/** Configuration for LLM provider */
export interface LLMConfig {
  /** LLM API base URL (defaults to the NVIDIA Integrate API) */
  baseUrl?: string;
  /** API key for authentication */
  apiKey?: string;
  /** Model identifier */
  model?: string;
  /** Maximum tokens for responses */
  maxTokens?: number;
  /** Temperature for generation */
  temperature?: number;
  /** Request/stream timeout in milliseconds (default 120000) */
  timeoutMs?: number;
}

/** OpenAI-compatible chat message */
interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** OpenAI-compatible chat completion response */
interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/** OpenAI-compatible streaming chunk */
interface StreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
    };
    finish_reason: string | null;
  }>;
}

// ============================================================================
// System Prompts
// ============================================================================

const SYSTEM_PROMPT_SPEC = `You are the Doctor, an AI that designs organs (sandboxed features) for the GRAFT Creature.

When given a user wish, you produce a structured spec with:
1. Organ name (kebab-case)
2. Requirements in EARS format (Each requirement: ### ID: Title [TAG] WHEN condition THE SYSTEM SHALL behavior)
3. Design overview
4. ports: the input/output ports the wish EXPLICITLY names, each as {name, direction: "in"|"out", schema}.
   Copy names and JSON schemas exactly as the wish states them (do not rename, retype or add ports).
   If the wish says to link to an installed organ, reuse that organ's port name and schema from the anatomy
   context (installedOrgans). Use an empty array when the wish names no ports.
5. permissions: the permissions the wish EXPLICITLY names (e.g. "read:tasks.items", "subscribe:tasks.items",
   "emit:open-count"). Use an empty array when none are named.

Tags: [EX] for examples, [PBT] for property-based tests, [A11Y] for accessibility.

IMPORTANT: Respond with valid JSON matching the schema exactly.`;

const SYSTEM_PROMPT_BUILD = `You are the Doctor, building organ code from a spec.

Produce a complete organ bundle with:
1. manifest (name, version, apiVersion, permissions, ports, slotSize)
2. indexHtml (the organ's UI with embedded JS using Nerve API)
3. properties (fast-check property tests for [PBT] requirements, optional)

The index.html must:
- Use only the Nerve API (nerve.read(), nerve.emit(), nerve.now(), nerve.random(), nerve.subscribe(), nerve.onIn())
- Never access network, storage, cookies, or parent DOM
- Be a complete, self-contained HTML file
- Use inline <script> tags only (no external script src)
- Not use <form> elements: the sandbox blocks form submission. Use <input> plus <button type="button"> with click/keydown handlers instead

PORT NAMES: use nerve.emit('<port-name>', value) and nerve.onIn('<port-name>', fn) with the EXACT declared port names.
Do not render a received value until one arrives (show a waiting state first).

CRITICAL DATA DOMAIN STRUCTURES:
- tasks.items: Array of objects with { id: string, title: string, completed: boolean, dueDate?: string }.
  Notice: the completion flag is named "completed" (e.g. filter with !task.completed or task.completed === false).
- mood.entries: Array of objects with { id: string, date: string, mood: number, notes?: string }.

CRITICAL INITIALIZATION & CHIMERA IN PATTERNS:
- The organ MUST wait for the 'init' message from the host before calling nerve.read() or nerve.subscribe()
- Use this pattern for reading and subscribing:
  window.addEventListener('message', function(event) {
    var msg = event.data;
    if (msg && msg.type === 'init') {
      nerve.read('tasks.items').then(function(items) {
        update(items);
        nerve.subscribe('tasks.items', function(newItems) {
          update(newItems);
        });
      });
    }
  });
- To receive data from an input port (chimera link):
  Use either:
    nerve.onIn('portName', function(payload) { /* handle incoming payload */ });
  Or:
    window.addEventListener('message', function(event) {
      var msg = event.data;
      if (msg && msg.type === 'in' && msg.port === 'portName') {
        var payload = msg.payload;
        /* handle incoming payload */
      }
    });

Manifest requirements:
- permissions: Array of strings in format "read:domain" or "emit:portName" or "subscribe:domain"
  - CRITICAL: Read/subscribe permissions MUST use EXACTLY these domain names:
    * "read:mood.entries" / "subscribe:mood.entries" (NOT "read:mood")
    * "read:tasks.items" / "subscribe:tasks.items" (NOT "read:tasks")
    * "read:habits.checkins" / "subscribe:habits.checkins" (NOT "read:habits")
    * "read:calendar.events" / "subscribe:calendar.events" (NOT "read:calendar")
  - IMPORTANT: If you declare an output port, you MUST also include "emit:portName" permission
  - "subscribe:<x>" is for DATA domains only (e.g. "subscribe:tasks.items"), never for ports. Input ports need no permission.
  - If the spec lists ports or permissions, they are a binding contract: use them exactly, never rename or retype them.
- ports: Array of objects with { name: string, direction: "in"|"out", schema: object }
  - If the user wish specifies exact port name and schema (e.g. name "open-count", schema {"type":"integer"}), use EXACTLY that name and schema.
- slotSize: Must be one of "small", "medium", or "large"

PORT SCHEMA RULES (so organs can be linked into chimeras):
- Keep port schemas simple and flat. Match the user's requested schema (e.g. {"type":"integer"} or {"type":"number"}).
- If user requests schema {"type":"integer"}, set schema: {"type":"integer"}.
- An "in" port schema must NOT list "required" fields beyond what a matching "out" port provides. Prefer no "required" on input schemas unless requested.
- Use the exact port name from the wish or spec.

EXAMPLE: If you have ports: [{name: "count", direction: "out", schema: {type: "integer"}}]
Then you MUST include "emit:count" in the permissions array.

EXAMPLE: If you need to read task data, use "read:tasks.items" (NOT "read:tasks").

IMPORTANT: Respond with valid JSON matching the schema exactly.`;

/**
 * Normalize a JSON schema for OpenAI strict `response_format` mode.
 *
 * ONLY the root object node is constrained (additionalProperties:false +
 * every property required); nested nodes pass through verbatim. Verified
 * live against the NVIDIA Integrate API: constraining nested objects that
 * contain free-form ({}) property schemas makes the grammar backend fail
 * with "Grammar error: schema must be an object or boolean", returned as a
 * silent error chunk inside a 200 stream (observed as empty content). The
 * immune system stays the authoritative bundle gate; nested schemas are
 * soft guidance for the model.
 */
function makeStrictJsonSchema(schema: unknown): object {
  if (Array.isArray(schema)) {
    return schema.map(item => makeStrictJsonSchema(item));
  }
  if (typeof schema !== 'object' || schema === null) {
    return schema as object;
  }

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schema as Record<string, unknown>)) {
    if (key === 'required' || key === 'additionalProperties') {
      continue; // recomputed below for the root node only
    }
    out[key] = value; // nested nodes verbatim (see doc comment)
  }

  if (out.properties && typeof out.properties === 'object') {
    const props = out.properties as Record<string, unknown>;
    out.additionalProperties = false;
    out.required = Object.keys(props);
  }

  return out;
}

// JSON Schema for spec generation
const SPEC_SCHEMA = {
  type: "object",
  properties: {
    organName: { type: "string" },
    requirements: { type: "string" },
    design: { type: "string" },
    // Port contract named by the wish (empty when none). Authoritative after build.
    ports: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          direction: { type: "string", enum: ["in", "out"] },
          schema: { type: "object" }
        },
        required: ["name", "direction", "schema"]
      }
    },
    permissions: { type: "array", items: { type: "string" } }
  },
  required: ["organName", "requirements", "design", "ports", "permissions"]
};

// JSON Schema for organ bundle
// Must match immune system expectations in packages/immune/src/manifest/schemas.ts
const BUNDLE_SCHEMA = {
  type: "object",
  properties: {
    manifest: {
      type: "object",
      properties: {
        name: { type: "string" },
        version: { type: "string" },
        apiVersion: { type: "string" },
        permissions: {
          type: "array",
          // Must match immune system: (read|emit|subscribe):<target>
          // Valid read targets: mood.entries, tasks.items, habits.checkins, calendar.events
          items: { type: "string", pattern: "^(read|emit|subscribe):.+$" }
        },
        ports: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              direction: { type: "string", enum: ["in", "out"] },
              schema: { type: "object" }
            },
            required: ["name", "direction", "schema"]
          }
        },
        slotSize: { type: "string", enum: ["small", "medium", "large"] }
      },
      required: ["name", "version", "apiVersion", "permissions", "slotSize"]
    },
    indexHtml: { type: "string" },
    properties: { type: "string" }
  },
  required: ["manifest", "indexHtml"]
};

const SYSTEM_PROMPT_REPAIR = `You are the Doctor, repairing a rejected organ.

Given the organ bundle and rejection report, fix the issues.

CRITICAL RULES FOR PERMISSIONS:
- Read permissions MUST use EXACTLY these domain names:
  * "read:mood.entries" (NOT "read:mood")
  * "read:tasks.items" (NOT "read:tasks")
  * "read:habits.checkins" (NOT "read:habits")
  * "read:calendar.events" (NOT "read:calendar")
- If you have output ports, you MUST include "emit:portName" permission for each one

CRITICAL INITIALIZATION PATTERN:
- The organ MUST wait for the 'init' message from the host before calling nerve.read() or nerve.subscribe()
- NEVER call nerve.read() or nerve.subscribe() at the top level of the script (before receiving init)
- Correct pattern: listen for 'init' message, then call nerve.read()

If the rejection says "Invalid read target", change "read:tasks" to "read:tasks.items".
If the rejection says "requires emit:XXX permission", add "emit:XXX" to the permissions array.
If the rejection says "Read timeout", ensure the organ waits for 'init' message before calling nerve.read().`;

const SYSTEM_PROMPT_HEAL = `You are the Doctor, healing a decayed organ.

Given the organ bundle and decay report, update it for compatibility.
Respond with the corrected organ bundle JSON.`;

// ============================================================================
// LLM Provider
// ============================================================================

/**
 * LLM Doctor Provider
 *
 * Makes live LLM API calls to generate organs from wishes.
 */
export class LLMDoctorProvider implements DoctorProvider {
  readonly name: string;
  readonly type = 'llm' as const;

  private baseUrl: string;
  private apiKey: string | undefined;
  private model: string;
  private maxTokens: number;
  private temperature: number;
  private timeoutMs: number;

  constructor(config: LLMConfig = {}) {
    this.baseUrl = (config.baseUrl ?? process.env.LLM_BASE_URL ?? 'https://integrate.api.nvidia.com/v1').replace(/\/+$/, '');
    this.apiKey = config.apiKey ?? process.env.LLM_API_KEY;
    this.model = config.model ?? process.env.DOCTOR_MODEL ?? 'nvidia/nemotron-3.5-bolt-e4b';
    this.maxTokens = config.maxTokens ?? 4096;
    this.temperature = config.temperature ?? 0.7;
    this.timeoutMs = config.timeoutMs ?? 120000;

    this.name = `llm:${this.model}`;
  }

  /**
   * Check if the provider is configured (has API key).
   */
  isConfigured(): boolean {
    return typeof this.apiKey === 'string' && this.apiKey.length > 0;
  }

  /**
   * Make a chat completion request to the LLM API.
   */
  private async chat(
    messages: ChatMessage[],
    stream: boolean = true,
    jsonSchema?: object,
    schemaName: string = 'GraftStructured'
  ): Promise<AsyncIterable<string>> {
    if (!this.isConfigured()) {
      throw new Error('LLM_API_KEY not configured. Set LLM_API_KEY environment variable.');
    }

    const body: any = {
      model: this.model,
      messages,
      max_tokens: this.maxTokens,
      temperature: this.temperature,
      stream,
    };

    // Structured output via the standard OpenAI `response_format` JSON-schema
    // mode (verified live against the hosted NVIDIA Integrate API: guided_json
    // and nvext are rejected there, response_format works, streamed and not).
    // enable_thinking:false keeps reasoning traces out of the content stream.
    if (jsonSchema) {
      body.response_format = {
        type: 'json_schema',
        json_schema: {
          name: schemaName.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64) || 'GraftStructured',
          strict: true,
          schema: makeStrictJsonSchema(jsonSchema),
        },
      };
      // NVIDIA-specific; other OpenAI-compatible gateways (e.g. Gemini) reject unknown fields.
      if (this.baseUrl.includes('nvidia.com')) {
        body.chat_template_kwargs = { enable_thinking: false };
      }
      // Gemini 3 models think by default and `max_tokens` includes the
      // thought budget: with low effort the stream never stalls in a long
      // thought pause and the JSON payload keeps room to finish.
      if (this.baseUrl.includes('generativelanguage.googleapis.com')) {
        body.reasoning_effort = 'low';
        body.max_tokens = Math.max(this.maxTokens, 16384);
      }
    }

    const startedAt = Date.now();
    console.log(
      `[llm] request start model=${this.model} stream=${stream} schema=${jsonSchema ? schemaName : 'none'}`
    );

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
      // Bound the request (including the streamed read) so a hung API cannot
      // stall the SSE endpoint forever.
      signal: AbortSignal.timeout(this.timeoutMs),
    }).catch(error => {
      console.log(`[llm] request failed after ${Date.now() - startedAt}ms: ${error}`);
      throw error;
    });

    console.log(`[llm] response status=${response.status} after ${Date.now() - startedAt}ms`);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LLM API error (${response.status}): ${errorText}`);
    }

    if (!stream) {
      const data = (await response.json()) as ChatCompletionResponse;
      const content = data.choices[0]?.message?.content ?? '';
      console.log(
        `[llm] non-streamed body received: ${content.length} chars after ${Date.now() - startedAt}ms`
      );
      return this.singleToAsyncIterable(content);
    }

    console.log(`[llm] streaming body after ${Date.now() - startedAt}ms`);
    return this.parseStream(response);
  }

  /**
   * Parse SSE stream from LLM API.
   */
  private async *parseStream(response: Response): AsyncIterable<string> {
    if (!response.body) {
      throw new Error('Response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let chunkCount = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log(`[llm] stream finished: ${chunkCount} content chunks`);
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          // SSE comments (": keep-alive") and event names carry no data.
          if (!trimmed.startsWith('data:')) continue;

          const data = trimmed.slice(5).trim();
          if (!data || data === '[DONE]') {
            if (data === '[DONE]') return;
            continue;
          }

          try {
            const chunk = JSON.parse(data) as StreamChunk & { error?: unknown };
            // Some gateways deliver in-band errors inside a 200 SSE stream
            // (observed on NVIDIA: grammar failures arrive as
            // {"error": {...}} chunks). Surface them instead of yielding an
            // empty result.
            if (chunk.error) {
              throw new Error(
                `LLM stream error: ${typeof chunk.error === 'string' ? chunk.error : JSON.stringify(chunk.error)}`
              );
            }
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              chunkCount++;
              yield content;
            }
          } catch (e) {
            if (e instanceof Error && e.message.startsWith('LLM stream error:')) {
              throw e; // re-throw deliberate stream errors
            }
            // Skip malformed chunks
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Convert single response to async iterable.
   */
  private async *singleToAsyncIterable(content: string): AsyncIterable<string> {
    yield content;
  }

  /**
   * Parse JSON from LLM response, handling markdown code blocks and
   * reasoning ("think") blocks that thinking models inline in their content.
   */
  private parseJsonFromResponse(content: string): unknown {
    // Strip reasoning traces emitted by thinking models (<think>...</think>)
    let cleaned = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    // An unterminated <think> block (stream cut) is discarded as well.
    const openThink = cleaned.toLowerCase().lastIndexOf('<think>');
    if (openThink !== -1) {
      cleaned = cleaned.slice(0, openThink).trim();
    }

    // Remove markdown code blocks if present
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.slice(7);
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.slice(3);
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, -3);
    }
    cleaned = cleaned.trim();

    try {
      return JSON.parse(cleaned);
    } catch {
      // Fallback: the model wrapped the JSON in prose - take the outermost
      // JSON object span and retry.
      const start = cleaned.indexOf('{');
      const end = cleaned.lastIndexOf('}');
      if (start !== -1 && end > start) {
        return JSON.parse(cleaned.slice(start, end + 1));
      }
      throw new Error(
        `LLM response is not valid JSON: ${cleaned.slice(0, 200)}${cleaned.length > 200 ? '…' : ''}`
      );
    }
  }

  /**
   * Collect stream into a string.
   */
  private async collectStream(stream: AsyncIterable<string>): Promise<string> {
    let result = '';
    for await (const chunk of stream) {
      result += chunk;
    }
    return result;
  }

  /**
   * Create a timestamp for events.
   */
  private now(): number {
    return Date.now();
  }

  // ============================================================================
  // DoctorProvider Interface
  // ============================================================================

  async *proposeSpec(wish: string, anatomy: Anatomy): AsyncIterable<DoctorEvent> {
    console.log('[llm] proposeSpec() generator started');
    if (!this.isConfigured()) {
      yield {
        type: 'error',
        timestamp: this.now(),
        data: {
          message: 'LLM_API_KEY not configured. Set LLM_API_KEY environment variable.',
          code: 'MISSING_API_KEY',
        },
      };
      return;
    }

    const anatomyContext = JSON.stringify(anatomy, null, 2);
    const specMessages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT_SPEC },
      { role: 'user', content: `User wish: "${wish}"\n\nAnatomy context:\n${anatomyContext}` },
    ];

    yield {
      type: 'assumption',
      timestamp: this.now(),
      data: {
        message: `Analyzing wish: "${wish}"`,
      },
    };

    try {
      // Use structured output with JSON schema
      const stream = await this.chat(specMessages, true, SPEC_SCHEMA, 'GraftSpec');

      yield {
        type: 'spec-start',
        timestamp: this.now(),
        data: {},
      };

      let fullContent = '';
      for await (const chunk of stream) {
        fullContent += chunk;
        yield {
          type: 'spec-section',
          timestamp: this.now(),
          data: {
            partial: chunk,
          },
        };
      }

      // Parse the spec. Gemini's streaming endpoint sometimes drops the
      // tail of the response (mid-JSON, no finish_reason/[DONE]), so a
      // failed parse falls back to a non-streamed request (reliable).
      let parsed: {
        organName?: string;
        requirements?: string;
        design?: string;
        ports?: unknown;
        permissions?: unknown;
      };
      try {
        parsed = this.parseJsonFromResponse(fullContent) as NonNullable<typeof parsed>;
      } catch (parseError) {
        console.log(
          `[llm] spec stream unusable (${fullContent.length} chars: ${
            parseError instanceof Error ? parseError.message : parseError
          }) - retrying non-streamed`
        );
        const fallback = await this.chat(specMessages, false, SPEC_SCHEMA, 'GraftSpec');
        fullContent = await this.collectStream(fallback);
        parsed = this.parseJsonFromResponse(fullContent) as NonNullable<typeof parsed>;
      }

      yield {
        type: 'spec-section',
        timestamp: this.now(),
        data: {
          section: 'requirements',
          content: parsed.requirements ?? '',
        },
      };

      yield {
        type: 'spec-complete',
        timestamp: this.now(),
        data: {
          spec: {
            name: parsed.organName ?? 'unnamed-organ',
            requirements: parsed.requirements ?? '',
            design: parsed.design ?? '',
            ports: normalizePorts(parsed.ports),
            permissions: normalizePermissions(parsed.permissions),
          },
        },
      };
    } catch (error) {
      yield {
        type: 'error',
        timestamp: this.now(),
        data: {
          message: error instanceof Error ? error.message : 'Unknown error during spec proposal',
          code: 'SPEC_ERROR',
        },
      };
    }
  }

  async *build(spec: Spec, anatomy: Anatomy): AsyncIterable<DoctorEvent> {
    console.log('[llm] build() generator started');
    if (!this.isConfigured()) {
      yield {
        type: 'error',
        timestamp: this.now(),
        data: {
          message: 'LLM_API_KEY not configured.',
          code: 'MISSING_API_KEY',
        },
      };
      return;
    }

    yield {
      type: 'build-start',
      timestamp: this.now(),
      data: {},
    };

    try {
      // Use structured output with JSON schema
      const buildMessages: ChatMessage[] = [
        { role: 'system', content: SYSTEM_PROMPT_BUILD },
        {
          role: 'user',
          content: `Build an organ from this spec:\n\nName: ${spec.name}\n\nRequirements:\n${spec.requirements}\n\nDesign:\n${spec.design}\n\nPort contract (binding, use exactly):\n${JSON.stringify({ ports: spec.ports ?? [], permissions: spec.permissions ?? [] })}\n\nAnatomy context:\n${JSON.stringify(anatomy, null, 2)}`,
        },
      ];
      const stream = await this.chat(buildMessages, true, BUNDLE_SCHEMA, 'GraftOrganBundle');

      yield {
        type: 'build-progress',
        timestamp: this.now(),
        data: { step: 'Generating organ code...', progress: 10 },
      };

      let fullContent = '';
      for await (const chunk of stream) {
        fullContent += chunk;
      }

      yield {
        type: 'build-progress',
        timestamp: this.now(),
        data: { step: 'Parsing organ bundle...', progress: 80 },
      };

      // Same streamed-truncation fallback as proposeSpec: a cut stream
      // yields unparseable JSON, so retry once non-streamed.
      let parsed: {
        manifest?: OrganBundle['manifest'];
        indexHtml?: string;
        properties?: string;
      };
      try {
        parsed = this.parseJsonFromResponse(fullContent) as NonNullable<typeof parsed>;
      } catch (parseError) {
        console.log(
          `[llm] build stream unusable (${fullContent.length} chars: ${
            parseError instanceof Error ? parseError.message : parseError
          }) - retrying non-streamed`
        );
        const fallback = await this.chat(buildMessages, false, BUNDLE_SCHEMA, 'GraftOrganBundle');
        fullContent = await this.collectStream(fallback);
        parsed = this.parseJsonFromResponse(fullContent) as NonNullable<typeof parsed>;
      }

      // The spec's port contract is authoritative over whatever the model wrote.
      const bundle: OrganBundle = applyContract(
        {
          manifest: parsed.manifest ?? {
            name: spec.name,
            version: '1.0.0',
            apiVersion: anatomy.apiVersion,
            permissions: [],
            ports: [],
            slotSize: 'medium',
          },
          indexHtml: parsed.indexHtml ?? '',
          properties: parsed.properties,
          spec: `${spec.requirements}\n\n${spec.design}`,
        },
        spec
      );

      yield {
        type: 'build-complete',
        timestamp: this.now(),
        data: { bundle },
      };
    } catch (error) {
      yield {
        type: 'error',
        timestamp: this.now(),
        data: {
          message: error instanceof Error ? error.message : 'Unknown error during build',
          code: 'BUILD_ERROR',
        },
      };
    }
  }

  async *repair(bundle: OrganBundle, report: RejectionReport): AsyncIterable<DoctorEvent> {
    console.log('[llm] repair() generator started');
    if (!this.isConfigured()) {
      yield {
        type: 'error',
        timestamp: this.now(),
        data: {
          message: 'LLM_API_KEY not configured.',
          code: 'MISSING_API_KEY',
        },
      };
      return;
    }

    yield {
      type: 'repair-start',
      timestamp: this.now(),
      data: { report },
    };

    try {
      // Use structured output for repair too
      const stream = await this.chat(
        [
          { role: 'system', content: SYSTEM_PROMPT_REPAIR + '\n\nIMPORTANT: Respond with valid JSON matching the organ bundle schema exactly.' },
          {
            role: 'user',
            content: `Repair this organ:\n\nBundle:\n${JSON.stringify(bundle, null, 2)}\n\nRejection report:\n${JSON.stringify(report, null, 2)}`,
          },
        ],
        true, // Stream for better UX
        BUNDLE_SCHEMA, // Use the same schema as build
        'GraftOrganBundle'
      );

      let fullContent = '';
      for await (const chunk of stream) {
        fullContent += chunk;
      }

      const parsed = this.parseJsonFromResponse(fullContent) as Partial<OrganBundle>;

      // Repair may change code and permissions, never the port contract.
      const repairedBundle: OrganBundle = applyContract(
        {
          manifest: parsed.manifest ?? bundle.manifest,
          indexHtml: parsed.indexHtml ?? bundle.indexHtml,
          properties: parsed.properties ?? bundle.properties,
          spec: parsed.spec ?? bundle.spec,
        },
        { ports: bundle.manifest.ports }
      );

      yield {
        type: 'repair-complete',
        timestamp: this.now(),
        data: { bundle: repairedBundle },
      };
    } catch (error) {
      yield {
        type: 'error',
        timestamp: this.now(),
        data: {
          message: error instanceof Error ? error.message : 'Unknown error during repair',
          code: 'REPAIR_ERROR',
        },
      };
    }
  }

  async *heal(bundle: OrganBundle, decay: DecayReport): AsyncIterable<DoctorEvent> {
    if (!this.isConfigured()) {
      yield {
        type: 'error',
        timestamp: this.now(),
        data: {
          message: 'LLM_API_KEY not configured.',
          code: 'MISSING_API_KEY',
        },
      };
      return;
    }

    yield {
      type: 'assumption',
      timestamp: this.now(),
      data: {
        message: `Healing decayed organ: ${decay.organId}`,
      },
    };

    try {
      const stream = await this.chat([
        { role: 'system', content: SYSTEM_PROMPT_HEAL },
        {
          role: 'user',
          content: `Heal this organ:\n\nBundle:\n${JSON.stringify(bundle, null, 2)}\n\nDecay report:\n${JSON.stringify(decay, null, 2)}`,
        },
      ], false);

      const fullContent = await this.collectStream(stream);
      const parsed = this.parseJsonFromResponse(fullContent) as Partial<OrganBundle>;

      const healedBundle: OrganBundle = applyContract(
        {
          manifest: parsed.manifest ?? bundle.manifest,
          indexHtml: parsed.indexHtml ?? bundle.indexHtml,
          properties: parsed.properties ?? bundle.properties,
          spec: parsed.spec ?? bundle.spec,
        },
        { ports: bundle.manifest.ports }
      );

      yield {
        type: 'build-complete',
        timestamp: this.now(),
        data: { bundle: healedBundle },
      };
    } catch (error) {
      yield {
        type: 'error',
        timestamp: this.now(),
        data: {
          message: error instanceof Error ? error.message : 'Unknown error during healing',
          code: 'HEAL_ERROR',
        },
      };
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create an LLM Doctor provider.
 */
export function createLLMProvider(config: LLMConfig = {}): DoctorProvider {
  return new LLMDoctorProvider(config);
}
