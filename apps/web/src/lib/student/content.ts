/**
 * MOCK(student): read-only content for the Student area — the half that is the
 * same for every learner. Everything the learner *does* lives in `store.ts`.
 *
 * Mockup mode per docs/prompts/student-product/. No API call anywhere; remove
 * this whole module when the real content endpoints exist.
 *
 * Content that already had a mock module in this repo is NOT duplicated here —
 * pinyin/tones/sandhi/listening/speaking/PDFs come from `foundation-data.ts`,
 * the 214 Kangxi radicals from `radicals-data.ts`, grammar from
 * `grammar-data.ts`, the path from `learning-path-data.ts`.
 *
 * ⚠️ The prototype this is distilled from ships 940 KB of real content
 * (587 characters, 76 grammar points, 11 exams, 214 radicals). That corpus is
 * the `DOC-011` content and lives outside this repo. What follows is a
 * representative slice sized for a mockup, not that corpus.
 */

import type {
  ActivityItem,
  BadgeDef,
  Exam,
  ExamPaper,
  LegoStation,
  MistakeItem,
  PlacementQuestion,
  RankTier,
  RivalSeed,
  Scenario,
  SkillScore,
  StreakDay,
  StreakMilestone,
  VocabCard,
  WeekDay,
  WritingChar,
} from "./types";

/* ------------------------------------------------------------------
   Ranks — six imperial-examination tiers, derived from XP
------------------------------------------------------------------ */

export const ranks: RankTier[] = [
  { id: "dong-sinh", name: "Đồng sinh", hanzi: "童生", minXp: 0, blurb: "Vừa nhập môn, đang làm quen mặt chữ." },
  { id: "tu-tai", name: "Tú tài", hanzi: "秀才", minXp: 1200, blurb: "Đọc được câu ngắn, viết được chữ cơ bản." },
  { id: "cu-nhan", name: "Cử nhân", hanzi: "举人", minXp: 4000, blurb: "Giao tiếp hằng ngày trôi chảy." },
  { id: "cong-si", name: "Cống sĩ", hanzi: "贡士", minXp: 12000, blurb: "Đọc hiểu văn bản dài, viết đoạn mạch lạc." },
  { id: "tien-si", name: "Tiến sĩ", hanzi: "进士", minXp: 30000, blurb: "Dùng được tiếng Trung trong công việc." },
  { id: "trang-nguyen", name: "Trạng nguyên", hanzi: "状元", minXp: 60000, blurb: "Đỉnh bảng — thành thạo gần như bản ngữ." },
];

export const streakMilestones: StreakMilestone[] = [
  { days: 3, label: "Bén lửa", reward: "+50 XP" },
  { days: 7, label: "Một tuần", reward: "Huy hiệu Kiên Trì" },
  { days: 14, label: "Hai tuần", reward: "+1 khiên bảo vệ chuỗi" },
  { days: 30, label: "Một tháng", reward: "Huy hiệu Bền Bỉ" },
  { days: 60, label: "Hai tháng", reward: "Khung đại diện đặc biệt" },
  { days: 100, label: "Trăm ngày", reward: "Huy hiệu Bách Nhật" },
];

/* ------------------------------------------------------------------
   Charts
------------------------------------------------------------------ */

export const week: WeekDay[] = [
  { label: "T2", minutes: 24, xp: 120 },
  { label: "T3", minutes: 31, xp: 180 },
  { label: "T4", minutes: 12, xp: 60 },
  { label: "T5", minutes: 45, xp: 260 },
  { label: "T6", minutes: 28, xp: 150 },
  { label: "T7", minutes: 52, xp: 310 },
  { label: "CN", minutes: 18, xp: 90, isToday: true },
];

export const xpMonths: { month: string; xp: number }[] = [
  { month: "Th4", xp: 1840 },
  { month: "Th5", xp: 2610 },
  { month: "Th6", xp: 2210 },
  { month: "Th7", xp: 3420 },
  { month: "Th8", xp: 4180 },
  { month: "Th9", xp: 1170 },
];

export const skills: SkillScore[] = [
  { skill: "Nghe", score: 72, previous: 64 },
  { skill: "Đọc", score: 81, previous: 79 },
  { skill: "Viết", score: 58, previous: 61 },
  { skill: "Nói", score: 49, previous: 40 },
];

/**
 * 13 weeks of study minutes for the heat grid. Generated from a fixed formula
 * rather than 91 literals: deterministic, so the grid never shifts between
 * renders, and obviously fake to anyone reading it.
 */
export const streakHistory: StreakDay[] = Array.from({ length: 91 }, (_, i) => {
  const offset = 90 - i;
  const seed = (offset * 37) % 11;
  const minutes = seed === 0 ? 0 : seed < 3 ? 8 : seed < 6 ? 22 : seed < 9 ? 38 : 55;
  return { offset, minutes, shielded: offset === 17 || offset === 44 };
});

export const activity: ActivityItem[] = [
  { id: "a1", kind: "lesson", text: "Hoàn thành bài «Mua sắm & mặc cả»", detail: "HSK 3 · Chặng 8", at: "2026-09-03T01:20:00Z", xp: 120 },
  { id: "a2", kind: "grammar", text: "Thành thạo điểm ngữ pháp 把", detail: "Mức thành thạo 100%", at: "2026-09-02T13:05:00Z", xp: 60 },
  { id: "a3", kind: "exam", text: "Đạt đề thi thử HSK 3 — lần 2", detail: "72/100 · qua mốc 60", at: "2026-09-01T09:40:00Z", xp: 300 },
  { id: "a4", kind: "badge", text: "Mở khoá huy hiệu «Kiên Trì»", detail: "Chuỗi 7 ngày", at: "2026-08-31T15:12:00Z" },
  { id: "a5", kind: "boss", text: "Hạ ải trùm «Chợ Nghĩa Ô»", detail: "3 sao", at: "2026-08-30T10:02:00Z", xp: 250 },
  { id: "a6", kind: "streak", text: "Giữ chuỗi 12 ngày liên tiếp", at: "2026-08-29T22:30:00Z" },
  { id: "a7", kind: "lesson", text: "Hoàn thành bài «Hỏi đường»", detail: "HSK 3 · Chặng 7", at: "2026-08-28T12:15:00Z", xp: 120 },
];

/* ------------------------------------------------------------------
   Vocabulary flashcards
------------------------------------------------------------------ */

export const vocabCards: VocabCard[] = [
  { id: "v1", hanzi: "朋友", pinyin: "péngyou", vi: "bạn bè", level: 1, topic: "Con người", examples: [{ word: "好朋友", pinyin: "hǎo péngyou", vi: "bạn thân" }] },
  { id: "v2", hanzi: "老师", pinyin: "lǎoshī", vi: "giáo viên", level: 1, topic: "Con người", examples: [{ word: "语文老师", pinyin: "yǔwén lǎoshī", vi: "giáo viên ngữ văn" }] },
  { id: "v3", hanzi: "学生", pinyin: "xuésheng", vi: "học sinh", level: 1, topic: "Con người", examples: [{ word: "留学生", pinyin: "liúxuéshēng", vi: "du học sinh" }] },
  { id: "v4", hanzi: "医生", pinyin: "yīshēng", vi: "bác sĩ", level: 1, topic: "Nghề nghiệp", examples: [{ word: "看医生", pinyin: "kàn yīshēng", vi: "đi khám bác sĩ" }] },
  { id: "v5", hanzi: "商店", pinyin: "shāngdiàn", vi: "cửa hàng", level: 1, topic: "Nơi chốn", examples: [{ word: "去商店", pinyin: "qù shāngdiàn", vi: "đi cửa hàng" }] },
  { id: "v6", hanzi: "医院", pinyin: "yīyuàn", vi: "bệnh viện", level: 1, topic: "Nơi chốn", examples: [{ word: "在医院", pinyin: "zài yīyuàn", vi: "ở bệnh viện" }] },
  { id: "v7", hanzi: "喜欢", pinyin: "xǐhuan", vi: "thích", level: 1, topic: "Động từ", examples: [{ word: "很喜欢", pinyin: "hěn xǐhuan", vi: "rất thích" }] },
  { id: "v8", hanzi: "吃饭", pinyin: "chīfàn", vi: "ăn cơm", level: 1, topic: "Động từ", examples: [{ word: "吃午饭", pinyin: "chī wǔfàn", vi: "ăn trưa" }] },
  { id: "v9", hanzi: "工作", pinyin: "gōngzuò", vi: "làm việc / công việc", level: 2, topic: "Công việc", examples: [{ word: "找工作", pinyin: "zhǎo gōngzuò", vi: "tìm việc" }] },
  { id: "v10", hanzi: "帮助", pinyin: "bāngzhù", vi: "giúp đỡ", level: 2, topic: "Động từ", examples: [{ word: "帮助别人", pinyin: "bāngzhù biérén", vi: "giúp người khác" }] },
  { id: "v11", hanzi: "希望", pinyin: "xīwàng", vi: "hy vọng", level: 2, topic: "Động từ", examples: [{ word: "希望你好", pinyin: "xīwàng nǐ hǎo", vi: "mong bạn khoẻ" }] },
  { id: "v12", hanzi: "旅游", pinyin: "lǚyóu", vi: "du lịch", level: 2, topic: "Hoạt động", examples: [{ word: "去旅游", pinyin: "qù lǚyóu", vi: "đi du lịch" }] },
  { id: "v13", hanzi: "便宜", pinyin: "piányi", vi: "rẻ", level: 2, topic: "Tính từ", examples: [{ word: "很便宜", pinyin: "hěn piányi", vi: "rất rẻ" }] },
  { id: "v14", hanzi: "漂亮", pinyin: "piàoliang", vi: "đẹp", level: 2, topic: "Tính từ", examples: [{ word: "真漂亮", pinyin: "zhēn piàoliang", vi: "đẹp thật" }] },
  { id: "v15", hanzi: "特别", pinyin: "tèbié", vi: "đặc biệt", level: 3, topic: "Trạng từ", examples: [{ word: "特别好", pinyin: "tèbié hǎo", vi: "đặc biệt tốt" }] },
  { id: "v16", hanzi: "环境", pinyin: "huánjìng", vi: "môi trường", level: 3, topic: "Xã hội", examples: [{ word: "保护环境", pinyin: "bǎohù huánjìng", vi: "bảo vệ môi trường" }] },
  { id: "v17", hanzi: "经济", pinyin: "jīngjì", vi: "kinh tế", level: 3, topic: "Xã hội", examples: [{ word: "经济发展", pinyin: "jīngjì fāzhǎn", vi: "phát triển kinh tế" }] },
  { id: "v18", hanzi: "解决", pinyin: "jiějué", vi: "giải quyết", level: 3, topic: "Động từ", examples: [{ word: "解决问题", pinyin: "jiějué wèntí", vi: "giải quyết vấn đề" }] },
  { id: "v19", hanzi: "机会", pinyin: "jīhuì", vi: "cơ hội", level: 3, topic: "Danh từ", examples: [{ word: "好机会", pinyin: "hǎo jīhuì", vi: "cơ hội tốt" }] },
  { id: "v20", hanzi: "计划", pinyin: "jìhuà", vi: "kế hoạch", level: 3, topic: "Danh từ", examples: [{ word: "做计划", pinyin: "zuò jìhuà", vi: "lập kế hoạch" }] },
  { id: "v21", hanzi: "责任", pinyin: "zérèn", vi: "trách nhiệm", level: 4, topic: "Xã hội", examples: [{ word: "负责任", pinyin: "fù zérèn", vi: "chịu trách nhiệm" }] },
  { id: "v22", hanzi: "效率", pinyin: "xiàolǜ", vi: "hiệu suất", level: 4, topic: "Công việc", examples: [{ word: "提高效率", pinyin: "tígāo xiàolǜ", vi: "nâng cao hiệu suất" }] },
  { id: "v23", hanzi: "竞争", pinyin: "jìngzhēng", vi: "cạnh tranh", level: 4, topic: "Công việc", examples: [{ word: "市场竞争", pinyin: "shìchǎng jìngzhēng", vi: "cạnh tranh thị trường" }] },
  { id: "v24", hanzi: "影响", pinyin: "yǐngxiǎng", vi: "ảnh hưởng", level: 4, topic: "Động từ", examples: [{ word: "受影响", pinyin: "shòu yǐngxiǎng", vi: "bị ảnh hưởng" }] },
];

