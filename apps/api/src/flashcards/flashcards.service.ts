import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, isValidObjectId } from 'mongoose';
import { AppException } from '../common/errors/app.exception';
import { ErrorCode } from '../common/errors/error-codes';
import { Flashcard, type FlashcardDocument } from '../mongodb/schemas/flashcard.schema';
import {
  UserFlashcardState,
  type UserFlashcardStateDocument,
} from '../mongodb/schemas/user-flashcard-state.schema';
import type { ListFlashcardsQuery } from './dto/list-flashcards.query';
import type { PublicSrsRating } from './dto/review-flashcard.dto';
import { calculateSm2 } from './sm2';

@Injectable()
export class FlashcardsService {
  constructor(
    @InjectModel(Flashcard.name) private readonly flashcards: Model<FlashcardDocument>,
    @InjectModel(UserFlashcardState.name)
    private readonly states: Model<UserFlashcardStateDocument>,
  ) {}

  async browse(userId: string, query: ListFlashcardsQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const filter = { hskLevel: query.hskLevel };
    const [cards, total] = await Promise.all([
      this.flashcards.find(filter).sort({ hanzi: 1 }).skip((page - 1) * limit).limit(limit).lean(),
      this.flashcards.countDocuments(filter),
    ]);
    const ids = cards.map((card) => card._id);
    const states = await this.states.find({ userId, flashcardId: { $in: ids } }).lean();
    const byCard = new Map(states.map((state) => [String(state.flashcardId), state]));

    return {
      data: cards.map((card) => toCardDto(card, byCard.get(String(card._id)))),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async due(userId: string) {
    const now = new Date();
    const states = await this.states
      .find({ userId, nextReviewDate: { $lte: now } })
      .sort({ nextReviewDate: 1 })
      .limit(20)
      .lean();
    const ids = states.map((state) => state.flashcardId);
    const cards = await this.flashcards.find({ _id: { $in: ids } }).lean();
    const byId = new Map(cards.map((card) => [String(card._id), card]));

    return states.flatMap((state) => {
      const card = byId.get(String(state.flashcardId));
      return card ? [toCardDto(card, state)] : [];
    });
  }

  async review(userId: string, id: string, rating: PublicSrsRating) {
    if (!isValidObjectId(id)) {
      throw new AppException(ErrorCode.FLASHCARD_NOT_FOUND, 'Không tìm thấy thẻ từ vựng');
    }
    const flashcardId = new Types.ObjectId(id);
    const card = await this.flashcards.findById(flashcardId).lean();
    if (!card) throw new AppException(ErrorCode.FLASHCARD_NOT_FOUND, 'Không tìm thấy thẻ từ vựng');

    const current = await this.states.findOneAndUpdate(
      { userId, flashcardId },
      {
        $setOnInsert: {
          easeFactor: 2.5,
          repetitionsCount: 0,
          intervalDays: 1,
          nextReviewDate: new Date(),
          isSavedByUser: false,
          totalReviews: 0,
          correctReviews: 0,
        },
      },
      { upsert: true, new: true },
    );

    const now = new Date();
    const next = calculateSm2(
      {
        rating,
        repetitionsCount: current.repetitionsCount,
        intervalDays: current.intervalDays,
        easeFactor: current.easeFactor,
      },
      now,
    );

    const updated = await this.states.findOneAndUpdate(
      { _id: current._id, userId },
      {
        $set: { ...next, lastReviewedAt: now },
        $inc: { totalReviews: 1, correctReviews: rating >= 3 ? 1 : 0 },
      },
      { new: true },
    );

    return { flashcardId: id, rating, state: toStateDto(updated!) };
  }

  async stats(userId: string) {
    const now = new Date();
    const states = await this.states.find({ userId }).lean();
    const totalReviews = states.reduce((sum, state) => sum + state.totalReviews, 0);
    const correctReviews = states.reduce((sum, state) => sum + state.correctReviews, 0);

    return {
      totalCards: states.length,
      dueToday: states.filter((state) => state.nextReviewDate <= now).length,
      matureCards: states.filter((state) => state.intervalDays >= 21).length,
      retentionRate: totalReviews ? Math.round((correctReviews / totalReviews) * 100) : 0,
      totalReviews,
      // Product timezone is still unresolved. Returning an explicit null keeps the
      // contract honest instead of silently defining a UTC or server-local streak.
      streak: null,
    };
  }
}

function toCardDto(card: Record<string, any>, state?: Record<string, any>) {
  return {
    id: String(card._id),
    hskLevel: card.hskLevel,
    hanzi: card.hanzi,
    pinyin: card.pinyin,
    meaning: card.meaning,
    exampleSentence: card.exampleSentence ?? null,
    examplePinyin: card.examplePinyin ?? null,
    exampleMeaning: card.exampleMeaning ?? null,
    audioUrl: card.audioUrl ?? null,
    tags: card.tags ?? [],
    state: state ? toStateDto(state) : null,
  };
}

function toStateDto(state: Record<string, any>) {
  return {
    easeFactor: state.easeFactor,
    repetitionsCount: state.repetitionsCount,
    intervalDays: state.intervalDays,
    nextReviewDate: new Date(state.nextReviewDate).toISOString(),
    lastReviewedAt: state.lastReviewedAt ? new Date(state.lastReviewedAt).toISOString() : null,
    isSavedByUser: state.isSavedByUser,
    totalReviews: state.totalReviews,
    correctReviews: state.correctReviews,
  };
}
