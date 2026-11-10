/**
 * Creature Store - Zustand state management for the Creature host
 *
 * Manages the slot grid, organ instances, and built-in data domains.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// =============================================================================
// Types
// =============================================================================

export interface MoodEntry {
  id: string;
  date: string;
  mood: number; // 1-10 scale
  notes?: string;
}

export interface TaskItem {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high';
}

export interface HabitCheckin {
  id: string;
  habitId: string;
  date: string;
  completed: boolean;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  duration?: number;
}

export interface OrganInstance {
  id: string;
  name: string;
  manifest: OrganManifest;
  status: 'pending' | 'active' | 'quarantined' | 'decayed';
  installedAt: string;
}

export interface OrganManifest {
  name: string;
  version: string;
  apiVersion: string;
  permissions: string[];
  ports: { name: string; direction: 'in' | 'out'; schema: object }[];
  slotSize: 'small' | 'medium' | 'large';
}

export interface SlotPosition {
  row: number;
  col: number;
}

export interface OrganSlot {
  id: string;
  position: SlotPosition;
  size: 'small' | 'medium' | 'large';
  organId?: string;
}

export interface CreatureState {
  // Slots
  slots: OrganSlot[];
  
  // Organs
  organs: Map<string, OrganInstance>;
  
  // Built-in data domains (read-only to organs)
  mood: {
    entries: MoodEntry[];
  };
  tasks: {
    items: TaskItem[];
  };
  habits: {
    checkins: HabitCheckin[];
  };
  calendar: {
    events: CalendarEvent[];
  };
  
  // Actions
  initializeSlots: (rows: number, cols: number) => void;
  addOrgan: (slotId: string, organ: OrganInstance) => void;
  removeOrgan: (slotId: string) => void;
  updateOrganStatus: (organId: string, status: OrganInstance['status']) => void;
}

// =============================================================================
// Seeded Data Generator
// =============================================================================

/**
 * Simple seeded random number generator for deterministic data generation.
 * Uses mulberry32 algorithm.
 */
function seededRandom(seed: number): () => number {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/**
 * Generate 90 days of plausible seeded data for demos.
 * Uses deterministic RNG so demos are repeatable.
 */
function generateSeededData(seed: number = 42): {
  mood: MoodEntry[];
  tasks: TaskItem[];
  habits: HabitCheckin[];
  calendar: CalendarEvent[];
} {
  const random = seededRandom(seed);
  const now = new Date();
  const mood: MoodEntry[] = [];
  const tasks: TaskItem[] = [];
  const habits: HabitCheckin[] = [];
  const calendar: CalendarEvent[] = [];

  // Generate 90 days of mood entries
  for (let i = 0; i < 90; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    mood.push({
      id: `mood-${i}`,
      date: date.toISOString().split('T')[0],
      mood: Math.floor(random() * 5) + 4, // 4-9 range
      notes: random() > 0.7 ? 'Feeling reflective today' : undefined,
    });
  }

  // Generate sample tasks
  const taskTitles = [
    'Review quarterly report',
    'Prepare presentation',
    'Schedule team meeting',
    'Update documentation',
    'Code review',
    'Deploy feature branch',
    'Write unit tests',
    'Refactor legacy code',
  ];

  for (let i = 0; i < 12; i++) {
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + Math.floor(random() * 14) - 3);
    
    tasks.push({
      id: `task-${i}`,
      title: taskTitles[Math.floor(random() * taskTitles.length)],
      completed: random() > 0.6,
      dueDate: dueDate.toISOString().split('T')[0],
      priority: ['low', 'medium', 'high'][Math.floor(random() * 3)] as TaskItem['priority'],
    });
  }

  // Generate habit checkins for the last 90 days
  const habitIds = ['habit-1', 'habit-2', 'habit-3'];
  for (let i = 0; i < 90; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    for (const habitId of habitIds) {
      if (random() > 0.3) { // 70% completion rate
        habits.push({
          id: `checkin-${habitId}-${i}`,
          habitId,
          date: date.toISOString().split('T')[0],
          completed: random() > 0.2, // 80% of tracked days completed
        });
      }
    }
  }

  // Generate calendar events
  for (let i = 0; i < 8; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() + Math.floor(random() * 14));
    
    calendar.push({
      id: `event-${i}`,
      title: ['Team standup', 'Client call', 'Planning session', '1:1 meeting', 'Demo'][Math.floor(random() * 5)],
      date: date.toISOString().split('T')[0],
      time: `${9 + Math.floor(random() * 8)}:${random() > 0.5 ? '00' : '30'}`,
      duration: [30, 60, 90][Math.floor(random() * 3)],
    });
  }

  return { mood, tasks, habits, calendar };
}

// =============================================================================
// Store
// =============================================================================

const SEED = 42;
const GRID_ROWS = 3;
const GRID_COLS = 3;

const initialData = generateSeededData(SEED);

// Generate initial slots (3x3 grid)
function generateInitialSlots(): OrganSlot[] {
  const slots: OrganSlot[] = [];
  let id = 0;
  
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      slots.push({
        id: `slot-${id++}`,
        position: { row, col },
        size: 'medium',
      });
    }
  }
  
  return slots;
}

export const useCreatureStore = create<CreatureState>()(
  devtools(
    (set, get) => ({
      // Initial state
      slots: generateInitialSlots(),
      organs: new Map(),
      mood: { entries: initialData.mood },
      tasks: { items: initialData.tasks },
      habits: { checkins: initialData.habits },
      calendar: { events: initialData.calendar },

      // Actions
      initializeSlots: (rows, cols) => {
        const slots: OrganSlot[] = [];
        let id = 0;
        
        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            slots.push({
              id: `slot-${id++}`,
              position: { row, col },
              size: 'medium',
            });
          }
        }
        
        set({ slots });
      },

      addOrgan: (slotId, organ) => {
        const { slots, organs } = get();
        
        // Update slot to reference organ
        const updatedSlots = slots.map(slot =>
          slot.id === slotId ? { ...slot, organId: organ.id } : slot
        );
        
        // Add organ to registry
        const updatedOrgans = new Map(organs);
        updatedOrgans.set(organ.id, organ);
        
        set({ slots: updatedSlots, organs: updatedOrgans });
      },

      removeOrgan: (slotId) => {
        const { slots, organs } = get();
        const slot = slots.find(s => s.id === slotId);
        
        if (!slot?.organId) return;
        
        // Remove organ reference from slot
        const updatedSlots = slots.map(s =>
          s.id === slotId ? { ...s, organId: undefined } : s
        );
        
        // Remove organ from registry
        const updatedOrgans = new Map(organs);
        updatedOrgans.delete(slot.organId);
        
        set({ slots: updatedSlots, organs: updatedOrgans });
      },

      updateOrganStatus: (organId, status) => {
        const { organs } = get();
        const organ = organs.get(organId);
        
        if (!organ) return;
        
        const updatedOrgans = new Map(organs);
        updatedOrgans.set(organId, { ...organ, status });
        
        set({ organs: updatedOrgans });
      },
    }),
    { name: 'creature-store' }
  )
);
