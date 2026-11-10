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
 */
export function Creature() {
  const { slots } = useCreatureStore();

  return (
    <div className="creature">
      {/* Top bar with logo and heartbeat */}
      <TopBar />

      {/* Main content - The Specimen */}
      <section className="creature__body" aria-label="Organ slots">
        <div className="creature__slots-grid" role="grid">
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
