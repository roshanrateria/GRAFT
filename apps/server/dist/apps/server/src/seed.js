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
// ============================================================================
// Seeded Random Number Generator (mulberry32)
// ============================================================================
/**
 * Mulberry32 PRNG - fast, simple, 32-bit state
 * @param seed - Initial seed value
 * @returns A function that returns a random number between 0 and 1
 */
function mulberry32(seed) {
    return function () {
        let t = (seed += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
// ============================================================================
// Data Generation Helpers
// ============================================================================
const NOTES_TEMPLATES = [
    'Feeling good today!',
    'A bit tired but managing.',
    'Great progress on my goals.',
    'Challenging day, but staying positive.',
    'Had a productive morning.',
    'Feeling grateful for the small things.',
    'Need to get more sleep tonight.',
    'Excited about upcoming plans.',
    'Taking time for self-care.',
    'Work was demanding today.',
    'Enjoyed time with family.',
    'Weather affected my mood a bit.',
    'Made some good decisions today.',
    'Feeling motivated and focused.',
    'A bit anxious, but working through it.',
];
const TASK_TITLES = [
    'Review project proposal',
    'Schedule dentist appointment',
    'Complete weekly report',
    'Call mom',
    'Prepare presentation slides',
    'Buy groceries',
    'Submit expense report',
    'Plan weekend trip',
    'Update resume',
    'Clean the apartment',
    'Research new laptop',
    'Send birthday card',
    'Organize photo library',
    'Backup important files',
    'Review subscription costs',
    'Practice guitar',
    'Read chapter 5',
    'Fix kitchen faucet',
    'Plan garden layout',
    'Update budget spreadsheet',
];
const HABIT_NAMES = [
    'Morning meditation',
    'Exercise',
    'Read for 30 minutes',
    'Drink 8 glasses of water',
    'Take vitamins',
    'Write in journal',
    'Practice Spanish',
    'Walk 10,000 steps',
    'No social media before noon',
    'Stretch before bed',
];
const EVENT_TITLES = [
    'Team standup',
    'Client meeting',
    'Lunch with Alex',
    'Doctor appointment',
    'Project deadline',
    'Yoga class',
    'Book club',
    'Dentist checkup',
    'Performance review',
    'Haircut appointment',
    'Grocery shopping',
    'Weekly planning',
    'Call with Sarah',
    'Training session',
    'Volunteer shift',
];
const EVENT_TYPES = ['work', 'personal', 'health', 'social', 'errand'];
/**
 * Generate a random integer between min and max (inclusive)
 */
function randomInt(rng, min, max) {
    return Math.floor(rng() * (max - min + 1)) + min;
}
/**
 * Generate a random boolean with given probability
 */
function randomBool(rng, probability = 0.5) {
    return rng() < probability;
}
/**
 * Pick a random item from an array
 */
function pickRandom(rng, arr) {
    return arr[Math.floor(rng() * arr.length)];
}
/**
 * Format a date as ISO date string (YYYY-MM-DD)
 */
function formatDate(date) {
    return date.toISOString().split('T')[0];
}
/**
 * Format a date as ISO datetime string
 */
function formatDateTime(date) {
    return date.toISOString();
}
/**
 * Add days to a date
 */
function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}
/**
 * Generate a unique ID
 */
function generateId(rng, prefix) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let id = prefix;
    for (let i = 0; i < 8; i++) {
        id += chars[Math.floor(rng() * chars.length)];
    }
    return id;
}
// ============================================================================
// Mood Entries Generator
// ============================================================================
/**
 * Generate mood entries for the past 90 days
 */
function generateMoodEntries(rng, startDate) {
    const entries = [];
    for (let i = 0; i < 90; i++) {
        const date = addDays(startDate, i);
        // Most days have an entry (~85%)
        if (!randomBool(rng, 0.85)) {
            continue;
        }
        // Score distribution: weighted toward middle-high (5-8)
        // with occasional lows (1-4) and highs (9-10)
        let score;
        const scoreRoll = rng();
        if (scoreRoll < 0.1) {
            // 10% chance of low mood
            score = randomInt(rng, 1, 4);
        }
        else if (scoreRoll < 0.9) {
            // 80% chance of moderate mood
            score = randomInt(rng, 5, 8);
        }
        else {
            // 10% chance of high mood
            score = randomInt(rng, 9, 10);
        }
        const entry = {
            date: formatDate(date),
            score,
        };
        // ~40% of entries have notes
        if (randomBool(rng, 0.4)) {
            entry.notes = pickRandom(rng, NOTES_TEMPLATES);
        }
        entries.push(entry);
    }
    return entries;
}
// ============================================================================
// Tasks Generator
// ============================================================================
/**
 * Generate task items created over the past 90 days
 */
function generateTasks(rng, startDate) {
    const tasks = [];
    const taskCount = randomInt(rng, 15, 25);
    for (let i = 0; i < taskCount; i++) {
        const createdDay = randomInt(rng, 0, 89);
        const createdDate = addDays(startDate, createdDay);
        const task = {
            id: generateId(rng, 'task-'),
            title: pickRandom(rng, TASK_TITLES),
            completed: false,
            created: formatDateTime(createdDate),
        };
        // ~60% of tasks have a due date
        if (randomBool(rng, 0.6)) {
            const dueDaysOffset = randomInt(rng, 1, 14);
            const dueDate = addDays(createdDate, dueDaysOffset);
            task.dueDate = formatDate(dueDate);
        }
        // ~70% of tasks are completed (higher for older tasks)
        const ageInDays = 89 - createdDay;
        const completionProbability = 0.5 + ageInDays * 0.005;
        task.completed = randomBool(rng, Math.min(completionProbability, 0.95));
        tasks.push(task);
    }
    // Sort by creation date (oldest first)
    tasks.sort((a, b) => new Date(a.created).getTime() - new Date(b.created).getTime());
    return tasks;
}
// ============================================================================
// Habits Generator
// ============================================================================
/**
 * Generate habits with checkins for the past 90 days
 */
function generateHabits(rng, startDate) {
    const habits = [];
    const habitCount = randomInt(rng, 4, 7);
    // Pick unique habit names
    const availableNames = [...HABIT_NAMES];
    for (let i = 0; i < habitCount && availableNames.length > 0; i++) {
        const nameIndex = Math.floor(rng() * availableNames.length);
        const name = availableNames.splice(nameIndex, 1)[0];
        const checkins = [];
        // Generate checkins for each day
        for (let day = 0; day < 90; day++) {
            const date = addDays(startDate, day);
            // Completion probability varies by habit type
            let completionProbability = 0.6;
            if (name.includes('morning') || name.includes('vitamin')) {
                completionProbability = 0.8;
            }
            else if (name.includes('Exercise') || name.includes('Walk')) {
                completionProbability = 0.5;
            }
            // Weekends might have different patterns
            const dayOfWeek = date.getDay();
            if (dayOfWeek === 0 || dayOfWeek === 6) {
                // Weekend
                if (name.includes('meditation') || name.includes('Read')) {
                    completionProbability += 0.15;
                }
                else if (name.includes('Exercise') || name.includes('steps')) {
                    completionProbability += 0.1;
                }
            }
            checkins.push({
                date: formatDate(date),
                completed: randomBool(rng, completionProbability),
            });
        }
        habits.push({
            id: generateId(rng, 'habit-'),
            name,
            checkins,
        });
    }
    return habits;
}
// ============================================================================
// Calendar Events Generator
// ============================================================================
/**
 * Generate calendar events for the past 90 days
 */
function generateCalendarEvents(rng, startDate) {
    const events = [];
    const eventCount = randomInt(rng, 30, 50);
    for (let i = 0; i < eventCount; i++) {
        const eventDay = randomInt(rng, 0, 89);
        const eventDate = addDays(startDate, eventDay);
        // Random time between 8 AM and 7 PM
        const startHour = randomInt(rng, 8, 19);
        const startMinute = randomBool(rng, 0.5) ? 0 : 30;
        const durationMinutes = pickRandom(rng, [30, 60, 60, 60, 90, 120]);
        const start = new Date(eventDate);
        start.setHours(startHour, startMinute, 0, 0);
        const end = new Date(start);
        end.setMinutes(end.getMinutes() + durationMinutes);
        events.push({
            id: generateId(rng, 'event-'),
            title: pickRandom(rng, EVENT_TITLES),
            start: formatDateTime(start),
            end: formatDateTime(end),
            type: pickRandom(rng, EVENT_TYPES),
        });
    }
    // Sort by start time
    events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    return events;
}
// Store the generated data for access via getters
let generatedData = null;
/**
 * Generate 90 days of seed data with a deterministic seed
 * @param seed - The seed value for the RNG (same seed = same data)
 * @returns The generated seed data
 */
export function generateSeedData(seed) {
    // Create the RNG with the seed
    // Add an offset to prevent the first call from being the seed itself
    const rng = mulberry32(seed);
    // Calculate start date (90 days ago from today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = addDays(today, -89);
    const data = {
        moodEntries: generateMoodEntries(rng, startDate),
        tasks: generateTasks(rng, startDate),
        habits: generateHabits(rng, startDate),
        calendarEvents: generateCalendarEvents(rng, startDate),
    };
    generatedData = data;
    return data;
}
/**
 * Get mood entries (must call generateSeedData first)
 */
export function getMoodEntries() {
    if (!generatedData) {
        throw new Error('Must call generateSeedData() before accessing data');
    }
    return generatedData.moodEntries;
}
/**
 * Get task items (must call generateSeedData first)
 */
export function getTasks() {
    if (!generatedData) {
        throw new Error('Must call generateSeedData() before accessing data');
    }
    return generatedData.tasks;
}
/**
 * Get habits with checkins (must call generateSeedData first)
 */
export function getHabits() {
    if (!generatedData) {
        throw new Error('Must call generateSeedData() before accessing data');
    }
    return generatedData.habits;
}
/**
 * Get calendar events (must call generateSeedData first)
 */
export function getCalendarEvents() {
    if (!generatedData) {
        throw new Error('Must call generateSeedData() before accessing data');
    }
    return generatedData.calendarEvents;
}
/**
 * Get all seed data (must call generateSeedData first)
 */
export function getAllSeedData() {
    if (!generatedData) {
        throw new Error('Must call generateSeedData() before accessing data');
    }
    return generatedData;
}
/**
 * Clear generated data (useful for testing)
 */
export function clearSeedData() {
    generatedData = null;
}
//# sourceMappingURL=seed.js.map