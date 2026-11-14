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
  /** Organ HTML (from the approved bundle) rendered inside a sandboxed iframe */
  indexHtml?: string;
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
  
  // Chimera links (organ output port -> organ input port)
  chimeraLinks: ChimeraLink[];
  
  // Active keyboard-linking source (UI-04): organ + output port awaiting a target
  linkingSource: { organId: string; port: string } | null;
  
  // Status message for assistive tech (screen readers) during linking
  linkingStatus: string | null;
  
  // Slot awaiting a wish (set when the user activates an empty slot)
  pendingWishSlot: string | null;
  
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
  addChimeraLink: (link: ChimeraLink) => void;
  removeChimeraLink: (linkId: string) => void;
  getChimeraLinksFor: (organId: string) => ChimeraLink[];
  startLinking: (organId: string, port: string) => void;
  cancelLinking: () => void;
  setLinkingStatus: (message: string | null) => void;
  setPendingWishSlot: (slotId: string | null) => void;
}

/**
 * A chimera link: one organ's output port feeds another organ's input port.
 * Shape mirrors SnapshotManager's PortLink so snapshots capture links too.
 */
export interface ChimeraLink {
  id: string;
  sourceOrganId: string;
  sourcePort: string;
  targetOrganId: string;
  targetPort: string;
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
      chimeraLinks: [],
      linkingSource: null,
      linkingStatus: null,
      pendingWishSlot: null,
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
        const { slots, organs, chimeraLinks } = get();
        const slot = slots.find(s => s.id === slotId);
        
        if (!slot?.organId) return;
        
        const removedOrganId = slot.organId;
        
        // Remove organ reference from slot
        const updatedSlots = slots.map(s =>
          s.id === slotId ? { ...s, organId: undefined } : s
        );
        
        // Remove organ from registry
        const updatedOrgans = new Map(organs);
        updatedOrgans.delete(removedOrganId);
        
        // Remove chimera links involving the removed organ
        const updatedLinks = chimeraLinks.filter(
          l => l.sourceOrganId !== removedOrganId && l.targetOrganId !== removedOrganId
        );
        
        // Clear linking mode if its source organ was removed
        const linkingSource = get().linkingSource;
        const clearedLinking =
          linkingSource?.organId === removedOrganId
            ? { linkingSource: null, linkingStatus: 'Linking cancelled.' }
            : {};
        
        set({ slots: updatedSlots, organs: updatedOrgans, chimeraLinks: updatedLinks, ...clearedLinking });
      },

      updateOrganStatus: (organId, status) => {
        const { organs } = get();
        const organ = organs.get(organId);
        
        if (!organ) return;
        
        const updatedOrgans = new Map(organs);
        updatedOrgans.set(organId, { ...organ, status });
        
        set({ organs: updatedOrgans });
      },

      addChimeraLink: (link) => {
        const { chimeraLinks } = get();
        
        // Ignore exact duplicates (same source port and target port)
        const exists = chimeraLinks.some(
          l =>
            l.sourceOrganId === link.sourceOrganId &&
            l.sourcePort === link.sourcePort &&
            l.targetOrganId === link.targetOrganId &&
            l.targetPort === link.targetPort
        );
        if (exists) return;
        
        set({ chimeraLinks: [...chimeraLinks, link] });
      },

      removeChimeraLink: (linkId) => {
        set({
          chimeraLinks: get().chimeraLinks.filter(l => l.id !== linkId),
        });
      },

      getChimeraLinksFor: (organId) => {
        return get().chimeraLinks.filter(
          l => l.sourceOrganId === organId || l.targetOrganId === organId
        );
      },

      startLinking: (organId, port) => {
        set({
          linkingSource: { organId, port },
          linkingStatus: `Linking: select an input port to connect to ${organId}:${port}. Escape cancels.`,
        });
      },

      cancelLinking: () => {
        const { linkingSource } = get();
        set({
          linkingSource: null,
          linkingStatus: linkingSource ? 'Linking cancelled.' : null,
        });
      },

      setLinkingStatus: (message) => {
        set({ linkingStatus: message });
      },

      setPendingWishSlot: (slotId) => {
        set({ pendingWishSlot: slotId });
      },
    }),
    { name: 'creature-store' }
  )
);