export const vocabTopics = Array.from(new Set(vocabCards.map((v) => v.topic)));

/* ------------------------------------------------------------------
   Character writing
------------------------------------------------------------------ */

export const writingChars: WritingChar[] = [
  { id: "w1", char: "人", pinyin: "rén", vi: "người", level: 1, strokeCount: 2, strokes: ["phay", "mac"], radical: "人", radicalName: "Nhân", mnemonic: "Hai nét như hai chân đang bước.", words: [{ word: "人们", pinyin: "rénmen", vi: "mọi người" }, { word: "大人", pinyin: "dàrén", vi: "người lớn" }] },
  { id: "w2", char: "大", pinyin: "dà", vi: "to, lớn", level: 1, strokeCount: 3, strokes: ["ngang", "phay", "mac"], radical: "大", radicalName: "Đại", mnemonic: "Người dang rộng hai tay.", words: [{ word: "大学", pinyin: "dàxué", vi: "đại học" }, { word: "长大", pinyin: "zhǎngdà", vi: "lớn lên" }] },
  { id: "w3", char: "天", pinyin: "tiān", vi: "trời, ngày", level: 1, strokeCount: 4, strokes: ["ngang", "ngang", "phay", "mac"], radical: "大", radicalName: "Đại", mnemonic: "Một nét ngang trên chữ 大 — cái gì đó ở trên người.", words: [{ word: "今天", pinyin: "jīntiān", vi: "hôm nay" }, { word: "天气", pinyin: "tiānqì", vi: "thời tiết" }] },
  { id: "w4", char: "口", pinyin: "kǒu", vi: "miệng", level: 1, strokeCount: 3, strokes: ["so", "gap", "ngang"], radical: "口", radicalName: "Khẩu", mnemonic: "Cái miệng mở vuông.", words: [{ word: "人口", pinyin: "rénkǒu", vi: "dân số" }, { word: "门口", pinyin: "ménkǒu", vi: "cửa ra vào" }] },
  { id: "w5", char: "日", pinyin: "rì", vi: "mặt trời, ngày", level: 1, strokeCount: 4, strokes: ["so", "gap", "ngang", "ngang"], radical: "日", radicalName: "Nhật", mnemonic: "Mặt trời có một chấm ở giữa.", words: [{ word: "生日", pinyin: "shēngrì", vi: "sinh nhật" }, { word: "日本", pinyin: "Rìběn", vi: "Nhật Bản" }] },
  { id: "w6", char: "月", pinyin: "yuè", vi: "mặt trăng, tháng", level: 1, strokeCount: 4, strokes: ["phay", "gap", "ngang", "ngang"], radical: "月", radicalName: "Nguyệt", mnemonic: "Trăng khuyết dựng đứng.", words: [{ word: "月亮", pinyin: "yuèliang", vi: "mặt trăng" }, { word: "一个月", pinyin: "yí gè yuè", vi: "một tháng" }] },
  { id: "w7", char: "水", pinyin: "shuǐ", vi: "nước", level: 1, strokeCount: 4, strokes: ["moc", "hat", "phay", "mac"], radical: "水", radicalName: "Thuỷ", mnemonic: "Dòng nước chảy có nhánh hai bên.", words: [{ word: "喝水", pinyin: "hē shuǐ", vi: "uống nước" }, { word: "水果", pinyin: "shuǐguǒ", vi: "hoa quả" }] },
  { id: "w8", char: "火", pinyin: "huǒ", vi: "lửa", level: 1, strokeCount: 4, strokes: ["cham", "phay", "phay", "mac"], radical: "火", radicalName: "Hoả", mnemonic: "Ngọn lửa với hai tia bắn ra.", words: [{ word: "火车", pinyin: "huǒchē", vi: "tàu hoả" }, { word: "着火", pinyin: "zháohuǒ", vi: "bắt lửa" }] },
  { id: "w9", char: "好", pinyin: "hǎo", vi: "tốt", level: 1, strokeCount: 6, strokes: ["phay", "phay", "ngang", "gap", "moc", "ngang"], radical: "女", radicalName: "Nữ", mnemonic: "Người nữ 女 bên đứa con 子 — cảnh tượng tốt lành.", words: [{ word: "你好", pinyin: "nǐ hǎo", vi: "xin chào" }, { word: "好吃", pinyin: "hǎochī", vi: "ngon" }] },
  { id: "w10", char: "学", pinyin: "xué", vi: "học", level: 1, strokeCount: 8, strokes: ["cham", "cham", "phay", "cham", "moc", "ngang", "gap", "ngang"], radical: "子", radicalName: "Tử", mnemonic: "Đứa trẻ 子 dưới mái nhà đang học.", words: [{ word: "学习", pinyin: "xuéxí", vi: "học tập" }, { word: "学校", pinyin: "xuéxiào", vi: "trường học" }] },
  { id: "w11", char: "书", pinyin: "shū", vi: "sách", level: 1, strokeCount: 4, strokes: ["gap", "so", "hat", "cham"], radical: "乙", radicalName: "Ất", mnemonic: "Cuốn sách cuộn lại.", words: [{ word: "看书", pinyin: "kàn shū", vi: "đọc sách" }, { word: "书店", pinyin: "shūdiàn", vi: "hiệu sách" }] },
  { id: "w12", char: "中", pinyin: "zhōng", vi: "giữa, trung", level: 1, strokeCount: 4, strokes: ["so", "gap", "ngang", "so"], radical: "丨", radicalName: "Cổn", mnemonic: "Mũi tên xuyên qua chính giữa ô vuông.", words: [{ word: "中国", pinyin: "Zhōngguó", vi: "Trung Quốc" }, { word: "中午", pinyin: "zhōngwǔ", vi: "buổi trưa" }] },
  { id: "w13", char: "不", pinyin: "bù", vi: "không", level: 1, strokeCount: 4, strokes: ["ngang", "phay", "so", "cham"], radical: "一", radicalName: "Nhất", mnemonic: "Một nét chặn ngang lối đi.", words: [{ word: "不是", pinyin: "bú shì", vi: "không phải" }, { word: "不用", pinyin: "búyòng", vi: "không cần" }] },
  { id: "w14", char: "每", pinyin: "měi", vi: "mỗi", level: 2, strokeCount: 7, strokes: ["phay", "ngang", "gap", "cham", "ngang", "cham", "ngang"], radical: "母", radicalName: "Mẫu", mnemonic: "Người mẹ 母 với nét phẩy trên đầu.", words: [{ word: "每天", pinyin: "měitiān", vi: "mỗi ngày" }, { word: "每次", pinyin: "měicì", vi: "mỗi lần" }] },
  { id: "w15", char: "路", pinyin: "lù", vi: "đường", level: 2, strokeCount: 13, strokes: ["so", "gap", "ngang", "so", "ngang", "cham", "phay", "mac", "ngang", "so", "gap", "ngang", "ngang"], radical: "足", radicalName: "Túc", mnemonic: "Bộ chân 足 — cái mà đường dùng để đi.", words: [{ word: "马路", pinyin: "mǎlù", vi: "đường cái" }, { word: "路口", pinyin: "lùkǒu", vi: "ngã tư" }] },
  { id: "w16", char: "话", pinyin: "huà", vi: "lời nói", level: 2, strokeCount: 8, strokes: ["cham", "gap", "phay", "ngang", "so", "gap", "ngang", "ngang"], radical: "讠", radicalName: "Ngôn", mnemonic: "Bộ ngôn 讠 cạnh cái lưỡi 舌.", words: [{ word: "说话", pinyin: "shuōhuà", vi: "nói chuyện" }, { word: "电话", pinyin: "diànhuà", vi: "điện thoại" }] },
  { id: "w17", char: "题", pinyin: "tí", vi: "đề, câu hỏi", level: 3, strokeCount: 15, strokes: ["so", "gap", "ngang", "ngang", "ngang", "so", "ngang", "phay", "mac", "so", "gap", "ngang", "ngang", "phay", "cham"], radical: "页", radicalName: "Hiệt", mnemonic: "Bộ trang 页 — chỗ đề bài được in ra.", words: [{ word: "问题", pinyin: "wèntí", vi: "vấn đề" }, { word: "题目", pinyin: "tímù", vi: "đề bài" }] },
  { id: "w18", char: "意", pinyin: "yì", vi: "ý", level: 3, strokeCount: 13, strokes: ["cham", "ngang", "ngang", "so", "gap", "ngang", "ngang", "cham", "gap", "cham", "cham", "ngang", "ngang"], radical: "心", radicalName: "Tâm", mnemonic: "Âm thanh 音 đặt trên trái tim 心 — ý trong lòng.", words: [{ word: "意思", pinyin: "yìsi", vi: "ý nghĩa" }, { word: "同意", pinyin: "tóngyì", vi: "đồng ý" }] },
  { id: "w19", char: "经", pinyin: "jīng", vi: "kinh, trải qua", level: 3, strokeCount: 8, strokes: ["gap", "gap", "hat", "gap", "cham", "ngang", "so", "ngang"], radical: "纟", radicalName: "Mịch", mnemonic: "Bộ tơ 纟 — sợi dọc của tấm vải.", words: [{ word: "已经", pinyin: "yǐjīng", vi: "đã" }, { word: "经验", pinyin: "jīngyàn", vi: "kinh nghiệm" }] },
  { id: "w20", char: "解", pinyin: "jiě", vi: "giải, cởi", level: 4, strokeCount: 13, strokes: ["phay", "gap", "phay", "ngang", "ngang", "so", "phay", "gap", "ngang", "ngang", "so", "ngang", "so"], radical: "角", radicalName: "Giác", mnemonic: "Dùng dao 刀 tách sừng 角 khỏi con bò 牛.", words: [{ word: "解决", pinyin: "jiějué", vi: "giải quyết" }, { word: "了解", pinyin: "liǎojiě", vi: "tìm hiểu" }] },
  { id: "w21", char: "整", pinyin: "zhěng", vi: "chỉnh, nguyên", level: 4, strokeCount: 16, strokes: ["ngang", "so", "phay", "mac", "so", "gap", "ngang", "phay", "phay", "mac", "ngang", "so", "ngang", "so", "ngang", "ngang"], radical: "攵", radicalName: "Phốc", mnemonic: "Gõ 攵 cho mọi thứ ngay ngắn 正.", words: [{ word: "整理", pinyin: "zhěnglǐ", vi: "sắp xếp" }, { word: "完整", pinyin: "wánzhěng", vi: "hoàn chỉnh" }] },
  { id: "w22", char: "德", pinyin: "dé", vi: "đức", level: 5, strokeCount: 15, strokes: ["phay", "phay", "so", "so", "gap", "ngang", "so", "ngang", "ngang", "ngang", "cham", "gap", "cham", "cham", "ngang"], radical: "彳", radicalName: "Xích", mnemonic: "Bước đi 彳 ngay thẳng với trái tim 心.", words: [{ word: "道德", pinyin: "dàodé", vi: "đạo đức" }, { word: "德国", pinyin: "Déguó", vi: "nước Đức" }] },
  { id: "w23", char: "警", pinyin: "jǐng", vi: "cảnh (báo)", level: 5, strokeCount: 19, strokes: ["cham", "ngang", "ngang", "so", "phay", "mac", "phay", "phay", "mac", "ngang", "so", "ngang", "cham", "gap", "phay", "ngang", "so", "gap", "ngang"], radical: "言", radicalName: "Ngôn", mnemonic: "Lời nói 言 khiến người ta kính sợ 敬.", words: [{ word: "警察", pinyin: "jǐngchá", vi: "cảnh sát" }, { word: "警告", pinyin: "jǐnggào", vi: "cảnh cáo" }] },
  { id: "w24", char: "繁", pinyin: "fán", vi: "phồn, rườm rà", level: 6, strokeCount: 17, strokes: ["phay", "ngang", "gap", "cham", "ngang", "cham", "phay", "mac", "phay", "phay", "mac", "gap", "gap", "hat", "cham", "cham", "cham"], radical: "糸", radicalName: "Mịch", mnemonic: "Nhiều sợi tơ 糸 rối vào nhau.", words: [{ word: "繁体字", pinyin: "fántǐzì", vi: "chữ phồn thể" }, { word: "繁忙", pinyin: "fánmáng", vi: "bận rộn" }] },
];

