import { Creature } from './Creature';

/**
 * The GRAFT Theatre - Main Application Entry
 *
 * This is the host application that renders the Creature (the living dashboard)
 * along with the surrounding Theatre UI elements.
 */
export function App() {
  return (
    <div className="app" data-theme="dark">
      {/* Skip link for keyboard users */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      
      <main id="main-content" className="app__main">
        <Creature />
      </main>
    </div>
  );
}
