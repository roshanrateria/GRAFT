/**
 * TopBar Component
 *
 * Displays the GRAFT logo and live ECG heartbeat line.
 * The heartbeat reflects the health of installed organs.
 */

import { useCreatureStore } from '../stores/creatureStore';
import './TopBar.css';

export function TopBar() {
  const { organs } = useCreatureStore();
  
  // Determine heartbeat state based on organ health
  const organStates = Array.from(organs.values());
  const hasQuarantined = organStates.some(o => o.status === 'quarantined');
  const hasDecayed = organStates.some(o => o.status === 'decayed');
  const hasPending = organStates.some(o => o.status === 'pending');
  
  const heartbeatState = hasQuarantined 
    ? 'flatline' 
    : hasDecayed || hasPending 
      ? 'erratic' 
      : 'steady';

  return (
    <header className="top-bar" role="banner">
      <div className="top-bar__logo">
        <h1 className="top-bar__title">
          <span className="top-bar__title-main">GRAFT</span>
          <span className="top-bar__title-sub">The Creature</span>
        </h1>
      </div>
      
      <div className="top-bar__heartbeat" aria-label={`Heartbeat status: ${heartbeatState}`}>
        <svg 
          className="top-bar__ecg" 
          viewBox="0 0 200 40" 
          preserveAspectRatio="none"
          role="img"
          aria-hidden="true"
        >
          <path
            className={`top-bar__ecg-line top-bar__ecg-line--${heartbeatState}`}
            d="M0,20 L30,20 L35,20 L40,10 L45,30 L50,20 L55,20 L85,20 L90,20 L95,5 L100,35 L105,20 L110,20 L140,20 L145,20 L150,10 L155,30 L160,20 L165,20 L200,20"
            fill="none"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="top-bar__status sr-only">
          {heartbeatState === 'steady' && 'All organs healthy'}
          {heartbeatState === 'erratic' && 'Some organs need attention'}
          {heartbeatState === 'flatline' && 'Organ quarantined - immediate attention required'}
        </span>
      </div>
    </header>
  );
}
