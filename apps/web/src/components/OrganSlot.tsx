/**
 * OrganSlot Component
 *
 * A slot in the Creature's grid that can hold an organ.
 * Displays empty state or renders an installed organ.
 */

import { useCreatureStore, SlotPosition } from '../stores/creatureStore';
import './OrganSlot.css';

export interface OrganSlotProps {
  id: string;
  position: SlotPosition;
  size: 'small' | 'medium' | 'large';
  organId?: string;
}

export function OrganSlot({ id, position, size, organId }: OrganSlotProps) {
  const { organs } = useCreatureStore();
  
  const organ = organId ? organs.get(organId) : null;
  const isEmpty = !organ;
  
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
    
    return classes.join(' ');
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (isEmpty && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      // TODO: Open wish input for this slot
      console.log(`Initiate wish for slot ${id}`);
    }
  };

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

  return (
    <div
      className={getSlotClasses()}
      role="gridcell"
      tabIndex={0}
      aria-label={
        isEmpty
          ? `Empty organ slot at row ${position.row + 1}, column ${position.col + 1}`
          : `${organ?.name || 'Organ'} at row ${position.row + 1}, column ${position.col + 1}`
      }
      onKeyDown={handleKeyDown}
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
          </div>
        ) : (
          <div className="organ-slot__organ">
            <div className="organ-slot__organ-header">
              <span className="organ-slot__organ-name">{organ.name}</span>
              <span className={`organ-slot__organ-status organ-slot__organ-status--${organ.status}`}>
                {getStatusLabel(organ.status)}
              </span>
            </div>
            <div className="organ-slot__organ-body">
              {/* Organ content would be rendered here via iframe */}
              <div style={{ padding: 'var(--space-4)', color: 'var(--color-text-muted)' }}>
                Organ content renders here
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