/* ------------------------------------------------------------------
   Mistake notebook seed
------------------------------------------------------------------ */

export const mistakeSeed: MistakeItem[] = [
  { id: "m1", kind: "grammar", level: 3, prompt: "Chọn câu đúng: «Tôi đã ăn cơm rồi.»", hanzi: "我吃饭了。", pinyin: "Wǒ chī fàn le.", chosen: "我吃饭过。", answer: "我吃饭了。", options: ["我吃饭了。", "我吃饭过。", "我在吃饭。", "我要吃饭。"], tip: "了 đánh dấu việc đã hoàn thành; 过 đánh dấu kinh nghiệm từng làm.", from: "Bài 8 · HSK 3", box: 1, status: "due", lastSeen: "2026-09-02T08:10:00Z" },
  { id: "m2", kind: "vocab", level: 2, prompt: "«便宜» nghĩa là gì?", hanzi: "便宜", pinyin: "piányi", chosen: "tiện lợi", answer: "rẻ", options: ["rẻ", "tiện lợi", "đắt", "tốt"], tip: "便宜 = rẻ. «Tiện lợi» là 方便 fāngbiàn.", from: "Từ vựng HSK 2", box: 1, status: "due", lastSeen: "2026-09-02T08:12:00Z" },
  { id: "m3", kind: "character", level: 1, prompt: "Chữ nào nghĩa là «mặt trăng»?", hanzi: "月", pinyin: "yuè", chosen: "日", answer: "月", options: ["月", "日", "目", "白"], tip: "日 là mặt trời (có chấm giữa), 月 là mặt trăng (dáng khuyết).", from: "Nền tảng · Bộ thủ", box: 2, status: "due", lastSeen: "2026-09-01T14:30:00Z" },
  { id: "m4", kind: "grammar", level: 3, prompt: "Điền: 今天比昨天____。", hanzi: "今天比昨天热。", pinyin: "Jīntiān bǐ zuótiān rè.", chosen: "很热", answer: "热", options: ["热", "很热", "热了", "不热"], tip: "Sau 比 không dùng 很 — tính từ đứng trực tiếp.", from: "Ngữ pháp · So sánh", box: 1, status: "due", lastSeen: "2026-09-01T09:00:00Z" },
  { id: "m5", kind: "listening", level: 2, prompt: "Nghe và chọn số đúng", hanzi: "三百二十", pinyin: "sānbǎi èrshí", chosen: "230", answer: "320", options: ["320", "230", "302", "203"], tip: "三百 = 300, 二十 = 20. Đọc theo thứ tự trăm rồi chục.", from: "Nghe · Số & thời gian", box: 3, status: "scheduled", lastSeen: "2026-08-31T11:20:00Z" },
  { id: "m6", kind: "reading", level: 3, prompt: "Đoạn văn nói người viết định làm gì cuối tuần?", hanzi: "我打算去爬山。", pinyin: "Wǒ dǎsuàn qù pá shān.", chosen: "đi bơi", answer: "đi leo núi", options: ["đi leo núi", "đi bơi", "ở nhà", "đi mua sắm"], tip: "爬山 = leo núi. 游泳 mới là bơi.", from: "Đọc hiểu · HSK 3", box: 4, status: "scheduled", lastSeen: "2026-08-30T16:45:00Z" },
  { id: "m7", kind: "vocab", level: 3, prompt: "«机会» nghĩa là gì?", hanzi: "机会", pinyin: "jīhuì", chosen: "máy móc", answer: "cơ hội", options: ["cơ hội", "máy móc", "hội họp", "kế hoạch"], tip: "机会 = cơ hội. 机器 jīqì mới là máy móc.", from: "Từ vựng HSK 3", box: 5, status: "learned", lastSeen: "2026-08-28T07:05:00Z" },
  { id: "m8", kind: "grammar", level: 4, prompt: "Chọn câu 把 đúng", hanzi: "我把作业做完了。", pinyin: "Wǒ bǎ zuòyè zuòwán le.", chosen: "我做完把作业了。", answer: "我把作业做完了。", options: ["我把作业做完了。", "我做完把作业了。", "把我作业做完了。", "我把做完作业了。"], tip: "Trật tự câu 把: S + 把 + O + V + bổ ngữ.", from: "Ngữ pháp · Câu 把", box: 1, status: "due", lastSeen: "2026-09-02T19:40:00Z" },
  { id: "m9", kind: "character", level: 2, prompt: "Chữ 话 thuộc bộ nào?", hanzi: "话", pinyin: "huà", chosen: "口", answer: "讠", options: ["讠", "口", "舌", "亻"], tip: "讠 (ngôn) nằm bên trái — mọi chữ về lời nói đều mang bộ này.", from: "Luyện viết · 话", box: 2, status: "scheduled", lastSeen: "2026-08-29T10:15:00Z" },
  { id: "m10", kind: "vocab", level: 4, prompt: "«效率» nghĩa là gì?", hanzi: "效率", pinyin: "xiàolǜ", chosen: "hiệu quả", answer: "hiệu suất", options: ["hiệu suất", "hiệu quả", "tỉ lệ", "tốc độ"], tip: "效率 là hiệu suất (làm được bao nhiêu trên một đơn vị thời gian); 效果 mới là hiệu quả.", from: "Mô phỏng công sở", box: 1, status: "due", lastSeen: "2026-09-03T02:00:00Z" },
];

/* ------------------------------------------------------------------
   Exams
------------------------------------------------------------------ */

