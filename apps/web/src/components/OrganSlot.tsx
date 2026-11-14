/**
 * OrganSlot Component
 *
 * A slot in the Creature's grid that can hold an organ.
 * Displays empty state or renders an installed organ.
 *
 * Features:
 * - Status indicators (healthy/decayed/quarantined)
 * - Port visualization and keyboard-only chimera linking (UI-04):
 *   Tab to a port, Enter to select, Tab to a compatible target, Enter to link,
 *   Escape to cancel
 * - Live organ rendering inside the sandboxed Nerve iframe
 * - Amputate button with confirmation
 *
 * @see .kiro/steering/design-theatre.md for UI specifications
 * @see .kiro/specs/07-theatre-ui/requirements.md#UI-04
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import type { Permission } from '@graft/nerve';
import { useCreatureStore, SlotPosition } from '../stores/creatureStore';
import { SandboxHost } from './SandboxHost';
import { readDomainData } from '../host/dataProvider';
import { hostRegistry, routeEmit, startDataSync } from '../host/OrganRuntime';
import { validateLink, createChimeraLink, type LinkRejectionReason } from '../ChimeraLinking';
import { getLedgerService } from '../TransplantService';
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
  const organs = useCreatureStore(state => state.organs);
  const chimeraLinks = useCreatureStore(state => state.chimeraLinks);
  const linkingSource = useCreatureStore(state => state.linkingSource);
  const removeOrgan = useCreatureStore(state => state.removeOrgan);
  const startLinking = useCreatureStore(state => state.startLinking);
  const cancelLinking = useCreatureStore(state => state.cancelLinking);
  const setLinkingStatus = useCreatureStore(state => state.setLinkingStatus);
  const setPendingWishSlot = useCreatureStore(state => state.setPendingWishSlot);
  const [confirmState, setConfirmState] = useState<ConfirmState>('idle');
  const [showPorts, setShowPorts] = useState(false);

  const organ = organId ? organs.get(organId) : null;
  const isEmpty = !organ;

  // Get ports from organ manifest (placeholder for now)
  const ports: Port[] = organ?.manifest?.ports || [];

  // Start the data-sync pump once a live organ is rendered, so store changes
  // are pushed to subscribed organs.
  useEffect(() => {
    if (organ?.indexHtml) {
      startDataSync();
    }
  }, [organ?.indexHtml]);

  // Whether this organ+port is the active keyboard-linking source
  const isSource = (port: Port) =>
    !!linkingSource && linkingSource.organId === organ?.id && linkingSource.port === port.name;

  // Whether the active linking source can legally link to this organ's in port
  const isCompatibleTarget = useCallback(
    (port: Port) => {
      if (!linkingSource || !organ || port.direction !== 'in') return false;
      const { valid } = validateLink(
        chimeraLinks,
        organs,
        linkingSource.organId,
        linkingSource.port,
        organ.id,
        port.name
      );
      return valid;
    },
    [linkingSource, organ, chimeraLinks, organs]
  );

  // Whether this in port is already linked from the active source (no-op)
  const isAlreadyLinked = useCallback(
    (port: Port) => {
      if (!linkingSource || !organ || port.direction !== 'in') return false;
      return chimeraLinks.some(
        l =>
          l.sourceOrganId === linkingSource.organId &&
          l.sourcePort === linkingSource.port &&
          l.targetOrganId === organ.id &&
          l.targetPort === port.name
      );
    },
    [linkingSource, organ, chimeraLinks]
  );

  // Is a link active anywhere in the Creature? (drives highlight styling)
  const linkingActive = !!linkingSource;
  // Is this slot a highlighted compatible target?
  const isHighlightedTarget = linkingActive && !!organ && ports.some(isCompatibleTarget);

  const getSlotClasses = () => {
    const classes = ['organ-slot', `organ-slot--${size}`];

    if (isEmpty) {
      classes.push('organ-slot--empty');
      if (linkingActive) classes.push('organ-slot--dimmed');
    } else {
      classes.push('organ-slot--active');
      if (organ?.status === 'quarantined') {
        classes.push('organ-slot--quarantined');
      } else if (organ?.status === 'decayed') {
        classes.push('organ-slot--decayed');
      }
      if (isHighlightedTarget) {
        classes.push('organ-slot--link-target');
      } else if (linkingActive && linkingSource?.organId !== organ.id) {
        classes.push('organ-slot--dimmed');
      }
    }

    if (confirmState === 'confirming') {
      classes.push('organ-slot--confirming');
    }

    if (showPorts || linkingActive) {
      classes.push('organ-slot--ports-visible');
    }

    return classes.join(' ');
  };

  // UI-04: activate an empty slot for a wish (Enter/Space/click)
  const activateWishSlot = useCallback(() => {
    if (confirmState !== 'idle') return;
    setPendingWishSlot(id);
  }, [confirmState, id, setPendingWishSlot]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (isEmpty && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      activateWishSlot();
      return;
    }

    // Escape cancels an in-progress keyboard link (works from any slot)
    if (event.key === 'Escape' && linkingActive) {
      event.preventDefault();
      event.stopPropagation();
      cancelLinking();
      return;
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

  // ==========================================================================
  // UI-04: keyboard chimera linking
  // ==========================================================================

  /** Select (or deselect) an output port as the link source. */
  const handleOutPortActivate = useCallback(
    (port: Port) => {
      if (!organ) return;
      if (isSource(port)) {
        cancelLinking(); // Enter again on the active source toggles it off
        return;
      }
      startLinking(organ.id, port.name);
    },
    [organ, isSource, cancelLinking, startLinking]
  );

  /** Complete the link on a highlighted compatible input port. */
  const handleInPortActivate = useCallback(
    async (port: Port) => {
      if (!organ || !linkingSource) return;

      if (isAlreadyLinked(port)) {
        setLinkingStatus(`Port ${port.name} is already linked to ${linkingSource.organId}:${linkingSource.port}.`);
        return;
      }

      const result = await createChimeraLink(
        {
          ledgerService: getLedgerService(),
          getState: () => useCreatureStore.getState(),
          setState: partial => useCreatureStore.setState(partial),
        },
        linkingSource.organId,
        linkingSource.port,
        organ.id,
        port.name
      );

      if (result.success) {
        cancelLinking();
        setLinkingStatus(
          `Linked ${linkingSource.organId}:${linkingSource.port} to ${organ.id}:${port.name}.`
        );
      } else {
        setLinkingStatus(`Link rejected: ${result.error}`);
      }
    },
    [organ, linkingSource, isAlreadyLinked, cancelLinking, setLinkingStatus]
  );

  const getPortAriaLabel = (port: Port) => {
    const direction = port.direction === 'in' ? 'Input' : 'Output';
    if (isSource(port)) {
      return `${direction} port ${port.name}, selected as link source. Press Enter to cancel selection, Escape to cancel linking.`;
    }
    if (port.direction === 'out') {
      return `${direction} port ${port.name}. Press Enter to select it for chimera linking.`;
    }
    if (linkingActive) {
      if (isAlreadyLinked(port)) {
        return `${direction} port ${port.name}, already linked to the selected source.`;
      }
      if (isCompatibleTarget(port)) {
        return `${direction} port ${port.name}, compatible target. Press Enter to link from ${linkingSource!.organId}:${linkingSource!.port}.`;
      }
      return `${direction} port ${port.name}, not compatible with the selected source.`;
    }
    return `${direction} port ${port.name}`;
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

  // Ports this organ has chimera links on (visual marker)
  const linkedOutPorts = useMemo(() => {
    if (!organ) return new Set<string>();
    return new Set(
      chimeraLinks.filter(l => l.sourceOrganId === organ.id).map(l => l.sourcePort)
    );
  }, [chimeraLinks, organ]);

  const linkedInPorts = useMemo(() => {
    if (!organ) return new Set<string>();
    return new Set(
      chimeraLinks.filter(l => l.targetOrganId === organ.id).map(l => l.targetPort)
    );
  }, [chimeraLinks, organ]);

  return (
    <div
      className={getSlotClasses()}
      role="gridcell"
      tabIndex={0}
      aria-label={
        isEmpty
          ? `Empty organ slot at row ${position.row + 1}, column ${position.col + 1}. Press Enter to add an organ.`
          : `${organ?.name || 'Organ'} at row ${position.row + 1}, column ${position.col + 1}, status: ${organ?.status}`
      }
      onKeyDown={handleKeyDown}
      onClick={isEmpty ? activateWishSlot : undefined}
      onMouseEnter={() => setShowPorts(true)}
      onMouseLeave={() => setShowPorts(false)}
      onFocus={() => setShowPorts(true)}
      onBlur={() => setShowPorts(false)}
      data-testid={organId ? `organ-${organId}` : undefined}
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

            {/* Ports visualization + keyboard linking (UI-04) */}
            {ports.length > 0 && (
              <div
                className={`organ-slot__ports ${showPorts || linkingActive ? 'organ-slot__ports--visible' : ''}`}
                aria-label="Ports for chimera linking"
              >
                {ports.filter(p => p.direction === 'in').map((port, i) => (
                  <button
                    key={`in-${i}`}
                    className={[
                      'organ-slot__port',
                      'organ-slot__port--in',
                      isCompatibleTarget(port) ? 'organ-slot__port--compatible' : '',
                      linkedInPorts.has(port.name) ? 'organ-slot__port--linked' : '',
                    ].filter(Boolean).join(' ')}
                    title={getPortAriaLabel(port)}
                    aria-label={getPortAriaLabel(port)}
                    aria-disabled={linkingActive ? !isCompatibleTarget(port) || isAlreadyLinked(port) : undefined}
                    tabIndex={showPorts || linkingActive ? 0 : -1}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (linkingActive) {
                        void handleInPortActivate(port);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        if (linkingActive) {
                          void handleInPortActivate(port);
                        }
                      } else if (e.key === 'Escape' && linkingActive) {
                        e.preventDefault();
                        e.stopPropagation();
                        cancelLinking();
                      }
                    }}
                  >
                    <span className="organ-slot__port-marker">◀</span>
                    <span className="organ-slot__port-name">{port.name}</span>
                  </button>
                ))}
                {ports.filter(p => p.direction === 'out').map((port, i) => (
                  <button
                    key={`out-${i}`}
                    className={[
                      'organ-slot__port',
                      'organ-slot__port--out',
                      isSource(port) ? 'organ-slot__port--source' : '',
                      linkedOutPorts.has(port.name) ? 'organ-slot__port--linked' : '',
                    ].filter(Boolean).join(' ')}
                    title={getPortAriaLabel(port)}
                    aria-label={getPortAriaLabel(port)}
                    aria-pressed={isSource(port)}
                    tabIndex={showPorts || linkingActive ? 0 : -1}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOutPortActivate(port);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        handleOutPortActivate(port);
                      } else if (e.key === 'Escape' && linkingActive) {
                        e.preventDefault();
                        e.stopPropagation();
                        cancelLinking();
                      }
                    }}
                  >
                    <span className="organ-slot__port-name">{port.name}</span>
                    <span className="organ-slot__port-marker">▶</span>
                  </button>
                ))}
              </div>
            )}

            {/* Organ body: live sandbox when HTML is available */}
            <div className="organ-slot__organ-body">
              <div className="organ-slot__organ-content">
                {organ.indexHtml ? (
                  <SandboxHost
                    organId={organ.id}
                    content={organ.indexHtml}
                    granted={organ.manifest.permissions as Permission[]}
                    theme="dark"
                    reducedMotion={false}
                    dataProvider={readDomainData}
                    onEmit={(port, payload) => routeEmit(organ.id, port, payload)}
                    onStatusChange={(organId, status) =>
                      useCreatureStore.getState().updateOrganStatus(organId, status)
                    }
                    hostRegistry={hostRegistry}
                    onError={(error) =>
                      console.error(`Organ ${organ.id} sandbox error:`, error)
                    }
                  />
                ) : (
                  'Organ content renders here'
                )}
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
                    data-testid="amputate-confirm"
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
                  data-testid="amputate-button"
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

/** Exposed for tests and tooling */
export type { LinkRejectionReason };
