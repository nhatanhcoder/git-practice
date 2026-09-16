import { apiRequest } from "../api-client";
export interface Mistake {
 id: string; sourceType: "flashcard" | "question"; sourceId: string;
 status: "needs_review" | "reviewed"; version: number; eventAt: string;
 lastReviewedAt: string | null; available: boolean; prompt: string;
 pinyin: string | null; meaning: string | null; audioUrl: string | null;
 options: {id: string; text: string}[];
}
export async function fetchMistakes(page = 1) {
 const res = await apiRequest<Mistake[]>(`/student/mistakes?page=${page}&limit=20`);
 return {items: res.data, totalPages: res.meta?.totalPages ?? 0};
}
export async function fetchMistakeSession() {
 return (await apiRequest<Mistake[]>("/student/mistakes/review")).data;
}
export async function reviewMistake(item: Mistake, answer: {recalled: boolean} | {selectedOptions: string[]}) {
 return (await apiRequest<{correct: boolean; status: string; version: number; explanation: string | null}>(
 `/student/mistakes/${item.id}/review`, {method: "POST", body: JSON.stringify({version: item.version, ...answer})})).data;
}