export const exams: Exam[] = [
  { id: "e-h1-1", title: "HSK 1 — Đề mẫu 1", level: 1, kind: "full", durationMin: 35, questionCount: 6, passScore: 4, blurb: "Đề đầy đủ ba phần, dành cho người mới." },
  { id: "e-h2-1", title: "HSK 2 — Đề mẫu 1", level: 2, kind: "full", durationMin: 50, questionCount: 6, passScore: 4, blurb: "Nghe hiểu câu ngắn, đọc đoạn hai câu." },
  { id: "e-h3-1", title: "HSK 3 — Đề mẫu 1", level: 3, kind: "full", durationMin: 85, questionCount: 6, passScore: 4, blurb: "Đề đầy đủ: nghe, đọc, viết." },
  { id: "e-h3-2", title: "HSK 3 — Đề mẫu 2", level: 3, kind: "full", durationMin: 85, questionCount: 6, passScore: 4, blurb: "Cùng cấu trúc, ngữ liệu khác." },
  { id: "e-h4-1", title: "HSK 4 — Đề mẫu 1", level: 4, kind: "full", durationMin: 105, questionCount: 6, passScore: 4, blurb: "Bài đọc dài hơn, có câu hỏi suy luận." },
  { id: "e-h5-1", title: "HSK 5 — Đề mẫu 1", level: 5, kind: "full", durationMin: 125, questionCount: 6, passScore: 4, blurb: "Văn bản báo chí và bình luận." },
  { id: "e-h6-1", title: "HSK 6 — Đề mẫu 1", level: 6, kind: "full", durationMin: 140, questionCount: 6, passScore: 4, blurb: "Trình độ cao — đọc nhanh, viết tóm tắt." },
  { id: "d-listen-2", title: "Luyện nghe HSK 2", level: 2, kind: "drill", section: "listening", durationMin: 15, questionCount: 2, passScore: 1, blurb: "Chỉ phần nghe, 2 câu." },
  { id: "d-read-3", title: "Luyện đọc HSK 3", level: 3, kind: "drill", section: "reading", durationMin: 20, questionCount: 2, passScore: 1, blurb: "Chỉ phần đọc hiểu." },
  { id: "d-write-4", title: "Luyện viết HSK 4", level: 4, kind: "drill", section: "writing", durationMin: 25, questionCount: 2, passScore: 1, blurb: "Sắp xếp câu và điền chữ." },
  { id: "e-h7-1", title: "HSK 7–9 — Đề mẫu", level: 7, kind: "full", durationMin: 210, questionCount: 6, passScore: 4, blurb: "Bậc cao nhất, gộp ba cấp." },
];

/**
 * One paper shape reused for every exam, with the stem text swapped per level.
 * MOCK(student): the real corpus has 11 distinct papers / 161 questions.
 */
function paperFor(level: number): ExamPaper {
  return [
    {
      section: "listening",
      questions: [
        {
          id: `q-l1-${level}`,
          section: "listening",
          prompt: "Người nói định đi đâu?",
          passage: "我下午要去图书馆看书。",
          passagePinyin: "Wǒ xiàwǔ yào qù túshūguǎn kàn shū.",
          options: ["Thư viện", "Bệnh viện", "Cửa hàng", "Trường học"],
          answer: 0,
          explain: "图书馆 túshūguǎn là thư viện.",
        },
        {
          id: `q-l2-${level}`,
          section: "listening",
          prompt: "Bây giờ là mấy giờ?",
          passage: "现在三点半。",
          passagePinyin: "Xiànzài sān diǎn bàn.",
          options: ["3:00", "3:30", "2:30", "3:15"],
          answer: 1,
          explain: "半 bàn nghĩa là rưỡi — ba giờ rưỡi.",
        },
      ],
    },
    {
      section: "reading",
      questions: [
        {
          id: `q-r1-${level}`,
          section: "reading",
          prompt: "Theo đoạn văn, cuối tuần người viết làm gì?",
          passage: "周末我打算去爬山，因为天气很好。",
          passagePinyin: "Zhōumò wǒ dǎsuàn qù pá shān, yīnwèi tiānqì hěn hǎo.",
          options: ["Ở nhà", "Đi leo núi", "Đi làm", "Đi bơi"],
          answer: 1,
          explain: "爬山 pá shān là leo núi; 因为 nêu lý do thời tiết đẹp.",
        },
        {
          id: `q-r2-${level}`,
          section: "reading",
          prompt: "Từ nào điền vào chỗ trống? 这件衣服很____，我买了两件。",
          passage: "这件衣服很____，我买了两件。",
          passagePinyin: "Zhè jiàn yīfu hěn ____, wǒ mǎi le liǎng jiàn.",
          options: ["贵", "便宜", "长", "旧"],
          answer: 1,
          explain: "Mua hai cái vì rẻ — 便宜 piányi.",
        },
      ],
    },
    {
      section: "writing",
      questions: [
        {
          id: `q-w1-${level}`,
          section: "writing",
          prompt: "Sắp xếp thành câu đúng: 作业 / 把 / 我 / 做完了",
          options: ["我把作业做完了。", "我做完把作业了。", "把我作业做完了。", "作业我把做完了。"],
          answer: 0,
          explain: "Trật tự câu 把: S + 把 + O + V + bổ ngữ.",
        },
        {
          id: `q-w2-${level}`,
          section: "writing",
          prompt: "Chữ nào viết đúng cho «shuǐ» (nước)?",
          options: ["永", "水", "冰", "求"],
          answer: 1,
          explain: "水 shuǐ là nước; 永 yǒng là mãi mãi.",
        },
      ],
    },
  ];
}

/** Paper lookup. A drill returns only its own section. */
export function getPaper(examId: string): ExamPaper {
  const exam = exams.find((e) => e.id === examId);
  if (!exam) return [];
  const full = paperFor(exam.level);
  if (exam.kind === "drill" && exam.section) {
    return full.filter((s) => s.section === exam.section);
  }
  return full;
}

export const SECTION_LABEL: Record<string, string> = {
  listening: "Nghe hiểu",
  reading: "Đọc hiểu",
  writing: "Viết",
};

export const SECTION_HANZI: Record<string, string> = {
  listening: "听力",
  reading: "阅读",
  writing: "书写",
};

/* ------------------------------------------------------------------
   Lego sentence builder
------------------------------------------------------------------ */

export const ROLE_LABEL: Record<string, string> = {
  S: "Chủ ngữ",
  T: "Thời gian",
  P: "Nơi chốn",
  A: "Trạng ngữ",
  V: "Động từ",
  O: "Tân ngữ",
  C: "Bổ ngữ",
  Q: "Nghi vấn",
};

export const legoStations: LegoStation[] = [
  {
    id: "st-1",
    name: "Trạm 1 — Câu cơ bản",
    hanzi: "基础",
    level: 1,
    rule: "S + V + O",
    blurb: "Chủ ngữ trước, động từ giữa, tân ngữ sau.",
    sentences: [
      { id: "s1a", order: ["b1", "b2", "b3"], vi: "Tôi uống trà.", rule: "S + V + O", blocks: [{ id: "b1", text: "我", pinyin: "wǒ", role: "S" }, { id: "b2", text: "喝", pinyin: "hē", role: "V" }, { id: "b3", text: "茶", pinyin: "chá", role: "O" }] },
      { id: "s1b", order: ["b1", "b2", "b3"], vi: "Anh ấy đọc sách.", rule: "S + V + O", blocks: [{ id: "b1", text: "他", pinyin: "tā", role: "S" }, { id: "b2", text: "看", pinyin: "kàn", role: "V" }, { id: "b3", text: "书", pinyin: "shū", role: "O" }] },
      { id: "s1c", order: ["b1", "b2", "b3"], vi: "Mẹ nấu cơm.", rule: "S + V + O", blocks: [{ id: "b1", text: "妈妈", pinyin: "māma", role: "S" }, { id: "b2", text: "做", pinyin: "zuò", role: "V" }, { id: "b3", text: "饭", pinyin: "fàn", role: "O" }] },
    ],
  },
  {
    id: "st-2",
    name: "Trạm 2 — Thời gian đứng trước",
    hanzi: "时间",
    level: 1,
    rule: "S + T + V + O",
    blurb: "Khác tiếng Việt: thời gian đứng trước động từ, không đứng cuối.",
    sentences: [
      { id: "s2a", order: ["b1", "b2", "b3", "b4"], vi: "Tôi ăn cơm lúc trưa.", rule: "S + T + V + O", blocks: [{ id: "b1", text: "我", pinyin: "wǒ", role: "S" }, { id: "b2", text: "中午", pinyin: "zhōngwǔ", role: "T" }, { id: "b3", text: "吃", pinyin: "chī", role: "V" }, { id: "b4", text: "饭", pinyin: "fàn", role: "O" }] },
      { id: "s2b", order: ["b1", "b2", "b3", "b4"], vi: "Cô ấy đi làm vào ngày mai.", rule: "S + T + V + O", blocks: [{ id: "b1", text: "她", pinyin: "tā", role: "S" }, { id: "b2", text: "明天", pinyin: "míngtiān", role: "T" }, { id: "b3", text: "去", pinyin: "qù", role: "V" }, { id: "b4", text: "上班", pinyin: "shàngbān", role: "O" }] },
      { id: "s2c", order: ["b1", "b2", "b3", "b4"], vi: "Chúng tôi họp lúc 3 giờ.", rule: "S + T + V + O", blocks: [{ id: "b1", text: "我们", pinyin: "wǒmen", role: "S" }, { id: "b2", text: "三点", pinyin: "sān diǎn", role: "T" }, { id: "b3", text: "开", pinyin: "kāi", role: "V" }, { id: "b4", text: "会", pinyin: "huì", role: "O" }] },
    ],
  },
  {
    id: "st-3",
    name: "Trạm 3 — Nơi chốn với 在",
    hanzi: "地点",
    level: 2,
    rule: "S + 在 + P + V + O",
    blurb: "Cụm 在 + nơi chốn đứng trước động từ.",
    sentences: [
      { id: "s3a", order: ["b1", "b2", "b3", "b4"], vi: "Tôi học ở trường.", rule: "S + 在 + P + V", blocks: [{ id: "b1", text: "我", pinyin: "wǒ", role: "S" }, { id: "b2", text: "在学校", pinyin: "zài xuéxiào", role: "P" }, { id: "b3", text: "学习", pinyin: "xuéxí", role: "V" }, { id: "b4", text: "汉语", pinyin: "Hànyǔ", role: "O" }] },
      { id: "s3b", order: ["b1", "b2", "b3", "b4"], vi: "Bố làm việc ở công ty.", rule: "S + 在 + P + V", blocks: [{ id: "b1", text: "爸爸", pinyin: "bàba", role: "S" }, { id: "b2", text: "在公司", pinyin: "zài gōngsī", role: "P" }, { id: "b3", text: "工作", pinyin: "gōngzuò", role: "V" }, { id: "b4", text: "很忙", pinyin: "hěn máng", role: "C" }] },
      { id: "s3c", order: ["b1", "b2", "b3", "b4"], vi: "Họ đợi tôi ở cửa.", rule: "S + 在 + P + V + O", blocks: [{ id: "b1", text: "他们", pinyin: "tāmen", role: "S" }, { id: "b2", text: "在门口", pinyin: "zài ménkǒu", role: "P" }, { id: "b3", text: "等", pinyin: "děng", role: "V" }, { id: "b4", text: "我", pinyin: "wǒ", role: "O" }] },
    ],
  },
  {
    id: "st-4",
    name: "Trạm 4 — Bổ ngữ mức độ",
    hanzi: "补语",
    level: 3,
    rule: "S + V + 得 + C",
    blurb: "得 nối động từ với lời nhận xét về mức độ.",
    sentences: [
      { id: "s4a", order: ["b1", "b2", "b3", "b4"], vi: "Anh ấy nói rất nhanh.", rule: "S + V + 得 + C", blocks: [{ id: "b1", text: "他", pinyin: "tā", role: "S" }, { id: "b2", text: "说", pinyin: "shuō", role: "V" }, { id: "b3", text: "得", pinyin: "de", role: "A" }, { id: "b4", text: "很快", pinyin: "hěn kuài", role: "C" }] },
      { id: "s4b", order: ["b1", "b2", "b3", "b4"], vi: "Cô ấy hát rất hay.", rule: "S + V + 得 + C", blocks: [{ id: "b1", text: "她", pinyin: "tā", role: "S" }, { id: "b2", text: "唱", pinyin: "chàng", role: "V" }, { id: "b3", text: "得", pinyin: "de", role: "A" }, { id: "b4", text: "很好听", pinyin: "hěn hǎotīng", role: "C" }] },
      { id: "s4c", order: ["b1", "b2", "b3", "b4"], vi: "Tôi ngủ rất muộn.", rule: "S + V + 得 + C", blocks: [{ id: "b1", text: "我", pinyin: "wǒ", role: "S" }, { id: "b2", text: "睡", pinyin: "shuì", role: "V" }, { id: "b3", text: "得", pinyin: "de", role: "A" }, { id: "b4", text: "很晚", pinyin: "hěn wǎn", role: "C" }] },
    ],
  },
  {
    id: "st-5",
    name: "Trạm 5 — Câu 把",
    hanzi: "把字句",
    level: 3,
    rule: "S + 把 + O + V + C",
    blurb: "Tân ngữ nhảy lên trước động từ, sau 把. Động từ phải có bổ ngữ.",
    sentences: [
      { id: "s5a", order: ["b1", "b2", "b3", "b4"], vi: "Tôi làm xong bài tập rồi.", rule: "S + 把 + O + V + C", blocks: [{ id: "b1", text: "我", pinyin: "wǒ", role: "S" }, { id: "b2", text: "把作业", pinyin: "bǎ zuòyè", role: "O" }, { id: "b3", text: "做", pinyin: "zuò", role: "V" }, { id: "b4", text: "完了", pinyin: "wán le", role: "C" }] },
      { id: "s5b", order: ["b1", "b2", "b3", "b4"], vi: "Anh ấy đặt sách lên bàn.", rule: "S + 把 + O + V + C", blocks: [{ id: "b1", text: "他", pinyin: "tā", role: "S" }, { id: "b2", text: "把书", pinyin: "bǎ shū", role: "O" }, { id: "b3", text: "放", pinyin: "fàng", role: "V" }, { id: "b4", text: "在桌子上", pinyin: "zài zhuōzi shàng", role: "C" }] },
      { id: "s5c", order: ["b1", "b2", "b3", "b4"], vi: "Xin hãy đóng cửa lại.", rule: "S + 把 + O + V + C", blocks: [{ id: "b1", text: "请", pinyin: "qǐng", role: "A" }, { id: "b2", text: "把门", pinyin: "bǎ mén", role: "O" }, { id: "b3", text: "关", pinyin: "guān", role: "V" }, { id: "b4", text: "上", pinyin: "shàng", role: "C" }] },
    ],
  },
  {
    id: "st-6",
    name: "Trạm 6 — Câu hỏi",
    hanzi: "疑问句",
    level: 2,
    rule: "Giữ nguyên trật tự, thay chỗ cần hỏi",
    blurb: "Tiếng Trung không đảo trật tự khi hỏi — chỉ thay từ nghi vấn vào đúng vị trí.",
    sentences: [
      { id: "s6a", order: ["b1", "b2", "b3", "b4"], vi: "Bạn đi đâu?", rule: "S + V + Q", blocks: [{ id: "b1", text: "你", pinyin: "nǐ", role: "S" }, { id: "b2", text: "去", pinyin: "qù", role: "V" }, { id: "b3", text: "哪儿", pinyin: "nǎr", role: "Q" }, { id: "b4", text: "？", pinyin: "", role: "A" }] },
      { id: "s6b", order: ["b1", "b2", "b3", "b4"], vi: "Cái này bao nhiêu tiền?", rule: "S + Q + O", blocks: [{ id: "b1", text: "这个", pinyin: "zhège", role: "S" }, { id: "b2", text: "多少", pinyin: "duōshao", role: "Q" }, { id: "b3", text: "钱", pinyin: "qián", role: "O" }, { id: "b4", text: "？", pinyin: "", role: "A" }] },
      { id: "s6c", order: ["b1", "b2", "b3", "b4"], vi: "Bạn ăn cơm chưa?", rule: "S + V + O + 吗", blocks: [{ id: "b1", text: "你", pinyin: "nǐ", role: "S" }, { id: "b2", text: "吃", pinyin: "chī", role: "V" }, { id: "b3", text: "饭", pinyin: "fàn", role: "O" }, { id: "b4", text: "了吗", pinyin: "le ma", role: "Q" }] },
    ],
  },
  {
    id: "st-7",
    name: "Trạm 7 — Câu phức",
    hanzi: "复句",
    level: 4,
    rule: "虽然…但是… / 因为…所以…",
    blurb: "Cặp liên từ đi thành đôi — tiếng Trung giữ cả hai vế, khác tiếng Việt.",
    sentences: [
      { id: "s7a", order: ["b1", "b2", "b3", "b4"], vi: "Tuy trời mưa nhưng tôi vẫn đi.", rule: "虽然 A 但是 B", blocks: [{ id: "b1", text: "虽然", pinyin: "suīrán", role: "A" }, { id: "b2", text: "下雨", pinyin: "xià yǔ", role: "V" }, { id: "b3", text: "但是", pinyin: "dànshì", role: "A" }, { id: "b4", text: "我还是去", pinyin: "wǒ háishi qù", role: "C" }] },
      { id: "s7b", order: ["b1", "b2", "b3", "b4"], vi: "Vì bận nên tôi không đến.", rule: "因为 A 所以 B", blocks: [{ id: "b1", text: "因为", pinyin: "yīnwèi", role: "A" }, { id: "b2", text: "很忙", pinyin: "hěn máng", role: "C" }, { id: "b3", text: "所以", pinyin: "suǒyǐ", role: "A" }, { id: "b4", text: "我没来", pinyin: "wǒ méi lái", role: "V" }] },
      { id: "s7c", order: ["b1", "b2", "b3", "b4"], vi: "Không những rẻ mà còn tốt.", rule: "不但 A 而且 B", blocks: [{ id: "b1", text: "不但", pinyin: "búdàn", role: "A" }, { id: "b2", text: "便宜", pinyin: "piányi", role: "C" }, { id: "b3", text: "而且", pinyin: "érqiě", role: "A" }, { id: "b4", text: "质量好", pinyin: "zhìliàng hǎo", role: "C" }] },
    ],
  },
];

/* ------------------------------------------------------------------
   Workplace simulation
------------------------------------------------------------------ */

export const SCENARIO_KIND_LABEL: Record<string, string> = {
  quotation: "Báo giá",
  meeting: "Họp",
  email: "Thư tín",
  interview: "Phỏng vấn",
};

