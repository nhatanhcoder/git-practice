import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");

/**
 * Task C structural guards (2026-09-13). The exams rooms and the placement page
 * were rebuilt from MOCK fixtures onto the live assignment/attempt/placement
 * endpoints. These assertions pin the rebuild in place: no fixture imports, no
 * client-side scoring, no answer key on any take/placement wire read.
 */

describe("exams rooms are live and ADR-005-clean", () => {
  const lobby = read("../src/app/student/(app)/exams/page.tsx");
  const door = read("../src/app/student/(app)/exams/[examId]/page.tsx");
  const result = read("../src/app/student/(app)/exams/[examId]/result/page.tsx");

  it("no page imports the prototype fixtures from content.ts", () => {
    for (const [name, src] of [["lobby", lobby], ["door", door], ["result", result]]) {
      assert.ok(!src.includes("lib/student/content"), `${name} must not read content.ts fixtures`);
      assert.ok(!src.includes("MOCK("), `${name} must not carry a MOCK marker`);
    }
  });

  it("the door starts an attempt instead of rendering a client-scored paper", () => {
    assert.match(door, /startAttempt/);
    assert.ok(!door.includes("scorePaper"), "client scoring is the ADR-005 violation");
    assert.ok(!/correctAnswer/.test(door), "the door never touches answer keys");
  });

  it("the result route resolves via INV-ATLP-12 and hands over to the attempt result", () => {
    assert.match(result, /fetchMyAttempt/);
    assert.match(result, /attempts\/\$\{[^}]+\}\/result/);
    assert.match(result, /Chưa có bài thi nào/, "no attempt ⇒ honest empty, never a fake score");
  });

  it("the lobby reads the real assignment list and narrows to mock_test", () => {
    assert.match(lobby, /\/student\/assignments/);
    assert.match(lobby, /mock_test/);
    assert.match(lobby, /fetchMyAttempt/);
  });
});

describe("placement page is server-authoritative", () => {
  const page = read("../src/app/student/(app)/placement/page.tsx");
  const service = read("../src/lib/student/placement-service.ts");

  it("reads the live endpoints, not the prototype fixtures", () => {
    assert.ok(!page.includes("lib/student/content"));
    assert.ok(!page.includes("placementQuestions"));
    assert.ok(!page.includes("MOCK("));
    assert.match(service, /\/student\/placement/);
  });

  it("never grades in the browser (ADR-005)", () => {
    assert.ok(!page.includes("q.answer"), "comparing picked vs answer is client scoring");
    assert.ok(!page.includes("setCurrentLevel"), "the level comes from the server, not the demo store");
    assert.match(service, /submitPlacement/);
  });

  it("the wire type carries no answer key", () => {
    // Strip comments first — the doc comment is ALLOWED to say the key never rides
    // the wire; the type itself must not carry it.
    const code = service.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    const questionType = code.slice(
      code.indexOf("export interface PlacementQuestion"),
      code.indexOf("export interface PlacementPaper"),
    );
    assert.ok(!questionType.includes("correctAnswer"));
    assert.ok(questionType.includes("content"), "audioUrl/prompt ride the take-payload content shape");
  });
});
