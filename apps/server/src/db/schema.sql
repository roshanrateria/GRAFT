-- Ledger table for hash-chain provenance
-- Each row represents a state change in the Creature
CREATE TABLE IF NOT EXISTS ledger (
  id TEXT PRIMARY KEY,
  ts INTEGER NOT NULL,
  organ_id TEXT,
  event TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  prev_hash TEXT NOT NULL,
  hash TEXT NOT NULL
);

-- Index for efficient organ_id queries
CREATE INDEX IF NOT EXISTS idx_ledger_organ_id ON ledger(organ_id);

-- Index for chronological queries
CREATE INDEX IF NOT EXISTS idx_ledger_ts ON ledger(ts);
