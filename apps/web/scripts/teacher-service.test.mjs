import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateEnrollmentCode,
  classStatusLabels,
  enrollmentStatusLabels,
  contentTypeLabels,
  mockTeacherClasses,
  mockClassStudents,
  mockClassLessons,
} from '../src/lib/teacher-data.ts';

describe('Teacher Data & Service Utilities', () => {
  it('generates compliant 8-character enrollment codes', () => {
    for (const level of [1, 3, 5, 6, 9]) {
      const code = generateEnrollmentCode(level);
      assert.equal(code.length, 8);
      assert.ok(code.startsWith(`HSK${level}`));
      assert.match(code, /^[A-Z0-9]{8}$/);
    }
  });

  it('has valid status and content type labels in Vietnamese', () => {
    assert.equal(classStatusLabels.active, 'Đang hoạt động');
    assert.equal(classStatusLabels.archived, 'Đã lưu trữ');
    assert.equal(enrollmentStatusLabels.active, 'Đang học');
    assert.equal(enrollmentStatusLabels.dropped, 'Đã rời lớp');
    assert.equal(contentTypeLabels.document, 'Tài liệu');
    assert.equal(contentTypeLabels.video, 'Video');
  });

  it('provides comprehensive mock data for offline fallback', () => {
    assert.ok(Array.isArray(mockTeacherClasses));
    assert.ok(mockTeacherClasses.length >= 4);

    const c1Students = mockClassStudents['c1'];
    assert.ok(Array.isArray(c1Students));
    assert.equal(c1Students.length, 8);
    assert.equal(c1Students[0].nickname, 'Nguyễn Minh Anh');

    const c1Lessons = mockClassLessons['c1'];
    assert.ok(Array.isArray(c1Lessons));
    assert.equal(c1Lessons.length, 5);
    assert.equal(c1Lessons[0].title, 'Bài 1 · Chào hỏi và giới thiệu');
  });

  it('validates HSK level bounds in [1, 9]', () => {
    const isValidHsk = (level) => Number.isInteger(level) && level >= 1 && level <= 9;
    assert.equal(isValidHsk(0), false);
    assert.equal(isValidHsk(1), true);
    assert.equal(isValidHsk(5), true);
    assert.equal(isValidHsk(9), true);
    assert.equal(isValidHsk(10), false);
  });

  it('validates lesson draft title constraint (min 3 chars)', () => {
    const isValidLessonTitle = (title) => title.trim().length >= 3;
    assert.equal(isValidLessonTitle('  '), false);
    assert.equal(isValidLessonTitle('ab'), false);
    assert.equal(isValidLessonTitle('HSK'), true);
    assert.equal(isValidLessonTitle('Bài 1: Giới thiệu'), true);
  });
});
