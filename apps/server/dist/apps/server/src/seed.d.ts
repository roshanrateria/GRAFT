/**
 * Deterministic seed data generator for the Creature
 *
 * Generates 90 days of plausible data using a seeded RNG (mulberry32)
 * for reproducibility. Same seed always produces the same data.
 *
 * Data domains (read-only to organs):
 * - mood.entries: Mood entries with date, score (1-10), optional notes
 * - tasks.items: Task items with id, title, completed, dueDate, created
 * - habits.checkins: Habits with id, name, checkins (date, completed)
 * - calendar.events: Calendar events with id, title, start, end, type
 */
import type { MoodEntry, TaskItem, Habit, CalendarEvent } from '@graft/nerve';
/**
 * Seed data container
 */
export interface SeedData {
    moodEntries: MoodEntry[];
    tasks: TaskItem[];
    habits: Habit[];
    calendarEvents: CalendarEvent[];
}
/**
 * Generate 90 days of seed data with a deterministic seed
 * @param seed - The seed value for the RNG (same seed = same data)
 * @returns The generated seed data
 */
export declare function generateSeedData(seed: number): SeedData;
/**
 * Get mood entries (must call generateSeedData first)
 */
export declare function getMoodEntries(): MoodEntry[];
/**
 * Get task items (must call generateSeedData first)
 */
export declare function getTasks(): TaskItem[];
/**
 * Get habits with checkins (must call generateSeedData first)
 */
export declare function getHabits(): Habit[];
/**
 * Get calendar events (must call generateSeedData first)
 */
export declare function getCalendarEvents(): CalendarEvent[];
/**
 * Get all seed data (must call generateSeedData first)
 */
export declare function getAllSeedData(): SeedData;
/**
 * Clear generated data (useful for testing)
 */
export declare function clearSeedData(): void;
//# sourceMappingURL=seed.d.ts.map