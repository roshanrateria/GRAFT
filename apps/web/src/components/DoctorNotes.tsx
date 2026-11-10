/**
 * DoctorNotes Component
 *
 * The left panel of the Theatre UI.
 * Displays wish input, streaming spec, properties, and build progress.
 * Includes passcode input for live Doctor mode.
 *
 * @see .kiro/steering/design-theatre.md for UI specifications
 */

import { useState, useCallback, useEffect } from 'react';
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

  // Live mode state
  const [passcode, setPasscode] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [liveSession, setLiveSession] = useState<LiveSession | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [canGoLive, setCanGoLive] = useState(false);

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

    try {
      // TODO: Connect to Doctor API
      // For now, just log the wish
      console.log('Wish submitted:', wish);

      // Simulate assumptions for demo
      setAssumptions([
        { id: '1', text: 'User wants a visual mood tracker', status: 'pending' },
        { id: '2', text: 'Data should persist locally', status: 'pending' },
      ]);
    } finally {
      setIsSubmitting(false);
    }
  }, [wish, isSubmitting]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      handleWishSubmit();
    }
  }, [handleWishSubmit]);

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
          className="doctor-notes__wish-input"
          value={wish}
          onChange={(e) => setWish(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe what you want the Creature to do..."
          disabled={isSubmitting}
          rows={3}
          aria-describedby="wish-hint"
        />
        <span id="wish-hint" className="doctor-notes__wish-hint">
          Press Ctrl+Enter to submit
        </span>
        <button
          className="doctor-notes__wish-submit"
          onClick={handleWishSubmit}
          disabled={!wish.trim() || isSubmitting}
          aria-label="Submit wish"
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
        <div className="doctor-notes__streaming-area" role="status" aria-live="polite">
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

      {/* Build Progress */}
      <section className="doctor-notes__section" aria-label="Build Progress">
        <h3 className="doctor-notes__section-title">Build Progress</h3>
        <div className="doctor-notes__progress-area">
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
    </aside>
  );
}

export default DoctorNotes;
