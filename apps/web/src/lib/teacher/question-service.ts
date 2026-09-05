import { apiRequest } from '@/lib/api-client';
import {
  toQuestionDto,
  type Difficulty,
  type Question,
  type QuestionDto,
  type QuestionOption,
  type Skill,
} from './question-data';

/**
 * `/teacher/questions` — the MongoDB-backed question bank.
 *
 * No offline fallback: a screen that cannot reach its API says so. See
 * admin-users-service for why that rule exists.
 */

/** What the API returns. The entity's nested shape, plus the server-assigned id. */
type ApiQuestion = {
  id: string;
  skill: Skill;
  subType: string;
  hskLevel: number;
  difficulty: Difficulty;
  content: {
    audioUrl?: string;
    transcript?: string;
    passage?: string;
    prompt?: string;
    rubric?: string;
  };
  options?: QuestionOption[];
  correctAnswer: string | string[] | null;
  explanation: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

/**
 * DTO → ViewModel, the inverse of `toQuestionDto`.
 *
 * The screen works with a flat `content` string whose meaning depends on the
 * skill; the entity nests it as transcript / passage / prompt. Reading the wrong
 * one leaves the editor blank for that skill only — a bug that hides until
 * someone opens a listening question.
 */
export function fromApiQuestion(q: ApiQuestion): Question {
  const content =
    q.skill === 'listening'
      ? q.content?.transcript
      : q.skill === 'reading'
        ? q.content?.passage
        : q.content?.prompt;

  return {
    id: q.id,
    skill: q.skill,
    subType: q.subType,
    hskLevel: q.hskLevel,
    difficulty: q.difficulty,
    content: content ?? '',
    options: q.options ?? null,
    correctAnswer: q.correctAnswer,
    rubric: q.content?.rubric ?? null,
    explanation: q.explanation ?? '',
    // ⛔ The API cannot supply this. `usageCount` counts the assignments using a
    // question (F3.6 gates delete on it), and the Assignment table does not exist
    // in Postgres yet. Reporting 0 means the UI will not block a delete it should
    // block — recorded rather than papered over with an invented number.
    usageCount: 0,
    createdAt: q.createdAt,
  };
}

export async function fetchQuestions(params: {
  skill?: Skill | 'all';
  subType?: string | 'all';
  hskLevel?: number | 'all';
  q?: string;
} = {}): Promise<{ questions: Question[]; total: number }> {
  const query = new URLSearchParams();
  if (params.skill && params.skill !== 'all') query.set('skill', params.skill);
  if (params.subType && params.subType !== 'all') query.set('subType', params.subType);
  if (params.hskLevel && params.hskLevel !== 'all') query.set('hskLevel', String(params.hskLevel));
  if (params.q?.trim()) query.set('q', params.q.trim());
  query.set('limit', '100');

  const res = await apiRequest<ApiQuestion[]>(`/teacher/questions?${query.toString()}`);
  const rows = Array.isArray(res.data) ? res.data : [];
  return { questions: rows.map(fromApiQuestion), total: res.meta?.total ?? rows.length };
}

export async function createQuestion(draft: Question): Promise<Question> {
  const dto: QuestionDto = toQuestionDto(draft);
  const res = await apiRequest<ApiQuestion>('/teacher/questions', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
  return fromApiQuestion(res.data);
}

export async function updateQuestion(id: string, draft: Question): Promise<Question> {
  const dto: QuestionDto = toQuestionDto(draft);
  const res = await apiRequest<ApiQuestion>(`/teacher/questions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(dto),
  });
  return fromApiQuestion(res.data);
}

export async function deleteQuestion(id: string): Promise<void> {
  await apiRequest(`/teacher/questions/${id}`, { method: 'DELETE' });
}