export const scenarios: Scenario[] = [
  {
    id: "sc-1",
    kind: "quotation",
    channel: "email",
    title: "Hỏi giá và thương lượng",
    hanzi: "询价",
    level: 3,
    counterpart: "Vương Lệ · Phòng kinh doanh",
    blurb: "Nhà cung cấp báo giá cao hơn dự toán. Thương lượng mà vẫn giữ quan hệ.",
    context:
      "Bạn phụ trách mua hàng cho một công ty Việt Nam. Đối tác Trung Quốc vừa gửi báo giá 500 chiếc, đơn giá 45 tệ — cao hơn ngân sách 12%.",
    criteria: ["Nêu rõ số lượng và đơn giá mong muốn", "Giữ giọng lịch sự", "Đề xuất một phương án thay thế"],
    vocab: [
      { word: "报价", pinyin: "bàojià", vi: "báo giá" },
      { word: "单价", pinyin: "dānjià", vi: "đơn giá" },
      { word: "折扣", pinyin: "zhékòu", vi: "chiết khấu" },
      { word: "预算", pinyin: "yùsuàn", vi: "ngân sách" },
      { word: "交货期", pinyin: "jiāohuòqī", vi: "thời hạn giao hàng" },
    ],
    turns: [
      {
        id: "t1",
        incoming: "您好，这是我们的报价：500件，单价45元，交货期30天。",
        incomingPinyin: "Nín hǎo, zhè shì wǒmen de bàojià: 500 jiàn, dānjià 45 yuán, jiāohuòqī 30 tiān.",
        incomingVi: "Xin chào, đây là báo giá của chúng tôi: 500 chiếc, đơn giá 45 tệ, giao hàng trong 30 ngày.",
        task: "Cảm ơn và nêu ngân sách của bạn, đề nghị chiết khấu.",
        phrases: [
          { word: "谢谢您的报价", pinyin: "xièxie nín de bàojià", vi: "cảm ơn báo giá của bạn" },
          { word: "我们的预算是", pinyin: "wǒmen de yùsuàn shì", vi: "ngân sách của chúng tôi là" },
          { word: "能不能给折扣", pinyin: "néng bu néng gěi zhékòu", vi: "có thể giảm giá không" },
        ],
        model: "谢谢您的报价。我们的预算是单价40元，能不能给一点折扣？",
        modelVi: "Cảm ơn báo giá. Ngân sách của chúng tôi là 40 tệ/chiếc, bên bạn giảm được chút nào không?",
        keywords: ["谢谢", "预算", "折扣"],
        pitfall: "Đừng chỉ nói «太贵了» — nêu con số cụ thể mới thương lượng được.",
      },
      {
        id: "t2",
        incoming: "40元有点低。如果订800件，我们可以做到42元。",
        incomingPinyin: "40 yuán yǒudiǎn dī. Rúguǒ dìng 800 jiàn, wǒmen kěyǐ zuòdào 42 yuán.",
        incomingVi: "40 tệ hơi thấp. Nếu đặt 800 chiếc, chúng tôi có thể làm 42 tệ.",
        task: "Chấp nhận có điều kiện — đổi lấy thời hạn giao hàng ngắn hơn.",
        phrases: [
          { word: "可以接受", pinyin: "kěyǐ jiēshòu", vi: "có thể chấp nhận" },
          { word: "缩短交货期", pinyin: "suōduǎn jiāohuòqī", vi: "rút ngắn thời gian giao" },
          { word: "两周内", pinyin: "liǎng zhōu nèi", vi: "trong hai tuần" },
        ],
        model: "42元可以接受。不过请把交货期缩短到两周内，可以吗？",
        modelVi: "42 tệ thì chấp nhận được. Nhưng xin rút thời hạn giao xuống trong hai tuần, được không?",
        keywords: ["接受", "交货期", "两周"],
        pitfall: "Nhượng bộ mà không đổi lấy gì là mất lợi thế cho vòng sau.",
      },
      {
        id: "t3",
        incoming: "好的，两周内发货。请确认订单。",
        incomingPinyin: "Hǎo de, liǎng zhōu nèi fāhuò. Qǐng quèrèn dìngdān.",
        incomingVi: "Được, giao trong hai tuần. Xin xác nhận đơn hàng.",
        task: "Xác nhận đơn hàng và nhắc lại các điều khoản đã chốt.",
        phrases: [
          { word: "确认订单", pinyin: "quèrèn dìngdān", vi: "xác nhận đơn hàng" },
          { word: "合同", pinyin: "hétong", vi: "hợp đồng" },
          { word: "期待合作", pinyin: "qīdài hézuò", vi: "mong được hợp tác" },
        ],
        model: "确认订单：800件，单价42元，两周内交货。请发合同给我。期待合作！",
        modelVi: "Xác nhận đơn: 800 chiếc, 42 tệ/chiếc, giao trong hai tuần. Xin gửi hợp đồng. Mong hợp tác!",
        keywords: ["确认", "800", "42", "合同"],
        pitfall: "Nhắc lại đủ số lượng, đơn giá và thời hạn — thiếu một cái là mở đường cho tranh chấp.",
      },
    ],
  },
  {
    id: "sc-2",
    kind: "meeting",
    channel: "chat",
    title: "Báo cáo tiến độ trong họp",
    hanzi: "汇报",
    level: 4,
    counterpart: "Trưởng phòng Lý",
    blurb: "Dự án chậm ba ngày. Báo cáo trung thực và đề xuất giải pháp.",
    context: "Cuộc họp tiến độ hằng tuần. Bạn phụ trách phần thiết kế, đang chậm ba ngày vì đối tác giao muộn tài liệu.",
    criteria: ["Nêu tiến độ bằng số liệu", "Không đổ lỗi", "Đưa ra phương án bù tiến độ"],
    vocab: [
      { word: "进度", pinyin: "jìndù", vi: "tiến độ" },
      { word: "延期", pinyin: "yánqī", vi: "chậm trễ" },
      { word: "原因", pinyin: "yuányīn", vi: "nguyên nhân" },
      { word: "解决方案", pinyin: "jiějué fāng'àn", vi: "phương án giải quyết" },
    ],
    turns: [
      {
        id: "t1",
        incoming: "设计部分现在怎么样？",
        incomingPinyin: "Shèjì bùfen xiànzài zěnmeyàng?",
        incomingVi: "Phần thiết kế hiện giờ thế nào?",
        task: "Báo cáo phần trăm hoàn thành và nói thẳng là đang chậm.",
        phrases: [
          { word: "完成了百分之", pinyin: "wánchéng le bǎi fēn zhī", vi: "đã hoàn thành ... phần trăm" },
          { word: "延期了三天", pinyin: "yánqī le sān tiān", vi: "chậm ba ngày" },
        ],
        model: "设计完成了百分之七十，比计划延期了三天。",
        modelVi: "Thiết kế đã xong 70%, chậm hơn kế hoạch ba ngày.",
        keywords: ["百分之", "延期"],
        pitfall: "Nói «快好了» mà không có số là câu trả lời vô nghĩa trong họp tiến độ.",
      },
      {
        id: "t2",
        incoming: "原因是什么？",
        incomingPinyin: "Yuányīn shì shénme?",
        incomingVi: "Nguyên nhân là gì?",
        task: "Nêu nguyên nhân khách quan, không đổ lỗi cá nhân.",
        phrases: [
          { word: "主要原因是", pinyin: "zhǔyào yuányīn shì", vi: "nguyên nhân chính là" },
          { word: "资料到得晚", pinyin: "zīliào dào de wǎn", vi: "tài liệu đến muộn" },
        ],
        model: "主要原因是合作方的资料到得比较晚，我们等了三天。",
        modelVi: "Nguyên nhân chính là tài liệu từ đối tác đến muộn, chúng tôi phải đợi ba ngày.",
        keywords: ["原因", "资料"],
        pitfall: "Tránh nêu tên cá nhân — nêu khâu bị nghẽn.",
      },
      {
        id: "t3",
        incoming: "那怎么补回来？",
        incomingPinyin: "Nà zěnme bǔ huílai?",
        incomingVi: "Vậy bù lại thế nào?",
        task: "Đề xuất phương án cụ thể có mốc thời gian.",
        phrases: [
          { word: "解决方案", pinyin: "jiějué fāng'àn", vi: "phương án" },
          { word: "加班两天", pinyin: "jiābān liǎng tiān", vi: "tăng ca hai ngày" },
          { word: "下周五之前", pinyin: "xià zhōu wǔ zhīqián", vi: "trước thứ sáu tuần sau" },
        ],
        model: "解决方案是加班两天，下周五之前追上进度。",
        modelVi: "Phương án là tăng ca hai ngày, trước thứ sáu tuần sau sẽ đuổi kịp tiến độ.",
        keywords: ["方案", "下周五"],
        pitfall: "Phương án không có mốc thời gian thì không phải phương án.",
      },
    ],
  },
  {
    id: "sc-3",
    kind: "email",
    channel: "email",
    title: "Viết thư xin lỗi khách hàng",
    hanzi: "道歉信",
    level: 4,
    counterpart: "Khách hàng Trần",
    blurb: "Hàng giao thiếu. Viết thư xin lỗi và nêu cách khắc phục.",
    context: "Khách nhận thiếu 20 chiếc trong lô 200. Bạn viết thư xin lỗi chính thức.",
    criteria: ["Xin lỗi rõ ràng ngay câu đầu", "Nêu cách bù hàng", "Cam kết không tái diễn"],
    vocab: [
      { word: "抱歉", pinyin: "bàoqiàn", vi: "xin lỗi" },
      { word: "补发", pinyin: "bǔfā", vi: "gửi bù" },
      { word: "给您带来不便", pinyin: "gěi nín dàilái bú biàn", vi: "gây bất tiện cho quý vị" },
    ],
    turns: [
      {
        id: "t1",
        incoming: "我们收到的货少了20件，请说明。",
        incomingPinyin: "Wǒmen shōudào de huò shǎo le 20 jiàn, qǐng shuōmíng.",
        incomingVi: "Hàng chúng tôi nhận thiếu 20 chiếc, xin giải thích.",
        task: "Xin lỗi và xác nhận sẽ kiểm tra.",
        phrases: [
          { word: "非常抱歉", pinyin: "fēicháng bàoqiàn", vi: "vô cùng xin lỗi" },
          { word: "马上核实", pinyin: "mǎshàng héshí", vi: "kiểm tra ngay" },
        ],
        model: "非常抱歉给您带来不便，我们马上核实。",
        modelVi: "Vô cùng xin lỗi vì sự bất tiện, chúng tôi sẽ kiểm tra ngay.",
        keywords: ["抱歉", "核实"],
        pitfall: "Đừng giải thích trước khi xin lỗi.",
      },
      {
        id: "t2",
        incoming: "什么时候能补上？",
        incomingPinyin: "Shénme shíhou néng bǔ shàng?",
        incomingVi: "Bao giờ bù được?",
        task: "Cam kết mốc thời gian gửi bù.",
        phrases: [
          { word: "明天补发", pinyin: "míngtiān bǔfā", vi: "mai gửi bù" },
          { word: "运费由我们承担", pinyin: "yùnfèi yóu wǒmen chéngdān", vi: "cước do chúng tôi chịu" },
        ],
        model: "明天补发20件，运费由我们承担。",
        modelVi: "Ngày mai gửi bù 20 chiếc, cước vận chuyển bên tôi chịu.",
        keywords: ["补发", "运费"],
        pitfall: "Chịu phí vận chuyển là chi tiết khách nhớ lâu nhất.",
      },
      {
        id: "t3",
        incoming: "希望以后不要再发生。",
        incomingPinyin: "Xīwàng yǐhòu búyào zài fāshēng.",
        incomingVi: "Mong sau này không tái diễn.",
        task: "Cam kết biện pháp phòng ngừa cụ thể.",
        phrases: [
          { word: "加强检查", pinyin: "jiāqiáng jiǎnchá", vi: "tăng cường kiểm tra" },
          { word: "出货前检查", pinyin: "chūhuò qián jiǎnchá", vi: "kiểm tra trước khi xuất hàng" },
        ],
        model: "我们会加强出货前的检查，避免同样的问题再发生。",
        modelVi: "Chúng tôi sẽ tăng cường kiểm tra trước khi xuất hàng để tránh lặp lại.",
        keywords: ["加强", "检查"],
        pitfall: "«以后会注意» quá chung chung — nêu đúng khâu sẽ sửa.",
      },
    ],
  },
  {
    id: "sc-4",
    kind: "interview",
    channel: "chat",
    title: "Phỏng vấn xin việc",
    hanzi: "面试",
    level: 4,
    counterpart: "Nhà tuyển dụng Chu",
    blurb: "Giới thiệu bản thân, nói về điểm mạnh và lý do ứng tuyển.",
    context: "Bạn ứng tuyển vị trí trợ lý kinh doanh tại một công ty Trung Quốc ở Hà Nội.",
    criteria: ["Giới thiệu ngắn gọn có trọng tâm", "Nêu kinh nghiệm bằng ví dụ", "Đặt lại một câu hỏi"],
    vocab: [
      { word: "自我介绍", pinyin: "zìwǒ jièshào", vi: "tự giới thiệu" },
      { word: "经验", pinyin: "jīngyàn", vi: "kinh nghiệm" },
      { word: "优势", pinyin: "yōushì", vi: "thế mạnh" },
    ],
    turns: [
      {
        id: "t1",
        incoming: "请做一下自我介绍。",
        incomingPinyin: "Qǐng zuò yíxià zìwǒ jièshào.",
        incomingVi: "Xin mời tự giới thiệu.",
        task: "Giới thiệu tên, học vấn, và một câu về kinh nghiệm.",
        phrases: [
          { word: "我叫", pinyin: "wǒ jiào", vi: "tôi tên là" },
          { word: "毕业于", pinyin: "bìyè yú", vi: "tốt nghiệp tại" },
          { word: "两年经验", pinyin: "liǎng nián jīngyàn", vi: "hai năm kinh nghiệm" },
        ],
        model: "我叫阮明英，毕业于河内大学中文系，有两年外贸经验。",
        modelVi: "Tôi tên Nguyễn Minh Anh, tốt nghiệp khoa Trung Đại học Hà Nội, có hai năm kinh nghiệm ngoại thương.",
        keywords: ["我叫", "毕业", "经验"],
        pitfall: "Đừng kể cả tiểu sử — ba câu là đủ.",
      },
      {
        id: "t2",
        incoming: "你的优势是什么？",
        incomingPinyin: "Nǐ de yōushì shì shénme?",
        incomingVi: "Thế mạnh của bạn là gì?",
        task: "Nêu một thế mạnh kèm ví dụ có số liệu.",
        phrases: [
          { word: "我的优势是", pinyin: "wǒ de yōushì shì", vi: "thế mạnh của tôi là" },
          { word: "比如说", pinyin: "bǐrú shuō", vi: "ví dụ như" },
        ],
        model: "我的优势是沟通能力。比如说，去年我负责了30多个中国客户。",
        modelVi: "Thế mạnh của tôi là giao tiếp. Ví dụ, năm ngoái tôi phụ trách hơn 30 khách hàng Trung Quốc.",
        keywords: ["优势", "比如"],
        pitfall: "Thế mạnh không có ví dụ thì chỉ là tính từ.",
      },
      {
        id: "t3",
        incoming: "你还有什么问题吗？",
        incomingPinyin: "Nǐ hái yǒu shénme wèntí ma?",
        incomingVi: "Bạn còn câu hỏi gì không?",
        task: "Hỏi lại một câu về công việc.",
        phrases: [
          { word: "我想问一下", pinyin: "wǒ xiǎng wèn yíxià", vi: "tôi muốn hỏi" },
          { word: "团队", pinyin: "tuánduì", vi: "đội nhóm" },
        ],
        model: "我想问一下，这个岗位的团队有多少人？",
        modelVi: "Tôi muốn hỏi, đội của vị trí này có bao nhiêu người?",
        keywords: ["问", "团队"],
        pitfall: "Trả lời «没有问题» là bỏ mất cơ hội cuối cùng để gây ấn tượng.",
      },
    ],
  },
  {
    id: "sc-5",
    kind: "email",
    channel: "email",
    title: "Mời họp và chốt lịch",
    hanzi: "约会议",
    level: 3,
    counterpart: "Đối tác Ngô",
    blurb: "Đề xuất lịch họp, xử lý khi đối tác bận.",
    context: "Bạn cần họp trực tuyến 45 phút với đối tác trong tuần này.",
    criteria: ["Nêu mục đích họp", "Đề xuất ít nhất hai khung giờ", "Xác nhận múi giờ"],
    vocab: [
      { word: "会议", pinyin: "huìyì", vi: "cuộc họp" },
      { word: "方便", pinyin: "fāngbiàn", vi: "tiện" },
      { word: "北京时间", pinyin: "Běijīng shíjiān", vi: "giờ Bắc Kinh" },
    ],
    turns: [
      {
        id: "t1",
        incoming: "您好，有什么事情需要讨论吗？",
        incomingPinyin: "Nín hǎo, yǒu shénme shìqing xūyào tǎolùn ma?",
        incomingVi: "Xin chào, có việc gì cần trao đổi không?",
        task: "Nêu mục đích và đề xuất hai khung giờ.",
        phrases: [
          { word: "想约一个会议", pinyin: "xiǎng yuē yí gè huìyì", vi: "muốn hẹn một cuộc họp" },
          { word: "您方便吗", pinyin: "nín fāngbiàn ma", vi: "bạn có tiện không" },
        ],
        model: "想约一个45分钟的会议讨论合同。周三下午2点或者周四上午10点，您方便吗？",
        modelVi: "Muốn hẹn họp 45 phút để bàn hợp đồng. Chiều thứ tư 2 giờ hoặc sáng thứ năm 10 giờ, bạn tiện không?",
        keywords: ["会议", "方便"],
        pitfall: "Chỉ đề xuất một khung giờ là ép đối tác phải từ chối.",
      },
      {
        id: "t2",
        incoming: "周三下午我有事，周四上午可以。是北京时间吗？",
        incomingPinyin: "Zhōusān xiàwǔ wǒ yǒu shì, zhōusì shàngwǔ kěyǐ. Shì Běijīng shíjiān ma?",
        incomingVi: "Chiều thứ tư tôi bận, sáng thứ năm được. Là giờ Bắc Kinh phải không?",
        task: "Xác nhận múi giờ rõ ràng.",
        phrases: [
          { word: "北京时间", pinyin: "Běijīng shíjiān", vi: "giờ Bắc Kinh" },
          { word: "河内时间", pinyin: "Hénèi shíjiān", vi: "giờ Hà Nội" },
        ],
        model: "是北京时间上午10点，河内时间9点。我发会议链接给您。",
        modelVi: "Là 10 giờ sáng giờ Bắc Kinh, tức 9 giờ giờ Hà Nội. Tôi sẽ gửi link họp.",
        keywords: ["北京时间", "链接"],
        pitfall: "Lệch một giờ giữa Hà Nội và Bắc Kinh — không nói rõ là lỡ họp.",
      },
      {
        id: "t3",
        incoming: "好的，谢谢。",
        incomingPinyin: "Hǎo de, xièxie.",
        incomingVi: "Được, cảm ơn.",
        task: "Chốt lại và nêu chương trình họp.",
        phrases: [
          { word: "议程", pinyin: "yìchéng", vi: "chương trình họp" },
          { word: "会前发给您", pinyin: "huì qián fā gěi nín", vi: "gửi trước cuộc họp" },
        ],
        model: "好的，周四见。议程我会在会前发给您。",
        modelVi: "Vâng, hẹn thứ năm. Chương trình họp tôi sẽ gửi trước.",
        keywords: ["议程", "周四"],
        pitfall: "Họp không có chương trình (议程) thường kéo dài gấp đôi.",
      },
    ],
  },
  {
    id: "sc-6",
    kind: "quotation",
    channel: "chat",
    title: "Xử lý khiếu nại chất lượng",
    hanzi: "质量投诉",
    level: 5,
    counterpart: "QC Hạ",
    blurb: "Khách phản ánh lỗi 5%. Thu thập thông tin trước khi cam kết.",
    context: "Khách báo 5% lô hàng bị lỗi đường may. Bạn cần làm rõ trước khi hứa đền bù.",
    criteria: ["Hỏi bằng chứng cụ thể", "Không hứa trước khi đủ thông tin", "Nêu quy trình xử lý"],
    vocab: [
      { word: "质量问题", pinyin: "zhìliàng wèntí", vi: "vấn đề chất lượng" },
      { word: "照片", pinyin: "zhàopiàn", vi: "ảnh chụp" },
      { word: "批次", pinyin: "pīcì", vi: "lô hàng" },
      { word: "赔偿", pinyin: "péicháng", vi: "bồi thường" },
    ],
    turns: [
      {
        id: "t1",
        incoming: "这批货有5%出现线头问题，怎么办？",
        incomingPinyin: "Zhè pī huò yǒu 5% chūxiàn xiàntóu wèntí, zěnme bàn?",
        incomingVi: "Lô này có 5% bị lỗi chỉ thừa, xử lý sao?",
        task: "Xin ảnh và số lô trước khi kết luận.",
        phrases: [
          { word: "能发照片吗", pinyin: "néng fā zhàopiàn ma", vi: "gửi ảnh được không" },
          { word: "批次号", pinyin: "pīcì hào", vi: "số lô" },
        ],
        model: "能发几张照片和批次号给我吗？我们先确认是哪一批。",
        modelVi: "Bạn gửi vài ảnh và số lô được không? Chúng tôi xác nhận đúng lô trước đã.",
        keywords: ["照片", "批次"],
        pitfall: "Hứa bồi thường trước khi xem bằng chứng là mất quyền thương lượng.",
      },
      {
        id: "t2",
        incoming: "照片发过去了，批次是B240815。",
        incomingPinyin: "Zhàopiàn fā guòqù le, pīcì shì B240815.",
        incomingVi: "Đã gửi ảnh, lô là B240815.",
        task: "Xác nhận đã nhận và nêu thời hạn phản hồi.",
        phrases: [
          { word: "收到了", pinyin: "shōudào le", vi: "đã nhận" },
          { word: "两天内答复", pinyin: "liǎng tiān nèi dáfù", vi: "trả lời trong hai ngày" },
        ],
        model: "照片收到了。我们查一下生产记录，两天内给您答复。",
        modelVi: "Đã nhận ảnh. Chúng tôi kiểm tra hồ sơ sản xuất, trong hai ngày sẽ phản hồi.",
        keywords: ["收到", "答复"],
        pitfall: "«我们看看» không có mốc thời gian sẽ bị nhắc lại mỗi ngày.",
      },
      {
        id: "t3",
        incoming: "如果确实是我们的问题呢？",
        incomingPinyin: "Rúguǒ quèshí shì wǒmen de wèntí ne?",
        incomingVi: "Nếu đúng là lỗi bên các anh thì sao?",
        task: "Nêu phương án bồi thường có điều kiện.",
        phrases: [
          { word: "如果确认", pinyin: "rúguǒ quèrèn", vi: "nếu xác nhận" },
          { word: "免费更换", pinyin: "miǎnfèi gēnghuàn", vi: "đổi miễn phí" },
        ],
        model: "如果确认是我们的问题，我们免费更换有问题的部分，运费我们承担。",
        modelVi: "Nếu xác nhận là lỗi của chúng tôi, chúng tôi đổi miễn phí phần lỗi và chịu cước.",
        keywords: ["确认", "更换"],
        pitfall: "Giữ chữ «如果确认» — đó là điều kiện, không phải sự thừa nhận.",
      },
    ],
  },
];

