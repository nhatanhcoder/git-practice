"use client";

/**
 * Error boundary for the whole Student area.
 *
 * Without this, a thrown render error falls through to the root boundary, which
 * is painted with the Admin area's light tokens — jarring inside the dark "Hán Lộ"
 * canvas, and it loses the shell entirely. Keeping the boundary here means the
 * rail, topbar and theme survive while only the content column is replaced.
 *
 * MOCK(student): mockup mode per docs/prompts/student-product/.
 */

import { useEffect } from "react";
import { ErrorState, PageHead } from "@/components/student/primitives";

export default function StudentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Server digests are all the production build exposes; log both so a mockup
    // reviewer can match what they see with the terminal.
    console.error("[student] render error", error);
  }, [error]);

  return (
    <div className="stack gap-6">
      <PageHead
        eyebrow="Sự cố"
        title="Khu vực học gặp lỗi"
        sub="Màn hình này không dựng được. Bạn có thể thử tải lại phần nội dung mà không mất trạng thái điều hướng."
      />
      <div className="panel panel--pad">
        <ErrorState
          title="Không dựng được màn hình"
          text={
            error.digest
              ? `Lỗi hiển thị trong bản mockup (mã ${error.digest}).`
              : "Lỗi hiển thị trong bản mockup. Dữ liệu vẫn là dữ liệu giả lập, không có máy chủ nào bị ảnh hưởng."
          }
          onRetry={reset}
        />
      </div>
    </div>
  );
}
