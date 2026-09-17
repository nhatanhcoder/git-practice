"use client";

import { useCallback, useEffect, useState } from "react";
import { ShieldCheck, Trophy } from "lucide-react";
import { EmptyState, ErrorState, Metric, PageHead, Panel, SkeletonPanel } from "@/components/student/primitives";
import { ApiError } from "@/lib/api-client";
import { fetchLeaderboard, type LeaderboardResponse } from "@/lib/student/gamification-service";
import styles from "./leaderboard.module.css";

export default function LeaderboardPage() {
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setData(await fetchLeaderboard()); } catch (reason) { setData(null); setError(reason); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  return <>
    <PageHead eyebrow="Kết quả chính thức" title="Bảng xếp hạng" sub="Xếp hạng theo tổng điểm đạt được trên tổng điểm tối đa. Danh tính học viên khác luôn được ẩn." />
    <Panel className="panel--pad">
      <div className={styles.notice}><ShieldCheck size={20} /><div><strong>Riêng tư theo mặc định</strong><p>Mỗi học viên dùng một bí danh ổn định. Cần ít nhất 3 bài chính thức đã chấm để tham gia.</p></div></div>
    </Panel>
    {loading ? <SkeletonPanel rows={8} height={180} /> : error ? <Panel className="panel--pad"><ErrorState title={error instanceof ApiError && error.isForbidden ? "Bạn không có quyền xem bảng" : "Không tải được bảng xếp hạng"} text="Không hiển thị dữ liệu cũ hoặc đối thủ mô phỏng. Hãy kiểm tra kết nối rồi thử lại." onRetry={() => void load()} /></Panel> : !data || data.eligibleCount === 0 ? <Panel className="panel--pad"><EmptyState icon={<Trophy size={26} />} title="Chưa có học viên đủ điều kiện" text="Bảng sẽ mở khi có học viên hoàn thành ít nhất 3 bài chính thức đã chấm." /></Panel> : <>
      <Panel className="panel--pad"><div className={styles.metrics}><Metric label="Hạng của bạn" value={data.me ? `#${data.me.rank}` : "Chưa đủ điều kiện"} /><Metric label="Điểm chuẩn hóa" value={data.me ? `${data.me.score.toFixed(2)}%` : "—"} /><Metric label="Học viên đủ điều kiện" value={data.eligibleCount} /></div></Panel>
      {!data.me ? <Panel className="panel--pad"><p className={styles.partial}>Bạn chưa có đủ 3 bài chính thức đã chấm. Bảng bên dưới vẫn dùng bí danh và không lộ hồ sơ học viên.</p></Panel> : null}
      <Panel><div className="panel__head"><div><h2 className="section-title">Top 20</h2><p className="section-sub">Điểm cao hơn xếp trước; khi bằng điểm, số bài nhiều hơn xếp trước.</p></div></div><ol className={styles.board}>
        {data.rows.map((row) => <li key={`${row.rank}-${row.alias}`} className={row.isYou ? styles.you : undefined}><span className={styles.rank}>#{row.rank}</span><span className={styles.alias}>{row.alias}{row.isYou ? <small>Bạn</small> : null}</span><span><strong>{row.score.toFixed(2)}%</strong><small>Điểm</small></span><span><strong>{row.gradedAttempts}</strong><small>Bài đã chấm</small></span></li>)}
      </ol></Panel>
      {data.me && data.me.rank > 20 ? <Panel className="panel--pad"><p className={styles.ownRow}><span>Vị trí của bạn</span><strong>#{data.me.rank} · {data.me.score.toFixed(2)}% · {data.me.gradedAttempts} bài</strong></p></Panel> : null}
    </>}
  </>;
}