/* ------------------------------------------------------------------
   Badges — ids must match the meters in student-rules.evaluateBadges
------------------------------------------------------------------ */

export const badgeDefs: BadgeDef[] = [
  { id: "streak", name: "Kiên Trì", hanzi: "恒", category: "Chuỗi ngày", rarity: "Thường", blurb: "Bảy ngày học liên tiếp.", requirement: "Chuỗi 7 ngày" },
  { id: "streak-30", name: "Bền Bỉ", hanzi: "毅", category: "Chuỗi ngày", rarity: "Hiếm", blurb: "Một tháng không nghỉ ngày nào.", requirement: "Chuỗi 30 ngày" },
  { id: "lessons", name: "Khởi Hành", hanzi: "启", category: "Ngữ pháp", rarity: "Thường", blurb: "Hoàn thành mười bài học.", requirement: "10 bài học" },
  { id: "lessons-50", name: "Đường Dài", hanzi: "远", category: "Ngữ pháp", rarity: "Sử thi", blurb: "Năm mươi bài học đã qua.", requirement: "50 bài học" },
  { id: "exam", name: "Nhập Trường", hanzi: "考", category: "Thi cử", rarity: "Thường", blurb: "Đạt đề thi thử đầu tiên.", requirement: "Qua 1 đề" },
  { id: "exam-5", name: "Ứng Thí", hanzi: "第", category: "Thi cử", rarity: "Hiếm", blurb: "Qua năm đề thi thử.", requirement: "Qua 5 đề" },
  { id: "grammar", name: "Cú Pháp", hanzi: "法", category: "Ngữ pháp", rarity: "Thường", blurb: "Thành thạo mười điểm ngữ pháp.", requirement: "10 điểm ≥ 80%" },
  { id: "grammar-40", name: "Văn Lý", hanzi: "理", category: "Ngữ pháp", rarity: "Sử thi", blurb: "Bốn mươi điểm ngữ pháp thành thạo.", requirement: "40 điểm ≥ 80%" },
  { id: "writing", name: "Bút Đầu", hanzi: "笔", category: "Chữ Hán", rarity: "Thường", blurb: "Viết đạt hai mươi chữ.", requirement: "20 chữ đạt chuẩn" },
  { id: "writing-100", name: "Thư Pháp", hanzi: "书", category: "Chữ Hán", rarity: "Huyền thoại", blurb: "Một trăm chữ viết đạt chuẩn.", requirement: "100 chữ đạt chuẩn" },
  { id: "vocab", name: "Tích Từ", hanzi: "词", category: "Từ vựng", rarity: "Thường", blurb: "Hai mươi lăm thẻ đã thuộc.", requirement: "25 thẻ «đã thuộc»" },
  { id: "vocab-200", name: "Kho Chữ", hanzi: "库", category: "Từ vựng", rarity: "Sử thi", blurb: "Hai trăm thẻ đã thuộc.", requirement: "200 thẻ «đã thuộc»" },
  { id: "xp", name: "Ngũ Thiên", hanzi: "五", category: "Cộng đồng", rarity: "Hiếm", blurb: "Năm nghìn điểm kinh nghiệm.", requirement: "5.000 XP" },
  { id: "xp-25k", name: "Nhị Ngũ", hanzi: "廿", category: "Cộng đồng", rarity: "Huyền thoại", blurb: "Hai mươi lăm nghìn XP.", requirement: "25.000 XP" },
  { id: "night", name: "Dạ Độc", hanzi: "夜", category: "Cộng đồng", rarity: "Hiếm", blurb: "Học sau nửa đêm mười lần.", requirement: "10 phiên sau 00:00" },
  { id: "dawn", name: "Thần Khởi", hanzi: "晨", category: "Cộng đồng", rarity: "Hiếm", blurb: "Học trước 6 giờ sáng mười lần.", requirement: "10 phiên trước 06:00" },
  { id: "perfect", name: "Toàn Thắng", hanzi: "全", category: "Thi cử", rarity: "Sử thi", blurb: "Một đề thi đúng tuyệt đối.", requirement: "Điểm tối đa một đề" },
  { id: "lego", name: "Ghép Câu", hanzi: "构", category: "Ngữ pháp", rarity: "Thường", blurb: "Ba sao ở một trạm Lego.", requirement: "3 sao một trạm" },
  { id: "workplace", name: "Thương Đàm", hanzi: "商", category: "Cộng đồng", rarity: "Hiếm", blurb: "Đạt trên 80 điểm một kịch bản công sở.", requirement: "≥ 80 điểm" },
  { id: "radical", name: "Bộ Thủ", hanzi: "部", category: "Chữ Hán", rarity: "Hiếm", blurb: "Học đủ 50 bộ thủ.", requirement: "50 bộ thủ" },
];

