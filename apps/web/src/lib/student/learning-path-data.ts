// MOCK(student): learning-path mock data — prototype only.
// Node states are derived from the demo learner profile (HSK 3, current lesson 8).

export type Curriculum = "hsk_standard_course" | "han_yu_jiao_cheng";

export const curricula: { key: Curriculum; name: string; desc: string }[] = [
  {
    key: "hsk_standard_course",
    name: "HSK Standard Course",
    desc: "15 bài / cấp · HSK 1–9",
  },
  {
    key: "han_yu_jiao_cheng",
    name: "Giáo trình Hán ngữ",
    desc: "6 quyển · 51 bài · HSK 1–6",
  },
];

export type NodeKind = "lesson" | "side-quest" | "boss";
export type NodeState = "completed" | "current" | "available" | "locked";

export interface PathNode {
  id: string;
  kind: NodeKind;
  order: number; // position on the path, 0-based
  lessonNo: number | null;
  title: string;
  titleHanzi: string;
  minutes: number;
  xp: number;
  state: NodeState;
  vocabCount: number | null;
  grammarCount: number | null;
  exerciseCount: number | null;
  bookLabel?: string;
}

export interface LevelMap {
  level: number;
  curriculum: Curriculum;
  nodes: PathNode[];
  levelState: "completed" | "current" | "locked";
  lessonsCompleted: number;
  lessonsTotal: number;
  xpInLevel: number;
  xpTotalInLevel: number;
}

/* ---------- HSK Standard Course topics (VN titles, per level) ---------- */

const standardTopics: Record<number, [string, string, number, number][]> = {
  // [title VN, titleHanzi, vocab, grammar]
  1: [
    ["Bài 1 · Chào hỏi", "你好", 12, 1],
    ["Bài 2 · Gia đình", "家人", 14, 1],
    ["Bài 3 · Số và thời gian", "数字和时间", 15, 2],
    ["Bài 4 · Ngày sinh", "生日", 12, 1],
    ["Bài 5 · Đi ăn", "吃饭", 18, 2],
    ["Bài 6 · Đi mua đồ", "买东西", 16, 1],
    ["Bài 7 · Hỏi đường", "问路", 15, 2],
    ["Bài 8 · Thời tiết", "天气", 14, 1],
    ["Bài 9 · Sở thích", "爱好", 15, 2],
    ["Bài 10 · Trường học", "学校", 16, 1],
    ["Bài 11 · Bạn bè", "朋友", 12, 1],
    ["Bài 12 · Ngủ nghỉ", "睡觉", 10, 1],
    ["Bài 13 · Đi làm", "上班", 15, 2],
    ["Bài 14 · Gọi điện", "打电话", 13, 1],
    ["Bài 15 · Xin lỗi & cảm ơn", "对不起和谢谢", 12, 1],
  ],
  2: [
    ["Bài 1 · Chào hỏi cơ bản", "打招呼", 15, 2],
    ["Bài 2 · Lịch làm việc", "工作日程", 16, 2],
    ["Bài 3 · Nhà ở", "住房", 18, 2],
    ["Bài 4 · Giao thông", "交通", 16, 1],
    ["Bài 5 · Đi siêu thị", "去超市", 15, 2],
    ["Bài 6 · Internet", "上网", 14, 1],
    ["Bài 7 · Mua quần áo", "买衣服", 17, 2],
    ["Bài 8 · Ăn uống Trung Quốc", "中国菜", 16, 2],
    ["Bài 9 · Du lịch", "旅游", 18, 2],
    ["Bài 10 · Khỏe mạnh", "身体健康", 15, 1],
    ["Bài 11 · Nói về cảm xúc", "心情", 14, 2],
    ["Bài 12 · Rủ bạn đi chơi", "约朋友", 13, 1],
    ["Bài 13 · Mời khách", "请客", 15, 2],
    ["Bài 14 · Kỳ nghỉ", "假期", 12, 1],
    ["Bài 15 · Chúc mừng", "祝贺", 12, 1],
  ],
  3: [
    ["Bài 1 · Giới thiệu bản thân", "自我介绍", 20, 2],
    ["Bài 2 · Thời gian rảnh", "空闲时间", 22, 2],
    ["Bài 3 · Trở về trường", "返校", 21, 2],
    ["Bài 4 · Mua điện thoại", "买手机", 23, 3],
    ["Bài 5 · Nói chuyện thời tiết", "聊天气", 19, 2],
    ["Bài 6 · Cuộc thi chữ Hán", "汉字比赛", 20, 2],
    ["Bài 7 · Hỏi đường", "问路", 21, 2],
    ["Bài 8 · Đi mua sắm", "去商场买东西", 25, 3],
    ["Bài 9 · Chụp ảnh", "拍照", 18, 2],
    ["Bài 10 · Tìm việc làm thêm", "找兼职", 22, 3],
    ["Bài 11 · Thuê nhà", "租房子", 21, 2],
    ["Bài 12 · Thể thao", "运动", 20, 2],
    ["Bài 13 · Sở thích mới", "新爱好", 18, 2],
    ["Bài 14 · Lễ hội xuân", "春节", 24, 3],
    ["Bài 15 · Tạm biệt", "告别", 20, 2],
  ],
  4: [
    ["Bài 1 · Cuộc sống đại học", "大学生活", 30, 3],
    ["Bài 2 · Tình bạn", "友情", 28, 3],
    ["Bài 3 · Câu chuyện tình yêu", "爱情故事", 30, 3],
    ["Bài 4 · Mua bán trực tuyến", "网购", 27, 3],
    ["Bài 5 · Bảo vệ sức khoẻ", "健康", 29, 3],
    ["Bài 6 · Môi trường", "环境", 31, 3],
    ["Bài 7 · Vai trò giới tính", "男女平等", 26, 3],
    ["Bài 8 · Ăn uống an toàn", "食品安全", 28, 3],
    ["Bài 9 · Giao thông đô thị", "城市交通", 27, 3],
    ["Bài 10 · Tình yêu nghệ thuật", "艺术", 30, 3],
    ["Bài 11 · Về quê", "回乡", 26, 3],
    ["Bài 12 · Gửi quà", "送礼", 24, 3],
    ["Bài 13 · Nhân cách", "人格", 27, 3],
    ["Bài 14 · Công việc", "工作", 29, 3],
    ["Bài 15 · Đánh giá cuộc sống", "生活评价", 26, 3],
  ],
  5: [
    ["Bài 1 · Điểm mạnh & điểm yếu", "优点和缺点", 36, 3],
    ["Bài 2 · Câu chuyện triết lý", "哲理故事", 34, 3],
    ["Bài 3 · Truyền thống", "传统", 35, 3],
    ["Bài 4 · Nói về văn hoá", "文化", 33, 3],
    ["Bài 5 · Chế độ ăn", "饮食", 34, 3],
    ["Bài 6 · Xã hội hoá", "社会化", 32, 3],
    ["Bài 7 · Tài sản & giá trị", "财富与价值", 35, 3],
    ["Bài 8 · Công nghệ", "科技", 36, 3],
    ["Bài 9 · Vệ sinh cá nhân", "个人卫生", 30, 3],
    ["Bài 10 · Nhân sinh quan", "人生观", 34, 3],
    ["Bài 11 · Đọc sách", "读书", 33, 3],
    ["Bài 12 · Tình yêu", "爱情", 32, 3],
    ["Bài 13 · Nói chuyện nếp sống", "谈生活", 31, 3],
    ["Bài 14 · Công việc & sự nghiệp", "事业", 35, 3],
    ["Bài 15 · Quan hệ bạn bè", "朋友关系", 33, 3],
  ],
  6: [
    ["Bài 1 · Câu chuyện gia đình", "家庭故事", 42, 4],
    ["Bài 2 · Câu chuyện cuộc đời", "人生故事", 40, 4],
    ["Bài 3 · Câu chuyện xã hội", "社会故事", 41, 4],
    ["Bài 4 · Câu chuyện tình cảm", "感情故事", 39, 4],
    ["Bài 5 · Câu chuyện khoa học", "科学故事", 42, 4],
    ["Bài 6 · Câu chuyện văn hoá", "文化故事", 40, 4],
    ["Bài 7 · Câu chuyện động vật", "动物故事", 38, 4],
    ["Bài 8 · Câu chuyện nghề nghiệp", "职业故事", 41, 4],
    ["Bài 9 · Câu chuyện giáo dục", "教育故事", 40, 4],
    ["Bài 10 · Câu chuyện môi trường", "环境故事", 39, 4],
    ["Bài 11 · Câu chuyện pháp luật", "法律故事", 42, 4],
    ["Bài 12 · Câu chuyện kinh tế", "经济故事", 41, 4],
    ["Bài 13 · Câu chuyện du lịch", "旅游故事", 38, 4],
    ["Bài 14 · Câu chuyện sức khoẻ", "健康故事", 40, 4],
    ["Bài 15 · Câu chuyện lịch sử", "历史故事", 42, 4],
  ],
  7: [
    ["Bài 1 · Phong tục tập quán", "风俗习惯", 50, 4],
    ["Bài 2 · Đô thị hoá", "城市化", 48, 4],
    ["Bài 3 · Bảo tồn văn hoá", "文化保护", 49, 4],
    ["Bài 4 · Y tế công cộng", "公共卫生", 47, 4],
    ["Bài 5 · Giáo dục hiện đại", "现代教育", 50, 4],
    ["Bài 6 · Kinh tế số", "数字经济", 51, 4],
    ["Bài 7 · Truyền thông", "传媒", 48, 4],
    ["Bài 8 · Nghệ thuật đương đại", "当代艺术", 46, 4],
    ["Bài 9 · Phát triển bền vững", "可持续发展", 50, 4],
    ["Bài 10 · Giao lưu văn hoá", "文化交流", 49, 4],
    ["Bài 11 · Năng lượng mới", "新能源", 47, 4],
    ["Bài 12 · Xã hội già hoá", "老龄化社会", 48, 4],
    ["Bài 13 · Nông thôn mới", "新农村", 46, 4],
    ["Bài 14 · Thể thao & sức khoẻ", "体育与健康", 50, 4],
    ["Bài 15 · Tầm nhìn tương lai", "未来展望", 49, 4],
  ],
  8: [
    ["Bài 1 · Ngôn ngữ học", "语言学", 60, 5],
    ["Bài 2 · Văn học hiện đại", "现代文学", 58, 5],
    ["Bài 3 · Triết học", "哲学", 61, 5],
    ["Bài 4 · Lịch sử Trung Quốc", "中国历史", 59, 5],
    ["Bài 5 · Địa lý & dân tộc", "地理与民族", 57, 5],
    ["Bài 6 · Kinh tế chính trị", "政治经济", 60, 5],
    ["Bài 7 · Luật pháp", "法律", 58, 5],
    ["Bài 8 · Tâm lý học", "心理学", 59, 5],
    ["Bài 9 · Khoa học nhân văn", "人文科学", 61, 5],
    ["Bài 10 · Nghiên cứu xã hội", "社会研究", 57, 5],
    ["Bài 11 · Nghệ thuật cổ điển", "古典艺术", 58, 5],
    ["Bài 12 · Tranh luận học thuật", "学术辩论", 60, 5],
    ["Bài 13 · Báo chí", "新闻", 59, 5],
    ["Bài 14 · Ngoại giao", "外交", 57, 5],
    ["Bài 15 · Tổng kết học thuật", "学术总结", 60, 5],
  ],
  9: [
    ["Bài 1 · Kinh điển Trung Hoa", "中华经典", 70, 5],
    ["Bài 2 · Văn hoá tư tưởng", "思想文化", 68, 5],
    ["Bài 3 · Nghiên cứu chuyên sâu", "专题研究", 72, 5],
    ["Bài 4 · Phê bình văn nghệ", "文艺批评", 69, 5],
    ["Bài 5 · Chính sách công", "公共政策", 70, 5],
    ["Bài 6 · Toàn cầu hoá", "全球化", 71, 5],
    ["Bài 7 · Cạnh tranh & hợp tác", "竞争与合作", 68, 5],
    ["Bài 8 · Khoa học viễn tưởng", "科幻", 70, 5],
    ["Bài 9 · Đạo đức nghề nghiệp", "职业道德", 69, 5],
    ["Bài 10 · Phân tích dữ liệu", "数据分析", 72, 5],
    ["Bài 11 · Diễn thuyết", "演讲", 68, 5],
    ["Bài 12 · Đàm phán", "谈判", 70, 5],
    ["Bài 13 · Sáng tạo", "创新", 69, 5],
    ["Bài 14 · Di sản nhân loại", "人类遗产", 71, 5],
    ["Bài 15 · Tổng kết HSK 9", "HSK 9 总结", 70, 5],
  ],
};

