import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');

const writingList = read('../src/app/student/(app)/writing/page.tsx');
const writingDetail = read('../src/app/student/(app)/writing/[charId]/page.tsx');
const lego = read('../src/app/student/(app)/lego/page.tsx');
const workplaceList = read('../src/app/student/(app)/workplace/page.tsx');
const workplaceDetail = read('../src/app/student/(app)/workplace/[scenarioId]/page.tsx');
const writingService = read('../src/lib/student/writing-service.ts');
const legoService = read('../src/lib/student/lego-service.ts');
const workplaceService = read('../src/lib/student/workplace-service.ts');

test('Writing routes are live and contain no fake score or local fixture progress', () => {
  const source = `${writingList}\n${writingDetail}`;
  for (const forbidden of [
    'UnavailableState', 'DemoStateSwitcher', 'writingChars', 'useStudentStore',
    'gradeInk', 'WRITING_PASS_SCORE', 'awardXp', 'bestScore',
  ]) {
    assert.ok(!source.includes(forbidden), `Writing must not contain ${forbidden}`);
  }
  assert.match(writingService, /\/student\/writing\/progress/);
  assert.match(writingService, /practised: true/);
});

test('Lego route submits complete answers to the server and contains no XP authority', () => {
  for (const forbidden of [
    'UnavailableState', 'DemoStateSwitcher', 'legoStations', 'useStudentStore',
    'awardXp', 'setLegoStars', '+20 XP',
  ]) {
    assert.ok(!lego.includes(forbidden), `Lego must not contain ${forbidden}`);
  }
  assert.match(legoService, /\/student\/lego\/stations\/\$\{encodeURIComponent\(id\)\}\/attempt/);
  assert.match(lego, /submitLegoStation/);
});

test('Workplace route reveals comparison material without keyword or numeric scoring', () => {
  const source = `${workplaceList}\n${workplaceDetail}`;
  for (const forbidden of [
    'UnavailableState', 'DemoStateSwitcher', 'scenarios } from', 'useStudentStore',
    'scoreReply', 'bestScore', 'keyword', 'awardXp',
  ]) {
    assert.ok(!source.includes(forbidden), `Workplace must not contain ${forbidden}`);
  }
  assert.match(workplaceService, /\/reveal`/);
  assert.match(workplaceDetail, /Không có điểm số hoặc đánh giá AI/);
});
