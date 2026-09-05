The complete rules are in `ai/rules/working-rules.md`. This is the mandatory short form.

## Startup

Before every task:

1. Read `AGENTS.md`.
2. Read all five always-loaded files referenced there.
3. Read the newest file in `ai/context/sessions/`.
4. Answer these questions before taking action:
   - What was left unfinished in the previous session?
   - Is this task CODE, DOCS, or READ-ONLY?
   - Does it change DB schema, Auth, RBAC, or money-related behavior?

If the answer to the third question is yes, stop and obtain explicit approval before making any change. No exceptions. Approval applies only to the named scope.

## Workflow

### CODE

`branch → claim PROGRESS 🔶 → plan → WAIT FOR APPROVAL → implement → verify → RECORD → PR`

### DOCS
ssss
`branch → plan → WAIT FOR APPROVAL → edit → check:docs → RECORD → PR`

### READ-ONLY

`inspect → verify evidence → report`

Read-only reviews and diagnostics do not require a branch, RECORD, or PR unless the user explicitly requests changes.

## Mandatory RECORD

Every CODE or DOCS task must update:

- `ai/PROGRESS.md`
- `ai/known-issues/KNOWN_ISSUES.md`
- `ai/context/sessions/<date>-<task-name>.md`
- The status flag of every document touched

`KNOWN_ISSUES.md` is append-only. Search existing IDs across active branches before assigning a new one; never reuse or renumber IDs.

## Rules

- Run `node scripts/check-docs.mjs` before every commit.
- For frontend verification, run `pnpm --filter web build`. Never run the root build.
- Commit each logical unit immediately. Do not postpone all commits until the end of the session.
- Never invent error codes, fields, payloads, or endpoints. If a required contract is missing, mark it `⛔` and report it.
- If documents conflict, record the conflict and do not silently choose a side.
- When an entity specification conflicts with a feature document, the entity specification is authoritative; record the mismatch.
- When delegating, provide the subagent with the complete source list and relevant excerpts. Incomplete context produces unreliable findings.
- Existing skills may be used freely. Ask before installing a new skill.
- Never run `/design-promote` unless the user explicitly requests that exact command.
- If any required step is skipped, stop, disclose it, and complete the missing step immediately.
- A passing test only proves the tested scope. Missing or unimplemented endpoints must be reported as `NOT IMPLEMENTED`, never counted as passing.
- Do not merge, deploy, or modify unrelated work unless explicitly authorized.

## End of Session

End with exactly these four lines:

Done:
Recorded in: <actual files, or NONE>
Blocked by:
You need to: