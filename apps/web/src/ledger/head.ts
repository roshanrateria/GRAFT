/**
 * Ledger chain-head resolution.
 *
 * Shared by the TransactionCoordinator, AmputationService and ChimeraLinking
 * to compute the `prev_hash` for a new entry: the hash of the current chain
 * tail, or the genesis value for an empty chain.
 *
 * LED: SQLiteLedgerService.append validates prev_hash against the chain head,
 * so callers MUST resolve it instead of passing a placeholder.
 */

import { GENESIS_PREV_HASH, type LedgerService } from '@graft/ledger';

/**
 * Resolve the hash a new ledger entry must chain from.
 * @param ledger - Any ledger service (SQLite-backed, fetch-backed, in-memory)
 * @returns The current tail hash, or GENESIS_PREV_HASH when the chain is empty
 */
export async function getChainHeadHash(ledger: LedgerService): Promise<string> {
  const history = await ledger.getHistory();
  const head = history[history.length - 1];
  return head ? head.hash : GENESIS_PREV_HASH;
}