/* ---------- Giáo trình Hán ngữ: 6 books, 51 lessons, HSK 1–6 ---------- */

const hanYuBooks: { book: number; level: number; lessons: number; name: string }[] = [
  { book: 1, level: 1, lessons: 8, name: "Sách 1 · Nhập môn" },
  { book: 2, level: 2, lessons: 9, name: "Sách 2 · Cơ sở" },
  { book: 3, level: 3, lessons: 10, name: "Sách 3 · Sơ trung" },
  { book: 4, level: 4, lessons: 8, name: "Sách 4 · Trung cấp" },
  { book: 5, level: 5, lessons: 8, name: "Sách 5 · Trung cao" },
  { book: 6, level: 6, lessons: 8, name: "Sách 6 · Cao cấp" },
];

const hanYuTopics: string[] = [
  "Phát âm & chào hỏi", "Giới thiệu tên", "Số đếm", "Gia đình", "Ngày tháng",
  "Đi học", "Ăn sáng", "Thời gian biểu", "Mua bút", "Hỏi giá",
  "Chỉ đường", "Đi chợ", "Ngủ trưa", "Buổi chiều", "Tối muộn",
  "Ngày cuối tuần", "Gặp gỡ", "Đi chơi cùng bạn", "Sở thích", "Mùa thu",
  "Mùa đông", "Tết Nguyên Đán", "Tặng quà", "Đi tàu", "Bán vé",
  "Gọi điện", "Hẹn gặp", "Phòng trọ", "Dọn nhà", "Cửa hàng",
  "Ăn tối", "Nấu cơm", "Mời khách", "Khỏe mạnh", "Ốm",
  "Nghỉ phép", "Đi làm lại", "Cuối tháng", "Gửi thư", "Nhận tiền",
  "Đi ngân hàng", "Đổi tiền", "Mua điện thoại", "Internet", "Tin nhắn",
  "Hẹn phỏng vấn", "Thử việc", "Ký hợp đồng", "Chúc mừng", "Lên chức",
  "Tiễn biệt",
];

