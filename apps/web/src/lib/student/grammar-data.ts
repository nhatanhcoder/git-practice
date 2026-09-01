// MOCK(student): grammar library mock data — prototype only.

export type GrammarCategory =
  | "Cấu trúc câu"
  | "Trợ từ"
  | "So sánh"
  | "Bổ ngữ"
  | "Thể hiện"
  | "Liên từ";

export const grammarCategories: GrammarCategory[] = [
  "Cấu trúc câu",
  "Trợ từ",
  "So sánh",
  "Bổ ngữ",
  "Thể hiện",
  "Liên từ",
];

export interface GrammarExample {
  hanzi: string;
  pinyin: string;
  vi: string;
}

export interface GrammarPoint {
  id: string;
  level: number; // HSK 1–9
  title: string; // Vietnamese name
  formula: string;
  category: GrammarCategory;
  hanzi: string; // example headline
  pinyin: string;
  vi: string;
  mastery: number; // 0–100
  examples: GrammarExample[];
  notes: string;
}

export const grammarPoints: GrammarPoint[] = [
  {
    id: "g1",
    level: 1,
    title: "Câu 是 (shì)",
    formula: "S + 是 + O",
    category: "Cấu trúc câu",
    hanzi: "我是学生。",
    pinyin: "Wǒ shì xuésheng.",
    vi: "Tôi là học sinh.",
    mastery: 100,
    examples: [
      { hanzi: "他是老师。", pinyin: "Tā shì lǎoshī.", vi: "Anh ấy là giáo viên." },
      { hanzi: "这是我妈妈。", pinyin: "Zhè shì wǒ māma.", vi: "Đây là mẹ tôi." },
    ],
    notes: "是 nối chủ ngữ và danh từ phủ định dùng 不是.",
  },
  {
    id: "g2",
    level: 1,
    title: "Trợ từ 的 (de) — sở hữu",
    formula: "S + 的 + N",
    category: "Trợ từ",
    hanzi: "这是我的书。",
    pinyin: "Zhè shì wǒ de shū.",
    vi: "Đây là sách của tôi.",
    mastery: 100,
    examples: [
      { hanzi: "他朋友的手机", pinyin: "Tā péngyou de shǒujī", vi: "điện thoại của bạn anh ấy" },
      { hanzi: "学校的图书馆", pinyin: "xuéxiào de túshūguǎn", vi: "thư viện của trường" },
    ],
    notes: "Với người thân quen gần, có thể lược 的: 我妈妈.",
  },
  {
    id: "g3",
    level: 2,
    title: "Câu so sánh 比 (bǐ)",
    formula: "A + 比 + B + Adj",
    category: "So sánh",
    hanzi: "今天比昨天热。",
    pinyin: "Jīntiān bǐ zuótiān rè.",
    vi: "Hôm nay nóng hơn hôm qua.",
    mastery: 92,
    examples: [
      { hanzi: "他比我高。", pinyin: "Tā bǐ wǒ gāo.", vi: "Anh ấy cao hơn tôi." },
      { hanzi: "汉语课比英语课难。", pinyin: "Hànyǔ kè bǐ Yīngyǔ kè nán.", vi: "Lớp tiếng Hán khó hơn lớp tiếng Anh." },
    ],
    notes: "Không dùng 很 trước tính từ khi so sánh bằng 比.",
  },
  {
    id: "g4",
    level: 2,
    title: "Câu muốn 想 (xiǎng)",
    formula: "S + 想 + V (O)",
    category: "Thể hiện",
    hanzi: "我想喝水。",
    pinyin: "Wǒ xiǎng hē shuǐ.",
    vi: "Tôi muốn uống nước.",
    mastery: 88,
    examples: [
      { hanzi: "你想去哪儿？", pinyin: "Nǐ xiǎng qù nǎr?", vi: "Bạn muốn đi đâu?" },
      { hanzi: "我想买这件衣服。", pinyin: "Wǒ xiǎng mǎi zhè jiàn yīfu.", vi: "Tôi muốn mua cái áo này." },
    ],
    notes: "想 cũng mang nghĩa «nghĩ, nhớ», tùy ngữ cảnh.",
  },
  {
    id: "g5",
    level: 3,
    title: "Câu 把 (bǎ) — nhấn mạnh kết quả",
    formula: "S + 把 + O + V + bổ ngữ",
    category: "Cấu trúc câu",
    hanzi: "我把作业做完了。",
    pinyin: "Wǒ bǎ zuòyè zuò wán le.",
    vi: "Tôi đã làm xong bài tập.",
    mastery: 45,
    examples: [
      { hanzi: "请把门关上。", pinyin: "Qǐng bǎ mén guān shàng.", vi: "Xin hãy đóng cửa lại." },
      { hanzi: "他把书放在桌子上。", pinyin: "Tā bǎ shū fàng zài zhuōzi shàng.", vi: "Anh ấy đặt sách lên bàn." },
    ],
    notes: "Động từ trong câu 把 phải có bổ ngữ hoặc 了, không đứng trơn.",
  },
  {
    id: "g6",
    level: 3,
    title: "Bổ ngữ kết quả 完 / 到",
    formula: "V + 完 / 到 / 见",
    category: "Bổ ngữ",
    hanzi: "我听懂了老师的话。",
    pinyin: "Wǒ tīng dǒng le lǎoshī de huà.",
    vi: "Tôi nghe hiểu lời giáo viên.",
    mastery: 52,
    examples: [
      { hanzi: "作业我做完了。", pinyin: "Zuòyè wǒ zuò wán le.", vi: "Bài tập tôi đã làm xong." },
      { hanzi: "我看见他了。", pinyin: "Wǒ kànjiàn tā le.", vi: "Tôi đã nhìn thấy anh ấy." },
    ],
    notes: "Phủ định đặt 不/没 trước động từ: 没听懂.",
  },
  {
    id: "g7",
    level: 3,
    title: "Trợ từ 过 (guo) — kinh nghiệm",
    formula: "S + V + 过 + O",
    category: "Trợ từ",
    hanzi: "我去过北京。",
    pinyin: "Wǒ qù guo Běijīng.",
    vi: "Tôi đã từng đến Bắc Kinh.",
    mastery: 38,
    examples: [
      { hanzi: "你吃过饺子吗？", pinyin: "Nǐ chī guo jiǎozi ma?", vi: "Bạn đã từng ăn sủi cảo chưa?" },
      { hanzi: "我没看过这个电影。", pinyin: "Wǒ méi kàn guo zhège diànyǐng.", vi: "Tôi chưa từng xem phim này." },
    ],
    notes: "过 nhấn mạnh trải nghiệm trong quá khứ, khác 了 (hoàn thành).",
  },
  {
    id: "g8",
    level: 3,
    title: "Câu bị động 被 (bèi)",
    formula: "S + 被 + O + V",
    category: "Cấu trúc câu",
    hanzi: "手机被我弄丢了。",
    pinyin: "Shǒujī bèi wǒ nòng diū le.",
    vi: "Điện thoại bị tôi làm mất.",
    mastery: 30,
    examples: [
      { hanzi: "作业被他做完了。", pinyin: "Zuòyè bèi tā zuò wán le.", vi: "Bài tập được anh ấy làm xong." },
      { hanzi: "杯子被弟弟打碎了。", pinyin: "Bēizi bèi dìdi dǎ suì le.", vi: "Cái ly bị em trai làm vỡ." },
    ],
    notes: "Bị động với 被 thường dùng cho sự việc không mong muốn.",
  },
  {
    id: "g9",
    level: 4,
    title: "Liên từ 不但…而且…",
    formula: "S + 不但 + A, 而且 + B",
    category: "Liên từ",
    hanzi: "他不但会说汉语，而且会说日语。",
    pinyin: "Tā búdàn huì shuō Hànyǔ, érqiě huì shuō Rìyǔ.",
    vi: "Anh ấy không những nói được tiếng Hán mà còn nói được tiếng Nhật.",
    mastery: 20,
    examples: [
      { hanzi: "今天不但冷，而且下雨。", pinyin: "Jīntiān búdàn lěng, érqiě xià yǔ.", vi: "Hôm nay không những lạnh mà còn mưa." },
      { hanzi: "她不但漂亮，而且聪明。", pinyin: "Tā búdàn piàoliang, érqiě cōngming.", vi: "Cô ấy không những xinh mà còn thông minh." },
    ],
    notes: "Chủ ngữ chung đặt trước 不但; chủ ngữ khác đặt sau.",
  },
  {
    id: "g10",
    level: 4,
    title: "Bổ ngữ mức độ 得 (de)",
    formula: "V + 得 + (rất) + Adj",
    category: "Bổ ngữ",
    hanzi: "他说汉语说得很好。",
    pinyin: "Tā shuō Hànyǔ shuō de hěn hǎo.",
    vi: "Anh ấy nói tiếng Hán nói rất giỏi.",
    mastery: 25,
    examples: [
      { hanzi: "你来得太晚了。", pinyin: "Nǐ lái de tài wǎn le.", vi: "Bạn đến muộn quá." },
      { hanzi: "她唱歌唱得不错。", pinyin: "Tā chàng gē chàng de búcuò.", vi: "Cô ấy hát khá ổn." },
    ],
    notes: "Động từ có tân ngữ thì lặp lại động từ trước 得.",
  },
  {
    id: "g11",
    level: 4,
    title: "Cả… cũng / 越…越…",
    formula: "越 + A + 越 + B",
    category: "Cấu trúc câu",
    hanzi: "天气越来越冷了。",
    pinyin: "Tiānqì yuè lái yuè lěng le.",
    vi: "Thời tiết ngày càng lạnh.",
    mastery: 15,
    examples: [
      { hanzi: "越多越好。", pinyin: "Yuè duō yuè hǎo.", vi: "Càng nhiều càng tốt." },
      { hanzi: "他越学越有兴趣。", pinyin: "Tā yuè xué yuè yǒu xìngqù.", vi: "Anh càng học càng thấy hứng thú." },
    ],
    notes: "来越 dùng cho xu hướng tăng dần theo thời gian.",
  },
  {
    id: "g12",
    level: 5,
    title: "Bổ ngữ hướng 补语趋向",
    formula: "V + 上/下/进/出/回/过/起",
    category: "Bổ ngữ",
    hanzi: "他拿出一本书来。",
    pinyin: "Tā ná chū yì běn shū lái.",
    vi: "Anh ấy lấy ra một quyển sách.",
    mastery: 0,
    examples: [
      { hanzi: "把书放回去。", pinyin: "Bǎ shū fàng huí qù.", vi: "Đặt sách về chỗ cũ." },
      { hanzi: "他走进来了。", pinyin: "Tā zǒu jìn lái le.", vi: "Anh ấy đi vào (về phía người nói)." },
    ],
    notes: "来/đi chỉ hướng vận động theo vị trí người nói.",
  },
  {
    id: "g13",
    level: 5,
    title: "Câu nhượng bộ 虽然…但是…",
    formula: "虽然 + A, 但是 + B",
    category: "Liên từ",
    hanzi: "虽然很难，但是我不放弃。",
    pinyin: "Suīrán hěn nán, dànshì wǒ bú fàngqì.",
    vi: "Tuy rất khó nhưng tôi không bỏ cuộc.",
    mastery: 10,
    examples: [
      { hanzi: "虽然下雨，他还是去了。", pinyin: "Suīrán xià yǔ, tā háishì qù le.", vi: "Dù mưa, anh ấy vẫn đi." },
      { hanzi: "虽然贵，质量很好。", pinyin: "Suīrán guì, zhìliàng hěn hǎo.", vi: "Tuy đắt nhưng chất lượng tốt." },
    ],
    notes: "Cặp từ đi成对: 虽然…但是…, 尽管…还是…",
  },
  {
    id: "g14",
    level: 5,
    title: "Ngữ khí nếu 万一 (wànyī)",
    formula: "万一 + điều kiện, (thì)…",
    category: "Thể hiện",
    hanzi: "万一下雨，比赛就取消。",
    pinyin: "Wànyī xià yǔ, bǐsài jiù qǔxiāo.",
    vi: "Nếu lỡ trời mưa thì trận đấu sẽ bị huỷ.",
    mastery: 0,
    examples: [
      { hanzi: "万一他不来怎么办？", pinyin: "Wànyī tā bù lái zěnme bàn?", vi: "Nếu lỡ anh ấy không đến thì sao?" },
      { hanzi: "万一有事，给我打电话。", pinyin: "Wànyī yǒu shì, gěi wǒ dǎ diànhuà.", vi: "Nếu có chuyện gì thì gọi điện cho tôi." },
    ],
    notes: "万一 nhấn mạnh xác suất thấp nhưng hậu quả đáng lo.",
  },
];

