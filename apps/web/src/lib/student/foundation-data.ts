// MOCK(student): foundation hub mock data — Pinyin, tones, listening, speaking, PDFs.

/* ---------- Pinyin: 21 initials (Thanh mẫu) ---------- */

export interface Initial {
  pinyin: string;
  ipa: string;
  exampleHanzi: string;
  examplePinyin: string;
  exampleVi: string;
  tip: string;
}

export const initials: Initial[] = [
  { pinyin: "b", ipa: "[p]", exampleHanzi: "爸", examplePinyin: "bà", exampleVi: "bố", tip: "Không bật hơi như \"b\" tiếng Việt" },
  { pinyin: "p", ipa: "[pʰ]", exampleHanzi: "跑", examplePinyin: "pǎo", exampleVi: "chạy", tip: "Bật hơi mạnh, đặt giấy trước miệng để thử" },
  { pinyin: "m", ipa: "[m]", exampleHanzi: "妈", examplePinyin: "mā", exampleVi: "mẹ", tip: "Như \"m\" tiếng Việt" },
  { pinyin: "f", ipa: "[f]", exampleHanzi: "飞", examplePinyin: "fēi", exampleVi: "bay", tip: "Răng trên chạm môi dưới" },
  { pinyin: "d", ipa: "[t]", exampleHanzi: "大", examplePinyin: "dà", exampleVi: "to", tip: "Đầu lưỡi chạm răng trên" },
  { pinyin: "t", ipa: "[tʰ]", exampleHanzi: "他", examplePinyin: "tā", exampleVi: "anh ấy", tip: "Bật hơi mạnh hơn \"t\" tiếng Việt" },
  { pinyin: "n", ipa: "[n]", exampleHanzi: "你", examplePinyin: "nǐ", exampleVi: "bạn", tip: "Như \"n\" tiếng Việt" },
  { pinyin: "l", ipa: "[l]", exampleHanzi: "来", examplePinyin: "lái", exampleVi: "đến", tip: "Như \"l\" tiếng Việt" },
  { pinyin: "g", ipa: "[k]", exampleHanzi: "高", examplePinyin: "gāo", exampleVi: "cao", tip: "Phần sau lưỡi chạm vòm mềm" },
  { pinyin: "k", ipa: "[kʰ]", exampleHanzi: "看", examplePinyin: "kàn", exampleVi: "xem", tip: "Như \"c\" tiếng Việt, bật hơi" },
  { pinyin: "h", ipa: "[x]", exampleHanzi: "好", examplePinyin: "hǎo", exampleVi: "tốt", tip: "Giống \"kh\" nhẹ, không phải \"h\" cổ họng" },
  { pinyin: "j", ipa: "[tɕ]", exampleHanzi: "几", examplePinyin: "jǐ", exampleVi: "mấy", tip: "Môi kéo ngang, mặt lưỡi chạm vòm cứng" },
  { pinyin: "q", ipa: "[tɕʰ]", exampleHanzi: "去", examplePinyin: "qù", exampleVi: "đi", tip: "Như j nhưng bật hơi mạnh" },
  { pinyin: "x", ipa: "[ɕ]", exampleHanzi: "小", examplePinyin: "xiǎo", exampleVi: "nhỏ", tip: "Môi kéo ngang, luồng khí hẹp" },
  { pinyin: "zh", ipa: "[ʈʂ]", exampleHanzi: "中", examplePinyin: "zhōng", exampleVi: "giữa", tip: "Đầu lưỡi cuộn lên trên" },
  { pinyin: "ch", ipa: "[ʈʂʰ]", exampleHanzi: "吃", examplePinyin: "chī", exampleVi: "ăn", tip: "Như zh nhưng bật hơi" },
  { pinyin: "sh", ipa: "[ʂ]", exampleHanzi: "是", examplePinyin: "shì", exampleVi: "là", tip: "Lưỡi cuộn, luồng khí rộng" },
  { pinyin: "r", ipa: "[ʐ]", exampleHanzi: "人", examplePinyin: "rén", exampleVi: "người", tip: "Khác \"r\" tiếng Việt — không rung lưỡi" },
  { pinyin: "z", ipa: "[ts]", exampleHanzi: "字", examplePinyin: "zì", exampleVi: "chữ", tip: "Như \"ch\" tiếng Việt trong \"cha\"" },
  { pinyin: "c", ipa: "[tsʰ]", exampleHanzi: "词", examplePinyin: "cí", exampleVi: "từ", tip: "Như z nhưng bật hơi mạnh" },
  { pinyin: "s", ipa: "[s]", exampleHanzi: "四", examplePinyin: "sì", exampleVi: "bốn", tip: "Như \"s\" tiếng Việt" },
];