interface SideQuestDef {
  afterLesson: number; // insert after this lesson
  title: string;
  titleHanzi: string;
  minutes: number;
  xp: number;
}

const standardSideQuests: Record<number, SideQuestDef[]> = {
  3: [
    { afterLesson: 5, title: "Nhiệm vụ phụ · Ôn từ vựng đơn 1–5", titleHanzi: "复习任务", minutes: 8, xp: 40 },
    { afterLesson: 10, title: "Nhiệm vụ phụ · Nghe tốc độ nhanh", titleHanzi: "快速听力", minutes: 10, xp: 60 },
  ],
};

function defaultSideQuests(): SideQuestDef[] {
  return [
    { afterLesson: 5, title: "Nhiệm vụ phụ · Ôn từ vựng 5 bài", titleHanzi: "复习任务", minutes: 8, xp: 40 },
    { afterLesson: 10, title: "Nhiệm vụ phụ · Luyện nghe nâng cao", titleHanzi: "听力挑战", minutes: 10, xp: 60 },
  ];
}

const bossNames: Record<number, [string, string]> = {
  1: ["Trùm cuối HSK 1 · Kiểm tra tổng hợp", "大Boss"],
  2: ["Trùm cuối HSK 2 · Kiểm tra tổng hợp", "大Boss"],
  3: ["Trùm cuối HSK 3 · Kiểm tra tổng hợp", "大Boss"],
  4: ["Trùm cuối HSK 4 · Kiểm tra tổng hợp", "大Boss"],
  5: ["Trùm cuối HSK 5 · Kiểm tra tổng hợp", "大Boss"],
  6: ["Trùm cuối HSK 6 · Kiểm tra tổng hợp", "大Boss"],
  7: ["Trùm cuối HSK 7 · Kiểm tra tổng hợp", "大Boss"],
  8: ["Trùm cuối HSK 8 · Kiểm tra tổng hợp", "大Boss"],
  9: ["Trùm cuối HSK 9 · Vòng bảo vệ cuối cùng", "最终Boss"],
};

