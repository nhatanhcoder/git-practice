"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Award, Check, Lock } from "lucide-react";
import { Bar, EmptyState, ErrorState, Metric, PageHead, Panel, SkeletonPanel } from "@/components/student/primitives";
import { Drawer } from "@/components/student/overlay";
import { ApiError } from "@/lib/api-client";
import { fetchBadges, type AttemptBadge, type BadgesResponse } from "@/lib/student/gamification-service";
import styles from "./badges.module.css";

type Filter = "all" | "earned" | "locked";
const dateLabel = (value: string) => new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(new Date(value));

export default function BadgesPage() {
  const [data, setData] = useState<BadgesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<AttemptBadge | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setData(await fetchBadges()); } catch (reason) { setData(null); setError(reason); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const visible = useMemo(() => data?.badges.filter((badge) => filter === "all" || (filter === "earned" ? badge.earned : !badge.earned)) ?? [], [data, filter]);

  return <>
    <PageHead eyebrow="Thành tựu chính thức" title="Kho huy hiệu" sub="Huy hiệu được máy chủ tính từ các bài chính thức đã chấm. Không có XP, phần thưởng hoặc tiến độ lưu ở trình duyệt." />
    {loading ? <SkeletonPanel rows={4} height={210} /> : error ? <Panel className="panel--pad"><ErrorState title={error instanceof ApiError && error.isForbidden ? "Bạn không có quyền xem huy hiệu" : "Không tải được huy hiệu"} text="Không dùng trạng thái cũ hay huy hiệu mô phỏng. Hãy kiểm tra kết nối rồi thử lại." onRetry={() => void load()} /></Panel> : !data ? null : <>
      <Panel className="panel--pad"><div className={styles.summary}><Metric label="Đã mở" value={`${data.earnedCount}/${data.badges.length}`} icon={<Award size={16} />} /><div className={styles.filters} role="group" aria-label="Lọc huy hiệu">{(["all","earned","locked"] as Filter[]).map((value) => <button type="button" key={value} className={`pill ${filter === value ? "is-active" : ""}`} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value === "all" ? "Tất cả" : value === "earned" ? "Đã mở" : "Còn khóa"}</button>)}</div></div></Panel>
      {data.earnedCount === 0 && filter === "earned" ? <Panel className="panel--pad"><EmptyState icon={<Award size={26} />} title="Chưa có huy hiệu đã mở" text="Hoàn thành bài chính thức và chờ giáo viên chấm để bắt đầu bộ sưu tập." action={<button type="button" className="btn btn--outline" onClick={() => setFilter("all")}>Xem điều kiện</button>} /></Panel> : visible.length === 0 ? <Panel className="panel--pad"><EmptyState title="Không có huy hiệu khớp bộ lọc" action={<button type="button" className="btn btn--outline" onClick={() => setFilter("all")}>Xóa bộ lọc</button>} /></Panel> : <section className={styles.grid} aria-label="Danh sách huy hiệu">
        {visible.map((badge) => { const progress = Math.min(100, (badge.current / badge.target) * 100); return <button type="button" key={badge.id} className={`${styles.card} ${badge.earned ? styles.earned : ""}`} onClick={() => setOpen(badge)}>
          <span className={styles.glyph} aria-hidden="true">{badge.earned ? <Check size={24} /> : <Lock size={22} />}</span><span className={styles.cardHead}><strong>{badge.title}</strong><small>{badge.earned ? "Đã mở" : "Còn khóa"}</small></span><span className={styles.description}>{badge.description}</span><Bar value={progress} size="sm" tone={badge.earned ? "success" : "gold"} label={`${badge.title}: ${badge.current}/${badge.target}`} /><span className={styles.count}>{badge.current}/{badge.target}</span>{badge.earnedAt ? <span className={styles.date}>Mở ngày {dateLabel(badge.earnedAt)}</span> : null}
        </button>; })}
      </section>}
    </>}
    <Drawer open={Boolean(open)} onClose={() => setOpen(null)} title={open?.title ?? "Chi tiết huy hiệu"} subtitle={open?.earned ? "Đã mở" : "Còn khóa"} eyebrow="Huy hiệu bài chính thức"><div className={styles.drawerBody}><p>{open?.description}</p><p><strong>Tiến độ:</strong> {open?.current}/{open?.target}</p>{open?.earnedAt ? <p><strong>Thời điểm đạt:</strong> {dateLabel(open.earnedAt)}</p> : <p>Huy hiệu sẽ tự mở khi kết quả chấm đáp ứng điều kiện.</p>}</div></Drawer>
  </>;
}
