import { Creature } from './Creature';
import { DoctorNotes } from './components/DoctorNotes';
import { ChartPanel } from './components/ChartPanel';
import './styles/App.css';

/**
 * The GRAFT Theatre - Main Application Entry
 *
 * This is the host application that renders the Creature (the living dashboard)
 * along with the surrounding Theatre UI elements.
 *
 * Layout: Victorian anatomical theatre with three columns:
 * - Left: Doctor's Notes (wish input, spec, properties, build progress)
 * - Center: The Specimen (organ slot grid)
 * - Right: The Chart (ledger timeline, verification)
 */
export function App() {
  return (
    <div className="app" data-theme="dark">
      {/* Skip link for keyboard users */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <div className="app__layout">
        {/* Left panel: Doctor's Notes */}
        <DoctorNotes />

        {/* Center: The Specimen - main content */}
        <main id="main-content" className="app__main">
          <Creature />
        </main>

        {/* Right panel: The Chart */}
        <ChartPanel />
      </div>
    </div>
  );
}
