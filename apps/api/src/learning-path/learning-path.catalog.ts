import type { ImportCard } from "../flashcards/import/vocab-extract";
import type { LearningWord } from "../mongodb/schemas/learning-unit.schema";
export interface PublishedLearningUnit {
  slug: string;
  curriculum: string;
  level: number;
  order: number;
  title: string;
  sourceHash: string;
  words: LearningWord[];
  published: boolean;
}
export function buildLearningCatalog(
  cards: ImportCard[],
  sourceHash: string,
): PublishedLearningUnit[] {
  const units: PublishedLearningUnit[] = [];
  for (let level = 1; level <= 9; level++) {
    const words = cards
      .filter((c) => c.hskLevel === level)
      .sort((a, b) => (a.hanzi < b.hanzi ? -1 : a.hanzi > b.hanzi ? 1 : 0))
      .map((c) => ({ hanzi: c.hanzi, pinyin: c.pinyin, meaning: c.meaning }));
    const batches: LearningWord[][] = [];
    for (let i = 0; i < words.length; i += 8)
      batches.push(words.slice(i, i + 8));
    if (batches.length > 1 && batches[batches.length - 1].length === 1) {
      const tail = batches.pop()!;
      batches[batches.length - 1].push(...tail);
    }
    for (const [index, batch] of batches.entries()) {
      if (new Set(batch.map((w) => w.meaning)).size < 2)
        throw new Error("Unit needs at least two distinct meanings");
      units.push({
        slug: `hanlo-v1-hsk-${level}-unit-${index + 1}`,
        curriculum: "hanlo_vocabulary",
        level,
        order: index + 1,
        title: `HSK ${level} · Từ vựng ${index + 1}`,
        sourceHash,
        words: batch,
        published: true,
      });
    }
  }
  return units;
}
