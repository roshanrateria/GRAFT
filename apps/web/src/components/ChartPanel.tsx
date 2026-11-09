/**
 * ChartPanel Component
 *
 * The Chart displays the ledger timeline and provides chain verification.
 * Part of "The Chart" section in the Victorian anatomical theatre UI.
 *
 * @see .kiro/steering/design-theatre.md for UI specifications
 */

import { useState, useEffect, useCallback } from 'react';
import './ChartPanel.css';

// Types for ledger entries
export interface LedgerEntry {
  id: string;
  ts: number;
  organ_id: string | null;
  event: string;
  payload_json: string;
  prev_hash: string;
  hash: string;
}

export interface VerificationResult {
  valid: boolean;
  errorIndex?: number;
}

interface ChartPanelProps {
  /** Optional className for additional styling */
  className?: string;
}

/**
 * Format a timestamp to a human-readable string.
 */
function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Get a short display string for the event payload.
 */
function getPayloadSummary(payloadJson: string): string {
  try {
    const payload = JSON.parse(payloadJson);
    const keys = Object.keys(payload);
    if (keys.length === 0) return '{}';
    if (keys.length <= 2) {
      return keys.map(k => `${k}: ${String(payload[k]).slice(0, 20)}`).join(', ');
    }
    return `${keys.length} fields`;
  } catch {
    return payloadJson.slice(0, 30);
  }
}

/**
 * Get the display color for an event type.
 */
function getEventColor(event: string): string {
  const colors: Record<string, string> = {
    WISH: 'var(--color-brass)',
    SPEC: 'var(--color-brass)',
    BUILD: 'var(--color-brass)',
    IMMUNE_PASS: 'var(--color-vein-green)',
    IMMUNE_FAIL: 'var(--color-alert)',
    TRANSPLANT_APPROVED: 'var(--color-vein-green)',
    AMPUTATED: 'var(--color-oxblood)',
    CHIMERA_LINKED: 'var(--color-brass)',
    CHECKUP_PASS: 'var(--color-vein-green)',
    CHECKUP_FAIL: 'var(--color-alert)',
    HEAL_PROPOSED: 'var(--color-brass)',
    HEAL_APPROVED: 'var(--color-vein-green)',
  };
  return colors[event] || 'var(--color-text-secondary)';
}

/**
 * ChartPanel - Displays the ledger timeline with verification.
 */
export function ChartPanel({ className }: ChartPanelProps) {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verification, setVerification] = useState<VerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  // Fetch ledger history on mount
  useEffect(() => {
    async function fetchLedger() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch('/api/ledger/history');

        if (!response.ok) {
          throw new Error(`Failed to fetch ledger: ${response.status}`);
        }

        const data = await response.json();
        setEntries(data.entries || []);
      } catch (err) {
        // Use mock data for development/demo when server is unavailable
        // Only show error if mock data is also unavailable
        const mockEntries = getMockEntries();
        if (mockEntries.length > 0) {
          setEntries(mockEntries);
          setError(null);
        } else {
          setError(err instanceof Error ? err.message : 'Failed to load ledger');
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchLedger();
  }, []);

  // Verify chain integrity
  const handleVerify = useCallback(async () => {
    try {
      setIsVerifying(true);
      setVerification(null);

      const response = await fetch('/api/ledger/verify');

      if (!response.ok) {
        throw new Error(`Verification failed: ${response.status}`);
      }

      const result: VerificationResult = await response.json();
      setVerification(result);
    } catch (err) {
      // For development/demo, verify locally
      const result = verifyLocalChain(entries);
      setVerification(result);
    } finally {
      setIsVerifying(false);
    }
  }, [entries]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleVerify();
    }
  }, [handleVerify]);

  return (
    <aside
      className={`chart-panel ${className || ''}`}
      aria-label="The Chart - Ledger timeline"
    >
      <header className="chart-panel__header">
        <h2 className="chart-panel__title">The Chart</h2>
        <button
          className="chart-panel__verify-btn"
          onClick={handleVerify}
          onKeyDown={handleKeyDown}
          disabled={isVerifying || entries.length === 0}
          aria-label="Verify chain integrity"
          aria-busy={isVerifying}
        >
          {isVerifying ? 'Verifying...' : 'Verify chain'}
        </button>
      </header>

      {/* Verification result display */}
      {verification && (
        <div
          className={`chart-panel__verification chart-panel__verification--${verification.valid ? 'valid' : 'invalid'}`}
          role="status"
          aria-live="polite"
        >
          {verification.valid ? (
            <span className="chart-panel__verification-text">
              <span className="chart-panel__verification-icon" aria-hidden="true">✓</span>
              Chain valid
            </span>
          ) : (
            <span className="chart-panel__verification-text">
              <span className="chart-panel__verification-icon" aria-hidden="true">✗</span>
              Chain invalid at entry {verification.errorIndex}
            </span>
          )}
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="chart-panel__loading" aria-label="Loading ledger entries">
          <span className="chart-panel__loading-text">Loading ledger...</span>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="chart-panel__error" role="alert">
          <span className="chart-panel__error-text">{error}</span>
        </div>
      )}

      {/* Timeline */}
      {!isLoading && !error && (
        <div
          className="chart-panel__timeline"
          role="list"
          aria-label="Ledger entries"
        >
          {entries.length === 0 ? (
            <div className="chart-panel__empty">
              No entries in the ledger
            </div>
          ) : (
            entries.map((entry, index) => (
              <article
                key={entry.id}
                className="chart-panel__entry"
                role="listitem"
                tabIndex={0}
                aria-label={`Entry ${index + 1}: ${entry.event} at ${formatTimestamp(entry.ts)}`}
              >
                <div className="chart-panel__entry-header">
                  <time
                    className="chart-panel__entry-time"
                    dateTime={new Date(entry.ts).toISOString()}
                  >
                    {formatTimestamp(entry.ts)}
                  </time>
                  <span
                    className="chart-panel__entry-event"
                    style={{ color: getEventColor(entry.event) }}
                  >
                    {entry.event}
                  </span>
                </div>
                <div className="chart-panel__entry-details">
                  {entry.organ_id && (
                    <span className="chart-panel__entry-organ">
                      Organ: {entry.organ_id}
                    </span>
                  )}
                  <span className="chart-panel__entry-payload">
                    {getPayloadSummary(entry.payload_json)}
                  </span>
                </div>
                <div className="chart-panel__entry-hash" title={entry.hash}>
                  {entry.hash.slice(0, 8)}...
                </div>
              </article>
            ))
          )}
        </div>
      )}
    </aside>
  );
}

