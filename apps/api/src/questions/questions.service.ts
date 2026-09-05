import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, isValidObjectId } from 'mongoose';
import { AppException } from '../common/errors/app.exception';
import { ErrorCode } from '../common/errors/error-codes';
import { Question, QuestionDocument } from '../mongodb/schemas/question.schema';
import { CreateQuestionDto } from './dto/create-question.dto';
import { ListQuestionsQuery } from './dto/list-questions.query';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { toDetails, validateQuestion } from './question-rules';

/** Shape returned to the client. Mongo's `_id` is exposed as a string `id`. */
export type QuestionDto = {
  id: string;
  skill: string;
  subType: string;
  hskLevel: number;
  difficulty: string;
  content: Record<string, unknown>;
  options?: Array<{ id: string; text: string }>;
  correctAnswer: string | string[] | null;
  explanation: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class QuestionsService {
  constructor(@InjectModel(Question.name) private readonly model: Model<QuestionDocument>) {}

  async list(teacherId: string, query: ListQuestionsQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    // Scoped to the caller. Ownership is not a filter the client can widen:
    // ENTITY_QUESTION.md gives each teacher their own bank, and reading the whole
    // collection would be a data leak dressed up as a missing query parameter.
    const filter: FilterQuery<QuestionDocument> = { createdBy: teacherId };
    if (query.skill) filter.skill = query.skill;
    if (query.subType) filter.subType = query.subType;
    if (query.hskLevel) filter.hskLevel = query.hskLevel;
    if (query.difficulty) filter.difficulty = query.difficulty;

    if (query.q?.trim()) {
      // Escaped: an unescaped user string here is regex injection, and a trivial
      // way to hang the server with a catastrophic-backtracking pattern.
      const needle = new RegExp(escapeRegExp(query.q.trim()), 'i');
      filter.$or = [
        { 'content.prompt': needle },
        { 'content.passage': needle },
        { 'content.transcript': needle },
        { 'options.text': needle },
      ];
    }

    const [rows, total] = await Promise.all([
      this.model
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      this.model.countDocuments(filter).exec(),
    ]);

    return {
      data: rows.map(toDto),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(teacherId: string, id: string): Promise<QuestionDto> {
    return toDto(await this.loadOwned(teacherId, id));
  }

  async create(teacherId: string, dto: CreateQuestionDto): Promise<QuestionDto> {
    this.assertValid({
      skill: dto.skill,
      subType: dto.subType,
      content: dto.content,
      options: dto.options,
      correctAnswer: dto.correctAnswer ?? null,
    });

    const created = await this.model.create({
      skill: dto.skill,
      subType: dto.subType,
      hskLevel: dto.hskLevel,
      difficulty: dto.difficulty ?? 'medium',
      content: dto.content ?? {},
      options: dto.options,
      correctAnswer: dto.correctAnswer ?? null,
      explanation: dto.explanation ?? null,
      createdBy: teacherId,
    });

    return toDto(created.toObject());
  }

  async update(teacherId: string, id: string, dto: UpdateQuestionDto): Promise<QuestionDto> {
    const current = await this.loadOwned(teacherId, id);

    // Validate the MERGED result, not the patch. A PATCH that only sets
    // `skill: "writing"` is individually valid while leaving a correctAnswer
    // behind — and a writing question with an answer gets auto-graded.
    this.assertValid({
      skill: dto.skill ?? (current.skill as CreateQuestionDto['skill']),
      subType: dto.subType ?? current.subType,
      content: dto.content ?? current.content,
      options: dto.options ?? current.options,
      correctAnswer: dto.correctAnswer !== undefined ? dto.correctAnswer : current.correctAnswer,
    });

    const updated = await this.model
      .findByIdAndUpdate(
        id,
        {
          ...(dto.skill !== undefined ? { skill: dto.skill } : {}),
          ...(dto.subType !== undefined ? { subType: dto.subType } : {}),
          ...(dto.hskLevel !== undefined ? { hskLevel: dto.hskLevel } : {}),
          ...(dto.difficulty !== undefined ? { difficulty: dto.difficulty } : {}),
          ...(dto.content !== undefined ? { content: dto.content } : {}),
          ...(dto.options !== undefined ? { options: dto.options } : {}),
          ...(dto.correctAnswer !== undefined ? { correctAnswer: dto.correctAnswer } : {}),
          ...(dto.explanation !== undefined ? { explanation: dto.explanation } : {}),
        },
        { new: true },
      )
      .lean()
      .exec();

    if (!updated) throw new AppException(ErrorCode.QUESTION_NOT_FOUND, 'Không tìm thấy câu hỏi');
    return toDto(updated);
  }

  async remove(teacherId: string, id: string): Promise<{ id: string }> {
    await this.loadOwned(teacherId, id);

    // BLOCKED — ENTITY_QUESTION.md says a teacher may delete a question "unless
    // used in a published Assignment". That check cannot be made: the Assignment
    // table does not exist in Postgres yet, so there is nothing to ask. Deleting
    // a referenced question would orphan `Assignment.questionIds[]`, and DEBT-001
    // means there is no cross-store transaction or foreign key to catch it.
    // Left unenforced and written down rather than faked — a hardcoded `false`
    // here would read like the rule holds.
    await this.model.findByIdAndDelete(id).exec();
    return { id };
  }

  /** Loads a question, then proves the caller owns it. */
  private async loadOwned(teacherId: string, id: string) {
    // A malformed id makes Mongoose throw CastError, which the global filter
    // renders as a 500. It is a client mistake, so answer 404.
    if (!isValidObjectId(id)) {
      throw new AppException(ErrorCode.QUESTION_NOT_FOUND, 'Không tìm thấy câu hỏi');
    }

    const found = await this.model.findById(id).lean().exec();
    if (!found) throw new AppException(ErrorCode.QUESTION_NOT_FOUND, 'Không tìm thấy câu hỏi');

    // Distinct from NOT_FOUND on purpose. It does reveal that the id exists, but
    // answering 404 for another teacher's question makes a genuine ownership bug
    // indistinguishable from a typo.
    if (found.createdBy !== teacherId) {
      throw new AppException(ErrorCode.QUESTION_NOT_OWNER, 'Câu hỏi này không thuộc về bạn');
    }
    return found;
  }

  private assertValid(shape: Parameters<typeof validateQuestion>[0]) {
    const problems = validateQuestion(shape);
    if (!problems.length) return;

    // Missing audio has its own registry code; everything else is a validation
    // failure carrying per-field detail.
    if (problems.some((p) => p.field === 'content.audioUrl')) {
      throw new AppException(
        ErrorCode.QUESTION_AUDIO_REQUIRED,
        'Câu hỏi Nghe cần tệp âm thanh',
        toDetails(problems),
      );
    }
    throw new AppException(
      ErrorCode.VALIDATION_ERROR,
      'Dữ liệu câu hỏi không hợp lệ',
      toDetails(problems),
    );
  }
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toDto(row: Record<string, any>): QuestionDto {
  return {
    id: String(row._id),
    skill: row.skill,
    subType: row.subType,
    hskLevel: row.hskLevel,
    difficulty: row.difficulty,
    content: row.content ?? {},
    options: row.options,
    correctAnswer: row.correctAnswer ?? null,
    explanation: row.explanation ?? null,
    createdBy: row.createdBy,
    // UTC ISO 8601 on the wire, per API_CONVENTIONS.md § Timezone. Display
    // formatting happens in the UI layer and nowhere else.
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}
