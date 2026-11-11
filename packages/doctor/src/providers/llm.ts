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

// ============================================================================
// LLM Configuration
// ============================================================================

/** Configuration for LLM provider */
export interface LLMConfig {
  /** LLM API base URL (defaults to OpenAI) */
  baseUrl?: string;
  /** API key for authentication */
  apiKey?: string;
  /** Model identifier */
  model?: string;
  /** Maximum tokens for responses */
  maxTokens?: number;
  /** Temperature for generation */
  temperature?: number;
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

Tags: [EX] for examples, [PBT] for property-based tests, [A11Y] for accessibility.

IMPORTANT: Respond with valid JSON matching the schema exactly.`;

const SYSTEM_PROMPT_BUILD = `You are the Doctor, building organ code from a spec.

Produce a complete organ bundle with:
1. manifest (name, version, apiVersion, permissions, ports, slotSize)
2. indexHtml (the organ's UI with embedded JS using Nerve API)
3. properties (fast-check property tests for [PBT] requirements, optional)

The index.html must:
- Use only the Nerve API (nerve.read(), nerve.emit(), nerve.now(), nerve.random())
- Never access network, storage, cookies, or parent DOM
- Be a complete, self-contained HTML file
- Use inline <script> tags only (no external script src)

Manifest requirements:
- permissions: Array of strings in format "read:domain" or "emit:portName" or "subscribe:portName"
  - CRITICAL: Read permissions MUST use EXACTLY these domain names:
    * "read:mood.entries" (NOT "read:mood")
    * "read:tasks.items" (NOT "read:tasks")
    * "read:habits.checkins" (NOT "read:habits")
    * "read:calendar.events" (NOT "read:calendar")
  - IMPORTANT: If you declare an output port, you MUST also include "emit:portName" permission
- ports: Array of objects with { name: string, direction: "in"|"out", schema: object }
- slotSize: Must be one of "small", "medium", or "large"

EXAMPLE: If you have ports: [{name: "count", direction: "out", schema: {type: "integer"}}]
Then you MUST include "emit:count" in the permissions array.

EXAMPLE: If you need to read task data, use "read:tasks.items" (NOT "read:tasks").

IMPORTANT: Respond with valid JSON matching the schema exactly.`;

// JSON Schema for spec generation
const SPEC_SCHEMA = {
  type: "object",
  properties: {
    organName: { type: "string" },
    requirements: { type: "string" },
    design: { type: "string" }
  },
  required: ["organName", "requirements", "design"]
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

If the rejection says "Invalid read target", change "read:tasks" to "read:tasks.items".
If the rejection says "requires emit:XXX permission", add "emit:XXX" to the permissions array.`;

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
export class LLMDdoctorProvider implements DoctorProvider {
  readonly name: string;
  readonly type = 'llm' as const;

  private baseUrl: string;
  private apiKey: string | undefined;
  private model: string;
  private maxTokens: number;
  private temperature: number;

  constructor(config: LLMConfig = {}) {
    this.baseUrl = config.baseUrl ?? process.env.LLM_BASE_URL ?? 'https://api.openai.com/v1';
    this.apiKey = config.apiKey ?? process.env.LLM_API_KEY;
    this.model = config.model ?? process.env.DOCTOR_MODEL ?? 'deepseek-ai/deepseek-v4.1-flash';
    this.maxTokens = config.maxTokens ?? 4096;
    this.temperature = config.temperature ?? 0.7;

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
    jsonSchema?: object
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

    // Add structured output constraint if schema provided
    if (jsonSchema) {
      body.guided_json = jsonSchema;
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LLM API error (${response.status}): ${errorText}`);
    }

    if (!stream) {
      const data = (await response.json()) as ChatCompletionResponse;
      return this.singleToAsyncIterable(data.choices[0]?.message?.content ?? '');
    }

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

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data: ')) continue;

          const data = trimmed.slice(6);
          if (data === '[DONE]') return;

          try {
            const chunk = JSON.parse(data) as StreamChunk;
            const content = chunk.choices[0]?.delta?.content;
            if (content) yield content;
          } catch {
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
   * Parse JSON from LLM response, handling markdown code blocks.
   */
  private parseJsonFromResponse(content: string): unknown {
    // Remove markdown code blocks if present
    let cleaned = content.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.slice(7);
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.slice(3);
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.slice(0, -3);
    }
    cleaned = cleaned.trim();

    return JSON.parse(cleaned);
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

    yield {
      type: 'assumption',
      timestamp: this.now(),
      data: {
        message: `Analyzing wish: "${wish}"`,
      },
    };

    try {
      // Use structured output with JSON schema
      const stream = await this.chat(
        [
          { role: 'system', content: SYSTEM_PROMPT_SPEC },
          { role: 'user', content: `User wish: "${wish}"\n\nAnatomy context:\n${anatomyContext}` },
        ],
        true,
        SPEC_SCHEMA
      );

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

      // Parse the spec
      const parsed = this.parseJsonFromResponse(fullContent) as {
        organName?: string;
        requirements?: string;
        design?: string;
      };

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
      const stream = await this.chat(
        [
          { role: 'system', content: SYSTEM_PROMPT_BUILD },
          {
            role: 'user',
            content: `Build an organ from this spec:\n\nName: ${spec.name}\n\nRequirements:\n${spec.requirements}\n\nDesign:\n${spec.design}\n\nAnatomy context:\n${JSON.stringify(anatomy, null, 2)}`,
          },
        ],
        true,
        BUNDLE_SCHEMA
      );

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

      const parsed = this.parseJsonFromResponse(fullContent) as {
        manifest?: OrganBundle['manifest'];
        indexHtml?: string;
        properties?: string;
      };

      const bundle: OrganBundle = {
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
      };

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
        BUNDLE_SCHEMA // Use the same schema as build
      );

      let fullContent = '';
      for await (const chunk of stream) {
        fullContent += chunk;
      }

      const parsed = this.parseJsonFromResponse(fullContent) as Partial<OrganBundle>;

      const repairedBundle: OrganBundle = {
        manifest: parsed.manifest ?? bundle.manifest,
        indexHtml: parsed.indexHtml ?? bundle.indexHtml,
        properties: parsed.properties ?? bundle.properties,
        spec: parsed.spec ?? bundle.spec,
      };

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

      const healedBundle: OrganBundle = {
        manifest: parsed.manifest ?? bundle.manifest,
        indexHtml: parsed.indexHtml ?? bundle.indexHtml,
        properties: parsed.properties ?? bundle.properties,
        spec: parsed.spec ?? bundle.spec,
      };

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
  return new LLMDdoctorProvider(config);
}
