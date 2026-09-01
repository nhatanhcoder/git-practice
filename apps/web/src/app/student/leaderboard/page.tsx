"use client";

import { Trophy } from "lucide-react";
import { ComingSoon } from "@/components/student/coming-soon";

export default function LeaderboardPage() {
  return (
    <ComingSoon
      title="Bảng xếp hạng & Huy hiệu"
      desc="Cạnh tranh lành mạnh với bạn học cùng lớp, giữ chuỗi ngày học và sưu tập huy hiệu."
      icon={Trophy}
      bullets={[
        "Xếp hạng theo XP theo tuần và tháng",
        "Chuỗi ngày học (streak) và kỷ lục cá nhân",
        "Huy hiệu theo cột mốc: 100 từ, 7 ngày liền, phá trùm…",
      ]}
    />
  );
}
