/**
 * Pure rules for the Student area — no React, no DOM, no data.
 *
 * Plain JavaScript with JSDoc on purpose, following `lib/teacher/teacher-rules.js`
 * and `lib/admin/*-rules.js`: the tests then import exactly what ships instead of
 * regex-stripping TypeScript, which broke the moment a signature used `string[]`
 * (see KNOWN_ISSUES WEB-006).
 *
 * Distilled from the prototype's `data/rules.ts`. One deliberate change is
 * flagged at `placementLevel`.
 *
 * MOCK(student): mockup mode per docs/prompts/student-product/.
 */

/**
 * @typedef {import('./types').RankTier} RankTier
 * @typedef {import('./types').MistakeItem} MistakeItem
 * @typedef {import('./types').ReviewItem} ReviewItem
 * @typedef {import('./types').WeekDay} WeekDay
 * @typedef {import('./types').LeaderRow} LeaderRow
 * @typedef {import('./types').RivalSeed} RivalSeed
 * @typedef {import('./types').BadgeDef} BadgeDef
 * @typedef {import('./types').Badge} Badge
 * @typedef {import('./types').ExamPaper} ExamPaper
 * @typedef {import('./types').SectionId} SectionId
 */

/* ------------------------------------------------------------------
   Mistake notebook — Leitner boxes
------------------------------------------------------------------ */

/**
 * Five Leitner boxes with widening intervals.
 *
 * ⚠️ This is the prototype's algorithm, not the project's. `SPRINT_PLAN.md` S5
 * and `PROJECT_KNOWLEDGE.md` 4.3 specify **SM-2** for flashcard scheduling. The
 * two are not interchangeable and the conflict is recorded in
 * docs/front-end-design-docs/HANLU_PROTOTYPE_DISTILLED.md §6.1. Until the owner
 * picks one, this drives the mocked UI only.
 * @type {{box:number,label:string,interval:string}[]}
 */
export const SRS_BOXES = [
  { box: 1, label: "Hộp 1", interval: "Ôn lại sau 10 phút" },
  { box: 2, label: "Hộp 2", interval: "Ôn lại sau 1 ngày" },
  { box: 3, label: "Hộp 3", interval: "Ôn lại sau 3 ngày" },
  { box: 4, label: "Hộp 4", interval: "Ôn lại sau 1 tuần" },
  { box: 5, label: "Hộp 5", interval: "Ôn lại sau 1 tháng" },
];

/**
 * @param {number} box
 * @returns {string}
 */
export function boxInterval(box) {
  const hit = SRS_BOXES.find((b) => b.box === box);
  return hit ? hit.interval : "Ôn lại sau 1 tháng";
}

/**
 * Right answer moves up one box (capped at 5); wrong drops all the way to 1.
 * @param {number} box
 * @param {boolean} correct
 * @returns {number}
 */
export function advanceBox(box, correct) {
  if (!correct) return 1;
  return Math.min(5, box + 1);
}

/**
 * A mistake is due again once it is in box 1–2, or explicitly marked due.
 * @param {{status:string}} item
 * @returns {boolean}
 */
export function isDue(item) {
  return item.status === "due";
}

/** A writing-pad score at or above this counts as one character written correctly. */
export const WRITING_PASS_SCORE = 80;

/** Cost, in XP, of forcing a locked node open. */
export const FORCE_UNLOCK_COST = 100;

/* ------------------------------------------------------------------
   Dates and streaks
------------------------------------------------------------------ */

/**
 * Today in local time as yyyy-mm-dd.
 * @param {Date} [d]
 * @returns {string}
 */
