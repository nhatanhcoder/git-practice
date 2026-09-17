"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BarChart3, BookOpenCheck } from "lucide-react";
import { Bar, EmptyState, ErrorState, Metric, PageHead, Panel, SectionHeader, SkeletonPanel } from "@/components/student/primitives";
import { ApiError } from "@/lib/api-client";
import { fetchStudentProgress, fetchStudentProgressChart, type ProgressChart, type ProgressOverview, type ProgressSkill } from "@/lib/student/progress-service";
import styles from "./progress.module.css";

const skillLabels: Record<ProgressSkill, string> = { listening: "Nghe", reading: "Đọc", writing: "Viết" };
const skills = Object.keys(skillLabels) as ProgressSkill[];
const percent = (value: number | null) => value === null ? "—" : `${Math.round(value * 100)}%`;
const dateLabel = (value: string) => new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", timeZone: "UTC" }).format(new Date(value));

export default function ProgressPage() {
  const [overview, setOverview] = useState<ProgressOverview | null>(null);
  const [chart, setChart] = useState<ProgressChart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [showTable, setShowTable] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [nextOverview, nextChart] = await Promise.all([fetchStudentProgress(), fetchStudentProgressChart()]);
      setOverview(nextOverview); setChart(nextChart);
    } catch (reason) {
      setOverview(null); setChart(null); setError(reason);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);
  const chartMax = useMemo(() => Math.max(1, ...(chart?.points.map((point) => point.avgScore ?? 0) ?? [])), [chart]);

  return <>
    <PageHead eyebrow="Học tập" title="Tiến độ học tập" sub="Số liệu từ các bài đã được chấm của chính bạn. Tuần được tính từ thứ Hai theo giờ UTC." />
    {loading ? <SkeletonPanel rows={5} height={220} /> : error ? (
      <Panel className="panel--pad"><ErrorState
        title={error instanceof ApiError && error.isForbidden ? "Bạn không có quyền xem trang này" : "Không tải được tiến độ"}
        text="Dữ liệu cũ không được dùng thay thế. Hãy kiểm tra kết nối rồi thử lại."
        onRetry={() => void load()}
      /></Panel>
    ) : !overview || overview.totals.gradedAttempts === 0 ? (
      <Panel className="panel--pad"><EmptyState icon={<BookOpenCheck size={26} />} title="Chưa có bài đã chấm" text="Kết quả sẽ xuất hiện sau khi giáo viên chấm ít nhất một bài của bạn." /></Panel>
    ) : <>
      <Panel className="panel--pad"><div className={styles.metrics}>
        <Metric label="Bài đã chấm" value={overview.totals.gradedAttempts} />
        <Metric label="Điểm trung bình" value={overview.totals.avgScore === null ? "—" : overview.totals.avgScore.toFixed(1)} />
        <Metric label="Kỹ năng có dữ liệu" value={skills.filter((skill) => overview.skillBreakdown[skill] !== null).length} unit="/ 3" />
      </div></Panel>

      <Panel className="panel--pad"><SectionHeader title="Độ chính xác theo kỹ năng" sub="Tám tuần trọn vẹn gần nhất · dấu — nghĩa là chưa có dữ liệu" />
        <div className={styles.tableScroll}><table className={styles.heatmap}>
          <thead><tr><th scope="col">Tuần bắt đầu</th>{skills.map((skill) => <th scope="col" key={skill}>{skillLabels[skill]}</th>)}</tr></thead>
          <tbody>{overview.heatmap.map((week) => <tr key={week.weekStart}><th scope="row">{dateLabel(week.weekStart)}</th>{skills.map((skill) => <td key={skill} data-level={week[skill] === null ? "none" : Math.ceil(week[skill]! * 4)}>{percent(week[skill])}</td>)}</tr>)}</tbody>
        </table></div>
      </Panel>

      <div className={styles.twoColumns}>
        <Panel className="panel--pad"><SectionHeader title="Tổng hợp kỹ năng" sub="Tỉ lệ đúng trong cùng cửa sổ tám tuần" /><div className={styles.skills}>
          {skills.map((skill) => <div className={styles.skill} key={skill}><div><strong>{skillLabels[skill]}</strong><span>{percent(overview.skillBreakdown[skill])}</span></div><Bar value={(overview.skillBreakdown[skill] ?? 0) * 100} label={`${skillLabels[skill]} ${percent(overview.skillBreakdown[skill])}`} tone={overview.skillBreakdown[skill] === null ? "gold" : "accent"} /></div>)}
        </div></Panel>
        <Panel className="panel--pad"><SectionHeader title="Điểm trung bình theo tuần" sub="Mười hai tuần trọn vẹn gần nhất" action={<button className="btn btn--outline" type="button" onClick={() => setShowTable((value) => !value)}>{showTable ? "Xem biểu đồ" : "Xem bảng"}</button>} />
          {showTable ? <div className={styles.tableScroll}><table className={styles.scoreTable}><thead><tr><th>Tuần</th><th>Điểm TB</th><th>Số bài</th></tr></thead><tbody>{chart?.points.map((point) => <tr key={point.weekStart}><td>{dateLabel(point.weekStart)}</td><td>{point.avgScore?.toFixed(1) ?? "—"}</td><td>{point.count}</td></tr>)}</tbody></table></div> :
            <div className={styles.chart} role="img" aria-label="Biểu đồ điểm trung bình theo tuần">{chart?.points.map((point) => <div className={styles.chartColumn} key={point.weekStart}><span className={styles.chartValue}>{point.avgScore?.toFixed(1) ?? "—"}</span><div className={styles.chartTrack}><span style={{ height: `${point.avgScore === null ? 0 : Math.max(4, (point.avgScore / chartMax) * 100)}%` }} /></div><span>{dateLabel(point.weekStart)}</span></div>)}</div>}
          {!chart?.points.some((point) => point.count > 0) ? <p className={styles.noChart}><BarChart3 size={16} /> Chưa có bài đã chấm trong 12 tuần trọn vẹn gần nhất.</p> : null}
        </Panel>
      </div>
    </>}
  </>;
}
