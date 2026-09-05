/**
 * MOCK(student): landing-page data, ported verbatim from the prototype's
 * `frontend/src/data/landingData.ts` (`Chinese UI test/ui-claude`). Everything is
 * simulated — teacher portraits are local PNGs under `public/teachers/`, student
 * avatars are Unsplash URLs, every number is a hard-coded count.
 *
 * Counts were verified against the prototype's JSON content on 2026-09-03:
 * 9 levels · 76 grammar points · 214 radicals (21 initials + 36 finals) ·
 * 587 writing characters · 11 exams · 40 Lego sentences · 6 workplace
 * scenarios · 20 badges.
 */

export interface Teacher {
  id: string;
  nameVi: string;
  nameHan: string;
  role: string;
  qualification: string;
  experience: string;
  avatar: string;
  bio: string;
  badge: string;
  themeColor: string;
  themeBg: string;
  tags: string[];
  sealHanzi: string;
}

export interface Student {
  id: string;
  nameVi: string;
  avatar: string;
  startLevel: string;
  hskLevel: string;
  duration: string;
  score: string;
  achievement: string;
  studyFocus: string;
  quote: string;
  fullTestimonial: string;
}

export const TEACHERS: Teacher[] = [
  {
    id: "zhang-wei",
    nameVi: "Thầy Trương Vĩ",
    nameHan: "张伟 老师",
    role: "Trưởng khoa HSK & Cựu Giám khảo khảo thí",
    qualification: "Tiến sĩ Ngôn ngữ học PKU",
    experience: "12 năm kinh nghiệm giảng dạy",
    avatar: "/teachers/teacher_zhang_wei-v2.png",
    bio: "Tiến sĩ Ngôn ngữ học ứng dụng Đại học Bắc Kinh (PKU). Chuyên gia hàng đầu về phân tích ma trận bẫy đề thi HSK 5–6 và HSK 7–9 cao cấp theo chuẩn mới của Hanban.",
    badge: "Tiến sĩ PKU",
    themeColor: "var(--accent)",
    themeBg:
      "radial-gradient(90% 120% at 75% 35%, rgba(220, 38, 38, 0.24) 0%, transparent 65%), radial-gradient(60% 80% at 15% 20%, rgba(234, 88, 12, 0.15) 0%, transparent 60%)",
    tags: ["Chiến lược HSK 5-6", "Bẫy đề HSK 7-9", "Cựu Giám khảo Hanban", "Ngữ pháp cao cấp"],
    sealHanzi: "师",
  },
  {
    id: "li-ruolan",
    nameVi: "Cô Lý Nhược Lan",
    nameHan: "李若兰 老师",
    role: "Chuyên gia Luyện phát âm & Khẩu ngữ",
    qualification: "Thạc sĩ Hán ngữ Quốc tế BNU",
    experience: "9 năm kinh nghiệm đào tạo",
    avatar: "/teachers/teacher_li_ruolan-v2.png",
    bio: "Thạc sĩ Giáo dục Hán ngữ Quốc tế (CTCSOL) ĐH Sư phạm Bắc Kinh. Đã giúp hơn 3.000 học viên chuẩn hóa 4 thanh điệu, giải quyết triệt để biến điệu và hình thành phản xạ nói trôi chảy.",
    badge: "Thạc sĩ BNU",
    themeColor: "var(--success)",
    themeBg:
      "radial-gradient(90% 120% at 75% 35%, rgba(16, 185, 129, 0.24) 0%, transparent 65%), radial-gradient(60% 80% at 15% 20%, rgba(6, 182, 212, 0.15) 0%, transparent 60%)",
    tags: ["Nền tảng Pinyin", "Khẩu ngữ HSKK", "Âm chuẩn Bắc Kinh", "Phản xạ giao tiếp"],
    sealHanzi: "音",
  },
  {
    id: "nguyen-minh-tuan",
    nameVi: "Thầy Nguyễn Minh Tuấn",
    nameHan: "阮明俊 老师",
    role: "Chuyên gia Luyện thi cấp tốc HSK 1–4",
    qualification: "Thủ khoa HSK 6 (295/300đ)",
    experience: "8 năm kinh nghiệm luyện thi",
    avatar: "/teachers/teacher_nguyen_tuan-v2.png",
    bio: "Thủ khoa HSK 6 (295/300 điểm), cựu giảng viên khoa Trung ĐHQGHN. Tác giả phương pháp ghi nhớ 1.500 chữ Hán qua 214 bộ thủ và tư duy ghép câu Lego độc quyền.",
    badge: "Thủ khoa HSK 6",
    themeColor: "var(--gold-400)",
    themeBg:
      "radial-gradient(90% 120% at 75% 35%, rgba(245, 158, 11, 0.24) 0%, transparent 65%), radial-gradient(60% 80% at 15% 20%, rgba(217, 119, 6, 0.15) 0%, transparent 60%)",
    tags: ["Lộ trình HSK 1-4", "Mẹo thi 100%", "Luyện viết chữ Hán", "Tư duy Lego"],
    sealHanzi: "字",
  },
  {
    id: "tran-hieu-dinh",
    nameVi: "Cô Trần Hiểu Đình",
    nameHan: "陈晓婷 老师",
    role: "Chuyên gia Tiếng Trung Thương mại & Công sở",
    qualification: "Thạc sĩ Thương mại SISU",
    experience: "10 năm kinh nghiệm cố vấn",
    avatar: "/teachers/teacher_tran_dinh-v2.png",
    bio: "Thạc sĩ Thương mại Quốc tế ĐH Ngoại ngữ Thượng Hải (SISU). Cố vấn ngôn ngữ kinh doanh cho các tập đoàn đa quốc gia và các doanh nghiệp FDI hàng đầu tại Việt Nam.",
    badge: "Thạc sĩ SISU",
    themeColor: "var(--epic)",
    themeBg:
      "radial-gradient(90% 120% at 75% 35%, rgba(139, 92, 246, 0.24) 0%, transparent 65%), radial-gradient(60% 80% at 15% 20%, rgba(59, 130, 246, 0.15) 0%, transparent 60%)",
    tags: ["Mô phỏng Công sở", "Thương mại BCT", "Đàm phán Hợp đồng", "Email & Báo giá"],
    sealHanzi: "商",
  },
];

