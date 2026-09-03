import { apiRequest, ApiError } from './api-client';
import {
  mockTeacherClasses,
  mockClassStudents,
  mockClassLessons,
  generateEnrollmentCode,
  type TeacherClass,
  type ClassStudent,
  type ClassLesson,
  type LessonContentType,
} from './teacher-data';

export async function fetchTeacherClasses(): Promise<{ classes: TeacherClass[]; isFallback?: boolean }> {
  try {
    const res = await apiRequest<TeacherClass[]>('/teacher/classes');
    return { classes: Array.isArray(res.data) ? res.data : [] };
  } catch {
    return { classes: mockTeacherClasses, isFallback: true };
  }
}

export async function createTeacherClass(data: {
  name: string;
  hskLevel: number;
  description?: string;
}): Promise<{ classItem: TeacherClass }> {
  try {
    const res = await apiRequest<TeacherClass>('/teacher/classes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return { classItem: res.data };
  } catch (err) {
    // Fallback optimistic creation for offline dev / SSG
    const fallback: TeacherClass = {
      id: 'c' + Date.now(),
      name: data.name,
      hskLevel: data.hskLevel,
      enrollmentCode: generateEnrollmentCode(data.hskLevel),
      studentCount: 0,
      status: 'active',
      createdAt: new Date().toISOString(),
      description: data.description || '',
    };
    return { classItem: fallback };
  }
}

export async function fetchTeacherClassDetail(
  classId: string,
): Promise<{ classItem: TeacherClass | null; students: ClassStudent[]; isFallback?: boolean }> {
  try {
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
  } catch {
    const source = mockTeacherClasses.find((c) => c.id === classId) ?? null;
    const students = source ? mockClassStudents[source.id] ?? [] : [];
    return { classItem: source, students, isFallback: true };
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
): Promise<{ lessons: ClassLesson[]; isFallback?: boolean }> {
  try {
    const res = await apiRequest<any[]>(`/teacher/classes/${classId}/lessons`);
    const lessons: ClassLesson[] = (res.data || []).map((l: any) => ({
      id: l.id,
      title: l.title,
      description: l.description || '',
      contentType: l.contentType || 'document',
      assignmentCount: 0,
    }));
    return { lessons };
  } catch {
    const fallback = mockClassLessons[classId] ?? [];
    return { lessons: fallback, isFallback: true };
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
