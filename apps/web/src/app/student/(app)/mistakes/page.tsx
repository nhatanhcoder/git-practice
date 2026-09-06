"use client";

/**
 * /student/mistakes — the mistake notebook.
 *
 * A05 separates two things that had been sharing this route. The vocabulary SRS lives at
 * `/student/flashcards` (see `lib/student/srs-routes.ts`); this page is the notebook of
 * questions answered wrongly in assignments and mock exams, which is a Sprint 4 feature with
 * no endpoints yet.
 *
 * It deliberately does NOT show a card queue. The store still holds demo mistakes, and
 * rendering them here would put invented review history in front of a signed-in learner — the
 * same defect as `WEB-011`. In development the demo session stays reachable, clearly labelled;
 * in production the page says what it is waiting for and points at the review that is real.
 */

import Link from "next/link";
import { ArrowRight, NotebookPen, Sparkles } from "lucide-react";
import { EmptyState, PageHead, Panel } from "@/components/student/primitives";
import {
  MISTAKES_REVIEW_ROUTE,
  SRS_ROUTE,
  isMistakeDemoEnabled,
} from "@/lib/student/srs-routes";

export default function MistakeNotebookPage() {
  const demoEnabled = isMistakeDemoEnabled(process.env.NODE_ENV);

  return (
    <div className="stack gap-5">
      <PageHead
        title="Sổ tay lỗi sai"
        sub="Những câu bạn trả lời sai trong bài tập và đề thi thử sẽ được gom về đây."
      />

      <EmptyState
        icon={<NotebookPen size={22} />}
        title="Chưa có dữ liệu lỗi sai"
        text="Sổ tay lỗi sai lấy dữ liệu từ bài tập và bài thi đã nộp. Các endpoint đó thuộc Sprint 4 (Assignments & Attempts) và chưa được xây dựng, nên trang này chưa hiển thị thẻ nào — thay vì dựng dữ liệu giả."
      />

      <Panel className="panel--pad stack gap-3">
        <h2 style={{ fontSize: "var(--step-1)", margin: 0 }}>Ôn từ vựng thì đã sẵn sàng</h2>
        <p style={{ color: "var(--text-2)", margin: 0, maxWidth: "62ch" }}>
          Flashcard từ vựng là một chức năng riêng và đã chạy trên máy chủ thật: thẻ đến hạn,
          bốn mức đánh giá SM-2 và thống kê ghi nhớ đều lưu theo tài khoản của bạn.
        </p>
        <Link href={SRS_ROUTE} className="btn btn--primary" style={{ alignSelf: "flex-start" }}>
          <Sparkles size={16} /> Mở Flashcard từ vựng <ArrowRight size={14} />
        </Link>
      </Panel>

      {demoEnabled ? (
        <Panel className="panel--pad stack gap-3">
          <h2 style={{ fontSize: "var(--step-1)", margin: 0 }}>Bản demo (chỉ có ở môi trường dev)</h2>
          <p style={{ color: "var(--text-2)", margin: 0, maxWidth: "62ch" }}>
            Phiên ôn lỗi sai dựng sẵn chạy hoàn toàn trong trình duyệt, không gửi gì lên máy chủ.
            Nó chỉ dùng để xem giao diện; không có ở bản production.
          </p>
          <Link
            href={MISTAKES_REVIEW_ROUTE}
            className="btn btn--outline"
            style={{ alignSelf: "flex-start" }}
          >
            Mở phiên ôn demo <ArrowRight size={14} />
          </Link>
        </Panel>
      ) : null}
    </div>
  );
}
