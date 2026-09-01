// MOCK(student): dashboard mock data — prototype only, no real API.

export interface ContinueLesson {
  course: string; // curriculum name
  level: number;
  lessonNo: number;
  title: string;
  titleHanzi: string;
  unit: string;
  progress: number; // percent within lesson
  minutesLeft: number;
  vocabDone: number;
  vocabTotal: number;
  grammarDone: number;
  grammarTotal: number;
}

export const continueLesson: ContinueLesson = {
  course: "HSK Standard Course",
  level: 3,
  lessonNo: 8,
  title: "Bài 8 · Đi mua sắm",
  titleHanzi: "去商场买东西",
  unit: "Từ vựng & Ngữ pháp",
  progress: 64,
  minutesLeft: 12,
  vocabDone: 16,
  vocabTotal: 25,
  grammarDone: 2,
  grammarTotal: 3,
};

export interface ReviewCard {
  id: string;
  hanzi: string;
  pinyin: string;
  meaning: string;
  level: number;
  dueKind: "SRS · đến hạn" | "SRS · trễ 1 ngày" | "Từ sai 3 lần";
  example: string;
}

export const todayReview: {
  total: number;
  newCards: number;
  dueCards: number;
  cards: ReviewCard[];
} = {
  total: 18,
  newCards: 5,
  dueCards: 13,
  cards: [
    {
      id: "r1",
      hanzi: "便宜",
      pinyin: "piányi",
      meaning: "rẻ",
      level: 3,
      dueKind: "SRS · đến hạn",
      example: "这件衣服很便宜。",
    },
    {
      id: "r2",
      hanzi: "打折",
      pinyin: "dǎzhé",
      meaning: "giảm giá",
      level: 3,
      dueKind: "SRS · trễ 1 ngày",
      example: "商场今天打折。",
    },
    {
      id: "r3",
      hanzi: "试",
      pinyin: "shì",
      meaning: "thử, làm thử",
      level: 3,
      dueKind: "Từ sai 3 lần",
      example: "我可以试试这双鞋吗？",
    },
    {
      id: "r4",
      hanzi: "质量",
      pinyin: "zhìliàng",
      meaning: "chất lượng",
      level: 3,
      dueKind: "SRS · đến hạn",
      example: "这家店的质量很好。",
    },
  ],
};

export interface ActivityItem {
  id: string;
  kind: "lesson" | "exam" | "srs" | "grammar" | "streak";
  text: string;
  meta: string;
  minutesAgo: number;
}

export const recentActivity: ActivityItem[] = [
  { id: "a1", kind: "lesson", text: "Hoàn thành Bài 7 · Hỏi đường", meta: "HSK 3 · +40 XP", minutesAgo: 35 },
  { id: "a2", kind: "srs", text: "Ôn 15 thẻ từ vựng", meta: "Ghi nhớ 13/15 · +20 XP", minutesAgo: 160 },
  { id: "a3", kind: "exam", text: "Thi thử HSK 3 — phần Nghe", meta: "Đạt 82% · kỷ lục mới", minutesAgo: 1500 },
  { id: "a4", kind: "grammar", text: "Học ngữ pháp «Câu 把»", meta: "Luyện tập 2/3 bài", minutesAgo: 2900 },
];

export interface QuickLink {
  href: string;
  title: string;
  desc: string;
  cta: string;
  icon: "map" | "grammar" | "foundation" | "exam";
}

export const quickLinks: QuickLink[] = [
  { href: "/student/learning-path", title: "Lộ trình học", desc: "Bản đồ bài học HSK 1–9, nhiệm vụ phụ và trùm cuối cấp", cta: "Vào lộ trình", icon: "map" },
  { href: "/student/grammar", title: "Ngữ pháp", desc: "Thư viện điểm ngữ pháp có tìm kiếm và luyện tập nhanh", cta: "Xem ngữ pháp", icon: "grammar" },
  { href: "/student/foundation", title: "Nền tảng", desc: "Pinyin, thanh điệu, 214 bộ thủ và luyện nghe – nói", cta: "Luyện nền tảng", icon: "foundation" },
  { href: "/student/exams", title: "Thi HSK", desc: "Thi thử chuẩn CBT theo từng cấp HSK", cta: "Vào phòng thi", icon: "exam" },
];
