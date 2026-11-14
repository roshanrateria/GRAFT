/**
 * The Creature - Host Application
 *
 * A small personal dashboard with seeded data and empty organ slots in a grid.
 * Built-in data domains (read-only to organs):
 * - mood.entries: Daily mood tracking
 * - tasks.items: Task management
 * - habits.checkins: Habit completion
 * - calendar.events: Calendar events
 *
 * @see .kiro/steering/design-theatre.md for UI specifications
 */

import { useCreatureStore } from './stores/creatureStore';
import { OrganSlot } from './components/OrganSlot';
import { TopBar } from './components/TopBar';
import './styles/Creature.css';

/**
 * The Creature host application.
 * Renders a slot grid for organs in the Victorian anatomical theatre aesthetic.
 * This is "The Specimen" - the center of the surgical theatre.
 */
export function Creature() {
  const { slots } = useCreatureStore();
  // Announced to screen readers while keyboard chimera linking is active (UI-04)
  const linkingStatus = useCreatureStore(state => state.linkingStatus);

  return (
    <div className="creature">
      {/* Top bar with logo and heartbeat */}
      <TopBar />

      {/* Screen-reader announcements for chimera linking (UI-04) */}
      <div
        role="status"
        aria-live="polite"
        data-testid="linking-status"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          margin: '-1px',
          padding: 0,
          overflow: 'hidden',
          clip: 'rect(0 0 0 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        {linkingStatus ?? ''}
      </div>

      {/* Main content - The Specimen */}
      <section className="creature__body" aria-label="The Specimen - Organ slots">
        <div className="creature__slots-grid" role="grid" aria-label="Organ slot grid">
          {slots.map((slot) => (
            <OrganSlot
              key={slot.id}
              id={slot.id}
              position={slot.position}
              size={slot.size}
              organId={slot.organId}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
