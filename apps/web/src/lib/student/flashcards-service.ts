import { apiRequest } from "../api-client";

export type SrsState = {
  easeFactor: number;
  repetitionsCount: number;
  intervalDays: number;
  nextReviewDate: string;
  lastReviewedAt: string | null;
  isSavedByUser: boolean;
  totalReviews: number;
  correctReviews: number;
};

export type Flashcard = {
  id: string;
  hskLevel: number;
  hanzi: string;
  pinyin: string;
  meaning: string;
  exampleSentence: string | null;
  examplePinyin: string | null;
  exampleMeaning: string | null;
  audioUrl: string | null;
  tags: string[];
  state: SrsState | null;
};

export type SrsStats = {
  totalCards: number;
  dueToday: number;
  matureCards: number;
  retentionRate: number;
  totalReviews: number;
  streak: number | null;
};

export type SrsRating = 0 | 3 | 4 | 5;

export async function fetchFlashcards(hskLevel: number): Promise<Flashcard[]> {
  return (await apiRequest<Flashcard[]>(`/student/flashcards?hskLevel=${hskLevel}`)).data;
}

export async function fetchDueFlashcards(): Promise<Flashcard[]> {
  return (await apiRequest<Flashcard[]>("/student/flashcards/due")).data;
}

export async function fetchSrsStats(): Promise<SrsStats> {
  return (await apiRequest<SrsStats>("/student/flashcards/stats")).data;
}

export async function reviewFlashcard(id: string, rating: SrsRating): Promise<SrsState> {
  const response = await apiRequest<{ state: SrsState }>(`/student/flashcards/${id}/review`, {
    method: "POST",
    body: JSON.stringify({ rating }),
  });
  return response.data.state;
}

