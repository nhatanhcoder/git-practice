---
status: implemented
last_updated: 2026-09-15
---
# LearningUnit — Mongo learning_units
Immutable platform vocabulary snapshot. Unique slug and unique (curriculum,level,order).
Fields: slug string; curriculum hanlo_vocabulary; level integer 1–9; order positive integer;
title string; sourceHash SHA256 of approved source; words array of {hanzi,pinyin,meaning};
published boolean; createdAt/updatedAt dates. No teacher or private assignment content.
Published unit content/order cannot be changed through student API or importer.
A new source revision requires a separately reviewed catalog version; progress references slug.
