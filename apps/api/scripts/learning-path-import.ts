import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import mongoose from "mongoose";
import {
  extractVocabulary,
  type WritingEntry,
} from "../src/flashcards/import/vocab-extract";
import {
  buildLearningCatalog,
  type PublishedLearningUnit,
} from "../src/learning-path/learning-path.catalog";

async function main() {
  const flags = process.argv.slice(2);
  if (flags.some((f) => f !== "--apply"))
    throw new Error("Only --apply is supported; default is dry-run");
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required");
  const raw = readFileSync(resolve("content/writing.json"), "utf8");
  const source = extractVocabulary(JSON.parse(raw) as WritingEntry[]);
  if (source.invalid.length)
    throw new Error("Invalid approved vocabulary source; stop publication");
  const planned = buildLearningCatalog(
    source.cards,
    createHash("sha256").update(raw).digest("hex"),
  );
  const connection = await mongoose
    .createConnection(process.env.MONGODB_URI)
    .asPromise();
  try {
    const collection =
      connection.collection<PublishedLearningUnit>("learning_units");
    const existing = await collection
      .find({ slug: { $in: planned.map((u) => u.slug) } })
      .toArray();
    const bySlug = new Map(existing.map((u) => [u.slug, u]));
    const fingerprint = (u: PublishedLearningUnit) =>
      JSON.stringify({
        slug: u.slug,
        curriculum: u.curriculum,
        level: u.level,
        order: u.order,
        title: u.title,
        sourceHash: u.sourceHash,
        words: u.words.map((w) => ({
          hanzi: w.hanzi,
          pinyin: w.pinyin,
          meaning: w.meaning,
        })),
        published: u.published,
      });
    for (const unit of planned) {
      const previous = bySlug.get(unit.slug);
      if (previous && fingerprint(previous) !== fingerprint(unit))
        throw new Error(
          `Immutable catalog conflict at ${unit.slug}; no writes made`,
        );
    }
    const missing = planned.filter((u) => !bySlug.has(u.slug));
    console.log(
      JSON.stringify({
        database: connection.name,
        collection: "learning_units",
        dryRun: !flags.includes("--apply"),
        words: source.cards.length,
        units: planned.length,
        conflictsResolvedByA11: source.conflicts.length,
        existing: existing.length,
        wouldCreate: missing.length,
      }),
    );
    if (flags.includes("--apply")) {
      await collection.createIndex({ slug: 1 }, { unique: true });
      await collection.createIndex(
        { curriculum: 1, level: 1, order: 1 },
        { unique: true },
      );
      let created = 0;
      for (const unit of missing) {
        const result = await collection.updateOne(
          { slug: unit.slug },
          { $setOnInsert: unit },
          { upsert: true },
        );
        if (!result.upsertedCount) {
          const concurrent = await collection.findOne({ slug: unit.slug });
          if (!concurrent || fingerprint(concurrent) !== fingerprint(unit))
            throw new Error("Concurrent catalog conflict; stop and review");
        }
        created += result.upsertedCount;
      }
      console.log(
        JSON.stringify({ created, progressTouched: 0, flashcardsTouched: 0 }),
      );
    }
  } finally {
    await connection.close();
  }
}
void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Import failed");
  process.exitCode = 1;
});