export const STUDENTS: Student[] = [
  {
    id: "nam",
    nameVi: "Nguyễn Hoàng Nam",
    avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=600&q=80",
    startLevel: "Mới bắt đầu (Zero)",
    hskLevel: "HSK 6 · 288/300 điểm",
    duration: "7 tháng tự học liền mạch",
    score: "Nghe 98 · Đọc 96 · Viết 94 (Tổng: 288/300)",
    achievement: "Học bổng Toàn phần CSC Thạc sĩ ĐH Thanh Hoa",
    studyFocus: "Phòng thi CBT mô phỏng & Sổ tay lỗi sai SRS",
    quote: "Nhờ lộ trình chín bậc liền mạch và phương pháp lặp lại ngắt quãng SRS của Hán Lộ, mình đã tiết kiệm hơn 1 năm tự học để bứt phá HSK 6.",
    fullTestimonial:
      "Trước khi biết đến Hán Lộ, mình học rất rời rạc giữa từ vựng và ngữ pháp. Khi vào nền tảng, hệ thống bản đồ 9 bậc cùng 5 hộp thẻ lặp lại ngắt quãng SRS đã giúp mình ghi nhớ từ vựng cực kỳ bền vững. Đặc biệt là phòng thi CBT đếm ngược 100% chuẩn thi thật giúp mình bước vào kỳ thi chính thức mà không hề bị căng thẳng thời gian.",
  },
  {
    id: "mai-anh",
    nameVi: "Trần Mai Anh",
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80",
    startLevel: "HSK 2 (Mất tự tin phần Viết)",
    hskLevel: "HSK 5 · 276/300 điểm",
    duration: "5 tháng luyện thi cấp tốc",
    score: "Nghe 92 · Đọc 94 · Viết 90 (Tổng: 276/300)",
    achievement: "Thủ khoa Đầu ra Khoa Trung ĐH Ngoại Thương",
    studyFocus: "Ghép câu Lego & Thư viện ngữ pháp tương tác",
    quote: "Phòng thi CBT mô phỏng 100% đề thi thật với đồng hồ đếm ngược giúp mình bước vào phòng thi chính thức hoàn toàn tự tin và không bị ngợp thời gian.",
    fullTestimonial:
      "Phương pháp phân tích trật tự câu Lego với mã màu ngữ pháp đã cứu vớt điểm phần Viết của mình. Mình hiểu rõ vị trí của trạng ngữ chỉ thời gian, nơi chốn, bổ ngữ kết quả và câu chữ Ba/Bị mà không cần học vẹt công thức khô khan.",
  },
  {
    id: "quoc-bao",
    nameVi: "Lê Quốc Bảo",
    avatar: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=600&q=80",
    startLevel: "Mất gốc giao tiếp",
    hskLevel: "HSK 4 & Chứng chỉ BCT Công sở",
    duration: "4 tháng thực chiến",
    score: "Nghe 88 · Đọc 86 · Khẩu ngữ BCT Giỏi",
    achievement: "Trưởng phòng Thu mua Doanh nghiệp FDI Thượng Hải",
    studyFocus: "Mô phỏng công sở & Luyện phản xạ đàm phán",
    quote: "Phần mô phỏng công sở và ghép câu Lego đã giúp mình tự tin soạn email báo giá, họp song phương với đối tác Thượng Hải cực kỳ trôi chảy.",
    fullTestimonial:
      "Đi làm bận rộn nên mình không thể theo các khóa học cố định. Các bài mô phỏng công sở của Hán Lộ tái hiện chính xác ngữ cảnh họp hành, trả giá, điều khoản hợp đồng và văn hóa kinh doanh Trung Quốc, ứng dụng ngay vào công việc hàng ngày.",
  },
  {
    id: "quynh-nga",
    nameVi: "Phạm Quỳnh Nga",
    avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=80",
    startLevel: "HSK 4 căn bản",
    hskLevel: "HSK 6 · 292/300 điểm",
    duration: "6 tháng chuyên sâu",
    score: "Nghe 99 · Đọc 97 · Viết 96 (Tổng: 292/300)",
    achievement: "Biên phiên dịch viên Cabin & Hội nghị Quốc tế",
    studyFocus: "Luyện viết chữ Hán theo nét & Đề thi HSK 6 cao cấp",
    quote: "Thư viện ngữ pháp kèm bài tập tương tác và phân tích thứ tự nét chữ Hán siêu trực quan. Một nền tảng học tiếng Trung toàn diện nhất mình từng dùng!",
    fullTestimonial:
      "Để làm phiên dịch Cabin, tốc độ nhận diện mặt chữ và nắm bắt ngữ cảnh phải tính bằng mili-giây. Các dạng bài nghe có bản chép lời chi tiết cùng bảng phân tích nét bút thuận đã giúp mình nâng cao phản xạ dịch thuật vượt bậc.",
  },
];