export function todayISO(d = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Whole days between two yyyy-mm-dd marks. Negative when `from` is after `to`.
 * @param {string} from
 * @param {string} to
 * @returns {number}
 */
export function diffDays(from, to) {
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.round((b - a) / 86400000);
}

/**
 * Streak after studying on `today`.
 * Same day: unchanged. Next day: +1. Any longer gap: back to 1.
 * @param {string|null} lastStudyDate
 * @param {number} streak
 * @param {string} today
 * @returns {number}
 */
export function nextStreak(lastStudyDate, streak, today) {
  if (!lastStudyDate) return Math.max(1, streak);
  const gap = diffDays(lastStudyDate, today);
  if (gap <= 0) return streak;
  if (gap === 1) return streak + 1;
  return 1;
}

/* ------------------------------------------------------------------
   XP and rank
------------------------------------------------------------------ */

/**
 * Rank is derived from XP, never stored — the highest tier whose `minXp` is met.
 * @param {RankTier[]} ranks
 * @param {number} xp
 * @returns {{current: RankTier, next: RankTier|null, into: number, forNext: number}}
 */
export function rankFromXp(ranks, xp) {
  const sorted = [...ranks].sort((a, b) => a.minXp - b.minXp);
  let current = sorted[0];
  for (const tier of sorted) {
    if (xp >= tier.minXp) current = tier;
  }
  const idx = sorted.indexOf(current);
  const next = idx + 1 < sorted.length ? sorted[idx + 1] : null;
  const into = xp - current.minXp;
  const forNext = next ? next.minXp - current.minXp : 0;
  return { current, next, into, forNext };
}

/**
 * Percentage of the way from the current rank to the next. A maxed-out learner
 * reads 100 rather than dividing by zero.
 * @param {number} into
 * @param {number} forNext
 * @returns {number}
 */
export function rankProgress(into, forNext) {
  if (forNext <= 0) return 100;
  return Math.max(0, Math.min(100, Math.round((into / forNext) * 100)));
}

/* ------------------------------------------------------------------
   Grammar mastery
------------------------------------------------------------------ */

/**
 * A right answer adds 20 points of mastery, a wrong one removes 10; clamped 0–100.
 * @param {{level:number,attempts:number}} current
 * @param {boolean} correct
 * @returns {{level:number,attempts:number}}
 */
export function nextMastery(current, correct) {
  const delta = correct ? 20 : -10;
  return {
    level: Math.max(0, Math.min(100, current.level + delta)),
    attempts: current.attempts + 1,
  };
}

/**
 * Join content with the learner's mastery map. Points never seen read as zero.
 * @template {{id:string}} T
 * @param {T[]} points
 * @param {Record<string,{level:number,attempts:number}>} mastery
 * @returns {(T & {mastery:{level:number,attempts:number}})[]}
 */
export function withGrammarMastery(points, mastery) {
  return points.map((p) => ({
    ...p,
    mastery: mastery[p.id] || { level: 0, attempts: 0 },
  }));
}

/**
 * Distractors for a multiple-choice question, taken from other points.
 * @param {{id:string,pattern?:string,hanzi?:string}} point
 * @param {{id:string,pattern?:string,hanzi?:string}[]} all
 * @param {number} [count]
 * @returns {string[]}
 */
export function getDistractors(point, all, count = 3) {
  const pool = all.filter((p) => p.id !== point.id).map((p) => p.pattern);
  const out = [];
  for (const candidate of pool) {
    if (out.length >= count) break;
    if (!out.includes(candidate)) out.push(candidate);
  }
  return out;
}

/* ------------------------------------------------------------------
   Character writing
------------------------------------------------------------------ */

/**
 * @template {{id:string}} T
 * @param {T[]} chars
 * @param {Record<string,{practised:number,bestScore:number}>} progress
 * @returns {(T & {progress:{practised:number,bestScore:number}})[]}
 */
export function withWritingProgress(chars, progress) {
  return chars.map((c) => ({
    ...c,
    progress: progress[c.id] || { practised: 0, bestScore: 0 },
  }));
}

/**
 * The distinct radicals present in a character set, for the radical filter.
 * @param {{radical:string,radicalName:string}[]} chars
 * @returns {{char:string,name:string,count:number}[]}
 */
export function writingRadicals(chars) {
  /** @type {Record<string,{char:string,name:string,count:number}>} */
  const acc = {};
  for (const c of chars) {
    if (!acc[c.radical]) acc[c.radical] = { char: c.radical, name: c.radicalName, count: 0 };
    acc[c.radical].count += 1;
  }
  return Object.values(acc).sort((a, b) => b.count - a.count);
}

/* ------------------------------------------------------------------
   Lego sentence builder
------------------------------------------------------------------ */

/**
 * Stars for one round: finishing is 1, >= 50% right is 2, >= 80% is 3.
 * @param {number} rights
 * @param {number} total
 * @returns {number}
 */
export function legoStarsFor(rights, total) {
  const rate = total > 0 ? rights / total : 0;
  if (rate >= 0.8) return 3;
  if (rate >= 0.5) return 2;
  return 1;
}

/**
 * Join stations with the learner's stars. A station unlocks when the one before
 * it has at least one star; the first station is always open.
 * @template {{id:string}} T
 * @param {T[]} stations
 * @param {Record<string,number>} legoStars
 * @returns {(T & {stars:number, locked:boolean})[]}
 */
export function withLegoProgress(stations, legoStars) {
  return stations.map((st, i) => {
    const prev = i > 0 ? stations[i - 1] : null;
    return {
      ...st,
      stars: legoStars[st.id] || 0,
      locked: prev ? (legoStars[prev.id] || 0) < 1 : false,
    };
  });
}

/**
 * Deterministic shuffle so a round does not reshuffle on every React render.
 * @template T
 * @param {T[]} blocks
 * @param {number} seed
 * @returns {T[]}
 */
export function shuffleBlocks(blocks, seed) {
  const out = [...blocks];
  let s = seed || 1;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) % 2147483648;
    const j = s % (i + 1);
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

/* ------------------------------------------------------------------
   Exams
------------------------------------------------------------------ */

/**
 * Score a paper against an answer map.
 *
 * ⚠️ This is **mock scoring in the browser**, which ADR-005 forbids for the real
 * product: the attempt must be scored server-side and the clock must come from a
 * server `expiresAt`. Recorded in HANLU_PROTOTYPE_DISTILLED.md §9. Replace this
 * whole function when the Attempt API lands — do not wire the UI to it.
 *
 * @param {ExamPaper} paper
 * @param {Record<string,number>} answers
 * @param {number} passScore
 * @returns {{score:number,max:number,passed:boolean,sections:{section:SectionId,score:number,max:number}[]}}
 */
export function scorePaper(paper, answers, passScore) {
  const sections = paper.map((s) => {
    let score = 0;
    for (const q of s.questions) {
      if (answers[q.id] === q.answer) score += 1;
    }
    return { section: s.section, score, max: s.questions.length };
  });
  const score = sections.reduce((sum, s) => sum + s.score, 0);
  const max = sections.reduce((sum, s) => sum + s.max, 0);
  return { score, max, passed: score >= passScore, sections };
}

/**
 * Exam status belongs to the learner, not the exam.
 * @param {{id:string,level:number}} exam
 * @param {{examStatus:Record<string,string>, currentLevel:number}} progress
 * @returns {import('./types').ExamStatus}
 */
export function examStatus(exam, progress) {
  const stored = progress.examStatus[exam.id];
  if (stored) return stored;
  return exam.level > progress.currentLevel + 1 ? "locked" : "available";
}

/* ------------------------------------------------------------------
   Placement test
------------------------------------------------------------------ */

/**
 * Suggested level: the highest band such that every band from 1 up to it has at
 * least one right answer. No right answers at all means start at HSK 1.
 *
 * ⚠️ The prototype capped this at `maxLevel = 6`, which is the stale HSK 1–6
 * range `DOC-004` exists to stamp out. The range is **1–9** (settled 2026-08-11),
 * so the default is 9 here. This is the one behavioural change made while porting.
 *
 * @param {Record<number, number>} correctByLevel
 * @param {number} [maxLevel]
 * @returns {number}
 */
export function placementLevel(correctByLevel, maxLevel = 9) {
  let level = 1;
  while (level <= maxLevel && (correctByLevel[level] || 0) > 0) level++;
  return Math.max(1, level - 1);
}

/* ------------------------------------------------------------------
   Workplace simulation
------------------------------------------------------------------ */

/**
 * Simulated reply scoring: keyword coverage plus a light length check.
 *
 * MOCK(student): a real implementation would be an AI call behind the API.
 * Nothing here is a language-quality judgement.
 *
 * @param {string} text
 * @param {{keywords:string[]}} turn
 * @returns {{score:number, hit:string[], missed:string[]}}
 */
export function scoreReply(text, turn) {
  const body = (text || "").trim();
  const hit = turn.keywords.filter((k) => body.includes(k));
  const missed = turn.keywords.filter((k) => !body.includes(k));
  if (body.length === 0) return { score: 0, hit, missed };
  const coverage = turn.keywords.length ? hit.length / turn.keywords.length : 1;
  const lengthBonus = body.length >= 12 ? 1 : body.length / 12;
  return { score: Math.round(coverage * 80 + lengthBonus * 20), hit, missed };
}

/**
 * @template {{id:string}} T
 * @param {T[]} scenarios
 * @param {Record<string,{bestScore:number,attempts:number}>} workplaceProgress
 * @returns {(T & {progress:{bestScore:number,attempts:number}})[]}
 */
export function withScenarioProgress(scenarios, workplaceProgress) {
  return scenarios.map((s) => ({
    ...s,
    progress: workplaceProgress[s.id] || { bestScore: 0, attempts: 0 },
  }));
}

/* ------------------------------------------------------------------
   Leaderboard
------------------------------------------------------------------ */

/**
 * Deterministic pseudo-random so the board does not reshuffle between renders.
 * @param {number} seed
 * @returns {number}
 */
function seeded(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

/**
 * Build the board for a period, with the learner inserted in their real place.
 * @param {RivalSeed[]} rivals
 * @param {{id:string,name:string,initials:string,currentLevel:number,xp:number}} you
 * @param {string} scope
 * @returns {LeaderRow[]}
 */
export function getLeaderboard(rivals, you, scope) {
  const factor = scope === "week" ? 0.18 : scope === "month" ? 0.55 : 1;
  const rows = rivals.map((r, i) => ({
    id: r.id,
    name: r.name,
    initials: r.initials,
    level: r.level,
    xp: Math.round(r.baseXp * factor * (0.85 + seeded(i + 1) * 0.3)),
    rank: 0,
    delta: Math.round(seeded(i + 7) * 6) - 3,
    isYou: false,
  }));
  rows.push({
    id: you.id,
    name: you.name,
    initials: you.initials,
    level: you.currentLevel,
    xp: Math.round(you.xp * factor),
    rank: 0,
    delta: 2,
    isYou: true,
  });
  rows.sort((a, b) => b.xp - a.xp);
  rows.forEach((r, i) => {
    r.rank = i + 1;
  });
  return rows;
}

/* ------------------------------------------------------------------
   Review queue and charts
------------------------------------------------------------------ */

/**
 * Today's review queue is derived from the mistake notebook, never stored.
 * @param {MistakeItem[]} mistakes
 * @returns {ReviewItem[]}
 */
export function reviewQueueFromMistakes(mistakes) {
  return mistakes
    .filter(isDue)
    .slice(0, 8)
    .map((m) => ({
      id: m.id,
      kind: m.kind,
      prompt: m.prompt,
      hanzi: m.hanzi,
      pinyin: m.pinyin,
      meaning: m.answer,
      box: m.box,
      strength: Math.min(100, m.box * 20),
    }));
}

/**
 * Add XP or minutes to today's column of the week chart.
 * @param {WeekDay[]} week
 * @param {{xp?:number,minutes?:number}} delta
 * @returns {WeekDay[]}
 */
export function bumpWeek(week, delta) {
  return week.map((d) =>
    d.isToday
      ? { ...d, xp: d.xp + (delta.xp || 0), minutes: d.minutes + (delta.minutes || 0) }
      : d,
  );
}

/**
 * Overall summary shown at the top of the progress page.
 * @param {{completedLessons:string[], earnedBadges:string[], attempts:object[], grammarMastery:Record<string,{level:number}>}} progress
 * @returns {{lessons:number,badges:number,exams:number,grammarMastered:number}}
 */
export function progressSummary(progress) {
  const grammarMastered = Object.values(progress.grammarMastery).filter(
    (m) => m.level >= 80,
  ).length;
  return {
    lessons: progress.completedLessons.length,
    badges: progress.earnedBadges.length,
    exams: progress.attempts.filter((a) => a.passed).length,
    grammarMastered,
  };
}

/* ------------------------------------------------------------------
   Badges
------------------------------------------------------------------ */

/**
 * Evaluate every badge against the progress record. Returns unlock state and a
 * 0–100 progress figure so locked badges can still show how close they are.
 *
 * @param {BadgeDef[]} defs
 * @param {any} progress
 * @returns {Badge[]}
 */
export function evaluateBadges(defs, progress) {
  const lessons = progress.completedLessons.length;
  const passed = progress.attempts.filter((a) => a.passed).length;
  const grammar = Object.values(progress.grammarMastery).filter((m) => m.level >= 80).length;
  const chars = Object.values(progress.writingMastery).filter(
    (m) => m.bestScore >= WRITING_PASS_SCORE,
  ).length;
  const learned = progress.mistakes.filter((m) => m.status === "learned").length;

  /** @type {Record<string, {have:number, need:number}>} */
  const meters = {
    streak: { have: progress.student.streakDays, need: 7 },
    "streak-30": { have: progress.student.streakDays, need: 30 },
    lessons: { have: lessons, need: 10 },
    "lessons-50": { have: lessons, need: 50 },
    exam: { have: passed, need: 1 },
    "exam-5": { have: passed, need: 5 },
    grammar: { have: grammar, need: 10 },
    "grammar-40": { have: grammar, need: 40 },
    writing: { have: chars, need: 20 },
    "writing-100": { have: chars, need: 100 },
    vocab: { have: learned, need: 25 },
    "vocab-200": { have: learned, need: 200 },
    xp: { have: progress.student.xp, need: 5000 },
    "xp-25k": { have: progress.student.xp, need: 25000 },
  };

  return defs.map((def) => {
    const meter = meters[def.id];
    const forced = progress.earnedBadges.includes(def.id);
    if (!meter) return { ...def, unlocked: forced, progress: forced ? 100 : 0 };
    const pct = Math.max(0, Math.min(100, Math.round((meter.have / meter.need) * 100)));
    return { ...def, unlocked: forced || meter.have >= meter.need, progress: pct };
  });
}
