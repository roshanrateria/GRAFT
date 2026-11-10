/**
 * Nerve API v1 Type Definitions
 *
 * The Nerve API is the exclusive communication channel between organs and the Creature.
 * All messages are JSON with a type discriminator.
 *
 * @see docs/NERVE_API.md
 */
/** Current Nerve API version */
export declare const NERVE_API_VERSION: "1.0.0";
/** Supported theme modes */
export type Theme = 'light' | 'dark';
/** Permission actions that organs can declare */
export type PermissionAction = 'read' | 'emit' | 'subscribe';
/** Permission string format: `<action>:<target>` */
export type Permission = `${PermissionAction}:${string}`;
/** Base type for all host-to-organ messages */
export interface HostToOrganMessageBase {
    type: string;
}
/** Initial handshake message sent to organ after load */
export interface InitMessage extends HostToOrganMessageBase {
    type: 'init';
    /** API version the host supports */
    apiVersion: string;
    /** Current theme */
    theme: Theme;
    /** Whether reduced motion is preferred */
    reducedMotion: boolean;
    /** Granted permissions from manifest */
    granted: Permission[];
}
/** Data delivery message in response to a read request */
export interface DataMessage extends HostToOrganMessageBase {
    type: 'data';
    /** Request ID from the original read message */
    id: string;
    /** The requested data value */
    value: unknown;
}
/** Input from a linked organ (chimera) */
export interface InMessage extends HostToOrganMessageBase {
    type: 'in';
    /** Input port name */
    port: string;
    /** Data from the linked organ */
    payload: unknown;
}
/** Time tick with injected clock */
export interface TickMessage extends HostToOrganMessageBase {
    type: 'tick';
    /** Current timestamp (injected, not Date.now()) */
    now: number;
}
/** Union of all host-to-organ messages */
export type HostToOrganMessage = InitMessage | DataMessage | InMessage | TickMessage;
/** Base type for all organ-to-host messages */
export interface OrganToHostMessageBase {
    type: string;
}
/** Handshake response from organ */
export interface HelloMessage extends OrganToHostMessageBase {
    type: 'hello';
    /** API version the organ supports */
    apiVersion: string;
}
/** Request to read data from a domain */
export interface ReadMessage extends OrganToHostMessageBase {
    type: 'read';
    /** Request ID for correlation with response */
    id: string;
    /** Data path, e.g., 'mood.entries' */
    path: string;
}
/** Emit data to an output port (for chimera linking) */
export interface EmitMessage extends OrganToHostMessageBase {
    type: 'emit';
    /** Output port name */
    port: string;
    /** Data to emit */
    payload: unknown;
}
/** Request iframe resize */
export interface ResizeMessage extends OrganToHostMessageBase {
    type: 'resize';
    /** Desired height in pixels */
    height: number;
}
/** Union of all organ-to-host messages */
export type OrganToHostMessage = HelloMessage | ReadMessage | EmitMessage | ResizeMessage;
/** Check if a message is an init message */
export declare function isInitMessage(msg: unknown): msg is InitMessage;
/** Check if a message is a data message */
export declare function isDataMessage(msg: unknown): msg is DataMessage;
/** Check if a message is an in message */
export declare function isInMessage(msg: unknown): msg is InMessage;
/** Check if a message is a tick message */
export declare function isTickMessage(msg: unknown): msg is TickMessage;
/** Check if a message is a hello message */
export declare function isHelloMessage(msg: unknown): msg is HelloMessage;
/** Check if a message is a read message */
export declare function isReadMessage(msg: unknown): msg is ReadMessage;
/** Check if a message is an emit message */
export declare function isEmitMessage(msg: unknown): msg is EmitMessage;
/** Check if a message is a resize message */
export declare function isResizeMessage(msg: unknown): msg is ResizeMessage;
/** Maximum messages per second per organ before quarantine */
export declare const RATE_LIMIT_PER_SECOND = 20;
/** Maximum payload size in bytes (16 KB) */
export declare const MAX_PAYLOAD_BYTES: number;
/** Possible states of an organ */
export type OrganState = 'loading' | 'handshake' | 'active' | 'quarantined' | 'decayed';
/** Mood entry from mood.entries domain */
export interface MoodEntry {
    /** ISO date */
    date: string;
    /** Score from 1-10 */
    score: number;
    /** Optional notes */
    notes?: string;
}
/** Task item from tasks.items domain */
export interface TaskItem {
    /** Unique identifier */
    id: string;
    /** Task title */
    title: string;
    /** Whether task is completed */
    completed: boolean;
    /** Optional due date (ISO) */
    dueDate?: string;
    /** Creation timestamp (ISO) */
    created: string;
}
/** Habit checkin from habits.checkins domain */
export interface HabitCheckin {
    /** ISO date */
    date: string;
    /** Whether completed */
    completed: boolean;
}
/** Habit from habits.checkins domain */
export interface Habit {
    /** Unique identifier */
    id: string;
    /** Habit name */
    name: string;
    /** Check-in history */
    checkins: HabitCheckin[];
}
/** Calendar event from calendar.events domain */
export interface CalendarEvent {
    /** Unique identifier */
    id: string;
    /** Event title */
    title: string;
    /** Start time (ISO) */
    start: string;
    /** End time (ISO) */
    end: string;
    /** Event type */
    type: string;
}
/** Mood entries data */
export interface MoodEntriesData {
    entries: MoodEntry[];
}
/** Tasks items data */
export interface TasksItemsData {
    items: TaskItem[];
}
/** Habits checkins data */
export interface HabitsCheckinsData {
    habits: Habit[];
}
/** Calendar events data */
export interface CalendarEventsData {
    events: CalendarEvent[];
}
/** Map of data domains to their types */
export interface DataDomains {
    'mood.entries': MoodEntriesData;
    'tasks.items': TasksItemsData;
    'habits.checkins': HabitsCheckinsData;
    'calendar.events': CalendarEventsData;
}
/** Valid data domain paths */
export type DataDomainPath = keyof DataDomains;
//# sourceMappingURL=types.d.ts.map