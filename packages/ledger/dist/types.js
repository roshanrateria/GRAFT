/**
 * Event types recorded in the ledger
 */
export var EventType;
(function (EventType) {
    /** User submits a wish */
    EventType["WISH"] = "WISH";
    /** Spec finalized */
    EventType["SPEC"] = "SPEC";
    /** Build complete */
    EventType["BUILD"] = "BUILD";
    /** Immune system passed */
    EventType["IMMUNE_PASS"] = "IMMUNE_PASS";
    /** Immune system rejected */
    EventType["IMMUNE_FAIL"] = "IMMUNE_FAIL";
    /** User approved transplant */
    EventType["TRANSPLANT_APPROVED"] = "TRANSPLANT_APPROVED";
    /** Organ removed */
    EventType["AMPUTATED"] = "AMPUTATED";
    /** Ports linked */
    EventType["CHIMERA_LINKED"] = "CHIMERA_LINKED";
    /** Checkup passed */
    EventType["CHECKUP_PASS"] = "CHECKUP_PASS";
    /** Checkup failed */
    EventType["CHECKUP_FAIL"] = "CHECKUP_FAIL";
    /** Healing patch proposed */
    EventType["HEAL_PROPOSED"] = "HEAL_PROPOSED";
    /** Healing patch approved */
    EventType["HEAL_APPROVED"] = "HEAL_APPROVED";
})(EventType || (EventType = {}));
/** Genesis prev_hash value (64 zeros) */
export const GENESIS_PREV_HASH = '0'.repeat(64);
//# sourceMappingURL=types.js.map