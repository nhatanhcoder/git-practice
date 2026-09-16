import { createHash } from "node:crypto";
import type { LearningUnit } from "../mongodb/schemas/learning-unit.schema";

const choiceId = (slug: string, index: number, meaning: string) =>
  createHash("sha256")
    .update(JSON.stringify([slug, index, meaning]))
    .digest("hex")
    .slice(0, 16);
export function learningQuiz(unit: Pick<LearningUnit, "slug" | "words">) {
  const meanings = Array.from(new Set(unit.words.map((w) => w.meaning)));
  return unit.words.map((word, index) => ({
    prompt: word.hanzi,
    options: meanings
      .map((text) => ({ id: choiceId(unit.slug, index, text), text }))
      .sort((a, b) => (a.id < b.id ? -1 : 1)),
  }));
}
export function gradeLearning(
  unit: Pick<LearningUnit, "slug" | "words">,
  answers: string[],
) {
  const feedback = unit.words.map((word, index) => ({
    hanzi: word.hanzi,
    meaning: word.meaning,
    correct: answers[index] === choiceId(unit.slug, index, word.meaning),
  }));
  const score = feedback.filter((f) => f.correct).length;
  return {
    score,
    total: unit.words.length,
    passed: score >= Math.ceil(unit.words.length * 0.8),
    feedback,
  };
}
