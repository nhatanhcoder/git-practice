import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PrismaService } from '../prisma/prisma.service';
import { Question, type QuestionDocument, type QuestionSkill } from '../mongodb/schemas/question.schema';
import { buildChart, buildProgress } from './progress.rules';

@Injectable()
export class ProgressService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectModel(Question.name) private readonly questions: Model<QuestionDocument>,
  ) {}

  private attempts(studentId: string) {
    return this.prisma.attempt.findMany({
      where: { studentId, status: 'graded' },
      select: {
        submittedAt: true,
        gradedAt: true,
        totalScore: true,
        answers: { select: { questionId: true, isCorrect: true } },
      },
      orderBy: { gradedAt: 'asc' },
    });
  }

  async overview(studentId: string, now = new Date()) {
    const attempts = await this.attempts(studentId);
    const ids = [...new Set(attempts.flatMap((attempt) => attempt.answers.map((answer) => answer.questionId)))]
      .filter((id) => Types.ObjectId.isValid(id));
    const questions = ids.length
      ? await this.questions.find({ _id: { $in: ids } }, { skill: 1 }).lean().exec()
      : [];
    const skills = new Map(questions.map((question) => [String(question._id), question.skill as QuestionSkill]));
    return buildProgress(attempts, skills, now);
  }

  async chart(studentId: string, now = new Date()) {
    return buildChart(await this.attempts(studentId), now);
  }
}