export interface MasterySummary {
  total: number;
  mastered: number; // >= 80
  learning: number; // 1–79
  notStarted: number; // 0
}

export function masterySummary(points: GrammarPoint[]): MasterySummary {
  return {
    total: points.length,
    mastered: points.filter((p) => p.mastery >= 80).length,
    learning: points.filter((p) => p.mastery > 0 && p.mastery < 80).length,
    notStarted: points.filter((p) => p.mastery === 0).length,
  };
}

/* ---------- Exercise preview mini-demo data ---------- */

export interface McqExercise {
  question: string;
  options: string[];
  answerIndex: number;
  explain: string;
}

export const grammarExercises: Record<string, McqExercise> = {
  mcq: {
    question: "Chọn câu đúng: «Tôi đã từng đến Thượng Hải.»",
    options: ["我去上海了。", "我去过上海。", "我要去上海。", "我在上海。"],
    answerIndex: 1,
    explain: "Kinh nghiệm trong quá khứ dùng V + 过.",
  },
  fill: {
    question: "Điền vào chỗ trống: 今天比昨天_____。(nóng hơn)",
    options: ["很热", "热", "热了", "不热"],
    answerIndex: 1,
    explain: "Sau 比 không dùng 很; tính từ đứng trực tiếp.",
  },
  reorder: {
    question: "Sắp xếp thành câu: 把 / 作业 / 我 / 做完了",
    options: ["我", "把", "作业", "做完了"],
    answerIndex: 0,
    explain: "Trật tự câu 把: S + 把 + O + V + bổ ngữ.",
  },
  match: {
    question: "Nối từ với nghĩa đúng",
    options: ["便宜 → rẻ", "打折 → giảm giá", "质量 → chất lượng", "试 → thử"],
    answerIndex: 0,
    explain: "Từ vựng bài 8 — HSK 3.",
  },
  reflex: {
    question: "Speed Reflex: «nóng hơn hôm qua» là gì? (5 giây)",
    options: ["今天比昨天热", "今天很热", "昨天很热", "今天不热"],
    answerIndex: 0,
    explain: "So sánh dùng A 比 B + Adj.",
  },
};
