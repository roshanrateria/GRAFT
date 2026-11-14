/**
 * Fetch-based LedgerService for the browser.
 *
 * The browser cannot hash with node:crypto, so all hashing and chain
 * validation happen server-side: append delegates to POST /api/ledger/append,
 * which resolves prev_hash from the authoritative chain and computes the
 * SHA-256 link hash.
 */

import type { Entry, LedgerService } from '@graft/ledger';

export interface FetchLedgerServiceOptions {
  /** API base URL (defaults to same-origin /api) */
  baseUrl?: string;
  /** Custom fetch implementation (for tests) */
  fetchImpl?: typeof fetch;
}

/** Append request body sent to the server */
interface LedgerAppendRequest {
  id: string;
  organ_id: string | null;
  event: string;
  payload_json: string;
}

/**
 * LedgerService implementation that talks to the GRAFT server.
 * LED-02: append failures throw so callers can fail closed before mutating
 * state.
 */
export class FetchLedgerService implements LedgerService {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: FetchLedgerServiceOptions = {}) {
    this.baseUrl = options.baseUrl ?? '/api';
    this.fetchImpl = options.fetchImpl ?? fetch.bind(globalThis);
  }

  async append(entry: Omit<Entry, 'hash'>): Promise<Entry> {
    const body: LedgerAppendRequest = {
      id: entry.id,
      organ_id: entry.organ_id,
      event: entry.event,
      payload_json: entry.payload_json,
    };

    const response = await this.fetchImpl(`${this.baseUrl}/ledger/append`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`Ledger append failed (${response.status}): ${detail}`);
    }

    const data = (await response.json()) as { entry: Entry };
    if (!data?.entry?.hash) {
      throw new Error('Ledger append returned no entry hash');
    }
    return data.entry;
  }

  async verify(): Promise<{ valid: boolean; errorIndex?: number }> {
    const response = await this.fetchImpl(`${this.baseUrl}/ledger/verify`);
    if (!response.ok) {
      throw new Error(`Ledger verify failed (${response.status})`);
    }
    return (await response.json()) as { valid: boolean; errorIndex?: number };
  }

  async getHistory(organId?: string): Promise<Entry[]> {
    const query = organId ? `?organId=${encodeURIComponent(organId)}` : '';
    const response = await this.fetchImpl(`${this.baseUrl}/ledger/history${query}`);
    if (!response.ok) {
      throw new Error(`Ledger history failed (${response.status})`);
    }
    const data = (await response.json()) as { entries: Entry[] };
    return data?.entries ?? [];
  }
}

/**
 * Create a fetch-backed ledger service for the browser.
 */
export function createFetchLedgerService(
  options?: FetchLedgerServiceOptions
): FetchLedgerService {
  return new FetchLedgerService(options);
}
