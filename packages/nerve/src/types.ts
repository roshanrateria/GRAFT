/**
 * Nerve API v1 Type Definitions
 *
 * The Nerve API is the exclusive communication channel between organs and the Creature.
 * All messages are JSON with a type discriminator.
 *
 * @see docs/NERVE_API.md
 */

// ============================================================================
// API Version
// ============================================================================

/** Current Nerve API version */
export const NERVE_API_VERSION = '1.0.0' as const;

// ============================================================================
// Theme Types
// ============================================================================

/** Supported theme modes */
export type Theme = 'light' | 'dark';

// ============================================================================
// Permissions
// ============================================================================

/** Permission actions that organs can declare */
export type PermissionAction = 'read' | 'emit' | 'subscribe';

/** Permission string format: `<action>:<target>` */
export type Permission = `${PermissionAction}:${string}`;

// ============================================================================
// Host → Organ Messages
// ============================================================================

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
export type HostToOrganMessage =
  | InitMessage
  | DataMessage
  | InMessage
  | TickMessage;

// ============================================================================
// Organ → Host Messages
// ============================================================================

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
export type OrganToHostMessage =
  | HelloMessage
  | ReadMessage
  | EmitMessage
  | ResizeMessage;

// ============================================================================
// Message Type Guards
// ============================================================================

/** Check if a message is an init message */
export function isInitMessage(msg: unknown): msg is InitMessage {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    (msg as Record<string, unknown>).type === 'init'
  );
}

/** Check if a message is a data message */
export function isDataMessage(msg: unknown): msg is DataMessage {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    (msg as Record<string, unknown>).type === 'data'
  );
}

/** Check if a message is an in message */
export function isInMessage(msg: unknown): msg is InMessage {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    (msg as Record<string, unknown>).type === 'in'
  );
}

/** Check if a message is a tick message */
export function isTickMessage(msg: unknown): msg is TickMessage {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    (msg as Record<string, unknown>).type === 'tick'
  );
}

/** Check if a message is a hello message */
export function isHelloMessage(msg: unknown): msg is HelloMessage {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    (msg as Record<string, unknown>).type === 'hello'
  );
}

/** Check if a message is a read message */
export function isReadMessage(msg: unknown): msg is ReadMessage {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    (msg as Record<string, unknown>).type === 'read'
  );
}

/** Check if a message is an emit message */
export function isEmitMessage(msg: unknown): msg is EmitMessage {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    (msg as Record<string, unknown>).type === 'emit'
  );
}

/** Check if a message is a resize message */
export function isResizeMessage(msg: unknown): msg is ResizeMessage {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    (msg as Record<string, unknown>).type === 'resize'
  );
}

// ============================================================================
// Constraints
// ============================================================================

/** Maximum messages per second per organ before quarantine */
export const RATE_LIMIT_PER_SECOND = 20;

/** Maximum payload size in bytes (16 KB) */
export const MAX_PAYLOAD_BYTES = 16 * 1024;

// ============================================================================
// Organ State
// ============================================================================

/** Possible states of an organ */
export type OrganState =
  | 'loading'
  | 'handshake'
  | 'active'
  | 'quarantined'
  | 'decayed';

// ============================================================================
// Data Domains (read-only data provided by Creature)
// ============================================================================

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
