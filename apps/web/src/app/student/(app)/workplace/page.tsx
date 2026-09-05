"use client";

import { Briefcase } from "lucide-react";
import { ComingSoon } from "@/components/student/coming-soon";

export default function WorkplacePage() {
  return (
    <ComingSoon
      title="Giao tiếp công sở"
      desc="Kịch bản hội thoại thực tế nơi làm việc: họp, email, báo cáo, đàm phán và gọi điện với đối tác Trung Quốc."
      icon={Briefcase}
      bullets={[
        "Kịch bản theo chuyên ngành: sản xuất, thương mại, logistics",
        "Luyện nghe — nói theo vai trong hội thoại",
        "Từ vựng chuyên ngành kèm Flashcard SRS",
      ]}
    />
  );
}