/* ---------- Pinyin: 36 finals (Vân mẫu) ---------- */

export interface Final {
  pinyin: string;
  ipa: string;
  group: "Đơn vân" | "Phức vân" | "Mũi vân (trước)" | "Mũi vân (sau)" | "Giới âm";
  exampleHanzi: string;
  examplePinyin: string;
}

export const finals: Final[] = [
  { pinyin: "a", ipa: "[a]", group: "Đơn vân", exampleHanzi: "八", examplePinyin: "bā" },
  { pinyin: "o", ipa: "[o]", group: "Đơn vân", exampleHanzi: "我", examplePinyin: "wǒ" },
  { pinyin: "e", ipa: "[ɤ]", group: "Đơn vân", exampleHanzi: "饿", examplePinyin: "è" },
  { pinyin: "i", ipa: "[i]", group: "Đơn vân", exampleHanzi: "一", examplePinyin: "yī" },
  { pinyin: "u", ipa: "[u]", group: "Đơn vân", exampleHanzi: "五", examplePinyin: "wǔ" },
  { pinyin: "ü", ipa: "[y]", group: "Đơn vân", exampleHanzi: "鱼", examplePinyin: "yú" },
  { pinyin: "ê", ipa: "[ɛ]", group: "Đơn vân", exampleHanzi: "诶", examplePinyin: "ê" },
  { pinyin: "ai", ipa: "[ai]", group: "Phức vân", exampleHanzi: "爱", examplePinyin: "ài" },
  { pinyin: "ei", ipa: "[ei]", group: "Phức vân", exampleHanzi: "给", examplePinyin: "gěi" },
  { pinyin: "ui", ipa: "[uei]", group: "Phức vân", exampleHanzi: "水", examplePinyin: "shuǐ" },
  { pinyin: "ao", ipa: "[ɑu]", group: "Phức vân", exampleHanzi: "猫", examplePinyin: "māo" },
  { pinyin: "ou", ipa: "[ou]", group: "Phức vân", exampleHanzi: "狗", examplePinyin: "gǒu" },
  { pinyin: "iu", ipa: "[iou]", group: "Phức vân", exampleHanzi: "六", examplePinyin: "liù" },
  { pinyin: "ie", ipa: "[iɛ]", group: "Phức vân", exampleHanzi: "写", examplePinyin: "xiě" },
  { pinyin: "üe", ipa: "[yɛ]", group: "Phức vân", exampleHanzi: "月", examplePinyin: "yuè" },
  { pinyin: "er", ipa: "[ɚ]", group: "Phức vân", exampleHanzi: "二", examplePinyin: "èr" },
  { pinyin: "an", ipa: "[an]", group: "Mũi vân (trước)", exampleHanzi: "三", examplePinyin: "sān" },
  { pinyin: "en", ipa: "[ən]", group: "Mũi vân (trước)", exampleHanzi: "门", examplePinyin: "mén" },
  { pinyin: "in", ipa: "[in]", group: "Mũi vân (trước)", exampleHanzi: "心", examplePinyin: "xīn" },
  { pinyin: "un", ipa: "[uən]", group: "Mũi vân (trước)", exampleHanzi: "春", examplePinyin: "chūn" },
  { pinyin: "ün", ipa: "[yn]", group: "Mũi vân (trước)", exampleHanzi: "云", examplePinyin: "yún" },
  { pinyin: "ang", ipa: "[ɑŋ]", group: "Mũi vân (sau)", exampleHanzi: "上", examplePinyin: "shàng" },
  { pinyin: "eng", ipa: "[əŋ]", group: "Mũi vân (sau)", exampleHanzi: "朋", examplePinyin: "péng" },
  { pinyin: "ing", ipa: "[iŋ]", group: "Mũi vân (sau)", exampleHanzi: "星", examplePinyin: "xīng" },
  { pinyin: "ong", ipa: "[ʊŋ]", group: "Mũi vân (sau)", exampleHanzi: "东", examplePinyin: "dōng" },
  { pinyin: "ia", ipa: "[ia]", group: "Giới âm", exampleHanzi: "家", examplePinyin: "jiā" },
  { pinyin: "iao", ipa: "[iɑu]", group: "Giới âm", exampleHanzi: "小", examplePinyin: "xiǎo" },
  { pinyin: "ian", ipa: "[iɛn]", group: "Giới âm", exampleHanzi: "天", examplePinyin: "tiān" },
  { pinyin: "iang", ipa: "[iɑŋ]", group: "Giới âm", exampleHanzi: "想", examplePinyin: "xiǎng" },
  { pinyin: "iong", ipa: "[iʊŋ]", group: "Giới âm", exampleHanzi: "熊", examplePinyin: "xióng" },
  { pinyin: "ua", ipa: "[ua]", group: "Giới âm", exampleHanzi: "花", examplePinyin: "huā" },
  { pinyin: "uo", ipa: "[uo]", group: "Giới âm", exampleHanzi: "说", examplePinyin: "shuō" },
  { pinyin: "uai", ipa: "[uai]", group: "Giới âm", exampleHanzi: "快", examplePinyin: "kuài" },
  { pinyin: "uan", ipa: "[uan]", group: "Giới âm", exampleHanzi: "玩", examplePinyin: "wán" },
  { pinyin: "uang", ipa: "[uɑŋ]", group: "Giới âm", exampleHanzi: "黄", examplePinyin: "huáng" },
  { pinyin: "ueng", ipa: "[uəŋ]", group: "Giới âm", exampleHanzi: "翁", examplePinyin: "wēng" },
];

