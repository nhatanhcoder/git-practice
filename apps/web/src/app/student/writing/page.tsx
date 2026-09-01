"use client";

import { PenTool } from "lucide-react";
import { ComingSoon } from "@/components/student/coming-soon";

export default function WritingPage() {
  return (
    <ComingSoon
      title="Tập viết chữ Hán"
      desc="Luyện viết từng nét theo đúng thứ tự, từ bộ thủ đơn giản đến từ phức hợp theo cấp HSK."
      icon={PenTool}
      bullets={[
        "Hướng dẫn từng nét theo đúng quy tắc",
        "Duyệt 214 bộ thủ theo số nét",
        "Luyện từ theo cấp HSK 1–9",
        "Nhận diện chữ viết tay (demo)",
      ]}
    />
  );
}
