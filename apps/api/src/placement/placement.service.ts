import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PrismaService } from '../prisma/prisma.service';
import { AppException } from '../common/errors/app.exception';
import { ErrorCode } from '../common/errors/error-codes';
import { Question, type QuestionDocument } from '../mongodb/schemas/question.schema';
import type { SubmitPlacementDto } from './dto/placement.dto';
import {
  buildPaper,
  isCorrect,
  isEligible,
  placementLevel,
  type PaperQuestion,
  type PoolQuestion,
} from './placement-rules';

/**
 * The placement check (04-placement.md). Actor-scoped end to end: no method takes a
 * studentId from the wire (INV-PLC-08) — the controller passes the token subject only.
 *
 * The paper is sampled from the existing teacher-authored question bank on every GET
 * (INV-PLC-02/03): deterministic, contiguous bands from level 1, nothing invented.
 * Grading and the level rule run here, never in the browser (ADR-005, INV-PLC-04/05),
 * and a passing POST writes the level into the User.hskLevelGoal column the entity
 * spec already defines (INV-PLC-06) — no new table, no answers stored.
 */
@Injectable()
export class PlacementService {
  constructor(
    @InjectModel(Question.name) private readonly questions: Model<QuestionDocument>,
    private readonly prisma: PrismaService,
  ) {}

  async getPaper(studentId: string) {
    const { paper } = await this.samplePaper();
    const user = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: { hskLevelGoal: true },
    });
    return { questions: paper, savedLevel: user?.hskLevelGoal ?? null };
  }

  async submit(studentId: string, dto: SubmitPlacementDto) {
    const { paper, answers } = await this.samplePaper();
    if (paper.length === 0) {
      // INV-PLC-06: nothing to grade — the bank simply has no eligible band-1 question.
      throw new AppException(
        ErrorCode.PLACEMENT_NO_QUESTIONS,
        'Chưa có câu hỏi phù hợp trong ngân hàng câu hỏi để xếp cấp.',
      );
    }

    const correctByBand = new Map<number, number>();
    let total = 0;
    for (const q of paper) {
      const submittedAnswer = dto.answers.find((a) => a.questionId === q.questionId);
      // INV-PLC-07: answers for questions not on this paper are ignored, not errors —
      // the paper is sampled per GET, so a stale tab must not be able to fail the call.
      if (!submittedAnswer) continue;
      const key = answers.get(q.questionId) as string;
      if (isCorrect(submittedAnswer.selectedOptions, key)) {
        correctByBand.set(q.hskLevel, (correctByBand.get(q.hskLevel) ?? 0) + 1);
        total++;
      }
    }

    const highestBand = Math.max(...paper.map((q) => q.hskLevel));
    const level = placementLevel(correctByBand, highestBand);

    await this.prisma.user.update({
      where: { id: studentId },
      data: { hskLevelGoal: level },
    });

    const correctByLevel: Record<string, number> = {};
    for (const [band, count] of correctByBand) correctByLevel[String(band)] = count;

    return { level, correctByLevel, total, savedLevel: level };
  }

  /**
   * INV-PLC-01/02/03 — deterministic sampling straight off the bank. The Mongo sort is
   * the determinism: createdAt asc then _id asc, so two GETs between bank edits hand the
   * learner the same paper.
   */
  private async samplePaper(): Promise<{ paper: PaperQuestion[]; answers: Map<string, string> }> {
    const docs = await this.questions
      .find({ hskLevel: { $gte: 1, $lte: 6 } })
      .sort({ createdAt: 1, _id: 1 })
      .select({
        hskLevel: 1,
        skill: 1,
        subType: 1,
        content: 1,
        options: 1,
        correctAnswer: 1,
        createdAt: 1,
      })
      .lean();

    const pool: PoolQuestion[] = [];
    for (const doc of docs) {
      if (!isEligible(doc)) continue;
      pool.push({
        id: String(doc._id),
        hskLevel: doc.hskLevel,
        skill: doc.skill,
        subType: doc.subType,
        content: (doc.content ?? null) as PoolQuestion['content'],
        options: doc.options.map((o) => ({ id: o.id, text: o.text })),
        correctAnswer: doc.correctAnswer,
        createdAt: (doc as { createdAt?: Date }).createdAt ?? new Date(0),
      });
    }
    return buildPaper(pool);
  }
}