/* ---------- Tones (Thanh điệu) ---------- */

export interface Tone {
  no: number;
  mark: string; // e.g. "ā"
  name: string;
  contour: string; // description
  exampleHanzi: string;
  examplePinyin: string;
  exampleVi: string;
  path: string; // SVG path for the tone contour (48x32 viewBox)
}

export const tones: Tone[] = [
  {
    no: 1,
    mark: "ā",
    name: "Thanh 1 (Thanh bình)",
    contour: "Cao và bằng, không đổi độ cao",
    exampleHanzi: "妈",
    examplePinyin: "mā",
    exampleVi: "mẹ",
    path: "M4 10 H44",
  },
  {
    no: 2,
    mark: "á",
    name: "Thanh 2 (Thanh thượng)",
    contour: "Đi lên từ trung bình đến cao",
    exampleHanzi: "麻",
    examplePinyin: "má",
    exampleVi: "cây gai",
    path: "M4 26 Q20 22 44 6",
  },
  {
    no: 3,
    mark: "ǎ",
    name: "Thanh 3 (Thanh khứ)",
    contour: "Đi xuống rồi đi lên",
    exampleHanzi: "马",
    examplePinyin: "mǎ",
    exampleVi: "ngựa",
    path: "M4 12 Q16 12 24 22 Q32 32 44 8",
  },
  {
    no: 4,
    mark: "à",
    name: "Thanh 4 (Thanh nhập)",
    contour: "Rơi nhanh từ cao xuống thấp",
    exampleHanzi: "骂",
    examplePinyin: "mà",
    exampleVi: "mắng",
    path: "M4 6 L44 26",
  },
];

export interface SandhiRule {
  title: string;
  rule: string;
  examples: { hanzi: string; pinyin: string; vi: string }[];
}

