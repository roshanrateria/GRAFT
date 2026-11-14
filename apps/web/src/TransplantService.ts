/**
 * Transplant Service
 *
 * Singleton wiring for the browser: TransactionCoordinator backed by the
 * server's persistent ledger (via FetchLedgerService) and the real creature
 * store. Used by the consent flow in DoctorNotes.
 */

import { createTransactionCoordinator, type TransactionCoordinator } from './TransactionCoordinator.js';
import { createFetchLedgerService, type FetchLedgerServiceOptions } from './ledger/FetchLedgerService.js';
import { useCreatureStore } from './stores/creatureStore.js';

let ledgerService: ReturnType<typeof createFetchLedgerService> | null = null;
let coordinator: TransactionCoordinator | null = null;

/**
 * Get (lazily create) the browser's ledger service.
 * All ledger-first flows (transplant, chimera linking) share one instance.
 */
export function getLedgerService(options?: FetchLedgerServiceOptions) {
  if (!ledgerService) {
    ledgerService = createFetchLedgerService(options);
  }
  return ledgerService;
}

/**
 * Get (lazily create) the browser's TransactionCoordinator.
 */
export function getTransplantCoordinator(): TransactionCoordinator {
  if (!coordinator) {
    coordinator = createTransactionCoordinator({
      ledgerService: getLedgerService(),
      store: {
        getState: () => useCreatureStore.getState(),
        setState: partial => useCreatureStore.setState(partial),
      },
    });
  }
  return coordinator;
}

/** Test hook: drop cached services (forces re-creation next call). */
export function resetTransplantCoordinator(): void {
  ledgerService = null;
  coordinator = null;
}