export const PATH_LEVELS = [
  { level: "HSK 1", stage: "Sơ khởi", hanzi: "入门", words: "150 từ vựng", lessons: "15 bài học", tone: "accent" as const },
  { level: "HSK 2", stage: "Giao tiếp cơ bản", hanzi: "基础", words: "300 từ vựng", lessons: "20 bài học", tone: "accent" as const },
  { level: "HSK 3", stage: "Tự tin đàm thoại", hanzi: "进阶", words: "600 từ vựng", lessons: "25 bài học", tone: "info" as const },
  { level: "HSK 4", stage: "Thực chiến công việc", hanzi: "中级", words: "1.200 từ vựng", lessons: "30 bài học", tone: "info" as const },
  { level: "HSK 5", stage: "Đọc hiểu báo chí", hanzi: "高级", words: "2.500 từ vựng", lessons: "35 bài học", tone: "success" as const },
  { level: "HSK 6", stage: "Biên phiên dịch", hanzi: "精通", words: "5.000 từ vựng", lessons: "40 bài học", tone: "success" as const },
  { level: "HSK 7–9", stage: "Học thuật & Chuyên gia", hanzi: "大师", words: "11.000+ từ vựng", lessons: "Chuyên đề", tone: "epic" as const },
];

export const METHOD = [
  {
    step: "01",
    title: "Định vị bậc của bạn",
    text: "Bài kiểm tra xếp cấp đặt bạn vào đúng một trong chín bậc HSK, thay vì bắt bạn học lại từ đầu những gì đã biết.",
  },
  {
    step: "02",
    title: "Đi theo một con đường",
    text: "Bài học, nhiệm vụ phụ và ải trùm nối thành lộ trình có thứ tự. Mở khoá bằng tiến độ, không phải bằng cách nhảy cóc.",
  },
  {
    step: "03",
    title: "Ôn đúng lúc sắp quên",
    text: "Mọi câu sai rơi vào sổ tay và quay lại theo lịch lặp lại ngắt quãng năm hộp — càng nhớ chắc, khoảng cách càng giãn.",
  },
];

/** Content counts shown in the stats strip and area cards (verified 2026-09-03). */
export const CONTENT_COUNTS = {
  hskLevels: 9,
  grammar: 76,
  radicals: 214,
  pinyinSounds: 57, // 21 initials + 36 finals
  writing: 587,
  exams: 11,
  legoSentences: 40,
  workplace: 6,
  badges: 20,
} as const;
