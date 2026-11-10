/**
 * DoctorNotes Component
 *
 * The left panel of the Theatre UI.
 * Displays wish input, streaming spec, properties, and build progress.
 *
 * @see .kiro/steering/design-theatre.md for UI specifications
 */

import { useState, useCallback } from 'react';
import './DoctorNotes.css';

interface Assumption {
  id: string;
  text: string;
  status: 'pending' | 'confirmed' | 'rejected';
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

  return (
    <aside
      className={`doctor-notes ${className || ''}`}
      aria-label="Doctor's Notes"
    >
      <header className="doctor-notes__header">
        <h2 className="doctor-notes__title">Doctor's Notes</h2>
      </header>

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
