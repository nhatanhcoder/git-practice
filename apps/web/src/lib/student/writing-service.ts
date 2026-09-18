import { apiRequest } from "../api-client";

/**
 * Live F11 data — the HSK 1–9 character catalogue.
 *
 * Replaces the 24-character `writingChars` fixture. The catalogue is served
 * from `apps/api/content/writing.json` (587 characters, audited in A10/A11), so
 * the list, filters, stroke order and example words are all real content.
 *
 * **Practice progress is not here.** Scoring is a coverage heuristic on the
 * canvas and the record of it lives in the browser store; persisting it
 * server-side needs a writing-progress table the owner has not approved. Until
 * then the pages say so rather than implying the server remembers anything.
 */

export type StrokeKind =
  | "ngang" | "so" | "phay" | "mac" | "cham" | "moc" | "gap" | "hat";

export interface WordExample {
  word: string;
  pinyin: string;
  vi: string;
}

export interface WritingChar {
  id: string;
  char: string;
  pinyin: string;
  vi: string;
  level: number;
  strokeCount: number;
  strokes: StrokeKind[];
  radical: string;
  radicalName: string;
  words: WordExample[];
  mnemonic: string;
  strokePaths: string[] | null;
}

/** Lean shape returned by the list endpoint. */
export type WritingCharSummary = Pick<
  WritingChar,
  "id" | "char" | "pinyin" | "vi" | "level" | "strokeCount" | "radical" | "radicalName"
>;

export async function fetchWritingChars(): Promise<WritingCharSummary[]> {
  return (await apiRequest<WritingCharSummary[]>("/student/writing")).data;
}

export async function fetchWritingChar(id: string): Promise<WritingChar> {
  return (await apiRequest<WritingChar>(`/student/writing/${encodeURIComponent(id)}`)).data;
}

export interface WritingProgressRow {
  characterId: string;
  practised: true;
  updatedAt: string;
}

export async function fetchWritingProgress(): Promise<WritingProgressRow[]> {
  const response = await apiRequest<{ practised: WritingProgressRow[] }>(
    "/student/writing/progress",
  );
  return response.data.practised;
}

export async function markWritingPractised(id: string): Promise<WritingProgressRow> {
  return (
    await apiRequest<WritingProgressRow>(
      `/student/writing/${encodeURIComponent(id)}/progress`,
      { method: "PUT", body: JSON.stringify({ practised: true }) },
    )
  ).data;
}
