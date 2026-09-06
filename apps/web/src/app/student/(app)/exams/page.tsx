"use client";

import { ClipboardCheck } from "lucide-react";
import { ComingSoon } from "@/components/student/coming-soon";

export default function ExamsPage() {
  return (
    <ComingSoon
      title="Phòng thi HSK"
      desc="Thi thử chuẩn CBT với đồng hồ đếm ngược, chấm điểm tự động và phân tích điểm yếu theo từng kỹ năng."
      icon={ClipboardCheck}
      bullets={[
        "Đề thi thử HSK 1–9 theo cấu trúc thật",
        "Đồng hồ đếm ngược từng phần thi",
        "Bảng phân tích điểm Weakness theo kỹ năng",
        "Lịch sử điểm cao nhất từng cấp",
      ]}
    />
  );
}