/* ------------------------------------------------------------------
   Leaderboard rivals
------------------------------------------------------------------ */

export const rivals: RivalSeed[] = [
  { id: "r1", name: "Trần Gia Hân", initials: "GH", level: 5, baseXp: 41200 },
  { id: "r2", name: "Lý Thu Trang", initials: "TT", level: 4, baseXp: 38700 },
  { id: "r3", name: "Phạm Đức Anh", initials: "ĐA", level: 5, baseXp: 36400 },
  { id: "r4", name: "Vũ Khánh Linh", initials: "KL", level: 4, baseXp: 33900 },
  { id: "r5", name: "Đỗ Minh Quân", initials: "MQ", level: 3, baseXp: 31500 },
  { id: "r6", name: "Bùi Hải Yến", initials: "HY", level: 4, baseXp: 29800 },
  { id: "r7", name: "Ngô Tuấn Kiệt", initials: "TK", level: 3, baseXp: 27600 },
  { id: "r8", name: "Hoàng Bảo Ngọc", initials: "BN", level: 3, baseXp: 25100 },
  { id: "r9", name: "Đặng Thùy Dương", initials: "TD", level: 3, baseXp: 23400 },
  { id: "r10", name: "Lê Quốc Bảo", initials: "QB", level: 2, baseXp: 21800 },
  { id: "r11", name: "Nguyễn Hà My", initials: "HM", level: 3, baseXp: 19900 },
  { id: "r12", name: "Trịnh Văn Hùng", initials: "VH", level: 2, baseXp: 18200 },
  { id: "r13", name: "Cao Diệu Linh", initials: "DL", level: 2, baseXp: 16700 },
  { id: "r14", name: "Mai Anh Tuấn", initials: "AT", level: 2, baseXp: 14300 },
  { id: "r15", name: "Dương Kim Chi", initials: "KC", level: 2, baseXp: 12600 },
  { id: "r16", name: "Tô Nhật Nam", initials: "NN", level: 1, baseXp: 10400 },
  { id: "r17", name: "Lâm Phương Thảo", initials: "PT", level: 2, baseXp: 8900 },
  { id: "r18", name: "Chu Việt Anh", initials: "VA", level: 1, baseXp: 7200 },
  { id: "r19", name: "Hà Ngọc Mai", initials: "NM", level: 1, baseXp: 5600 },
  { id: "r20", name: "Phan Trọng Nghĩa", initials: "TN", level: 1, baseXp: 3800 },
];

/* ------------------------------------------------------------------
   Placement test
------------------------------------------------------------------ */

export const placementQuestions: PlacementQuestion[] = [
  { id: "p1", level: 1, prompt: "«你好» nghĩa là gì?", options: ["Xin chào", "Tạm biệt", "Cảm ơn", "Xin lỗi"], answer: 0 },
  { id: "p2", level: 1, prompt: "Chọn chữ nghĩa là «nước»", options: ["火", "水", "木", "土"], answer: 1 },
  { id: "p3", level: 2, prompt: "«我去过北京» nghĩa là gì?", options: ["Tôi sẽ đi Bắc Kinh", "Tôi từng đến Bắc Kinh", "Tôi đang ở Bắc Kinh", "Tôi không đi Bắc Kinh"], answer: 1 },
  { id: "p4", level: 2, prompt: "Điền: 他____我高。(cao hơn tôi)", options: ["比", "跟", "和", "对"], answer: 0 },
  { id: "p5", level: 3, prompt: "Câu 把 nào đúng?", options: ["我把书看完了。", "我看完把书了。", "把我书看完了。", "我把看完书了。"], answer: 0 },
  { id: "p6", level: 3, prompt: "«差不多» nghĩa gần nhất là?", options: ["hoàn toàn khác", "gần như", "rất tệ", "chắc chắn"], answer: 1 },
  { id: "p7", level: 4, prompt: "«尽管…还是…» diễn đạt quan hệ gì?", options: ["Nguyên nhân", "Nhượng bộ", "Điều kiện", "Mục đích"], answer: 1 },
  { id: "p8", level: 4, prompt: "«效率» nghĩa là?", options: ["hiệu suất", "hiệu quả", "tỷ lệ", "năng lượng"], answer: 0 },
  { id: "p9", level: 5, prompt: "«一举两得» nghĩa là?", options: ["Một công đôi việc", "Mất cả chì lẫn chài", "Đi hai hàng", "Nước đôi"], answer: 0 },
  { id: "p10", level: 5, prompt: "«鉴于» thường dùng trong văn phong nào?", options: ["Khẩu ngữ", "Văn viết trang trọng", "Thơ ca", "Tiếng lóng"], answer: 1 },
  { id: "p11", level: 6, prompt: "«无独有偶» nghĩa là?", options: ["Không phải trường hợp duy nhất", "Độc nhất vô nhị", "Không có ai", "Cả hai đều sai"], answer: 0 },
  { id: "p12", level: 6, prompt: "«潜移默化» mô tả điều gì?", options: ["Thay đổi đột ngột", "Ảnh hưởng dần dần không nhận ra", "Cố ý thay đổi", "Không thay đổi"], answer: 1 },
];
