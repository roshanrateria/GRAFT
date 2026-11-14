/**
 * Host Data Provider
 *
 * Maps Nerve data-domain paths (e.g. "mood.entries") to the creature store's
 * built-in data domains. Organs get read-only access via the Nerve API; the
 * store always holds the freshest state (read through getState()).
 */

import { DATA_DOMAIN_PATHS, type DataDomainPath } from '@graft/nerve';
import { useCreatureStore } from '../stores/creatureStore';

/** All valid data-domain paths, in canonical order */
export const DATA_DOMAIN_PATH_LIST: DataDomainPath[] = [
  DATA_DOMAIN_PATHS.moodEntries,
  DATA_DOMAIN_PATHS.tasksItems,
  DATA_DOMAIN_PATHS.habitsCheckins,
  DATA_DOMAIN_PATHS.calendarEvents,
];

/**
 * Type guard: is this string a valid data-domain path?
 */
export function isDataDomainPath(path: string): path is DataDomainPath {
  return (DATA_DOMAIN_PATH_LIST as string[]).includes(path);
}

/**
 * Read the current value of a data-domain path.
 * Returns null for unknown paths (NerveHost denies unpermitted reads anyway).
 *
 * The returned shapes follow the domain names:
 * - "mood.entries"    -> { entries: MoodEntry[] }
 * - "tasks.items"     -> { items: TaskItem[] }
 * - "habits.checkins" -> { checkins: HabitCheckin[] }
 * - "calendar.events" -> { events: CalendarEvent[] }
 */
export function readDomainData(path: string): unknown {
  const state = useCreatureStore.getState();

  switch (path) {
    case DATA_DOMAIN_PATHS.moodEntries:
      return state.mood;
    case DATA_DOMAIN_PATHS.tasksItems:
      return state.tasks;
    case DATA_DOMAIN_PATHS.habitsCheckins:
      return state.habits;
    case DATA_DOMAIN_PATHS.calendarEvents:
      return state.calendar;
    default:
      return null;
  }
}
