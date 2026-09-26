import { apiRequest } from '../api-client';

/**
 * Lesson supplements (API-020, teacher/08-supplements.md).
 *
 * Every function here throws on failure. There are no mock fallbacks:
 * an unreachable API surfaces as the page's error state, never as
 * fabricated rows.
 */

export type SupplementSourceType = 'learning_unit' | 'grammar_point';

export interface LessonSupplement {
  id: string;
  sourceType: SupplementSourceType;
  sourceKey: string;
  orderIndex: number;
  title: string | null;
  available: boolean;
}

export interface CatalogUnit {
  slug: string;
  title: string;
  level: number;
}

export interface CatalogGrammar {
  id: string;
  name: string;
  level: number;
  category: string;
}

interface SupplementRow {
  id: string;
  sourceType: SupplementSourceType;
  sourceKey: string;
  orderIndex: number;
  title: string | null;
  available: boolean;
}

function toSupplement(s: SupplementRow): LessonSupplement {
  return {
    id: s.id,
    sourceType: s.sourceType,
    sourceKey: s.sourceKey,
    orderIndex: s.orderIndex,
    title: s.title,
    available: s.available,
  };
}

function asRows(data: unknown): SupplementRow[] {
  if (Array.isArray(data)) return data as SupplementRow[];
  if (data && typeof data === 'object' && Array.isArray((data as { supplements?: unknown }).supplements)) {
    return (data as { supplements: SupplementRow[] }).supplements;
  }
  return [];
}

export async function fetchLessonSupplements(
  lessonId: string,
): Promise<{ supplements: LessonSupplement[] }> {
  const res = await apiRequest<unknown>(`/teacher/lessons/${lessonId}`);
  const data = (res as { data?: unknown }).data;
  const rows = asRows(data);
  return { supplements: rows.map(toSupplement) };
}

export async function fetchCatalogUnits(params?: {
  level?: number;
  search?: string;
}): Promise<{ units: CatalogUnit[] }> {
  const query = new URLSearchParams();
  if (params?.level) query.set('level', String(params.level));
  if (params?.search?.trim()) query.set('search', params.search.trim());
  const suffix = query.toString() ? `?${query}` : '';
  const res = await apiRequest<{ items?: CatalogUnit[] } | CatalogUnit[]>(`/teacher/learning-units${suffix}`);
  return { units: asItems<CatalogUnit>(res.data) };
}

export async function fetchCatalogGrammar(params?: {
  level?: number;
  category?: string;
  search?: string;
}): Promise<{ points: CatalogGrammar[] }> {
  const query = new URLSearchParams();
  if (params?.level) query.set('level', String(params.level));
  if (params?.category) query.set('category', params.category);
  if (params?.search?.trim()) query.set('search', params.search.trim());
  const suffix = query.toString() ? `?${query}` : '';
  const res = await apiRequest<{ items?: Record<string, unknown>[] } | Record<string, unknown>[]>(
    `/teacher/catalog/grammar${suffix}`,
  );
  const items = asItems<Record<string, unknown>>(res.data);
  return {
    points: items.map((g) => ({
      id: String(g.id ?? g.key ?? ''),
      name: String(g.name ?? g.id ?? ''),
      level: Number(g.level ?? 0),
      category: String(g.category ?? ''),
    })),
  };
}

function asItems<T>(data: { items?: T[] } | T[] | unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object' && Array.isArray((data as { items?: unknown }).items)) {
    return (data as { items: T[] }).items;
  }
  return [];
}

export async function attachSupplement(
  lessonId: string,
  input: { sourceType: SupplementSourceType; sourceKey: string },
): Promise<{ supplement: LessonSupplement }> {
  const res = await apiRequest<SupplementRow>(`/teacher/lessons/${lessonId}/supplements`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return { supplement: toSupplement(res.data) };
}

export async function removeSupplement(lessonId: string, supplementId: string): Promise<void> {
  await apiRequest<unknown>(`/teacher/lessons/${lessonId}/supplements/${supplementId}`, {
    method: 'DELETE',
  });
}

export async function reorderSupplements(
  lessonId: string,
  items: Array<{ id: string; orderIndex: number }>,
): Promise<{ supplements: LessonSupplement[] }> {
  const res = await apiRequest<SupplementRow[] | { supplements?: SupplementRow[] }>(
    `/teacher/lessons/${lessonId}/supplements/reorder`,
    {
      method: 'PATCH',
      body: JSON.stringify(items),
    },
  );
  return { supplements: asRows(res.data).map(toSupplement) };
}
