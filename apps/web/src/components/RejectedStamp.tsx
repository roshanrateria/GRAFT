/**
 * RejectedStamp Component
 *
 * Animated rejection stamp for failed immune verification.
 * Displays the reason and source line of the rejection.
 *
 * @see .kiro/steering/design-theatre.md for UI specifications
 */

import { useState, useEffect } from 'react';
import './RejectedStamp.css';

export interface RejectedStampProps {
  /** The reason for rejection */
  reason: string;

  /** The source line or file that caused the rejection */
  source?: string;

  /** The stage that failed */
  stage?: string;

  /** Optional className for additional styling */
  className?: string;
}

/**
 * RejectedStamp - Animated rejection notification.
 */
export function RejectedStamp({
  reason,
  source,
  stage,
  className,
}: RejectedStampProps) {
  const [reducedMotion, setReducedMotion] = useState(false);

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const containerClasses = [
    'rejected-stamp',
    reducedMotion ? 'rejected-stamp--static' : '',
    className || '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={containerClasses}
      role="alert"
      aria-live="assertive"
    >
      <div className="rejected-stamp__stamp">
        <span className="rejected-stamp__text">Rejected</span>
      </div>

      <div className="rejected-stamp__details">
        <span className="rejected-stamp__reason">{reason}</span>

        {stage && (
          <span className="rejected-stamp__source">
            Stage: {stage}
          </span>
        )}

        {source && (
          <span className="rejected-stamp__source">
            {source}
          </span>
        )}
      </div>
    </div>
  );
}

export default RejectedStamp;
