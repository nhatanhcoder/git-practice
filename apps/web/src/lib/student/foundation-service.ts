import { apiRequest } from "../api-client";

/**
 * Foundation catalog + studied-state — 02-foundation-grammar.md §2/§3.
 * Source fields arrive verbatim; the page adapts them for display and never
 * invents tips, variants, examples, durations or scores around them.
 */

export interface SoundRecord {
  id: string;
  sound: string;
  ipa: string;
  hanzi: string;
  pinyin: string;
  vi: string;
  group: string;
}

export interface ToneRecord {
  id: number;
  name: string;
  mark: string;
  contour: string;
  pitch: string;
  desc: string;
  hanzi: string;
  pinyin: string;
  vi: string;
  /** Source coordinate pairs (`"8,12 92,12"`) — NOT an SVG path. */
  path: string;
}

export interface SandhiRecord {
  id: string;
  title: string;
  rule: string;
  before?: string;
  after?: string;
  hanzi?: string;
  vi?: string;
}

export interface RadicalRecord {
  no: number;
  char: string;
  strokes: number;
  pinyin: string;
  meaning: string;
  hanViet: string;
}

export interface ListeningRecord {
  id: string;
  title: string;
  transcript?: string;
  hanzi?: string;
  vi?: string;
  level?: number;
}

export interface SpeakingRecord {
  id: string;
  prompt?: string;
  pinyin?: string;
  vi?: string;
  focus?: string;
  level?: number;
  title?: string;
}

export interface PdfRecord {
  id: string;
  title: string;
  desc?: string;
  tag?: string;
}

export interface FoundationCatalog {
  revision: string | null;
  groups: {
    initials: SoundRecord[];
    finals: SoundRecord[];
    tones: ToneRecord[];
    sandhi: SandhiRecord[];
    radicals: RadicalRecord[];
    listening: ListeningRecord[];
    speaking: SpeakingRecord[];
    pdfs: PdfRecord[];
  };
}

export type FoundationKind =
  | "pinyin"
  | "tones"
  | "sandhi"
  | "radicals"
  | "listening"
  | "speaking";

export interface StudiedRow {
  kind: string;
  key: string;
  studied: boolean;
  updatedAt: string;
}

export async function fetchFoundationCatalog(): Promise<FoundationCatalog> {
  return (await apiRequest<FoundationCatalog>("/student/foundation")).data;
}

export async function fetchFoundationProgress(): Promise<StudiedRow[]> {
  return (await apiRequest<{ studied: StudiedRow[] }>("/student/foundation/progress")).data
    .studied;
}

export interface SavedStudy {
  kind: string;
  key: string;
  studied: boolean;
  updatedAt: string;
}

export async function saveFoundationProgress(
  kind: FoundationKind,
  key: string,
  studied: boolean,
): Promise<SavedStudy> {
  return (
    await apiRequest<SavedStudy>("/student/foundation/progress", {
      method: "PUT",
      body: JSON.stringify({ kind, key, studied }),
    })
  ).data;
}

/**
 * Parse tone `path` coordinate pairs into points. Returns null when the
 * geometry is unparseable — the caller renders contour text instead of a
 * drawing it cannot trust.
 */
export function parseTonePoints(path: string): Array<{ x: number; y: number }> | null {
  if (typeof path !== "string" || path.trim() === "") return null;
  const points: Array<{ x: number; y: number }> = [];
  for (const pair of path.trim().split(/\s+/)) {
    const [xs, ys] = pair.split(",");
    const x = Number(xs);
    const y = Number(ys);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    points.push({ x, y });
  }
  return points.length > 0 ? points : null;
}

/**
 * Normalise parsed points into a `48x32` polyline. Scaling real coordinates
 * to fit is presentation, not invention — the shape is preserved.
 */
export function tonePolyline(points: Array<{ x: number; y: number }>): string {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = maxX - minX || 1;
  const spanY = maxY - minY || 1;
  return points
    .map(
      (p) =>
        `${(4 + ((p.x - minX) / spanX) * 40).toFixed(1)},${(4 + ((p.y - minY) / spanY) * 24).toFixed(1)}`,
    )
    .join(" ");
}
