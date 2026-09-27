import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseScheduleDate,
  shiftScheduleWeek,
  validateSessionDraft,
  weekForDate,
} from '../src/lib/teacher/schedule-rules.js';

const page = readFileSync(new URL('../src/app/teacher/sessions/page.tsx', import.meta.url), 'utf8');
const service = readFileSync(new URL('../src/lib/teacher/teacher-session-service.ts', import.meta.url), 'utf8');

test('schedule week is Monday–Sunday across month and year boundaries', () => {
  assert.deepEqual(weekForDate('2026-09-24'), { from: '2026-09-21', to: '2026-09-27' });
  assert.deepEqual(weekForDate('2027-01-01'), { from: '2026-12-28', to: '2027-01-03' });
  assert.equal(shiftScheduleWeek('2026-12-28', 1), '2027-01-04');
  assert.equal(shiftScheduleWeek('2027-01-04', -1), '2026-12-28');
});

test('schedule date validation rejects impossible calendar days', () => {
  assert.equal(parseScheduleDate('2026-02-29'), null);
  assert.ok(parseScheduleDate('2028-02-29'));
  assert.equal(parseScheduleDate('2026-13-01'), null);
  assert.equal(parseScheduleDate('24/09/2026'), null);
});

test('create validation requires owned class, date, ascending time and topic', () => {
  const valid = {
    classId: 'class-id', scheduledDate: '2026-09-24',
    scheduledStart: '19:00', scheduledEnd: '20:30', topic: 'Ôn ngữ pháp',
  };
  assert.deepEqual(validateSessionDraft(valid), {});
  const invalid = validateSessionDraft({ ...valid, classId: '', scheduledDate: '2026-09-31', scheduledStart: '20:30', scheduledEnd: '19:00', topic: '  ' });
  assert.ok(invalid.classId);
  assert.ok(invalid.scheduledDate);
  assert.ok(invalid.scheduledEnd);
  assert.ok(invalid.topic);
  assert.ok(validateSessionDraft({ ...valid, topic: 'a'.repeat(301) }).topic);
});

test('teacher sessions page uses the real list/create API and has no fake lifecycle writes', () => {
  assert.match(page, /fetchTeacherSessions\(/);
  assert.match(page, /createTeacherSession\(/);
  assert.match(page, /fetchTeacherClasses\(/);
  assert.match(page, /topic: draft\.topic\.trim\(\)/);
  assert.doesNotMatch(page, /mockSessions|mockTeacherClasses|handleStart|saveAttendance|handleSubmit|ReviewSwitcher/);
  assert.match(service, /page >= response\.meta\.totalPages/);
  assert.match(service, /limit: '100'/);
  assert.doesNotMatch(service, /\/teacher\/sessions\/.*\/(start|end|attendance|submit)/);
});
