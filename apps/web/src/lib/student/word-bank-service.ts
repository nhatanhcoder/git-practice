import { apiRequest } from "../api-client";

/**
 * The personal word bank (S-SRS-6/7, `docs/api/modules/student/02-word-bank.md`).
 *
 * The bank is a bookmark list, not an SRS state: saving never schedules a review
 * (INV-WB-06) and deleting never resets one (INV-WB-08). Reviewing banked words goes
 * through the EXISTING flashcards review endpoint — the session endpoint below only
 * returns card payloads shaped exactly like module 01's, so the SRS screen accepts them
 * unchanged.
 */

export interface SavedWord {
  id: string;
  hanzi: string;
  pinyin: string;
  meaning: string;
  sourceType: "lesson" | "passage" | "flashcard_browser" | "other";
  sourceId: string | null;
  note: string | null;
  savedAt: string;
}

export interface BankReviewCard {
  id: string | null;
  hskLevel: number | null;
  hanzi: string;
  pinyin: string;
  meaning: string;
  exampleSentence: string | null;
  examplePinyin: string | null;
  exampleMeaning: string | null;
  audioUrl: string | null;
  tags: string[];
  state: {
    easeFactor: number;
    repetitionsCount: number;
    intervalDays: number;
    nextReviewDate: string;
    lastReviewedAt: string | null;
    isSavedByUser: boolean;
    totalReviews: number;
    correctReviews: number;
  } | null;
}

export async function saveWord(input: {
  hanzi: string;
  pinyin: string;
  meaning: string;
  sourceType: "lesson" | "passage" | "flashcard_browser" | "other";
  sourceId?: string;
  note?: string;
}): Promise<SavedWord> {
  const res = await apiRequest<{ row: SavedWord; created: boolean }>("/student/word-bank", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return res.data.row;
}

export async function fetchWordBank(page = 1, limit = 50): Promise<{
  data: SavedWord[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}> {
  const res = await apiRequest<SavedWord[]>(`/student/word-bank?page=${page}&limit=${limit}`);
  return { data: res.data, meta: res.meta! };
}

export async function deleteSavedWord(id: string): Promise<void> {
  await apiRequest(`/student/word-bank/${id}`, { method: "DELETE" });
}

export async function fetchBankReviewCards(): Promise<BankReviewCard[]> {
  const res = await apiRequest<BankReviewCard[]>("/student/word-bank/review");
  return res.data;
}
