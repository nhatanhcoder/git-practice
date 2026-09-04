import { apiRequest } from './api-client';
import type {
  TeacherClass,
  ClassStudent,
  ClassLesson,
  LessonContentType,
} from './teacher-data';

/**
 * Every function here throws on failure. There are no mock fallbacks left.
 *
 * They used to return `mockTeacherClasses` / `mockClassLessons` (flagged
 * `isFallback: true`, which no caller checked) whenever the API was unreachable,
 * so a signed-out teacher saw a fully populated set of classes that belonged to
 * nobody. Worse, createTeacherClass fabricated a class WITH an enrollment code
 * and returned it as created — a code a student could never join with, because
 * the class did not exist.
 */
export async function fetchTeacherClasses(): Promise<{ classes: TeacherClass[] }> {
  const res = await apiRequest<TeacherClass[]>('/teacher/classes');
  return { classes: Array.isArray(res.data) ? res.data : [] };
}

export async function createTeacherClass(data: {
  name: string;
  hskLevel: number;
  description?: string;
}): Promise<{ classItem: TeacherClass }> {
  const res = await apiRequest<TeacherClass>('/teacher/classes', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return { classItem: res.data };
}

export async function fetchTeacherClassDetail(
  classId: string,
): Promise<{ classItem: TeacherClass; students: ClassStudent[] }> {
  {
    const res = await apiRequest<any>(`/teacher/classes/${classId}`);
    const d = res.data;
    const classItem: TeacherClass = {
      id: d.id,
      name: d.name,
      hskLevel: d.hskLevel,
      enrollmentCode: d.enrollmentCode,
      studentCount: d.students?.length ?? 0,
      status: d.status,
      createdAt: d.createdAt,
      description: d.description || '',
    };
    const students: ClassStudent[] = (d.students || []).map((s: any) => ({
      id: s.id,
      nickname: s.nickname,
      email: s.email,
      joinedAt: s.joinedAt,
      enrollmentStatus: 'active',
    }));
    return { classItem, students };
  }
}

export async function updateTeacherClass(
  classId: string,
  data: { name?: string; hskLevel?: number; description?: string },
): Promise<{ classItem: TeacherClass }> {
  const res = await apiRequest<TeacherClass>(`/teacher/classes/${classId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  return { classItem: res.data };
}

export async function archiveTeacherClass(classId: string): Promise<{ classItem: TeacherClass }> {
  const res = await apiRequest<TeacherClass>(`/teacher/classes/${classId}/archive`, {
    method: 'PATCH',
  });
  return { classItem: res.data };
}

export async function regenerateEnrollmentCode(classId: string): Promise<{ enrollmentCode: string }> {
  const res = await apiRequest<{ enrollmentCode: string }>(
    `/teacher/classes/${classId}/enrollment-code/regenerate`,
    { method: 'POST' },
  );
  return res.data;
}

export async function fetchClassLessons(
  classId: string,
): Promise<{ lessons: ClassLesson[] }> {
  {
    const res = await apiRequest<any[]>(`/teacher/classes/${classId}/lessons`);
    const lessons: ClassLesson[] = (res.data || []).map((l: any) => ({
      id: l.id,
      title: l.title,
      description: l.description || '',
      contentType: l.contentType || 'document',
      assignmentCount: 0,
    }));
    return { lessons };
  }
}

export async function createLesson(
  classId: string,
  data: { title: string; description?: string; contentType: LessonContentType },
): Promise<{ lesson: ClassLesson }> {
  const res = await apiRequest<any>(`/teacher/classes/${classId}/lessons`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  const d = res.data;
  return {
    lesson: {
      id: d.id,
      title: d.title,
      description: d.description || '',
      contentType: d.contentType || 'document',
      assignmentCount: 0,
    },
  };
}

export async function updateLesson(
  id: string,
  data: { title?: string; description?: string; contentType?: LessonContentType },
): Promise<{ lesson: ClassLesson }> {
  const res = await apiRequest<any>(`/teacher/lessons/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  const d = res.data;
  return {
    lesson: {
      id: d.id,
      title: d.title,
      description: d.description || '',
      contentType: d.contentType || 'document',
      assignmentCount: 0,
    },
  };
}

export async function deleteLesson(id: string): Promise<{ message: string }> {
  const res = await apiRequest<{ message: string }>(`/teacher/lessons/${id}`, {
    method: 'DELETE',
  });
  return res.data;
}

export async function reorderLessons(
  classId: string,
  items: Array<{ id: string; orderIndex: number }>,
): Promise<{ lessons: ClassLesson[] }> {
  const res = await apiRequest<any[]>(`/teacher/classes/${classId}/lessons/reorder`, {
    method: 'PATCH',
    body: JSON.stringify({ items }),
  });
  const lessons: ClassLesson[] = (res.data || []).map((l: any) => ({
    id: l.id,
    title: l.title,
    description: l.description || '',
    contentType: l.contentType || 'document',
    assignmentCount: 0,
  }));
  return { lessons };
}
