"use client";

// MOCK(student): local XP store for the prototype — replaced by real progress API later.
import { create } from "zustand";

interface StudentProgressState {
  xp: number;
  spentNote: string | null;
  add: (amount: number) => void;
  spend: (amount: number, note: string) => boolean;
  clearNote: () => void;
}

export const useStudentProgress = create<StudentProgressState>((set, get) => ({
  xp: 2450,
  spentNote: null,
  add: (amount) => set((s) => ({ xp: s.xp + amount })),
  spend: (amount, note) => {
    if (get().xp < amount) return false;
    set((s) => ({ xp: s.xp - amount, spentNote: note }));
    return true;
  },
  clearNote: () => set({ spentNote: null }),
}));
