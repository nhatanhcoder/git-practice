/**
 * MOCK(student): view model for the Student area, distilled from the "Hán Lộ"
 * prototype's `data/types.ts`. Mockup mode per docs/prompts/student-product/ —
 * none of this is a wire contract yet.
 *
 * **This file only declares shapes that did not already exist in the repo.**
 * Pinyin initials/finals, tones, sandhi, the 214 Kangxi radicals, listening and
 * speaking cards, PDFs, grammar points and the learning-path nodes all already
 * had mock modules with real content (`foundation-data.ts`, `radicals-data.ts`,
 * `grammar-data.ts`, `learning-path-data.ts`, `mock-user.ts`) — those are reused
 * as-is rather than redeclared here, so there is never a second `GrammarPoint`
 * for the next agent to pick the wrong one of.
 *
 * The structural rule carried over from the prototype, and worth keeping:
 * **learner state never lives inside a content definition.** `Exam` has no
 * `status`; `LegoStation` has no `stars`. Content is read-only and the same for
 * everyone; progress is per learner and joined at render time by the helpers in
 * `student-rules.js`. That mirrors how `docs/entities/` separates `Question`
 * (MongoDB) from `AttemptAnswer` (Postgres).
 *
 * ⚠️ Most shapes below have **no entity spec** in `docs/entities/` — XP, rank,
 * streak, badge, lego station, workplace scenario. They are recorded as gaps in
 * docs/front-end-design-docs/HANLU_PROTOTYPE_DISTILLED.md §6.1. Do not treat
 * them as agreed schema.
 */

/* ------------------------------------------------------------------
   Rank and profile
------------------------------------------------------------------ */

export interface RankTier {
  id: string;
  name: string;
  hanzi: string;
  minXp: number;
  blurb: string;
}

export type ActivityKind = "lesson" | "badge" | "exam" | "boss" | "streak" | "grammar";

export interface ActivityItem {
  id: string;
  kind: ActivityKind;
  text: string;
  detail?: string;
  /** ISO 8601 UTC. Formatted only at render — the WEB-003 rule. */
  at: string;
  xp?: number;
}

export interface WeekDay {
  label: string;
  minutes: number;
  xp: number;
  isToday?: boolean;
}

export interface StreakDay {
  /** Days counted back from today (0 = today). */
  offset: number;
  minutes: number;
  /** Kept by a streak shield rather than by real study. */
  shielded?: boolean;
}

export interface StreakMilestone {
  days: number;
  label: string;
  reward: string;
}

export interface SkillScore {
  skill: string;
  score: number;
  previous: number;
}

/* ------------------------------------------------------------------
   Vocabulary flashcards
------------------------------------------------------------------ */

export interface WordExample {
  word: string;
  pinyin: string;
  vi: string;
}

export interface VocabCard {
  id: string;
  hanzi: string;
  pinyin: string;
  vi: string;
  level: number;
  topic: string;
  examples: WordExample[];
}

/* ------------------------------------------------------------------
   Character writing
------------------------------------------------------------------ */

export type StrokeKind = "ngang" | "so" | "phay" | "mac" | "cham" | "moc" | "gap" | "hat";

export interface WritingChar {
  id: string;
  char: string;
  pinyin: string;
  vi: string;
  level: number;
  strokeCount: number;
  strokes: StrokeKind[];
  radical: string;
  radicalName: string;
  words: WordExample[];
  mnemonic: string;
}

export interface WritingMastery {
  practised: number;
  bestScore: number;
}

export type WritingCharWithProgress = WritingChar & { progress: WritingMastery };

/* ------------------------------------------------------------------
   Mistake notebook (SRS)
------------------------------------------------------------------ */

export type MistakeKind = "vocab" | "grammar" | "character" | "listening" | "reading";
export type MistakeStatus = "due" | "scheduled" | "learned";

export interface MistakeItem {
  id: string;
  kind: MistakeKind;
  level: number;
  /** The question answered wrong. */
  prompt: string;
  hanzi: string;
  pinyin: string;
  /** What the learner picked. */
  chosen: string;
  /** The right answer. */
  answer: string;
  /** Options for the retry, already including the right answer. */
  options: string[];
  /** Shown after answering. */
  tip: string;
  from: string;
  box: number;
  status: MistakeStatus;
  /** ISO 8601 UTC. */
  lastSeen: string;
}

export interface ReviewItem {
  id: string;
  kind: MistakeKind;
  prompt: string;
  hanzi: string;
  pinyin: string;
  meaning: string;
  box: number;
  strength: number;
}

/* ------------------------------------------------------------------
   Exams
------------------------------------------------------------------ */

