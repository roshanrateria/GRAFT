/**
 * LLM Doctor Provider
 *
 * Makes direct HTTP calls to an LLM API (OpenAI-compatible).
 * Configured by LLM_BASE_URL, LLM_API_KEY, and DOCTOR_MODEL environment variables.
 *
 * Implements DOC-02: Provider-agnostic LLM wrapper.
 */
import type { DoctorProvider, DoctorEvent, OrganBundle, Anatomy, Spec, RejectionReport, DecayReport } from '../types.js';
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
/**
 * LLM Doctor Provider
 *
 * Makes live LLM API calls to generate organs from wishes.
 */
export declare class LLMDdoctorProvider implements DoctorProvider {
    readonly name: string;
    readonly type: "llm";
    private baseUrl;
    private apiKey;
    private model;
    private maxTokens;
    private temperature;
    constructor(config?: LLMConfig);
    /**
     * Check if the provider is configured (has API key).
     */
    isConfigured(): boolean;
    /**
     * Make a chat completion request to the LLM API.
     */
    private chat;
    /**
     * Parse SSE stream from LLM API.
     */
    private parseStream;
    /**
     * Convert single response to async iterable.
     */
    private singleToAsyncIterable;
    /**
     * Parse JSON from LLM response, handling markdown code blocks.
     */
    private parseJsonFromResponse;
    /**
     * Collect stream into a string.
     */
    private collectStream;
    /**
     * Create a timestamp for events.
     */
    private now;
    proposeSpec(wish: string, anatomy: Anatomy): AsyncIterable<DoctorEvent>;
    build(spec: Spec, anatomy: Anatomy): AsyncIterable<DoctorEvent>;
    repair(bundle: OrganBundle, report: RejectionReport): AsyncIterable<DoctorEvent>;
    heal(bundle: OrganBundle, decay: DecayReport): AsyncIterable<DoctorEvent>;
}
/**
 * Create an LLM Doctor provider.
 */
export declare function createLLMProvider(config?: LLMConfig): DoctorProvider;
//# sourceMappingURL=llm.d.ts.map