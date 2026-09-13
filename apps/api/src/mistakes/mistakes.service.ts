import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { PrismaService } from '../prisma/prisma.service';
import { UserMistake, type UserMistakeDocument } from '../mongodb/schemas/user-mistake.schema';
import { Flashcard, type FlashcardDocument } from '../mongodb/schemas/flashcard.schema';
import { Question, type QuestionDocument } from '../mongodb/schemas/question.schema';
import { AppException } from '../common/errors/app.exception';
import { ErrorCode } from '../common/errors/error-codes';
import type { ListMistakesQuery, ReviewMistakeDto } from './mistakes.dto';

@Injectable()
export class MistakesService {
 constructor(
  private readonly prisma: PrismaService,
  @InjectModel(UserMistake.name) private readonly rows: Model<UserMistakeDocument>,
  @InjectModel(Flashcard.name) private readonly cards: Model<FlashcardDocument>,
  @InjectModel(Question.name) private readonly questions: Model<QuestionDocument>,
 ) {}
 async capture(userId: string, sourceType: 'flashcard' | 'question', sourceId: string, eventAt: Date) {
  const key = {userId, sourceType, sourceId};
  try {
   await this.rows.updateOne(key, {$setOnInsert: {...key, eventAt, status: 'needs_review', version: 1}}, {upsert: true});
  } catch (error) {
   if (!(error && typeof error === 'object' && 'code' in error && error.code === 11000)) throw error;
  }
  await this.rows.updateOne({...key, eventAt: {$lt: eventAt}},
   {$set: {eventAt, status: 'needs_review'}, $inc: {version: 1}});
 }
 // Reconciliation reads only final, owned answers. Replayed source dates are no-ops.
 private async sync(userId: string) {
  let cursor: string | undefined;
  for (;;) {
   const batch = await this.prisma.attemptAnswer.findMany({
    where: {isCorrect: false, attempt: {studentId: userId, status: 'graded', gradedAt: {not: null}}},
    include: {attempt: {select: {gradedAt: true}}},
    orderBy: {id: 'asc'}, take: 100, ...(cursor ? {cursor: {id: cursor}, skip: 1} : {}),
   });
   for (const row of batch) await this.capture(userId, 'question', row.questionId, row.attempt.gradedAt!);
   if (batch.length < 100) break;
   cursor = batch[batch.length - 1].id;
  }
 }
 private async source(row: UserMistake) {
  if (row.sourceType === 'flashcard') {
   const card = await this.cards.findById(row.sourceId).lean();
   return card ? {prompt: card.hanzi, pinyin: card.pinyin, meaning: card.meaning,
    audioUrl: card.audioUrl ?? null, options: [] as {id: string; text: string}[],
    key: null as string | string[] | null, explanation: card.meaning} : null;
  }
  const owned = await this.prisma.attemptAnswer.findFirst({
   where: {questionId: row.sourceId, isCorrect: false, attempt: {studentId: row.userId, status: 'graded'}},
  });
  if (!owned) return null;
  const q = await this.questions.findById(row.sourceId).lean();
  if (!q || q.skill === 'writing' || q.correctAnswer === null) return null;
  return {prompt: q.content.passage ?? q.content.prompt ?? 'Nghe và trả lời câu hỏi',
   pinyin: null, meaning: null, audioUrl: q.content.audioUrl ?? null,
   options: q.options?.map(o => ({id: o.id, text: o.text})) ?? [],
   key: q.correctAnswer, explanation: q.explanation};
 }
 private async dto(row: UserMistakeDocument) {
  const source = await this.source(row);
  return {id: String(row._id), sourceType: row.sourceType, sourceId: row.sourceId,
   status: row.status, version: row.version, eventAt: row.eventAt.toISOString(),
   lastReviewedAt: row.lastReviewedAt?.toISOString() ?? null, available: !!source,
   prompt: source?.prompt ?? 'Nội dung gốc không còn khả dụng', pinyin: source?.pinyin ?? null,
   meaning: source?.meaning ?? null, audioUrl: source?.audioUrl ?? null, options: source?.options ?? []};
 }
 async list(userId: string, {page = 1, limit = 20}: ListMistakesQuery) {
  await this.sync(userId);
  const [rows, total] = await Promise.all([
   this.rows.find({userId}).sort({eventAt: -1, _id: -1}).skip((page - 1) * limit).limit(limit),
   this.rows.countDocuments({userId}),
  ]);
  return {data: await Promise.all(rows.map(row => this.dto(row))),
   meta: {total, page, limit, totalPages: Math.ceil(total / limit)}};
 }
 async session(userId: string) {
  await this.sync(userId);
  const rows = await this.rows.find({userId, status: 'needs_review'}).sort({eventAt: 1, _id: 1}).limit(50);
  return Promise.all(rows.map(row => this.dto(row)));
 }
 async review(userId: string, id: string, dto: ReviewMistakeDto) {
  await this.sync(userId);
  if (!isValidObjectId(id)) throw new AppException(ErrorCode.MISTAKE_NOT_FOUND, 'Không tìm thấy lỗi sai');
  const row = await this.rows.findOne({_id: id, userId});
  if (!row) throw new AppException(ErrorCode.MISTAKE_NOT_FOUND, 'Không tìm thấy lỗi sai');
  const source = await this.source(row);
  if (!source) throw new AppException(ErrorCode.MISTAKE_NOT_FOUND, 'Nội dung không còn khả dụng');
  let correct: boolean;
  if (row.sourceType === 'flashcard') {
   if (typeof dto.recalled !== 'boolean' || dto.selectedOptions !== undefined)
    throw new AppException(ErrorCode.VALIDATION_ERROR, 'Cần đánh giá ghi nhớ');
   correct = dto.recalled;
  } else {
   if (!Array.isArray(dto.selectedOptions) || dto.recalled !== undefined)
    throw new AppException(ErrorCode.VALIDATION_ERROR, 'Cần gửi câu trả lời');
   const key = Array.isArray(source.key) ? source.key : [source.key];
   const picked = new Set(dto.selectedOptions);
   correct = picked.size === key.length && key.every(k => k !== null && picked.has(k));
  }
  const status = correct ? 'reviewed' : 'needs_review';
  const updated = await this.rows.findOneAndUpdate({_id: id, userId, version: dto.version, status: 'needs_review'},
   {$set: {status, lastReviewedAt: new Date()}, $inc: {version: 1}}, {new: true});
  if (!updated) throw new AppException(ErrorCode.MISTAKE_REVIEW_STALE, 'Dữ liệu đã thay đổi. Hãy tải lại phiên ôn');
  return {correct, status, version: updated.version, explanation: source.explanation};
 }
}
