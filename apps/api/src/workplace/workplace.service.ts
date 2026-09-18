import { Injectable } from '@nestjs/common';
import { AppException } from '../common/errors/app.exception';
import { ErrorCode } from '../common/errors/error-codes';
import { PrismaService } from '../prisma/prisma.service';
import { readContentJson } from '../self-study-practice/content-file';

export interface WorkplaceCorrection {
  wrong: string;
  better: string;
  why: string;
}

interface WorkplaceTurn {
  id: string;
  fromHanzi: string;
  fromPinyin: string;
  fromVi: string;
  task: string;
  suggestions: string[];
  model: string;
  modelVi: string;
  keywords: string[];
  corrections: WorkplaceCorrection[];
}

interface WorkplaceScenario {
  id: string;
  kind: string;
  channel: string;
  title: string;
  hanziTitle: string;
  partner: string;
  partnerRole: string;
  partnerInitial: string;
  level: number;
  durationMin: number;
  difficulty: string;
  blurb: string;
  goal: string;
  brief: string;
  vocabulary: Array<{ hanzi: string; pinyin: string; vi: string }>;
  phrases: Array<{ hanzi: string; pinyin: string; vi: string }>;
  turns: WorkplaceTurn[];
  rubric: Array<{ label: string; hint: string }>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function triplets(value: unknown): boolean {
  return Array.isArray(value) && value.every((item) => isRecord(item)
    && typeof item.hanzi === 'string'
    && typeof item.pinyin === 'string'
    && typeof item.vi === 'string');
}

function isWorkplaceCatalog(value: unknown): value is WorkplaceScenario[] {
  return Array.isArray(value) && value.length > 0 && value.every((scenario) => {
    if (!isRecord(scenario)) return false;
    const strings = [
      'id', 'kind', 'channel', 'title', 'hanziTitle', 'partner', 'partnerRole',
      'partnerInitial', 'difficulty', 'blurb', 'goal', 'brief',
    ];
    if (!strings.every((key) => typeof scenario[key] === 'string')
      || !Number.isInteger(scenario.level)
      || !Number.isInteger(scenario.durationMin)
      || !triplets(scenario.vocabulary)
      || !triplets(scenario.phrases)
      || !Array.isArray(scenario.rubric)
      || !scenario.rubric.every((item) => isRecord(item)
        && typeof item.label === 'string'
        && typeof item.hint === 'string')
      || !Array.isArray(scenario.turns)
      || scenario.turns.length === 0) return false;
    return scenario.turns.every((turn) => isRecord(turn)
      && typeof turn.id === 'string'
      && typeof turn.fromHanzi === 'string'
      && typeof turn.fromPinyin === 'string'
      && typeof turn.fromVi === 'string'
      && typeof turn.task === 'string'
      && stringArray(turn.suggestions)
      && typeof turn.model === 'string'
      && typeof turn.modelVi === 'string'
      && stringArray(turn.keywords)
      && Array.isArray(turn.corrections)
      && turn.corrections.every((item) => isRecord(item)
        && typeof item.wrong === 'string'
        && typeof item.better === 'string'
        && typeof item.why === 'string'));
  });
}

@Injectable()
export class WorkplaceService {
  private source: WorkplaceScenario[] | null = null;

  constructor(private readonly prisma: PrismaService) {}

  private catalog(): WorkplaceScenario[] {
    this.source ??= readContentJson('workplace.json', isWorkplaceCatalog);
    return this.source;
  }

  private scenarioOrThrow(scenarioId: string): WorkplaceScenario {
    const scenario = this.catalog().find((item) => item.id === scenarioId);
    if (!scenario) {
      throw new AppException(
        ErrorCode.WORKPLACE_SCENARIO_NOT_FOUND,
        'Không tìm thấy tình huống công sở.',
      );
    }
    return scenario;
  }

  private async completedKeys(studentId: string): Promise<Set<string>> {
    const rows = await this.prisma.userStudyProgress.findMany({
      where: { userId: studentId, contentKind: 'workplace', studied: true },
    });
    return new Set(rows.map((row) => row.contentKey));
  }

  async list(studentId: string) {
    const keys = await this.completedKeys(studentId);
    return {
      scenarios: this.catalog().map((scenario) => {
        const completedTurns = scenario.turns.filter((turn) =>
          keys.has(`turn:${scenario.id}:${turn.id}`)).length;
        return {
          id: scenario.id,
          kind: scenario.kind,
          channel: scenario.channel,
          title: scenario.title,
          hanziTitle: scenario.hanziTitle,
          partner: scenario.partner,
          partnerRole: scenario.partnerRole,
          partnerInitial: scenario.partnerInitial,
          level: scenario.level,
          durationMin: scenario.durationMin,
          difficulty: scenario.difficulty,
          blurb: scenario.blurb,
          progress: {
            completedTurns,
            totalTurns: scenario.turns.length,
            completed: completedTurns === scenario.turns.length,
          },
        };
      }),
    };
  }

  detail(scenarioId: string) {
    const scenario = this.scenarioOrThrow(scenarioId);
    return {
      id: scenario.id,
      kind: scenario.kind,
      channel: scenario.channel,
      title: scenario.title,
      hanziTitle: scenario.hanziTitle,
      partner: scenario.partner,
      partnerRole: scenario.partnerRole,
      partnerInitial: scenario.partnerInitial,
      level: scenario.level,
      durationMin: scenario.durationMin,
      difficulty: scenario.difficulty,
      blurb: scenario.blurb,
      goal: scenario.goal,
      brief: scenario.brief,
      vocabulary: scenario.vocabulary,
      phrases: scenario.phrases,
      rubric: scenario.rubric,
      turns: scenario.turns.map((turn) => ({
        id: turn.id,
        fromHanzi: turn.fromHanzi,
        fromPinyin: turn.fromPinyin,
        fromVi: turn.fromVi,
        task: turn.task,
        suggestions: turn.suggestions,
      })),
    };
  }

  async reveal(studentId: string, scenarioId: string, turnId: string) {
    const scenario = this.scenarioOrThrow(scenarioId);
    const index = scenario.turns.findIndex((item) => item.id === turnId);
    if (index < 0) {
      throw new AppException(
        ErrorCode.WORKPLACE_TURN_NOT_FOUND,
        'Không tìm thấy lượt hội thoại trong tình huống này.',
      );
    }
    const keys = await this.completedKeys(studentId);
    const previous = scenario.turns[index - 1];
    if (previous && !keys.has(`turn:${scenario.id}:${previous.id}`)) {
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        'Hãy hoàn thành lượt trước trước khi tiếp tục.',
      );
    }
    const turn = scenario.turns[index];
    await this.prisma.userStudyProgress.upsert({
      where: {
        userId_contentKind_contentKey: {
          userId: studentId,
          contentKind: 'workplace',
          contentKey: `turn:${scenario.id}:${turn.id}`,
        },
      },
      create: {
        userId: studentId,
        contentKind: 'workplace',
        contentKey: `turn:${scenario.id}:${turn.id}`,
        studied: true,
      },
      update: { studied: true },
    });
    keys.add(`turn:${scenario.id}:${turn.id}`);
    return {
      scenarioId: scenario.id,
      turnId: turn.id,
      model: turn.model,
      modelVi: turn.modelVi,
      corrections: turn.corrections,
      completed: scenario.turns.every((item) =>
        keys.has(`turn:${scenario.id}:${item.id}`)),
    };
  }
}
