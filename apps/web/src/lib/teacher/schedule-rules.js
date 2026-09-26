/** Date-only schedule arithmetic stays in UTC so a browser timezone cannot shift a class day. */
export function parseScheduleDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) return null;
  return date;
}

function dateOnly(date) {
  return date.toISOString().slice(0, 10);
}

export function weekForDate(value) {
  const date = parseScheduleDate(value);
  if (!date) throw new RangeError('Invalid schedule date');
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - daysSinceMonday);
  const from = dateOnly(date);
  date.setUTCDate(date.getUTCDate() + 6);
  return { from, to: dateOnly(date) };
}

export function shiftScheduleWeek(value, weeks) {
  const date = parseScheduleDate(value);
  if (!date) throw new RangeError('Invalid schedule date');
  date.setUTCDate(date.getUTCDate() + weeks * 7);
  return dateOnly(date);
}

export function todayInVietnam() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const field = (type) => parts.find((part) => part.type === type)?.value ?? '';
  return `${field('year')}-${field('month')}-${field('day')}`;
}

/** @typedef {{classId: string, scheduledDate: string, scheduledStart: string, scheduledEnd: string, topic: string}} SessionDraft */

/** @param {SessionDraft} draft */
export function validateSessionDraft(draft) {
  /** @type {Partial<Record<keyof SessionDraft, string>>} */
  const errors = {};
  const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (!draft.classId) errors.classId = 'Chọn lớp học.';
  if (!parseScheduleDate(draft.scheduledDate)) errors.scheduledDate = 'Chọn ngày hợp lệ.';
  if (!timePattern.test(draft.scheduledStart)) errors.scheduledStart = 'Nhập giờ bắt đầu hợp lệ.';
  if (!timePattern.test(draft.scheduledEnd)) errors.scheduledEnd = 'Nhập giờ kết thúc hợp lệ.';
  else if (timePattern.test(draft.scheduledStart) && draft.scheduledEnd <= draft.scheduledStart) {
    errors.scheduledEnd = 'Giờ kết thúc phải sau giờ bắt đầu.';
  }
  const topic = draft.topic.trim();
  if (!topic) errors.topic = 'Nhập chủ đề bài dạy.';
  else if (topic.length > 300) errors.topic = 'Chủ đề không quá 300 ký tự.';
  return errors;
}
