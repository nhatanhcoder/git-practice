import { Injectable } from '@nestjs/common';
import { AppException } from '../common/errors/app.exception';
import { ErrorCode } from '../common/errors/error-codes';
import { PrismaService } from '../prisma/prisma.service';
import { readContentJson } from '../self-study-practice/content-file';

export type StrokeKind =
  | 'ngang'
  | 'so'
  | 'phay'
  | 'mac'
  | 'cham'
  | 'moc'
  | 'gap'
  | 'hat';

interface WritingSourceWord {
  hanzi: string;
  pinyin: string;
  vi: string;
}

interface WritingSourceChar {
  id: string;
  char: string;
  pinyin: string;
  vi: string;
  level: number;
  radical: string;
  radicalName: string;
  strokeCount: number;
  strokes: StrokeKind[];
  words: WritingSourceWord[];
  tip: string;
}

interface StrokeSource {
  strokes: string[];
  medians: number[][][];
}

type StrokeCatalog = Record<string, StrokeSource>;

const STROKES = new Set<StrokeKind>([
  'ngang', 'so', 'phay', 'mac', 'cham', 'moc', 'gap', 'hat',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isWritingCatalog(value: unknown): value is WritingSourceChar[] {
  return Array.isArray(value) && value.length > 0 && value.every((row) => {
    if (!isRecord(row)) return false;
    return typeof row.id === 'string'
      && typeof row.char === 'string'
      && typeof row.pinyin === 'string'
      && typeof row.vi === 'string'
      && Number.isInteger(row.level)
      && (row.level as number) >= 1
      && (row.level as number) <= 9
      && typeof row.radical === 'string'
      && typeof row.radicalName === 'string'
      && Number.isInteger(row.strokeCount)
      && Array.isArray(row.strokes)
      && row.strokes.every((stroke) => STROKES.has(stroke as StrokeKind))
      && Array.isArray(row.words)
      && row.words.every((word) => isRecord(word)
        && typeof word.hanzi === 'string'
        && typeof word.pinyin === 'string'
        && typeof word.vi === 'string')
      && typeof row.tip === 'string';
  });
}

function isStrokeCatalog(value: unknown): value is StrokeCatalog {
  return isRecord(value) && Object.values(value).every((row) =>
    isRecord(row)
    && Array.isArray(row.strokes)
    && row.strokes.every((stroke) => typeof stroke === 'string')
    && Array.isArray(row.medians));
}

@Injectable()
export class WritingService {
  private chars: WritingSourceChar[] | null = null;
  private strokeCatalog: StrokeCatalog | null = null;

  constructor(private readonly prisma: PrismaService) {}

  private catalog(): WritingSourceChar[] {
    this.chars ??= readContentJson('writing.json', isWritingCatalog);
    return this.chars;
  }

  private strokes(): StrokeCatalog {
    this.strokeCatalog ??= readContentJson('strokes.json', isStrokeCatalog);
    return this.strokeCatalog;
  }

  browse() {
    return this.catalog().map((char) => ({
      id: char.id,
      char: char.char,
      pinyin: char.pinyin,
      vi: char.vi,
      level: char.level,
      strokeCount: char.strokeCount,
      radical: char.radical,
      radicalName: char.radicalName,
    }));
  }

  findOne(id: string) {
    const char = this.catalog().find((item) => item.id === id);
    if (!char) {
      throw new AppException(
        ErrorCode.WRITING_CHAR_NOT_FOUND,
        'Không tìm thấy chữ này trong bộ.',
      );
    }
    return {
      id: char.id,
      char: char.char,
      pinyin: char.pinyin,
      vi: char.vi,
      level: char.level,
      strokeCount: char.strokeCount,
      strokes: char.strokes,
      radical: char.radical,
      radicalName: char.radicalName,
      words: char.words.map((word) => ({
        word: word.hanzi,
        pinyin: word.pinyin,
        vi: word.vi,
      })),
      mnemonic: char.tip,
      strokePaths: this.strokes()[char.char]?.strokes ?? null,
    };
  }

  async getProgress(studentId: string) {
    const rows = await this.prisma.userStudyProgress.findMany({
      where: { userId: studentId, contentKind: 'writing', studied: true },
      orderBy: { updatedAt: 'desc' },
    });
    return {
      practised: rows.map((row) => ({
        characterId: row.contentKey,
        practised: true,
        updatedAt: row.updatedAt.toISOString(),
      })),
    };
  }

  async markPractised(studentId: string, characterId: string) {
    this.findOne(characterId);
    const row = await this.prisma.userStudyProgress.upsert({
      where: {
        userId_contentKind_contentKey: {
          userId: studentId,
          contentKind: 'writing',
          contentKey: characterId,
        },
      },
      create: {
        userId: studentId,
        contentKind: 'writing',
        contentKey: characterId,
        studied: true,
      },
      update: { studied: true },
    });
    return {
      characterId,
      practised: true,
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}

