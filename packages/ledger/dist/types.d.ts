/**
 * Event types recorded in the ledger
 */
export declare enum EventType {
    /** User submits a wish */
    WISH = "WISH",
    /** Spec finalized */
    SPEC = "SPEC",
    /** Build complete */
    BUILD = "BUILD",
    /** Immune system passed */
    IMMUNE_PASS = "IMMUNE_PASS",
    /** Immune system rejected */
    IMMUNE_FAIL = "IMMUNE_FAIL",
    /** User approved transplant */
    TRANSPLANT_APPROVED = "TRANSPLANT_APPROVED",
    /** Organ removed */
    AMPUTATED = "AMPUTATED",
    /** Ports linked */
    CHIMERA_LINKED = "CHIMERA_LINKED",
    /** Checkup passed */
    CHECKUP_PASS = "CHECKUP_PASS",
    /** Checkup failed */
    CHECKUP_FAIL = "CHECKUP_FAIL",
    /** Healing patch proposed */
    HEAL_PROPOSED = "HEAL_PROPOSED",
    /** Healing patch approved */
    HEAL_APPROVED = "HEAL_APPROVED"
}
/**
 * A single entry in the ledger hash chain
 */
export interface Entry {
    /** Unique identifier for this entry */
    id: string;
    /** Unix timestamp in milliseconds */
    ts: number;
    /** ID of the organ this event relates to (null for system-level events) */
    organ_id: string | null;
    /** Type of event */
    event: EventType;
    /** JSON-encoded payload specific to the event type */
    payload_json: string;
    /** Hash of the previous entry in the chain (64 zeros for genesis) */
    prev_hash: string;
    /** SHA-256 hash of (prev_hash + canonical_json(row_without_hash)) */
    hash: string;
}
/** Genesis prev_hash value (64 zeros) */
export declare const GENESIS_PREV_HASH: string;
//# sourceMappingURL=types.d.ts.map