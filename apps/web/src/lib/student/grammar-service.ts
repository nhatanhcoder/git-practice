import { apiRequest } from "../api-client";

/**
 * Grammar catalog + studied-state + reorder practice (02-foundation-grammar.md §2/§3).
 * Thin wrappers — filtering and grading happen server-side (ADR-005); this
 * module never decides correctness, never awards XP, and never sees the answer
 * key (`tokens` is stripped from list/detail responses).
 */

export interface GrammarCatalogItem {
  id: string;
  level: number;
  category: string;
  name: string;
  formula: string;
  hanzi: string;
  pinyin: string;
  vi: string;
  note: string;
  key: string;
  frequency: string;
}

export interface GrammarList {
  items: GrammarCatalogItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface GrammarStudiedRow {
  grammarId: string;
  studied: boolean;
  updatedAt: string;
}

export interface GrammarPracticeStat {
  grammarId: string;
  attempts: number;
  correct: number;
}

export interface GrammarProgress {
  studied: GrammarStudiedRow[];
  practice: GrammarPracticeStat[];
}

export interface GrammarPractice {
  id: string;
  /** The Vietnamese meaning — the learner rebuilds the Chinese sentence from it. */
  prompt: string;
  hanziLength: number;
  /** Server-shuffled token bank; deterministic per point. */
  tokens: string[];
}

export interface GrammarPracticeResult {
  id: string;
  correct: boolean;
  /** The source token order, revealed after submitting. */
  expected: string[];
  attemptCount: number;
  correctCount: number;
}

export async function fetchGrammarList(params: {
  hskLevel?: number;
  category?: string;
  search?: string;
  page?: number;
  limit?: number;
  assignedOnly?: boolean;
}): Promise<GrammarList> {
  const qs = new URLSearchParams();
  if (params.hskLevel !== undefined) qs.set("hskLevel", String(params.hskLevel));
  if (params.category) qs.set("category", params.category);
  if (params.search) qs.set("search", params.search);
  if (params.assignedOnly) qs.set("assignedOnly", "true");
  if (params.page !== undefined) qs.set("page", String(params.page));
  if (params.limit !== undefined) qs.set("limit", String(params.limit));
  const suffix = qs.size > 0 ? `?${qs.toString()}` : "";
  const res = await apiRequest<GrammarCatalogItem[]>(`/student/grammar${suffix}`);
  return {
    items: res.data,
    total: res.meta?.total ?? res.data.length,
    page: res.meta?.page ?? 1,
    limit: res.meta?.limit ?? res.data.length,
    totalPages: res.meta?.totalPages ?? 1,
  };
}

export async function fetchGrammarDetail(id: string): Promise<GrammarCatalogItem> {
  return (
    await apiRequest<GrammarCatalogItem>(`/student/grammar/${encodeURIComponent(id)}`)
  ).data;
}

export async function fetchGrammarProgress(): Promise<GrammarProgress> {
  return (await apiRequest<GrammarProgress>("/student/grammar/progress")).data;
}

export async function setGrammarStudied(
  grammarId: string,
  studied: boolean,
): Promise<{ grammarId: string; studied: boolean; updatedAt: string }> {
  return (
    await apiRequest<{ grammarId: string; studied: boolean; updatedAt: string }>(
      "/student/grammar/progress",
      { method: "PUT", body: JSON.stringify({ grammarId, studied }) },
    )
  ).data;
}

export async function fetchGrammarPractice(id: string): Promise<GrammarPractice> {
  return (
    await apiRequest<GrammarPractice>(
      `/student/grammar/${encodeURIComponent(id)}/practice`,
    )
  ).data;
}

function newSubmissionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `sub-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

export async function submitGrammarPractice(
  id: string,
  answer: string[],
  submissionId: string = newSubmissionId(),
): Promise<{ result: GrammarPracticeResult; submissionId: string }> {
  const result = (
    await apiRequest<GrammarPracticeResult>(
      `/student/grammar/${encodeURIComponent(id)}/practice`,
      { method: "POST", body: JSON.stringify({ submissionId, answer }) },
    )
  ).data;
  return { result, submissionId };
}
