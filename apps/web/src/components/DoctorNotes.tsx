/**
 * DoctorNotes Component
 *
 * The left panel of the Theatre UI.
 * Displays wish input, streaming spec, properties, and build progress.
 * Includes passcode input for live Doctor mode and the transplant consent
 * flow (organ preview -> consent -> ledger-first transplant).
 *
 * @see .kiro/steering/design-theatre.md for UI specifications
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { OrganBundle } from '@graft/immune';
import { ConsentDialog } from './ConsentDialog';
import type { StageName } from './StageGauge';
import { useCreatureStore } from '../stores/creatureStore';
import { getTransplantCoordinator } from '../TransplantService';
import './DoctorNotes.css';

interface Assumption {
  id: string;
  text: string;
  status: 'pending' | 'confirmed' | 'rejected';
}

interface LiveSession {
  token: string;
  expiresAt: number;
  wishCount: number;
}

/** Pending consent shown in the ConsentDialog */
interface PendingConsent {
  organName: string;
  organVersion: string;
  description?: string;
  passedStages: StageName[];
  permissions: string[];
  bundle: OrganBundle;
}

interface DoctorNotesProps {
  /** Optional className for additional styling */
  className?: string;
}

/**
 * DoctorNotes - The left panel for wish input and Doctor's work.
 */