export const sandhiRules: SandhiRule[] = [
  {
    title: "3–3 → 2–3",
    rule: "Hai thanh 3 đứng cạnh nhau: thanh 3 đầu tiên đọc thành thanh 2",
    examples: [
      { hanzi: "你好", pinyin: "nǐ hǎo → ní hǎo", vi: "xin chào" },
      { hanzi: "很好", pinyin: "hěn hǎo → hén hǎo", vi: "rất tốt" },
    ],
  },
  {
    title: "不 bù → bú",
    rule: "«不» trước thanh 4 đọc thành thanh 2",
    examples: [
      { hanzi: "不是", pinyin: "bù shì → bú shì", vi: "không phải" },
      { hanzi: "不去", pinyin: "bù qù → bú qù", vi: "không đi" },
    ],
  },
  {
    title: "一 yī → yí / yì",
    rule: "«一» trước thanh 4 đọc thanh 2, trước các thanh khác đọc thanh 4",
    examples: [
      { hanzi: "一个", pinyin: "yī gè → yí gè", vi: "một cái" },
      { hanzi: "一天", pinyin: "yī tiān → yì tiān", vi: "một ngày" },
    ],
  },
  {
    title: "Thanh nhẹ (轻声)",
    rule: "Một số âm tiết đọc nhẹ, ngắn, không có thanh điệu",
    examples: [
      { hanzi: "妈妈", pinyin: "māma", vi: "mẹ" },
      { hanzi: "谢谢", pinyin: "xièxie", vi: "cảm ơn" },
    ],
  },
];

/* ---------- Listening & Speaking practice ---------- */

export interface PracticeCard {
  id: string;
  title: string;
  desc: string;
  level: number;
  minutes: number;
  bestScore: number | null;
  attempts: number;
  kind: "image" | "dialogue" | "number" | "dictation" | "pronounce" | "shadow" | "read";
}

export const listeningCards: PracticeCard[] = [
  { id: "l1", title: "Chọn hình đúng", desc: "Nghe từ/câu rồi chọn hình phù hợp — 10 câu", level: 1, minutes: 5, bestScore: 90, attempts: 6, kind: "image" },
  { id: "l2", title: "Nghe hội thoại ngắn", desc: "Hội thoại 2–4 lượt, trả lời câu hỏi", level: 2, minutes: 8, bestScore: 75, attempts: 3, kind: "dialogue" },
  { id: "l3", title: "Nghe số & thời gian", desc: "Số điện thoại, giá, ngày giờ", level: 1, minutes: 5, bestScore: 100, attempts: 4, kind: "number" },
  { id: "l4", title: "Chính tả nghe", desc: "Nghe câu, gõ lại toàn bộ pinyin", level: 3, minutes: 10, bestScore: 60, attempts: 2, kind: "dictation" },
];

export const speakingCards: PracticeCard[] = [
  { id: "s1", title: "Phát âm thanh mẫu", desc: "Luyện 21 thanh mẫu dễ nhầm (zh/z, q/c)", level: 1, minutes: 6, bestScore: 82, attempts: 5, kind: "pronounce" },
  { id: "s2", title: "Đọc theo (Shadowing)", desc: "Nghe rồi nhại lại theo tốc độ gốc", level: 2, minutes: 8, bestScore: null, attempts: 0, kind: "shadow" },
  { id: "s3", title: "Đọc to đoạn văn", desc: "Đoạn 60 chữ, chấm điểm phát âm", level: 3, minutes: 7, bestScore: 68, attempts: 3, kind: "read" },
];

/* ---------- PDF downloads ---------- */

export interface PdfCard {
  id: string;
  title: string;
  desc: string;
  pages: number;
  size: string;
}

export const pdfCards: PdfCard[] = [
  { id: "p1", title: "Bảng Pinyin & IPA", desc: "21 thanh mẫu + 36 vân mẫu kèm phiên âm IPA", pages: 4, size: "1.2 MB" },
  { id: "p2", title: "214 Bộ thủ Khang Hi", desc: "Bộ thủ, biến thể, số nét và ví dụ", pages: 12, size: "3.4 MB" },
  { id: "p3", title: "500 từ vựng HSK 1", desc: "Hanzi, pinyin, nghĩa và ví dụ", pages: 18, size: "2.1 MB" },
  { id: "p4", title: "Lộ trình ôn tập 8 tuần", desc: "Kế hoạch ôn HSK theo tuần, có checklist", pages: 6, size: "0.9 MB" },
];

/* ---------- Mastery ---------- */

export const foundationMastery = {
  pinyin: 78,
  tones: 64,
  radicals: 31,
  listening: 52,
  speaking: 35,
};
