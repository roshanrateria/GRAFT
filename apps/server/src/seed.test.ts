/**
 * Tests for seed data generator
 *
 * Validates that:
 * - Same seed produces identical data
 * - Different seeds produce different data
 * - Data conforms to expected types
 * - Data is plausible (values in expected ranges)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateSeedData,
  getMoodEntries,
  getTasks,
  getHabits,
  getCalendarEvents,
  clearSeedData,
  getAllSeedData,
} from './seed.js';

describe('Seed Data Generator', () => {
  beforeEach(() => {
    clearSeedData();
  });

  describe('determinism', () => {
    it('produces identical data with the same seed', () => {
      const data1 = generateSeedData(12345);
      clearSeedData();
      const data2 = generateSeedData(12345);

      expect(data1.moodEntries).toEqual(data2.moodEntries);
      expect(data1.tasks).toEqual(data2.tasks);
      expect(data1.habits).toEqual(data2.habits);
      expect(data1.calendarEvents).toEqual(data2.calendarEvents);
    });

    it('produces different data with different seeds', () => {
      const data1 = generateSeedData(12345);
      clearSeedData();
      const data2 = generateSeedData(54321);

      // Data should be different (very unlikely to be identical by chance)
      const sameMood =
        JSON.stringify(data1.moodEntries) === JSON.stringify(data2.moodEntries);
      expect(sameMood).toBe(false);
    });
  });

  describe('mood entries', () => {
    it('generates mood entries with valid scores', () => {
      const data = generateSeedData(42);
      const entries = data.moodEntries;

      expect(entries.length).toBeGreaterThan(0);
      expect(entries.length).toBeLessThanOrEqual(90);

      for (const entry of entries) {
        expect(entry.score).toBeGreaterThanOrEqual(1);
        expect(entry.score).toBeLessThanOrEqual(10);
        expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        if (entry.notes) {
          expect(typeof entry.notes).toBe('string');
          expect(entry.notes.length).toBeGreaterThan(0);
        }
      }
    });

    it('some entries have notes', () => {
      const data = generateSeedData(100);
      const withNotes = data.moodEntries.filter((e) => e.notes);
      expect(withNotes.length).toBeGreaterThan(0);
    });
  });

  describe('tasks', () => {
    it('generates tasks with valid properties', () => {
      const data = generateSeedData(42);
      const tasks = data.tasks;

      expect(tasks.length).toBeGreaterThanOrEqual(15);
      expect(tasks.length).toBeLessThanOrEqual(25);

      for (const task of tasks) {
        expect(task.id).toMatch(/^task-[a-z0-9]{8}$/);
        expect(task.title.length).toBeGreaterThan(0);
        expect(typeof task.completed).toBe('boolean');
        expect(task.created).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        if (task.dueDate) {
          expect(task.dueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        }
      }
    });

    it('some tasks are completed', () => {
      const data = generateSeedData(100);
      const completed = data.tasks.filter((t) => t.completed);
      expect(completed.length).toBeGreaterThan(0);
    });

    it('some tasks are not completed', () => {
      const data = generateSeedData(100);
      const notCompleted = data.tasks.filter((t) => !t.completed);
      expect(notCompleted.length).toBeGreaterThan(0);
    });
  });

  describe('habits', () => {
    it('generates habits with checkins', () => {
      const data = generateSeedData(42);
      const habits = data.habits;

      expect(habits.length).toBeGreaterThanOrEqual(4);
      expect(habits.length).toBeLessThanOrEqual(7);

      for (const habit of habits) {
        expect(habit.id).toMatch(/^habit-[a-z0-9]{8}$/);
        expect(habit.name.length).toBeGreaterThan(0);
        expect(habit.checkins.length).toBe(90);

        for (const checkin of habit.checkins) {
          expect(checkin.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
          expect(typeof checkin.completed).toBe('boolean');
        }
      }
    });

    it('some checkins are completed', () => {
      const data = generateSeedData(100);
      for (const habit of data.habits) {
        const completed = habit.checkins.filter((c: { completed: boolean }) => c.completed);
        expect(completed.length).toBeGreaterThan(0);
      }
    });
  });

  describe('calendar events', () => {
    it('generates events with valid properties', () => {
      const data = generateSeedData(42);
      const events = data.calendarEvents;

      expect(events.length).toBeGreaterThanOrEqual(30);
      expect(events.length).toBeLessThanOrEqual(50);

      for (const event of events) {
        expect(event.id).toMatch(/^event-[a-z0-9]{8}$/);
        expect(event.title.length).toBeGreaterThan(0);
        expect(event.start).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        expect(event.end).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        expect(event.type).toBeDefined();
      }
    });

    it('end time is after start time', () => {
      const data = generateSeedData(100);
      for (const event of data.calendarEvents) {
        const start = new Date(event.start);
        const end = new Date(event.end);
        expect(end.getTime()).toBeGreaterThan(start.getTime());
      }
    });

    it('events are sorted by start time', () => {
      const data = generateSeedData(100);
      for (let i = 1; i < data.calendarEvents.length; i++) {
        const prev = new Date(data.calendarEvents[i - 1].start);
        const curr = new Date(data.calendarEvents[i].start);
        expect(curr.getTime()).toBeGreaterThanOrEqual(prev.getTime());
      }
    });
  });

  describe('getter functions', () => {
    it('throws if generateSeedData not called first', () => {
      expect(() => getMoodEntries()).toThrow(
        'Must call generateSeedData() before accessing data'
      );
      expect(() => getTasks()).toThrow(
        'Must call generateSeedData() before accessing data'
      );
      expect(() => getHabits()).toThrow(
        'Must call generateSeedData() before accessing data'
      );
      expect(() => getCalendarEvents()).toThrow(
        'Must call generateSeedData() before accessing data'
      );
    });

    it('returns data after generateSeedData is called', () => {
      generateSeedData(42);
      expect(getMoodEntries()).toBeDefined();
      expect(getTasks()).toBeDefined();
      expect(getHabits()).toBeDefined();
      expect(getCalendarEvents()).toBeDefined();
      expect(getAllSeedData()).toBeDefined();
    });
  });
});
