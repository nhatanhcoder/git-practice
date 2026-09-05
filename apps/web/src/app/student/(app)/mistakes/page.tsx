"use client";

import { NotebookPen } from "lucide-react";
import { ComingSoon } from "@/components/student/coming-soon";

export default function MistakesPage() {
  return (
    <ComingSoon
      title="Sổ lỗi & Ôn tập"
      desc="Mọi câu sai được ghi lại tự động và quay lại đúng lúc theo thuật toán SM-2 cho đến khi bạn thuộc."
      icon={NotebookPen}
      bullets={[
        "Thu thập lỗi từ bài tập, đề thi và flashcard",
        "Phiên ôn theo lịch SRS — đến hạn, trễ, đã thuộc",
        "Thống kê lỗi lặp nhiều nhất theo cấp HSK",
      ]}
    />
  );
}
