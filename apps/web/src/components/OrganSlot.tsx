/**
 * OrganSlot Component
 *
 * A slot in the Creature's grid that can hold an organ.
 * Displays empty state or renders an installed organ.
 *
 * Features:
 * - Status indicators (healthy/decayed/quarantined)
 * - Port visualization for chimera linking
 * - Amputate button with confirmation
 *
 * @see .kiro/steering/design-theatre.md for UI specifications
 */

import { useState, useCallback, useReducer } from 'react';
import { useCreatureStore, SlotPosition, OrganInstance } from '../stores/creatureStore';
import './OrganSlot.css';

export interface OrganSlotProps {
  id: string;
  position: SlotPosition;
  size: 'small' | 'medium' | 'large';
  organId?: string;
}

type ConfirmState = 'idle' | 'confirming' | 'removing';

interface Port {
  name: string;
  direction: 'in' | 'out';
}

export function OrganSlot({ id, position, size, organId }: OrganSlotProps) {
  const { organs, removeOrgan } = useCreatureStore();
  const [confirmState, setConfirmState] = useState<ConfirmState>('idle');
  const [showPorts, setShowPorts] = useState(false);

  const organ = organId ? organs.get(organId) : null;
  const isEmpty = !organ;

  // Get ports from organ manifest (placeholder for now)
  const ports: Port[] = organ?.manifest?.ports || [];

  const getSlotClasses = () => {
    const classes = ['organ-slot', `organ-slot--${size}`];

    if (isEmpty) {
      classes.push('organ-slot--empty');
    } else {
      classes.push('organ-slot--active');
      if (organ?.status === 'quarantined') {
        classes.push('organ-slot--quarantined');
      } else if (organ?.status === 'decayed') {
        classes.push('organ-slot--decayed');
      }
    }

    if (confirmState === 'confirming') {
      classes.push('organ-slot--confirming');
    }

    if (showPorts) {
      classes.push('organ-slot--ports-visible');
    }

    return classes.join(' ');
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (isEmpty && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      // TODO: Open wish input for this slot
      console.log(`Initiate wish for slot ${id}`);
    }

    // Toggle ports visibility with 'p' key
    if (!isEmpty && event.key === 'p') {
      event.preventDefault();
      setShowPorts(prev => !prev);
    }
  };

  const handleAmputateClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    if (confirmState === 'idle') {
      setConfirmState('confirming');
    } else if (confirmState === 'confirming') {
      setConfirmState('removing');
      // Perform amputation
      setTimeout(() => {
        removeOrgan(id);
        setConfirmState('idle');
      }, 300);
    }
  }, [confirmState, id, removeOrgan]);

  const handleAmputateCancel = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    setConfirmState('idle');
  }, []);

  const handleAmputateKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      setConfirmState('idle');
    }
  }, []);

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'pending':
        return 'Pending';
      case 'quarantined':
        return 'Quarantined';
      case 'decayed':
        return 'Decayed';
      default:
        return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return '●';
      case 'pending':
        return '◐';
      case 'quarantined':
        return '✕';
      case 'decayed':
        return '◌';
      default:
        return '?';
    }
  };

  return (
    <div
      className={getSlotClasses()}
      role="gridcell"
      tabIndex={0}
      aria-label={
        isEmpty
          ? `Empty organ slot at row ${position.row + 1}, column ${position.col + 1}`
          : `${organ?.name || 'Organ'} at row ${position.row + 1}, column ${position.col + 1}, status: ${organ?.status}`
      }
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setShowPorts(true)}
      onMouseLeave={() => setShowPorts(false)}
    >
      <span className="organ-slot__id" aria-hidden="true">
        {id}
      </span>

      <div className="organ-slot__content">
        {isEmpty ? (
          <div className="organ-slot__empty">
            <svg
              className="organ-slot__empty-icon"
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <rect
                x="8"
                y="12"
                width="32"
                height="24"
                rx="4"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray="4 2"
              />
              <circle
                cx="24"
                cy="24"
                r="6"
                stroke="currentColor"
                strokeWidth="2"
              />
              <line
                x1="24"
                y1="18"
                x2="24"
                y2="12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            <span className="organ-slot__empty-text">
              Empty slot
            </span>
            <span className="organ-slot__empty-hint">
              Press Enter to add
            </span>
          </div>
        ) : (
          <div className="organ-slot__organ">
            <div className="organ-slot__organ-header">
              <span className="organ-slot__organ-name">{organ.name}</span>
              <div className="organ-slot__organ-status-group">
                <span
                  className={`organ-slot__organ-status organ-slot__organ-status--${organ.status}`}
                  title={getStatusLabel(organ.status)}
                >
                  <span className="organ-slot__status-icon" aria-hidden="true">
                    {getStatusIcon(organ.status)}
                  </span>
                  <span className="organ-slot__status-label">
                    {getStatusLabel(organ.status)}
                  </span>
                </span>
              </div>
            </div>

            {/* Ports visualization */}
            {ports.length > 0 && (
              <div
                className={`organ-slot__ports ${showPorts ? 'organ-slot__ports--visible' : ''}`}
                aria-label="Ports for chimera linking"
              >
                {ports.filter(p => p.direction === 'in').map((port, i) => (
                  <button
                    key={`in-${i}`}
                    className="organ-slot__port organ-slot__port--in"
                    title={`Input: ${port.name}`}
                    aria-label={`Input port: ${port.name}`}
                    tabIndex={showPorts ? 0 : -1}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="organ-slot__port-marker">◀</span>
                    <span className="organ-slot__port-name">{port.name}</span>
                  </button>
                ))}
                {ports.filter(p => p.direction === 'out').map((port, i) => (
                  <button
                    key={`out-${i}`}
                    className="organ-slot__port organ-slot__port--out"
                    title={`Output: ${port.name}`}
                    aria-label={`Output port: ${port.name}`}
                    tabIndex={showPorts ? 0 : -1}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="organ-slot__port-name">{port.name}</span>
                    <span className="organ-slot__port-marker">▶</span>
                  </button>
                ))}
              </div>
            )}

            {/* Organ body placeholder */}
            <div className="organ-slot__organ-body">
              <div className="organ-slot__organ-content">
                Organ content renders here
              </div>
            </div>

            {/* Amputate button */}
            <div className="organ-slot__actions">
              {confirmState === 'confirming' ? (
                <div className="organ-slot__confirm" onKeyDown={handleAmputateKeyDown}>
                  <span className="organ-slot__confirm-text">Remove?</span>
                  <button
                    className="organ-slot__confirm-btn organ-slot__confirm-btn--yes"
                    onClick={handleAmputateClick}
                    aria-label="Confirm amputation"
                  >
                    Yes
                  </button>
                  <button
                    className="organ-slot__confirm-btn organ-slot__confirm-btn--no"
                    onClick={handleAmputateCancel}
                    aria-label="Cancel amputation"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  className="organ-slot__amputate"
                  onClick={handleAmputateClick}
                  aria-label="Amputate organ"
                  disabled={confirmState === 'removing'}
                >
                  <svg
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                    className="organ-slot__amputate-icon"
                  >
                    <path
                      d="M4 4L12 12M12 4L4 12"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="organ-slot__amputate-text">Amputate</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