/* ---------- Demo learner position ---------- */

export const demoPosition = {
  currentLevel: 3,
  currentLesson: 8, // lesson in progress (64%)
  completedThrough: 7, // lessons fully completed in level 3
};

/* ---------- Builder ---------- */

export function buildLevelMap(curriculum: Curriculum, level: number): LevelMap {
  if (curriculum === "han_yu_jiao_cheng") {
    return buildHanYuLevel(level);
  }
  return buildStandardLevel(level);
}

function buildStandardLevel(level: number): LevelMap {
  const topics = standardTopics[level] ?? [];
  const levelState: "completed" | "current" | "locked" =
    level < demoPosition.currentLevel
      ? "completed"
      : level === demoPosition.currentLevel
        ? "current"
        : "locked";

  const nodes: PathNode[] = [];
  let order = 0;
  let lessonsCompleted = 0;

  topics.forEach((t, idx) => {
    const lessonNo = idx + 1;
    let state: NodeState;
    if (levelState === "completed") {
      state = "completed";
      lessonsCompleted = topics.length;
    } else if (levelState === "locked") {
      state = "locked";
    } else {
      if (lessonNo <= demoPosition.completedThrough) {
        state = "completed";
        lessonsCompleted = lessonNo;
      } else if (lessonNo === demoPosition.currentLesson) {
        state = "current";
        lessonsCompleted = lessonNo; // in-progress counts toward completed count for the strip
      } else {
        state = "locked";
      }
    }
    nodes.push({
      id: `std-${level}-l${lessonNo}`,
      kind: "lesson",
      order: order++,
      lessonNo,
      title: t[0],
      titleHanzi: t[1],
      minutes: 15 + (t[2] > 25 ? 10 : 0),
      xp: 40 + level * 5,
      state,
      vocabCount: t[2],
      grammarCount: t[3],
      exerciseCount: 2,
    });

    const sq = (standardSideQuests[level] ?? defaultSideQuests()).find(
      (q) => q.afterLesson === lessonNo,
    );
    if (sq) {
      const sqState: NodeState =
        levelState === "completed"
          ? "completed"
          : levelState === "locked"
            ? "locked"
            : lessonNo <= demoPosition.completedThrough
              ? "completed"
              : lessonNo === demoPosition.currentLesson
                ? "available"
                : "locked";
      nodes.push({
        id: `std-${level}-sq${lessonNo}`,
        kind: "side-quest",
        order: order++,
        lessonNo: null,
        title: sq.title,
        titleHanzi: sq.titleHanzi,
        minutes: sq.minutes,
        xp: sq.xp,
        state: sqState,
        vocabCount: null,
        grammarCount: null,
        exerciseCount: 1,
      });
    }
  });

  const [bossTitle, bossHanzi] = bossNames[level] ?? ["Trùm cuối cấp", "大Boss"];
  nodes.push({
    id: `std-${level}-boss`,
    kind: "boss",
    order: order++,
    lessonNo: null,
    title: bossTitle,
    titleHanzi: bossHanzi,
    minutes: 30 + level * 2,
    xp: 200 + level * 25,
    state:
      levelState === "completed"
        ? "completed"
        : levelState === "current"
          ? "locked"
          : "locked",
    vocabCount: null,
    grammarCount: null,
    exerciseCount: 4,
  });

  const xpTotalInLevel = nodes.reduce((sum, n) => sum + n.xp, 0);
  const xpInLevel = nodes
    .filter((n) => n.state === "completed")
    .reduce((sum, n) => sum + n.xp, 0);

  return {
    level,
    curriculum: "hsk_standard_course",
    nodes,
    levelState,
    lessonsCompleted,
    lessonsTotal: topics.length,
    xpInLevel,
    xpTotalInLevel,
  };
}

