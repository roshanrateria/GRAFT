/**
 * ConsentDialog Component
 *
 * Modal dialog for organ transplant consent.
 * Shows organ preview, immune report summary, and action buttons.
 *
 * @see .kiro/steering/design-theatre.md for UI specifications
 * @see .kiro/steering/laws-of-anatomy.md#L3 for consent requirements
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { StageName } from './StageGauge';
import './ConsentDialog.css';

export interface ConsentDialogProps {
  /** Whether the dialog is visible */
  isVisible: boolean;

  /** Organ name */
  organName?: string;

  /** Organ version */
  organVersion?: string;

  /** Organ description */
  organDescription?: string;

  /** Stages that passed */
  passedStages: StageName[];

  /** Permissions requested by the organ */
  permissions?: string[];

  /** Callback when transplant is clicked */
  onTransplant?: () => void;

  /** Callback when reject is clicked */
  onReject?: () => void;

  /** Optional className for additional styling */
  className?: string;
}

const STAGE_LABELS: Record<StageName, string> = {
  static: 'Static Analysis',
  manifest: 'Manifest Validation',
  behavioral: 'Behavioral Tests',
  property: 'Property Tests',
};

/**
 * ConsentDialog - Modal for transplant consent.
 */
export function ConsentDialog({
  isVisible,
  organName = 'Unknown Organ',
  organVersion = '0.0.0',
  organDescription,
  passedStages,
  permissions = [],
  onTransplant,
  onReject,
  className,
}: ConsentDialogProps) {
  const [reducedMotion, setReducedMotion] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const transplantBtnRef = useRef<HTMLButtonElement>(null);
  const focusTrapRef = useRef<HTMLDivElement>(null);

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
      if (event.key === 'Escape') {
        event.preventDefault();
        onReject?.();
      }

      // Tab trap
      if (event.key === 'Tab' && dialogRef.current) {
        const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    },
    [onReject]
  );

  // Add keyboard listener when visible
  useEffect(() => {
    if (isVisible) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isVisible, handleKeyDown]);

  // Focus management
  useEffect(() => {
    if (isVisible && transplantBtnRef.current) {
      // Focus the transplant button when dialog opens
      transplantBtnRef.current.focus();
    }
  }, [isVisible]);

  // Prevent body scroll when dialog is visible
  useEffect(() => {
    if (isVisible) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [isVisible]);

  if (!isVisible) return null;

  const containerClasses = [
    'consent-dialog',
    className || '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={containerClasses}
      role="dialog"
      aria-modal="true"
      aria-labelledby="consent-dialog-title"
      aria-describedby="consent-dialog-desc"
    >
      {/* Focus trap at start */}
      <div
        ref={focusTrapRef}
        tabIndex={0}
        className="consent-dialog__focus-trap"
        aria-hidden="true"
      />

      <div className="consent-dialog__content" ref={dialogRef}>
        {/* Header */}
        <header className="consent-dialog__header">
          <h2 id="consent-dialog-title" className="consent-dialog__title">
            Transplant Consent
          </h2>
          <p id="consent-dialog-desc" className="consent-dialog__subtitle">
            Review the organ and decide whether to transplant
          </p>
        </header>

        {/* Organ Preview */}
        <div className="consent-dialog__preview">
          <div className="consent-dialog__preview-header">
            <span className="consent-dialog__preview-name">{organName}</span>
            <span className="consent-dialog__preview-version">{organVersion}</span>
          </div>
          {organDescription && (
            <p className="consent-dialog__preview-desc">{organDescription}</p>
          )}
        </div>

        {/* Immune Report Summary */}
        <div className="consent-dialog__report">
          <h3 className="consent-dialog__report-title">Immune Report</h3>
          <ul className="consent-dialog__report-list">
            {passedStages.map((stage) => (
              <li key={stage} className="consent-dialog__report-item">
                <span
                  className="consent-dialog__report-icon consent-dialog__report-icon--passed"
                  aria-hidden="true"
                >
                  ✓
                </span>
                <span className="consent-dialog__report-stage">{STAGE_LABELS[stage]}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Permissions */}
        {permissions.length > 0 && (
          <div className="consent-dialog__permissions">
            <h3 className="consent-dialog__permissions-title">Permissions</h3>
            {permissions.map((permission, index) => (
              <div key={index} className="consent-dialog__permission">
                <span className="consent-dialog__permission-icon" aria-hidden="true">
                  •
                </span>
                <span>{permission}</span>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="consent-dialog__actions">
          <button
            className="consent-dialog__btn consent-dialog__btn--reject"
            onClick={onReject}
            type="button"
          >
            Reject
          </button>
          <button
            ref={transplantBtnRef}
            className="consent-dialog__btn consent-dialog__btn--transplant"
            onClick={onTransplant}
            type="button"
          >
            Transplant
          </button>
        </div>
      </div>

      {/* Focus trap at end */}
      <div tabIndex={0} className="consent-dialog__focus-trap" aria-hidden="true" />
    </div>
  );
}

export default ConsentDialog;
