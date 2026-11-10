/**
 * TopBar Component
 *
 * Displays the GRAFT logo and live ECG heartbeat line.
 * The heartbeat reflects the health of installed organs.
 *
 * States:
 * - steady: All organs pass checkup (green, regular pulse)
 * - erratic: Any organ fails checkup (amber, irregular pulse)
 * - flatline: Quarantined organ exists (red, flat line with alert)
 *
 * @see .kiro/steering/design-theatre.md for UI specifications
 */

import { useCreatureStore } from '../stores/creatureStore';
import { useState, useEffect } from 'react';
import './TopBar.css';

export type HeartbeatState = 'steady' | 'erratic' | 'flatline';

export function TopBar() {
  const { organs } = useCreatureStore();
  const [reducedMotion, setReducedMotion] = useState(false);

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Determine heartbeat state based on organ health
  const organStates = Array.from(organs.values());
  const hasQuarantined = organStates.some(o => o.status === 'quarantined');
  const hasDecayed = organStates.some(o => o.status === 'decayed');
  const hasPending = organStates.some(o => o.status === 'pending');

  const heartbeatState: HeartbeatState = hasQuarantined
    ? 'flatline'
    : hasDecayed || hasPending
      ? 'erratic'
      : 'steady';

  // Count organs by status for display
  const organCount = organStates.length;
  const healthyCount = organStates.filter(o => o.status === 'active').length;
  const attentionCount = organStates.filter(o =>
    o.status === 'decayed' || o.status === 'pending'
  ).length;
  const quarantinedCount = organStates.filter(o => o.status === 'quarantined').length;

  return (
    <header className="top-bar" role="banner">
      <div className="top-bar__logo">
        <h1 className="top-bar__title">
          <span className="top-bar__title-main">GRAFT</span>
          <span className="top-bar__title-sub">The Creature</span>
        </h1>
      </div>

      <div
        className="top-bar__heartbeat"
        aria-label={`Heartbeat status: ${heartbeatState}. ${organCount > 0 ? `${healthyCount} healthy, ${attentionCount} need attention, ${quarantinedCount} quarantined.` : 'No organs installed.'}`}
      >
        {reducedMotion ? (
          // Static display for reduced motion preference
          <div className="top-bar__ecg-static">
            <div
              className={`top-bar__ecg-indicator top-bar__ecg-indicator--${heartbeatState}`}
              role="img"
              aria-hidden="true"
            />
            <span className="top-bar__ecg-label">
              {heartbeatState === 'steady' && 'Healthy'}
              {heartbeatState === 'erratic' && 'Attention'}
              {heartbeatState === 'flatline' && 'Alert'}
            </span>
          </div>
        ) : (
          // Animated ECG line
          <svg
            className="top-bar__ecg"
            viewBox="0 0 200 40"
            preserveAspectRatio="none"
            role="img"
            aria-hidden="true"
          >
            {/* Grid background */}
            <defs>
              <pattern id="ecg-grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path
                  d="M 10 0 L 0 0 0 10"
                  fill="none"
                  stroke="rgba(176, 141, 87, 0.1)"
                  strokeWidth="0.5"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#ecg-grid)" />

            {/* ECG line */}
            <path
              className={`top-bar__ecg-line top-bar__ecg-line--${heartbeatState}`}
              d="M0,20 L30,20 L35,20 L40,10 L45,30 L50,20 L55,20 L85,20 L90,20 L95,5 L100,35 L105,20 L110,20 L140,20 L145,20 L150,10 L155,30 L160,20 L165,20 L200,20"
              fill="none"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Flatline alert pulse */}
            {heartbeatState === 'flatline' && (
              <circle
                className="top-bar__ecg-alert-pulse"
                cx="100"
                cy="20"
                r="4"
                fill="var(--color-alert)"
              />
            )}
          </svg>
        )}

        <span className="sr-only">
          {heartbeatState === 'steady' && 'All organs healthy'}
          {heartbeatState === 'erratic' && 'Some organs need attention'}
          {heartbeatState === 'flatline' && 'Organ quarantined - immediate attention required'}
        </span>
      </div>

      {/* Status summary */}
      {organCount > 0 && (
        <div className="top-bar__stats" aria-label="Organ statistics">
          {healthyCount > 0 && (
            <span className="top-bar__stat top-bar__stat--healthy" title="Healthy organs">
              {healthyCount}
            </span>
          )}
          {attentionCount > 0 && (
            <span className="top-bar__stat top-bar__stat--attention" title="Organs needing attention">
              {attentionCount}
            </span>
          )}
          {quarantinedCount > 0 && (
            <span className="top-bar__stat top-bar__stat--quarantined" title="Quarantined organs">
              {quarantinedCount}
            </span>
          )}
        </div>
      )}
    </header>
  );
}