function buildHanYuLevel(level: number): LevelMap {
  const book = hanYuBooks.find((b) => b.level === level);
  if (!book) {
    // HSK 7–9: Giáo trình Hán ngữ chỉ có tới HSK 6 — designed empty state.
    return {
      level,
      curriculum: "han_yu_jiao_cheng",
      nodes: [],
      levelState: "locked",
      lessonsCompleted: 0,
      lessonsTotal: 0,
      xpInLevel: 0,
      xpTotalInLevel: 0,
    };
  }

  const levelState: "completed" | "current" | "locked" =
    level < demoPosition.currentLevel
      ? "completed"
      : level === demoPosition.currentLevel
        ? "current"
        : "locked";

  const nodes: PathNode[] = [];
  let order = 0;
  let lessonsCompleted = 0;
  const startIndex = hanYuBooks
    .filter((b) => b.level < level)
    .reduce((sum, b) => sum + b.lessons, 0);

  for (let i = 0; i < book.lessons; i++) {
    const globalIdx = startIndex + i;
    const lessonNo = i + 1;
    let state: NodeState;
    if (levelState === "completed") {
      state = "completed";
      lessonsCompleted = book.lessons;
    } else if (levelState === "locked") {
      state = "locked";
    } else {
      if (lessonNo <= 5) {
        state = "completed";
        lessonsCompleted = lessonNo;
      } else {
        state = "locked";
      }
    }
    const topic = hanYuTopics[globalIdx] ?? `Bài ${lessonNo}`;
    nodes.push({
      id: `hy-${level}-l${lessonNo}`,
      kind: "lesson",
      order: order++,
      lessonNo,
      title: `Bài ${lessonNo} · ${topic}`,
      titleHanzi: `第${lessonNo}课`,
      minutes: 14,
      xp: 35 + level * 5,
      state,
      vocabCount: 12 + level,
      grammarCount: 1 + Math.floor(level / 2),
      exerciseCount: 2,
      bookLabel: book.name,
    });
  }

  nodes.push({
    id: `hy-${level}-boss`,
    kind: "boss",
    order: order++,
    lessonNo: null,
    title: `Trùm cuối ${book.name}`,
    titleHanzi: "大Boss",
    minutes: 28,
    xp: 180 + level * 20,
    state: levelState === "completed" ? "completed" : "locked",
    vocabCount: null,
    grammarCount: null,
    exerciseCount: 3,
    bookLabel: book.name,
  });

  const xpTotalInLevel = nodes.reduce((sum, n) => sum + n.xp, 0);
  const xpInLevel = nodes
    .filter((n) => n.state === "completed")
    .reduce((sum, n) => sum + n.xp, 0);

  return {
    level,
    curriculum: "han_yu_jiao_cheng",
    nodes,
    levelState,
    lessonsCompleted,
    lessonsTotal: book.lessons,
    xpInLevel,
    xpTotalInLevel,
  };
}
