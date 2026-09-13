import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppException } from '../common/errors/app.exception';
import { ErrorCode } from '../common/errors/error-codes';

export interface AiSuggestion {
  score: number;
  feedback: string;
}

/**
 * Gemini writing-score suggestions (04-attempts-grading INV-TGRD-06, unparked
 * 2026-09-12 by owner order — the "explicit re-open" §16-Q1 required).
 *
 * Suggestion only, enforced by shape: this service returns `{ score, feedback }`
 * and owns no database handle, so no call path through it can write
 * teacherScore/teacherFeedback/autoScore or move attempt status. The grade
 * service copies the two fields onto the answer rows and nothing else.
 *
 * No SDK dependency — one REST call. Model is env-overridable (`GEMINI_MODEL`,
 * default `gemini-1.5-flash`); CR-11 still flags the 1.5 choice for review.
 */
@Injectable()
export class AiSuggestService {
  constructor(@Inject(ConfigService) private readonly config: ConfigService) {}

  async suggest(input: {
    prompt: string | null;
    rubric: string | null;
    writtenAnswer: string;
  }): Promise<AiSuggestion> {
    const key = this.config.get<string>('GEMINI_API_KEY') || process.env.GEMINI_API_KEY;
    // Unconfigured counts as invalid: without a usable key the service cannot
    // authenticate, and the registry has no "not configured" code. Deterministic
    // in tests (no network touched) — e2e asserts this branch.
    if (!key || key.includes('placeholder')) {
      throw new AppException(ErrorCode.AI_KEY_INVALID, 'Chưa cấu hình khóa Gemini');
    }

    const model = this.config.get<string>('GEMINI_MODEL') || 'gemini-1.5-flash';
    const body = {
      contents: [
        {
          parts: [
            {
              text: [
                'Bạn là trợ lý chấm bài viết tiếng Trung (HSK). CHỈ gợi ý, không cho điểm chính thức.',
                `Đề bài: ${input.prompt ?? '(không có đề)'}`,
                `Rubric: ${input.rubric ?? '(không có rubric)'}`,
                `Bài làm của học viên: ${input.writtenAnswer}`,
                'Trả lời DUY NHẤT một JSON object: {"score": <số thực 0..1>,',
                '"feedback": "<nhận xét tiếng Việt>}. Không thêm chữ nào khác.',
              ].join('\n'),
            },
          ],
        },
      ],
      generationConfig: { temperature: 0.2, maxOutputTokens: 512 },
    };

    let res: Response;
    try {
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(20_000),
        },
      );
    } catch {
      throw new AppException(ErrorCode.AI_GRADING_FAILED, 'Không gọi được Gemini, thử lại sau');
    }

    if (res.status === 401 || res.status === 403) {
      throw new AppException(ErrorCode.AI_KEY_INVALID, 'Khóa Gemini bị từ chối');
    }
    if (res.status === 429) {
      throw new AppException(ErrorCode.AI_QUOTA_EXCEEDED, 'Đã hết quota Gemini, thử lại sau');
    }
    if (!res.ok) {
      throw new AppException(ErrorCode.AI_GRADING_FAILED, 'Gemini trả về lỗi, thử lại sau');
    }

    const parsed = (await res.json().catch(() => null)) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    } | null;
    const text = parsed?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
    const suggestion = parseSuggestion(text);
    if (!suggestion) {
      throw new AppException(
        ErrorCode.AI_GRADING_FAILED,
        'Gemini trả về phản hồi không dùng được',
      );
    }
    return suggestion;
  }
}

/** Strict JSON parse of the model answer — anything else is a grading failure, never a guess. */
export function parseSuggestion(text: string): AiSuggestion | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    const obj = JSON.parse(text.slice(start, end + 1)) as { score?: unknown; feedback?: unknown };
    if (typeof obj.score !== 'number' || Number.isNaN(obj.score)) return null;
    if (typeof obj.feedback !== 'string') return null;
    return {
      score: Math.min(1, Math.max(0, obj.score)),
      feedback: obj.feedback.slice(0, 2000),
    };
  } catch {
    return null;
  }
}