export function DoctorNotes({ className }: DoctorNotesProps) {
  const [wish, setWish] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assumptions, setAssumptions] = useState<Assumption[]>([]);
  const [specText, setSpecText] = useState('');
  const [propertiesText, setPropertiesText] = useState('');
  const [buildProgress, setBuildProgress] = useState<number | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [transplantStatus, setTransplantStatus] = useState<string | null>(null);

  // Consent flow state
  const [pendingConsent, setPendingConsent] = useState<PendingConsent | null>(null);

  // Wish slot targeting (activated from an empty OrganSlot)
  const pendingWishSlot = useCreatureStore(state => state.pendingWishSlot);
  const setPendingWishSlot = useCreatureStore(state => state.setPendingWishSlot);

  // Live mode state
  const [passcode, setPasscode] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [liveSession, setLiveSession] = useState<LiveSession | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [canGoLive, setCanGoLive] = useState(false);

  // Focus the wish input when an empty slot was activated in the Specimen
  const wishInputRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (pendingWishSlot) {
      wishInputRef.current?.focus();
    }
  }, [pendingWishSlot]);

  // Check if live mode is available on mount
  useEffect(() => {
    const checkLiveAvailability = async () => {
      try {
        const response = await fetch('/api/doctor/status');
        if (response.ok) {
          const data = await response.json();
          setCanGoLive(data.canGoLive);
        }
      } catch {
        // Server not available, use replay mode
        setCanGoLive(false);
      }
    };
    checkLiveAvailability();
  }, []);

  // Validate existing session on mount (session stored in memory only)
  useEffect(() => {
    const validateSession = async () => {
      // Session token is stored in component state only (not localStorage for security)
      // On page refresh, session is lost - user must re-enter passcode
    };
    validateSession();
  }, []);

  const handleWishSubmit = useCallback(async () => {
    if (!wish.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setAssumptions([]);
    setSpecText('');
    setPropertiesText('');
    setBuildProgress(null);
    setStreamError(null);
    setTransplantStatus(null);

    try {
      console.log('Wish submitted:', wish);

      // Connect to Doctor API via Server-Sent Events
      const response = await fetch('/api/doctor/wish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wish,
          sessionToken: liveSession?.token,
        }),
      });

      // Check if response is SSE stream
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('text/event-stream')) {
        // Handle SSE stream
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          console.error('No reader available');
          return;
        }

        let buffer = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                handleDoctorEvent(data);
              } catch (e) {
                console.error('Failed to parse event:', line, e);
              }
            }
          }
        }
      } else {
        // Handle JSON response (error or live mode placeholder)
        const data = await response.json();
        if (data.message) {
          // Show placeholder message for live mode
          setSpecText(data.message);
        }
      }
    } catch (error) {
      console.error('Wish submission failed:', error);
      // Surface connection failures (server down, dropped SSE mid-stream) -
      // a silent console.error left the UI frozen on the placeholder.
      setStreamError(
        'Could not reach the Doctor. Check the connection and submit the wish again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [wish, isSubmitting, liveSession]);

  // Handle Doctor events from SSE stream
  const handleDoctorEvent = useCallback((event: { type: string; data: unknown; timestamp: number; _replay?: boolean }) => {
    console.log('Doctor event:', event.type, event.data);

    switch (event.type) {
      case 'assumption': {
        const data = event.data as { id?: string; text?: string; message?: string };
        const text = data.text ?? data.message ?? '';
        const id = data.id ?? `assumption-${Date.now()}`;
        setAssumptions(prev => [...prev, { id, text, status: 'pending' }]);
        break;
      }
      case 'spec-start':
        setSpecText('Generating specification...');
        break;
      case 'spec-section': {
        const data = event.data as { section?: string; content?: string; partial?: string };
        if (typeof data.partial === 'string') {
          // Streaming chunk: append raw text (first chunk replaces the placeholder)
          setSpecText(prev =>
            prev === 'Generating specification...' ? data.partial! : prev + data.partial!
          );
        } else if (typeof data.content === 'string') {
          // Full section (e.g. parsed requirements after the stream)
          setSpecText(prev => prev + '\n\n' + data.content);
        }
        break;
      }
      case 'spec-complete':
        break;
      case 'properties-start':
        setPropertiesText('Generating properties...');
        break;
      case 'properties-section': {
        const data = event.data as { content: string };
        setPropertiesText(prev => prev + '\n' + data.content);
        break;
      }
      case 'properties-complete':
        break;
      case 'build-start':
        setBuildProgress(0);
        break;
      case 'build-progress': {
        const data = event.data as { progress: number };
        setBuildProgress(data.progress);
        break;
      }
      case 'build-complete':
        setBuildProgress(100);
        break;
      case 'immune-start':
      case 'immune-stage':
      case 'immune-pass':
      case 'immune-fail':
        // Stage detail is shown by the Laboratory overlay; the consent dialog
        // summarises the final report.
        break;
      case 'consent-request': {
        const data = event.data as {
          organName: string;
          bundle: OrganBundle;
          report?: { stages: Array<{ stage: StageName; passed: boolean }> };
        };
        if (!data?.bundle?.manifest) {
          setStreamError('Consent request was missing the organ bundle.');
          break;
        }
        setPendingConsent({
          organName: data.organName ?? data.bundle.manifest.name,
          organVersion: data.bundle.manifest.version,
          description: data.bundle.spec?.slice(0, 240),
          passedStages: (data.report?.stages ?? [])
            .filter(s => s.passed)
            .map(s => s.stage),
          permissions: [...data.bundle.manifest.permissions],
          bundle: data.bundle,
        });
        break;
      }
      case 'error': {
        const data = event.data as { message?: string; hint?: string };
        const message = data.message ?? 'Unknown Doctor error';
        console.error('Doctor error:', message);
        setStreamError(data.hint ? `${message} (${data.hint})` : message);
        break;
      }
    }
  }, []);

  // Handle transplant consent decision
  const handleConsentTransplant = useCallback(async () => {
    if (!pendingConsent) return;

    const consent = pendingConsent;
    setPendingConsent(null);

    // Target slot: the slot the wish was activated from, else the first empty slot
    const state = useCreatureStore.getState();
    const targetSlot =
      state.slots.find(s => s.id === state.pendingWishSlot && !s.organId) ??
      state.slots.find(s => !s.organId);

    if (!targetSlot) {
      setTransplantStatus('Transplant failed: no empty slot available.');
      return;
    }

    try {
      const coordinator = getTransplantCoordinator();
      const result = await coordinator.transplant(consent.bundle, targetSlot.id);

      if (result.success) {
        setPendingWishSlot(null);
        setTransplantStatus(
          `Transplanted ${consent.organName} into ${targetSlot.id} (entry ${result.ledgerEntryId}).`
        );
      } else {
        setTransplantStatus(`Transplant rejected: ${result.error}`);
      }
    } catch (error) {
      setTransplantStatus(
        `Transplant failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }, [pendingConsent, setPendingWishSlot]);

  const handleConsentReject = useCallback(() => {
    setPendingConsent(null);
    setPendingWishSlot(null);
    setTransplantStatus('Organ rejected - the Creature stays as it was.');
  }, [setPendingWishSlot]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        handleWishSubmit();
      }
      // Escape clears a slot-activated wish and returns the slot to idle
      if (event.key === 'Escape' && pendingWishSlot) {
        event.preventDefault();
        setPendingWishSlot(null);
      }
    },
    [handleWishSubmit, pendingWishSlot, setPendingWishSlot]
  );

  // Passcode submission for live mode
  const handlePasscodeSubmit = useCallback(async () => {
    if (!passcode.trim() || isAuthenticating) return;

    setIsAuthenticating(true);
    setAuthError(null);

    try {
      const response = await fetch('/api/doctor/live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode }),
      });

      if (!response.ok) {
        const data = await response.json();
        setAuthError(data.error === 'Invalid passcode' ? 'Invalid passcode' : 'Authentication failed');
        return;
      }

      const data = await response.json();
      setLiveSession({
        token: data.sessionToken,
        expiresAt: data.expiresAt,
        wishCount: 0,
      });
      setPasscode(''); // Clear passcode from memory after successful auth
    } catch {
      setAuthError('Failed to connect to server');
    } finally {
      setIsAuthenticating(false);
    }
  }, [passcode, isAuthenticating]);

  // Logout from live mode
  const handleLogout = useCallback(async () => {
    if (liveSession) {
      try {
        await fetch('/api/doctor/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionToken: liveSession.token }),
        });
      } catch {
        // Ignore logout errors
      }
    }
    setLiveSession(null);
  }, [liveSession]);

  return (
    <aside
      className={`doctor-notes ${className || ''}`}
      aria-label="Doctor's Notes"
    >
      <header className="doctor-notes__header">
        <h2 className="doctor-notes__title">Doctor's Notes</h2>
        {/* Live mode indicator */}
        {liveSession && (
          <div className="doctor-notes__live-indicator" aria-label="Live mode active">
            <span className="doctor-notes__live-badge">LIVE</span>
            <button
              className="doctor-notes__logout-button"
              onClick={handleLogout}
              aria-label="Exit live mode"
              title="Exit live mode"
            >
              ✕
            </button>
          </div>
        )}
      </header>

      {/* Passcode Input for Live Mode */}
      {!liveSession && canGoLive && (
        <section className="doctor-notes__passcode" aria-label="Live mode authentication">
          <label className="doctor-notes__passcode-label" htmlFor="passcode-input">
            Enter passcode for live mode
          </label>
          <div className="doctor-notes__passcode-row">
            <input
              id="passcode-input"
              type="password"
              className="doctor-notes__passcode-input"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handlePasscodeSubmit();
                }
              }}
              placeholder="Passcode"
              disabled={isAuthenticating}
              autoComplete="off"
            />
            <button
              className="doctor-notes__passcode-submit"
              onClick={handlePasscodeSubmit}
              disabled={!passcode.trim() || isAuthenticating}
              aria-label="Authenticate for live mode"
            >
              {isAuthenticating ? '...' : '→'}
            </button>
          </div>
          {authError && (
            <span className="doctor-notes__passcode-error" role="alert">
              {authError}
            </span>
          )}
        </section>
      )}

      {/* Wish Input */}
      <section className="doctor-notes__wish" aria-label="Wish input">
        <label className="doctor-notes__wish-label" htmlFor="wish-input">
          Make a wish
        </label>
        <textarea
          id="wish-input"
          ref={wishInputRef}
          className="doctor-notes__wish-input"
          value={wish}
          onChange={(e) => setWish(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe what you want the Creature to do..."
          disabled={isSubmitting}
          rows={3}
          aria-describedby="wish-hint"
          data-testid="wish-input"
        />
        <span id="wish-hint" className="doctor-notes__wish-hint">
          {pendingWishSlot
            ? `Wishing for slot ${pendingWishSlot} — press Escape to cancel.`
            : 'Press Ctrl+Enter to submit'}
        </span>
        <button
          className="doctor-notes__wish-submit"
          onClick={handleWishSubmit}
          disabled={!wish.trim() || isSubmitting}
          aria-label="Submit wish"
          data-testid="wish-submit"
        >
          {isSubmitting ? 'Processing...' : 'Submit Wish'}
        </button>
      </section>

      {/* Assumptions Section */}
      {assumptions.length > 0 && (
        <section className="doctor-notes__section" aria-label="Assumptions">
          <h3 className="doctor-notes__section-title">Assumptions</h3>
          <ul className="doctor-notes__assumptions">
            {assumptions.map((assumption) => (
              <li
                key={assumption.id}
                className={`doctor-notes__assumption doctor-notes__assumption--${assumption.status}`}
              >
                <span className="doctor-notes__assumption-marker" aria-hidden="true">
                  {assumption.status === 'pending' ? '?' : assumption.status === 'confirmed' ? '✓' : '✗'}
                </span>
                <span className="doctor-notes__assumption-text">{assumption.text}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Streaming Spec Display */}
      <section className="doctor-notes__section" aria-label="Specification">
        <h3 className="doctor-notes__section-title">Specification</h3>
        <div className="doctor-notes__streaming-area" role="status" aria-live="polite" data-testid="spec-status">
          {specText || (
            <span className="doctor-notes__placeholder">
              Spec will appear here...
            </span>
          )}
        </div>
      </section>

      {/* Streaming Properties Display */}
      <section className="doctor-notes__section" aria-label="Properties">
        <h3 className="doctor-notes__section-title">Properties</h3>
        <div className="doctor-notes__streaming-area" role="status" aria-live="polite">
          {propertiesText || (
            <span className="doctor-notes__placeholder">
              Properties will appear here...
            </span>
          )}
        </div>
      </section>

      {/* Stream / doctor errors */}
      {streamError && (
        <div className="doctor-notes__error" role="alert" data-testid="stream-error">
          {streamError}
        </div>
      )}

      {/* Transplant result status */}
      {transplantStatus && (
        <div className="doctor-notes__transplant-status" role="status" data-testid="transplant-status">
          {transplantStatus}
        </div>
      )}

      {/* Build Progress */}
      <section className="doctor-notes__section" aria-label="Build Progress">
        <h3 className="doctor-notes__section-title">Build Progress</h3>
        <div className="doctor-notes__progress-area" data-testid="build-status">
          {buildProgress !== null ? (
            <div className="doctor-notes__progress-bar">
              <div
                className="doctor-notes__progress-fill"
                style={{ width: `${buildProgress}%` }}
                role="progressbar"
                aria-valuenow={buildProgress}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
          ) : (
            <span className="doctor-notes__placeholder">
              Build progress will appear here...
            </span>
          )}
        </div>
      </section>

      {/* Transplant consent dialog (ledger-first flow entry point) */}
      <ConsentDialog
        isVisible={!!pendingConsent}
        organName={pendingConsent?.organName}
        organVersion={pendingConsent?.organVersion}
        organDescription={pendingConsent?.description}
        passedStages={pendingConsent?.passedStages ?? []}
        permissions={pendingConsent?.permissions ?? []}
        onTransplant={() => void handleConsentTransplant()}
        onReject={handleConsentReject}
      />
    </aside>
  );
}

export default DoctorNotes;