export type SectionId = "listening" | "reading" | "writing";
export type ExamStatus = "available" | "in-progress" | "passed" | "locked";

export interface Exam {
  id: string;
  title: string;
  level: number;
  /** A full paper, or a single-skill drill. */
  kind: "full" | "drill";
  section?: SectionId;
  durationMin: number;
  questionCount: number;
  passScore: number;
  blurb: string;
}

export interface ExamQuestion {
  id: string;
  section: SectionId;
  /** Vietnamese stem. */
  prompt: string;
  /** Chinese material — the listening passage or the reading text. */
  passage?: string;
  passagePinyin?: string;
  options: string[];
  answer: number;
  explain: string;
}

export type ExamPaper = { section: SectionId; questions: ExamQuestion[] }[];

export interface ExamAttempt {
  id: string;
  examId: string;
  title: string;
  level: number;
  score: number;
  maxScore: number;
  passed: boolean;
  /** ISO 8601 UTC. */
  at: string;
  sections: { section: SectionId; score: number; max: number }[];
  answers: Record<string, number>;
}

/* ------------------------------------------------------------------
   Workplace simulation
------------------------------------------------------------------ */

export type ScenarioKind = "quotation" | "meeting" | "email" | "interview";
export type ScenarioChannel = "email" | "chat";

export interface VocabEntry {
  word: string;
  pinyin: string;
  vi: string;
}

export interface ScenarioTurn {
  id: string;
  /** Incoming message or letter from the counterpart. */
  incoming: string;
  incomingPinyin: string;
  incomingVi: string;
  /** What the learner has to do this turn. */
  task: string;
  /** Phrases they can tap to insert. */
  phrases: VocabEntry[];
  /** A high-scoring model answer. */
  model: string;
  modelVi: string;
  /** Keywords used by the simulated scoring. */
  keywords: string[];
  pitfall: string;
}

export interface Scenario {
  id: string;
  kind: ScenarioKind;
  channel: ScenarioChannel;
  title: string;
  hanzi: string;
  level: number;
  counterpart: string;
  blurb: string;
  /** Shown before the conversation starts. */
  context: string;
  vocab: VocabEntry[];
  criteria: string[];
  turns: ScenarioTurn[];
}

export interface ScenarioProgress {
  bestScore: number;
  attempts: number;
}

export type ScenarioWithProgress = Scenario & { progress: ScenarioProgress };

/* ------------------------------------------------------------------
   Lego sentence builder
------------------------------------------------------------------ */

/** Grammatical role of each block — drives its colour and the explanation. */
export type BlockRole = "S" | "T" | "P" | "A" | "V" | "O" | "C" | "Q";

export interface LegoBlock {
  id: string;
  text: string;
  pinyin: string;
  role: BlockRole;
}

export interface LegoSentence {
  id: string;
  /** The correct order, as block ids. */
  order: string[];
  blocks: LegoBlock[];
  vi: string;
  /** The word-order rule this sentence demonstrates. */
  rule: string;
}

export interface LegoStation {
  id: string;
  name: string;
  hanzi: string;
  level: number;
  rule: string;
  blurb: string;
  sentences: LegoSentence[];
}

export type LegoStationWithProgress = LegoStation & { stars: number; locked: boolean };

/* ------------------------------------------------------------------
   Gamification
------------------------------------------------------------------ */

export type LeaderScope = "week" | "month" | "all";

export interface RivalSeed {
  id: string;
  name: string;
  initials: string;
  level: number;
  baseXp: number;
}

export interface LeaderRow {
  id: string;
  name: string;
  initials: string;
  level: number;
  xp: number;
  rank: number;
  /** Rank change against the previous period (positive = moved up). */
  delta: number;
  isYou: boolean;
}

export type BadgeCategory =
  | "Chuỗi ngày"
  | "Từ vựng"
  | "Chữ Hán"
  | "Thi cử"
  | "Ngữ pháp"
  | "Cộng đồng";

export type BadgeRarity = "Thường" | "Hiếm" | "Sử thi" | "Huyền thoại";

export interface BadgeDef {
  id: string;
  name: string;
  hanzi: string;
  category: BadgeCategory;
  rarity: BadgeRarity;
  blurb: string;
  /** Shown while the badge is still locked. */
  requirement: string;
}

export type Badge = BadgeDef & { unlocked: boolean; progress: number };

/* ------------------------------------------------------------------
   Placement
------------------------------------------------------------------ */

export interface PlacementQuestion {
  id: string;
  level: number;
  prompt: string;
  options: string[];
  answer: number;
}