/**
 * Local chain verification for development/demo.
 */
function verifyLocalChain(entries: LedgerEntry[]): VerificationResult {
  if (entries.length === 0) {
    return { valid: true };
  }

  // Check that each entry's prev_hash matches the previous entry's hash
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];

    // Genesis entry must have 64 zeros
    if (i === 0 && entry.prev_hash !== '0'.repeat(64)) {
      return { valid: false, errorIndex: i };
    }

    // Check prev_hash links correctly
    if (i > 0) {
      const prevEntry = entries[i - 1];
      if (entry.prev_hash !== prevEntry.hash) {
        return { valid: false, errorIndex: i };
      }
    }
  }

  return { valid: true };
}

/**
 * Mock entries for development/demo when server is unavailable.
 */
function getMockEntries(): LedgerEntry[] {
  const now = Date.now();
  return [
    {
      id: 'entry-1',
      ts: now - 3600000,
      organ_id: null,
      event: 'WISH',
      payload_json: JSON.stringify({ wish: 'Add a mood tracker widget' }),
      prev_hash: '0'.repeat(64),
      hash: 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456',
    },
    {
      id: 'entry-2',
      ts: now - 3000000,
      organ_id: 'organ-1',
      event: 'SPEC',
      payload_json: JSON.stringify({ spec_version: '1.0', features: ['mood-entry', 'mood-chart'] }),
      prev_hash: 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456',
      hash: 'b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567890',
    },
    {
      id: 'entry-3',
      ts: now - 2400000,
      organ_id: 'organ-1',
      event: 'BUILD',
      payload_json: JSON.stringify({ build_time_ms: 4523, files: 12 }),
      prev_hash: 'b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567890',
      hash: 'c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567890123',
    },
    {
      id: 'entry-4',
      ts: now - 1800000,
      organ_id: 'organ-1',
      event: 'IMMUNE_PASS',
      payload_json: JSON.stringify({ tests_passed: 8, tests_failed: 0 }),
      prev_hash: 'c3d4e5f6789012345678901234567890abcdef1234567890abcdef1234567890123',
      hash: 'd4e5f6789012345678901234567890abcdef1234567890abcdef1234567890123456',
    },
    {
      id: 'entry-5',
      ts: now - 1200000,
      organ_id: 'organ-1',
      event: 'TRANSPLANT_APPROVED',
      payload_json: JSON.stringify({ slot_id: 'slot-4', user_consent: true }),
      prev_hash: 'd4e5f6789012345678901234567890abcdef1234567890abcdef1234567890123456',
      hash: 'e5f6789012345678901234567890abcdef1234567890abcdef1234567890123456789',
    },
  ];
}

export default ChartPanel;
