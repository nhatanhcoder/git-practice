import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { isValidObjectId, Model } from 'mongoose';
import { AppException } from '../common/errors/app.exception';
import { ErrorCode } from '../common/errors/error-codes';
import {
  Flashcard,
  type FlashcardDocument,
} from '../mongodb/schemas/flashcard.schema';
import {
  UserFlashcardState,
  type UserFlashcardStateDocument,
} from '../mongodb/schemas/user-flashcard-state.schema';
import {
  UserSavedWord,
  type UserSavedWordDocument,
} from '../mongodb/schemas/user-saved-word.schema';
import type { ListWordBankQuery, SaveWordDto } from './dto/word-bank.dto';

/**
 * The personal word bank (02-word-bank.md). MongoDB only, single-document operations.
 *
 * Ownership is structural, same reasoning as module 07's repository: every method takes
 * `userId` as a required first parameter and no endpoint accepts one, so a caller cannot
 * address another student's bank (INV-WB-01/03).
 */
@Injectable()
export class WordBankService {
  constructor(
    @InjectModel(UserSavedWord.name) private readonly bank: Model<UserSavedWordDocument>,
    @InjectModel(Flashcard.name) private readonly flashcards: Model<FlashcardDocument>,
    @InjectModel(UserFlashcardState.name)
    private readonly states: Model<UserFlashcardStateDocument>,
  ) {}

  /**
   * Upsert on (userId, hanzi) — the entity's duplicate rule. findOneAndUpdate with the
   * unique index as the guard is atomic: two concurrent first-saves converge on one row.
   * Existence is checked first only to pick the STATUS (201 first bookmark vs 200
   * re-bookmark); if that read races, the worst outcome is a cosmetically wrong status —
   * the data itself stays one row, guaranteed by the index, not by this read.
   */
  async save(userId: string, dto: SaveWordDto) {
    const existing = await this.bank
      .findOne({ userId, hanzi: dto.hanzi })
      .select({ _id: 1 })
      .lean();

    const row = await this.bank.findOneAndUpdate(
      { userId, hanzi: dto.hanzi },
      {
        $set: {
          userId,
          hanzi: dto.hanzi,
          pinyin: dto.pinyin,
          meaning: dto.meaning,
          sourceType: dto.sourceType,
          sourceId: dto.sourceId,
          note: dto.note,
          // Copy-at-save-time (INV-WB-04): bumps on every upsert per the entity rule —
          // savedAt means "last bookmarked", createdAt (timestamps: true) keeps the first.
          savedAt: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    return { row: this.toDto(row), created: !existing };
  }

  async list(userId: string, query: ListWordBankQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const filter = { userId };
    const [rows, total] = await Promise.all([
      this.bank
        .find(filter)
        .sort({ savedAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.bank.countDocuments(filter),
    ]);
    return {
      data: rows.map((row) => this.toDtoLean(row)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * A foreign row id is a bare 404 — the same no-existence-probing rule as module 07 §5.
   * Scoped deletion also means a "not found" and a "not mine" are indistinguishable, on
   * purpose.
   */
  async remove(userId: string, id: string) {
    if (!isValidObjectId(id)) {
      throw new AppException(ErrorCode.WORD_BANK_NOT_FOUND, 'Không tìm thấy từ đã lưu');
    }
    const removed = await this.bank.findOneAndDelete({ userId, _id: id });
    if (!removed) {
      throw new AppException(ErrorCode.WORD_BANK_NOT_FOUND, 'Không tìm thấy từ đã lưu');
    }
    // INV-WB-08: bank membership and SRS progress are independent facts. No state write
    // happens here, and none is needed — the states collection is never touched.
  }

  /**
   * S-SRS-7 session start: banked words as reviewable card payloads. The shape mirrors
   * module 01's card DTO exactly so the existing review screen and
   * POST /student/flashcards/:id/review accept these cards unchanged — SM-2 stays owned
   * by module 01. A banked word with NO catalog match comes back with id: null and the
   * client must not send it to review (INV-WB-07).
   */
  async reviewSession(userId: string) {
    const words = await this.bank
      .find({ userId })
      .sort({ savedAt: -1, _id: -1 })
      .limit(100)
      .lean();

    const matches = await this.flashcards
      .find({ hanzi: { $in: words.map((word) => word.hanzi) } })
      .lean();
    const byHanzi = new Map<string, Record<string, any>>(matches.map((card) => [card.hanzi, card]));

    const states = await this.states
      .find({
        userId,
        flashcardId: { $in: matches.map((card) => card._id) },
      })
      .lean();
    const byCard = new Map(states.map((state) => [String(state.flashcardId), state]));

    return words.map((word) => {
      const card = byHanzi.get(word.hanzi);
      if (!card) {
        // Unreviewable: nothing in the catalog names this hanzi. The bookmark itself
        // stays useful (hanzi/pinyin/meaning are bank-owned copies); SM-2 simply has
        // nothing to schedule for it.
        return {
          id: null,
          hskLevel: null,
          hanzi: word.hanzi,
          pinyin: word.pinyin,
          meaning: word.meaning,
          exampleSentence: null,
          examplePinyin: null,
          exampleMeaning: null,
          audioUrl: null,
          tags: [],
          state: null,
        };
      }
      const state = byCard.get(String(card._id));
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
        state: state
          ? {
              easeFactor: state.easeFactor,
              repetitionsCount: state.repetitionsCount,
              intervalDays: state.intervalDays,
              nextReviewDate: new Date(state.nextReviewDate).toISOString(),
              lastReviewedAt: state.lastReviewedAt
                ? new Date(state.lastReviewedAt).toISOString()
                : null,
              isSavedByUser: state.isSavedByUser,
              totalReviews: state.totalReviews,
              correctReviews: state.correctReviews,
            }
          : null,
      };
    });
  }

  private toDto(row: UserSavedWordDocument) {
    return this.toDtoLean(row.toObject());
  }

  private toDtoLean(row: Record<string, any>) {
    return {
      id: String(row._id),
      hanzi: row.hanzi,
      pinyin: row.pinyin,
      meaning: row.meaning,
      sourceType: row.sourceType,
      sourceId: row.sourceId ?? null,
      note: row.note ?? null,
      savedAt: new Date(row.savedAt).toISOString(),
    };
  }
}
