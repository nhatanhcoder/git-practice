---
status: completed
---

# 2026-09-10 — Foundation and Grammar design — Codex

## Scope and startup

User approved step 1: source/media audit and design documents, not implementation.
DOCS task. No real schema, Auth, RBAC or money change. Existing permissions are referenced,
not expanded. Latest startup session was 2026-09-07-opencode-a07-join-class.md; its live A07
browser/enrollment verification remained blocked by Docker/Postgres. This task does not close it.
Branch codex/foundation-grammar-contracts from fresh origin/main 99a511c, isolated worktree
D:/PersonalProject/Real-foundation-grammar-docs. Main checkout and its .pnpm-store were preserved.
Skills: flow-mapper and hsk-learning-ia, read in the preceding analysis turn and reused.

## Done

- Source audit: 76 Grammar records across HSK 1–9 (9/9/10/9/7/9/8/8/7), 297 Foundation
  records/descriptors, seven repeated-name groups and four repeated-example groups.
- Recorded SHA-256 hashes, source/FE mapping gaps, stale-doc conflicts and absence of media
  in searched formats/license files. This establishes neither redistribution rights nor
  pedagogical approval. Original external content is unchanged and was not copied.
- Proposed module design with sections 0–16: aggregate/storage choices, eight blocked API
  operation groups, source-derived fields, private-state boundaries, completion alternatives,
  idempotency/concurrency requirements, import/rollback plan and 12-rule acceptance matrix.
- Two Page Contracts, each under 60 lines, with seven states and explicit proposed approval
  status. Added matching flow trees, 17 transition rows, state transitions and missing operations.
- Updated Student API/module index, entity index and Page Contract index; none claim an
  executable Foundation/Grammar endpoint, DTO or physical schema. No new error codes invented.
- Appended notes under existing DOC-011/DEBT-003; no new issue id allocated or old entry edited.
- Audit committed separately as 7d23909; design is the next logical documentation commit.

## Verification

- Node JSON.parse and independent PowerShell ConvertFrom-Json produced identical source counts.
- Source hashes rechecked after documentation work and unchanged.
- Grammar: unique ids, HSK integer range, no empty existing fields or replacement characters,
  NFC-stable strings; token/example comparison matched all 76 after punctuation/space removal.
- Foundation: unique per-group keys, radical numbers contiguous 1–214, tones 1–4.
- check-docs: all 8 checks passed; git diff --check clean; seven states per new contract and
  transition/action coverage reviewed. Final check-docs is rerun before commit.
- No application tests/build or feature acceptance claimed: documents only. Runtime remains
  NOT IMPLEMENTED, and the proposed acceptance matrix is NOT RUN.

## Handoff / decisions

Review docs/api/modules/student/02-foundation-grammar.md D1–D5: source adoption and editorial
review, storage/physical schema, completion/mastery, media/recording policy, exact transport and
error contracts. These block backend work, not completion of the approved documentation task.
Open a documentation PR for review; no merge, deployment, database access or production import.

## Publication blocked by automatic approval review

The documentation is committed locally (7d23909 and fc09f63). Push/PR creation was rejected
by automatic approval review. Read-only checks confirmed origin is the public repository
https://github.com/nhatanhcoder/git-practice, viewer permission ADMIN, and the source path is
already present on origin/main. A retry with that evidence was also rejected because explicit
approval to publicly publish this exact audit/design payload was not established.
No push or PR was created. Ask the owner to authorize publication of this documentation to
that public repository; do not bypass the rejection. Application implementation remains
separately blocked on D1–D5 and is not authorized by a publication approval.

## Publication approved and completed

The owner explicitly replied "approval" to publishing this exact audit/design package to the
public nhatanhcoder/git-practice repository. The branch is pushed and PR #54 is open:
https://github.com/nhatanhcoder/git-practice/pull/54
This supersedes the publication blocker above. D1–D5 remain implementation decisions; no merge,
deployment, database change or runtime implementation was authorized or performed.
