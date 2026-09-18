import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { AppException } from '../common/errors/app.exception';
import { ErrorCode } from '../common/errors/error-codes';
import { PrismaService } from '../prisma/prisma.service';
import { readContentJson } from '../self-study-practice/content-file';
import type { SubmitLegoAttemptDto } from './dto/lego.dto';

export interface LegoBlock {
  id: string;
  text: string;
  role: string;
}

interface LegoSentence {
  id: string;
  level: number;
  blocks: LegoBlock[];
  pinyin: string;
  vi: string;
  hint: string;
  rule: string;
}

interface LegoStation {
  id: string;
  level: number;
  title: string;
  hanziTitle: string;
  focus: string;
  blurb: string;
  sentenceIds: string[];
}

interface LegoCatalog {
  sentences: LegoSentence[];
  stations: LegoStation[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function strings(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isLegoCatalog(value: unknown): value is LegoCatalog {
  if (!isRecord(value) || !Array.isArray(value.sentences) || !Array.isArray(value.stations)) {
    return false;
  }
  const sentencesValid = value.sentences.length > 0 && value.sentences.every((row) =>
    isRecord(row)
    && typeof row.id === 'string'
    && Number.isInteger(row.level)
    && Array.isArray(row.blocks)
    && row.blocks.length > 0
    && row.blocks.every((block) => isRecord(block)
      && typeof block.id === 'string'
      && typeof block.text === 'string'
      && typeof block.role === 'string')
    && typeof row.pinyin === 'string'
    && typeof row.vi === 'string'
    && typeof row.hint === 'string'
    && typeof row.rule === 'string');
  const stationsValid = value.stations.length > 0 && value.stations.every((row) =>
    isRecord(row)
    && typeof row.id === 'string'
    && Number.isInteger(row.level)
    && typeof row.title === 'string'
    && typeof row.hanziTitle === 'string'
    && typeof row.focus === 'string'
    && typeof row.blurb === 'string'
    && strings(row.sentenceIds));
  if (!sentencesValid || !stationsValid) return false;
  const sentenceIds = new Set(value.sentences.map((row) => row.id));
  return value.stations.every((station) =>
    station.sentenceIds.length > 0
    && station.sentenceIds.every((id: string) => sentenceIds.has(id)));
}

export function legoStars(attempted: boolean, correct: number, total: number): number {
  if (!attempted || total <= 0) return 0;
  const ratio = correct / total;
  if (ratio >= 0.8) return 3;
  if (ratio >= 0.5) return 2;
  return 1;
}

function shuffledBlocks(sentence: LegoSentence): LegoBlock[] {
  return [...sentence.blocks].sort((left, right) => {
    const rank = (id: string) => createHash('sha256')
      .update(`${sentence.id}:${id}:hanlo-lego-v1`)
      .digest('hex');
    return rank(left.id).localeCompare(rank(right.id));
  });
}

@Injectable()
export class LegoService {
  private source: LegoCatalog | null = null;

  constructor(private readonly prisma: PrismaService) {}

  private catalog(): LegoCatalog {
    this.source ??= readContentJson('lego.json', isLegoCatalog);
    return this.source;
  }

  private stationOrThrow(stationId: string): LegoStation {
    const station = this.catalog().stations.find((item) => item.id === stationId);
    if (!station) {
      throw new AppException(
        ErrorCode.LEGO_STATION_NOT_FOUND,
        'Không tìm thấy trạm Lego.',
      );
    }
    return station;
  }

  private stationSentences(station: LegoStation): LegoSentence[] {
    const byId = new Map(this.catalog().sentences.map((item) => [item.id, item]));
    return station.sentenceIds.map((id) => byId.get(id) as LegoSentence);
  }

  private async progressRows(studentId: string) {
    return this.prisma.userStudyProgress.findMany({
      where: { userId: studentId, contentKind: 'lego', studied: true },
    });
  }

  async list(studentId: string) {
    const rows = await this.progressRows(studentId);
    const keys = new Set(rows.map((row) => row.contentKey));
    return {
      stations: this.catalog().stations.map((station, index, stations) => {
        const attempted = keys.has(`station:${station.id}`);
        const correctCount = station.sentenceIds.filter((id) =>
          keys.has(`sentence:${id}`)).length;
        const previousId = stations[index - 1]?.id;
        return {
          id: station.id,
          level: station.level,
          title: station.title,
          hanziTitle: station.hanziTitle,
          focus: station.focus,
          blurb: station.blurb,
          progress: {
            attempted,
            correctCount,
            total: station.sentenceIds.length,
            stars: legoStars(attempted, correctCount, station.sentenceIds.length),
            unlocked: index === 0 || keys.has(`station:${previousId}`),
          },
        };
      }),
    };
  }

  getStation(stationId: string) {
    const station = this.stationOrThrow(stationId);
    return {
      id: station.id,
      level: station.level,
      title: station.title,
      hanziTitle: station.hanziTitle,
      focus: station.focus,
      blurb: station.blurb,
      sentences: this.stationSentences(station).map((sentence) => ({
        id: sentence.id,
        level: sentence.level,
        vi: sentence.vi,
        hint: sentence.hint,
        blocks: shuffledBlocks(sentence),
      })),
    };
  }

  async submit(studentId: string, stationId: string, dto: SubmitLegoAttemptDto) {
    const station = this.stationOrThrow(stationId);
    const sentences = this.stationSentences(station);
    const answerBySentence = new Map(dto.answers.map((answer) => [answer.sentenceId, answer]));
    const complete = dto.answers.length === sentences.length
      && answerBySentence.size === sentences.length
      && sentences.every((sentence) => {
        const answer = answerBySentence.get(sentence.id);
        if (!answer || answer.blockIds.length !== sentence.blocks.length) return false;
        return new Set(answer.blockIds).size === sentence.blocks.length
          && sentence.blocks.every((block) => answer.blockIds.includes(block.id));
      });
    if (!complete) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        'Mỗi câu trong trạm phải có đúng một lần và dùng đủ các khối.',
      );
    }

    const results = sentences.map((sentence) => {
      const submitted = answerBySentence.get(sentence.id)!.blockIds;
      const expected = sentence.blocks.map((block) => block.id);
      const correct = submitted.every((id, index) => id === expected[index]);
      return {
        sentenceId: sentence.id,
        correct,
        expectedBlocks: sentence.blocks,
        pinyin: sentence.pinyin,
        rule: sentence.rule,
      };
    });

    const keys = [
      `station:${station.id}`,
      ...results.filter((result) => result.correct)
        .map((result) => `sentence:${result.sentenceId}`),
    ];
    await this.prisma.$transaction(keys.map((contentKey) =>
      this.prisma.userStudyProgress.upsert({
        where: {
          userId_contentKind_contentKey: {
            userId: studentId,
            contentKind: 'lego',
            contentKey,
          },
        },
        create: { userId: studentId, contentKind: 'lego', contentKey, studied: true },
        update: { studied: true },
      })));

    const list = await this.list(studentId);
    const progress = list.stations.find((item) => item.id === stationId)!.progress;
    return { stationId, results, progress };
  }
}
