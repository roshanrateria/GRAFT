/**
 * LaboratoryOverlay Component
 *
 * Full-screen overlay that displays during immune system verification.
 * Shows four stage gauges that light up sequentially.
 *
 * States:
 * - Running: Shows gauges with current stage highlighted
 * - Passed: Shows "Awaiting consent" with Transplant button
 * - Failed: Shows "REJECTED" stamp with reason
 *
 * @see .kiro/steering/design-theatre.md for UI specifications
 */

import { useState, useEffect, useCallback } from 'react';
import { StageGauge, StageName } from './StageGauge';
import { RejectedStamp } from './RejectedStamp';
import './LaboratoryOverlay.css';

export type ImmuneResult = 'pending' | 'passed' | 'failed';

export interface ImmuneReport {
  result: ImmuneResult;
  reason?: string;
  source?: string;
  failedStage?: StageName;
  passedStages: StageName[];
}

export interface LaboratoryOverlayProps {
  /** Whether the overlay is visible */
  isVisible: boolean;

  /** Current stage being tested */
  currentStage: StageName | null;

  /** The immune report (when complete) */
  report: ImmuneReport | null;

  /** Organ name for preview */
  organName?: string;

  /** Organ description for preview */
  organDescription?: string;

  /** Callback when transplant is clicked */
  onTransplant?: () => void;

  /** Callback when reject is clicked */
  onReject?: () => void;

  /** Callback when overlay is closed */
  onClose?: () => void;

  /** Optional className for additional styling */
  className?: string;
}

/**
 * LaboratoryOverlay - Displays immune system verification progress.
 */
export function LaboratoryOverlay({
  isVisible,
  currentStage,
  report,
  organName,
  organDescription,
  onClose,
  className,
}: LaboratoryOverlayProps) {
  const [_reducedMotion, setReducedMotion] = useState(false);

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape' && report && onClose) {
        onClose();
      }
    },
    [report, onClose]
  );

  // Add keyboard listener when visible
  useEffect(() => {
    if (isVisible) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isVisible, handleKeyDown]);

  // Prevent body scroll when overlay is visible
  useEffect(() => {
    if (isVisible) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isVisible]);

  if (!isVisible) return null;

  const isRunning = report === null;
  const isPassed = report?.result === 'passed';
  const isFailed = report?.result === 'failed';

  const containerClasses = [
    'laboratory-overlay',
    className || '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={containerClasses}
      role="dialog"
      aria-modal="true"
      aria-label="Immune system verification"
    >
      {/* Close button */}
      {report && (
        <button
          className="laboratory-overlay__close"
          onClick={onClose}
          aria-label="Close"
        >
          <svg
            className="laboratory-overlay__close-icon"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M4 4L12 12M12 4L4 12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}

      <div className="laboratory-overlay__content">
        {/* Header */}
        <header className="laboratory-overlay__header">
          <h2 className="laboratory-overlay__title">The Laboratory</h2>
          <p className="laboratory-overlay__subtitle">
            {isRunning
              ? 'Analyzing organ for safety...'
              : isPassed
                ? 'Organ has passed all checks'
                : 'Organ has been rejected'}
          </p>
        </header>

        {/* Gauges */}
        <div className="laboratory-overlay__gauges">
          <StageGauge
            currentStage={currentStage}
            passedStages={report?.passedStages || []}
            failedStages={report?.failedStage ? [report.failedStage] : []}
            isActive={isRunning}
          />
        </div>

        {/* Loading state */}
        {isRunning && (
          <div className="laboratory-overlay__loading">
            <div className="laboratory-overlay__spinner" />
            <span className="laboratory-overlay__loading-text">
              Running immune analysis...
            </span>
          </div>
        )}

        {/* Success state - Awaiting consent */}
        {isPassed && (
          <div className="laboratory-overlay__success">
            <div className="laboratory-overlay__success-badge">
              <span className="laboratory-overlay__success-icon" aria-hidden="true">
                ✓
              </span>
              <span className="laboratory-overlay__success-text">Awaiting Consent</span>
            </div>
            <span className="laboratory-overlay__success-hint">
              Review the organ below and decide
            </span>
          </div>
        )}

        {/* Organ preview (shown when passed) */}
        {isPassed && organName && (
          <div className="laboratory-overlay__preview">
            <div className="laboratory-overlay__preview-name">{organName}</div>
            {organDescription && (
              <div className="laboratory-overlay__preview-desc">{organDescription}</div>
            )}
          </div>
        )}

        {/* Failed state - Rejected */}
        {isFailed && report && (
          <RejectedStamp
            reason={report.reason || 'Unknown error'}
            source={report.source}
            stage={report.failedStage}
          />
        )}
      </div>
    </div>
  );
}

export default LaboratoryOverlay;
