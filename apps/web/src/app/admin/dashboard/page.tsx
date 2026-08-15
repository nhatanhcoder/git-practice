"use client";

import {
  Activity,
  Bell,
  BookOpen,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Inbox,
  LayoutDashboard,
  Menu,
  Receipt,
  ShieldCheck,
  Users,
  Wallet,
  WalletCards,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  abbreviateVnd,
  emptyDashboardData,
  formatVnd,
  initialsOf,
  initialDashboardData,
  SERIES_PAYROLL,
  SERIES_REVENUE,
  type ChartPoint,
  type ReviewState,
} from "../../../lib/dashboard-data";
import styles from "./dashboard.module.css";

const CHART_W = 900;
const CHART_H = 300;
const PAD_L = 56;
const PAD_R = 96;
const PAD_T = 16;
const PAD_B = 34;

export default function AdminDashboardPage() {
  const router = useRouter();
  const [reviewState, setReviewState] = useState<ReviewState>("ready");
  const [mobileNav, setMobileNav] = useState(false);
  const [chartView, setChartView] = useState<"chart" | "table">("chart");
  const [activeMonth, setActiveMonth] = useState<number | null>(null);
  const [chartState, setChartState] = useState<"ok" | "error">("ok");

  type Delta = { pct: number; kind: "down" | "up" };
  const revenueDelta: Delta = useMemo(
    () => ({ pct: initialDashboardData.kpi.revenueDeltaPct, kind: initialDashboardData.kpi.revenueDeltaPct < 0 ? "down" : "up" }),
    [],
  );
  const payrollDelta: Delta = useMemo(
    () => ({ pct: initialDashboardData.kpi.payrollDeltaPct, kind: initialDashboardData.kpi.payrollDeltaPct < 0 ? "down" : "up" }),
    [],
  );

  // empty state: zero pending counts, empty queues; chart still renders
  const displayData = useMemo(() => {
    if (reviewState === "empty") {
      return emptyDashboardData(initialDashboardData);
    }
    return initialDashboardData;
  }, [reviewState]);
  const kpiLoading = reviewState === "loading";

  return (
    <div className={styles.appShell}>
      <aside className={`${styles.sidebar} ${mobileNav ? styles.sidebarOpen : ""}`}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>学</span>
          <span>HSK Platform</span>
          <button className={styles.closeNav} onClick={() => setMobileNav(false)} aria-label="Đóng menu">
            <X size={20} />
          </button>
        </div>
        <nav className={styles.nav} aria-label="Điều hướng quản trị">
          <a className={styles.navActive} href="#">
            <LayoutDashboard size={20} />Tổng quan
          </a>
          <a href="/admin/users">
            <Users size={20} />Tài khoản
          </a>
          <a href="#">
            <CircleDollarSign size={20} />Học phí
          </a>
          <a href="#">
            <WalletCards size={20} />Lương
          </a>
          <a href="#">
            <ShieldCheck size={20} />Giám sát
          </a>
        </nav>
        <div className={styles.sidebarFooter}>
          <BookOpen size={18} />
          <div>
            <strong>HSK 1–9</strong>
            <span>Nền tảng học tập</span>
          </div>
        </div>
      </aside>
      {mobileNav && <button className={styles.navBackdrop} onClick={() => setMobileNav(false)} aria-label="Đóng menu" />}

      <div className={styles.mainColumn}>
        <header className={styles.topbar}>
          <div className={styles.breadcrumb}>
            <button className={styles.menuButton} onClick={() => setMobileNav(true)} aria-label="Mở menu">
              <Menu size={20} />
            </button>
            <span>Quản trị</span>
            <ChevronRight size={15} />
            <strong>Tổng quan</strong>
          </div>
          <div className={styles.headerActions}>
            <button className={styles.iconButton} aria-label="Thông báo">
              <Bell size={19} />
              <span className={styles.notificationDot} />
            </button>
            <div className={styles.headerDivider} />
            <button className={styles.profileButton}>
              <span className={`${styles.avatar} ${styles.slate}`}>AT</span>
              <span>
                <strong>Anh Tuấn</strong>
                <small>Quản trị viên</small>
              </span>
              <ChevronDown size={16} />
            </button>
          </div>
        </header>

        <main className={styles.content}>
          <div className={styles.titleRow}>
            <div>
              <p className={styles.eyebrow}>QUẢN TRỊ HỆ THỐNG</p>
              <h1>Tổng quan</h1>
              <p className={styles.subtitle}>Cập nhật lúc 09:31, 11/08/2026</p>
            </div>
          </div>

          <section className={styles.kpiRow} aria-label="Chỉ số tổng quan">
            {kpiLoading ? (
              <>
                <div className={`${styles.kpiTile} ${styles.skeletonTile}`} />
                <div className={`${styles.kpiTile} ${styles.skeletonTile}`} />
                <div className={`${styles.kpiTile} ${styles.skeletonTile}`} />
                <div className={`${styles.kpiTile} ${styles.skeletonTile}`} />
              </>
            ) : (
              <>
                <a className={styles.kpiTile} href="/admin/users?status=pending">
                  <div className={styles.kpiIcon}>
                    <Users size={24} />
                  </div>
                  <span className={styles.kpiLabel}>Chờ duyệt</span>
                  <strong className={styles.kpiValue}>{displayData.kpi.pendingUsers}</strong>
                </a>
                <a className={styles.kpiTile} href="/admin/payroll/sessions">
                  <div className={styles.kpiIcon}>
                    <Activity size={24} />
                  </div>
                  <span className={styles.kpiLabel}>Buổi chờ duyệt</span>
                  <strong className={styles.kpiValue}>{displayData.kpi.pendingSessions}</strong>
                </a>
                <a className={styles.kpiTile} href="/admin/invoices">
                  <div className={styles.kpiIcon}>
                    <Receipt size={24} />
                  </div>
                  <span className={styles.kpiLabel}>Thu tháng này</span>
                  <strong className={styles.kpiValue}>{formatVnd(displayData.kpi.revenueThisMonth)}</strong>
                  <span className={`${styles.kpiDelta} ${revenueDelta.kind === "up" ? styles.deltaUp : styles.deltaDown}`}>
                    <DeltaIcon kind={revenueDelta.kind} />
                    {Math.abs(revenueDelta.pct).toLocaleString("vi-VN")}% · so với tháng trước
                  </span>
                </a>
                <a className={styles.kpiTile} href="/admin/payroll">
                  <div className={styles.kpiIcon}>
                    <Wallet size={24} />
                  </div>
                  <span className={styles.kpiLabel}>Chi lương tháng này</span>
                  <strong className={styles.kpiValue}>{formatVnd(displayData.kpi.payrollThisMonth)}</strong>
                  <span className={`${styles.kpiDelta} ${payrollDelta.kind === "up" ? styles.deltaUp : styles.deltaDown}`}>
                    <DeltaIcon kind={payrollDelta.kind} />
                    {Math.abs(payrollDelta.pct).toLocaleString("vi-VN")}% · so với tháng trước
                  </span>
                </a>
              </>
            )}
          </section>

          <section className={styles.queueRow} aria-label="Việc cần xử lý">
            <QueueCard
              title="Tài khoản chờ duyệt"
              count={displayData.pendingUsers.length}
              allHref="/admin/users?status=pending"
              loading={kpiLoading}
              empty={reviewState === "empty" || displayData.pendingUsers.length === 0}
            >
              {displayData.pendingUsers.map((u) => (
                <button
                  key={u.email}
                  className={styles.queueRowItem}
                  onClick={() => router.push("/admin/users?status=pending")}
                >
                  <span className={`${styles.queueAvatar} ${styles.avatarBlue}`}>{initialsOf(u.nickname)}</span>
                  <span className={styles.queueMain}>
                    <strong>{u.nickname}</strong>
                    <small>{u.email}</small>
                  </span>
                  <time className={styles.queueMeta}>{u.since}</time>
                </button>
              ))}
            </QueueCard>

            <QueueCard
              title="Buổi học chờ duyệt"
              count={displayData.pendingSessions.length}
              allHref="/admin/payroll/sessions"
              loading={kpiLoading}
              empty={reviewState === "empty" || displayData.pendingSessions.length === 0}
            >
              {displayData.pendingSessions.map((s, i) => (
                <button key={`${s.teacher}-${s.date}-${i}`} className={styles.queueRowItem} onClick={() => router.push("/admin/payroll/sessions")}>
                  <span className={styles.queueMain}>
                    <strong>{s.teacher}</strong>
                    <small>{s.klass}</small>
                  </span>
                  <time className={styles.queueMeta}>{s.date}</time>
                </button>
              ))}
            </QueueCard>
          </section>

          <section className={styles.chartCard} aria-label="Thu & chi 6 tháng gần nhất">
            <div className={styles.chartHeader}>
              <h2>Thu & chi 6 tháng gần nhất</h2>
              <button
                className={styles.toggleButton}
                onClick={() => setChartView(chartView === "chart" ? "table" : "chart")}
              >
                {chartView === "chart" ? "Xem dạng bảng" : "Xem biểu đồ"}
              </button>
            </div>

            {reviewState === "loading" || reviewState === "partial" ? (
              <div className={styles.chartSkeleton} aria-hidden="true" />
            ) : chartState === "error" ? (
              <div className={styles.chartError}>
                <Activity size={22} />
                <span>Không tải được biểu đồ.</span>
                <button onClick={() => setChartState("ok")}>Thử lại</button>
              </div>
            ) : chartView === "chart" ? (
              <RevenueChart
                data={displayData.chart}
                activeMonth={activeMonth}
                onHover={setActiveMonth}
                onLeave={() => setActiveMonth(null)}
              />
            ) : (
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Tháng</th>
                    <th className={styles.numeric}>Thu học phí</th>
                    <th className={styles.numeric}>Chi lương</th>
                  </tr>
                </thead>
                <tbody>
                  {displayData.chart.map((p) => (
                    <tr key={p.month}>
                      <td>
                        {p.month}
                        {p.partial && <span className={styles.partialNote}>T8 chưa hết tháng</span>}
                      </td>
                      <td className={styles.numeric}>{formatVnd(p.revenue)}</td>
                      <td className={styles.numeric}>{formatVnd(p.payroll)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </main>
      </div>

      <div className={styles.stateSwitcher}>
        <span>REVIEW STATE</span>
        {(["ready", "loading", "empty", "partial", "error", "mobile"] as const).map((state) => (
          <button
            key={state}
            className={reviewState === state ? styles.stateActive : ""}
            onClick={() => {
              if (state === "mobile") return; // mobile is a viewport label, not a review state
              setReviewState(state);
            }}
            disabled={state === "mobile"}
            aria-pressed={reviewState === state}
          >
            {state}
          </button>
        ))}
      </div>
    </div>
  );
}

function DeltaIcon({ kind }: { kind: "up" | "down" }) {
  return kind === "up" ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 7h10v10" />
      <path d="M17 7 7 17" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 17h10V7" />
      <path d="M17 17 7 7" />
    </svg>
  );
}

function QueueCard({
  title,
  count,
  allHref,
  loading,
  empty,
  children,
}: {
  title: string;
  count: number;
  allHref: string;
  loading: boolean;
  empty: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.queueCard}>
      <div className={styles.queueHeader}>
        <h3>
          {title}
          {!loading && !empty && <span className={styles.countPill}>{count}</span>}
        </h3>
        {!empty && (
          <a className={styles.queueAll} href={allHref}>
            Xem tất cả <ChevronRight size={15} />
          </a>
        )}
      </div>
      {loading ? (
        <div className={styles.queueRows}>
          {[0, 1, 2, 3, 4].map((i) => (
            <div className={styles.queueSkeleton} key={i}>
              <span />
              <span />
            </div>
          ))}
        </div>
      ) : empty ? (
        <div className={styles.queueEmpty}>
          <Inbox size={30} style={{ opacity: 0.15 }} />
          <span>Không có việc cần xử lý</span>
        </div>
      ) : (
        <div className={styles.queueRows}>{children}</div>
      )}
    </div>
  );
}

function RevenueChart({
  data,
  activeMonth,
  onHover,
  onLeave,
}: {
  data: ChartPoint[];
  activeMonth: number | null;
  onHover: (index: number) => void;
  onLeave: () => void;
}) {
  const maxVal = Math.max(...data.map((d) => Math.max(d.revenue, d.payroll)));
  const padMax = maxVal * 1.15;

  const xFor = (i: number) => PAD_L + (i * (CHART_W - PAD_L - PAD_R)) / (data.length - 1);
  const yFor = (v: number) => PAD_T + (1 - v / padMax) * (CHART_H - PAD_T - PAD_B);

  const lastIdx = data.length - 1;
  const isPartial = data[lastIdx].partial === true;

  // Solid path over full months (exclude the partial last month when partial).
  const solidIndices = isPartial ? data.slice(0, lastIdx).map((_, i) => i) : data.map((_, i) => i);
  const revenueSolid = buildPath(solidIndices.map((i) => [xFor(i), yFor(data[i].revenue)] as const));
  const payrollSolid = buildPath(solidIndices.map((i) => [xFor(i), yFor(data[i].payroll)] as const));
  const revenueDash = isPartial
    ? buildPath([[xFor(lastIdx - 1), yFor(data[lastIdx - 1].revenue)], [xFor(lastIdx), yFor(data[lastIdx].revenue)]])
    : null;
  const payrollDash = isPartial
    ? buildPath([[xFor(lastIdx - 1), yFor(data[lastIdx - 1].payroll)], [xFor(lastIdx), yFor(data[lastIdx].payroll)]])
    : null;

  // y ticks: 4-5 ticks abbreviated
  const ticks = [0, 0.33, 0.66, 1].map((t) => {
    const v = t * padMax;
    return { v, y: yFor(v), label: abbreviateVnd(v) };
  });

  return (
    <div className={styles.chartBody}>
      <div className={styles.legend} aria-hidden="true">
        <span><i className={styles.legendSwatch} style={{ background: SERIES_REVENUE }} />Thu học phí</span>
        <span><i className={styles.legendSwatch} style={{ background: SERIES_PAYROLL }} />Chi lương</span>
      </div>

      <svg
        className={styles.chartSvg}
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        role="img"
        aria-label="Biểu đồ thu học phí và chi lương 6 tháng gần nhất"
        onMouseMove={(e) => {
          const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const localX = ((e.clientX - rect.left) / rect.width) * CHART_W;
          const closest = Math.round(((localX - PAD_L) / (CHART_W - PAD_L - PAD_R)) * (data.length - 1));
          if (closest >= 0 && closest <= data.length - 1) onHover(closest);
        }}
        onMouseLeave={onLeave}
        onBlur={onLeave}
      >
        {ticks.map((t) => (
          <g key={t.label}>
            <line className={styles.gridline} x1={PAD_L} y1={t.y} x2={CHART_W - PAD_R} y2={t.y} />
            <text className={styles.axisText} x={PAD_L - 10} y={t.y + 4} textAnchor="end">
              {t.label}
            </text>
          </g>
        ))}

        {data.map((d, i) => (
          <text key={d.month} className={styles.axisText} x={xFor(i)} y={CHART_H - 8} textAnchor="middle">
            {d.month}
          </text>
        ))}

        {/* revenue series */}
        <path d={revenueSolid} fill="none" stroke={SERIES_REVENUE} strokeWidth="2" />
        {revenueDash && <path d={revenueDash} fill="none" stroke={SERIES_REVENUE} strokeWidth="2" strokeDasharray="4 4" />}
        {data.map((d, i) =>
          i === lastIdx && isPartial ? null : (
            <circle key={`r-${i}`} cx={xFor(i)} cy={yFor(d.revenue)} r="3" fill={SERIES_REVENUE} />
          ),
        )}
        {isPartial && <circle cx={xFor(lastIdx)} cy={yFor(data[lastIdx].revenue)} r="3" fill={SERIES_REVENUE} />}

        {/* payroll series */}
        <path d={payrollSolid} fill="none" stroke={SERIES_PAYROLL} strokeWidth="2" />
        {payrollDash && <path d={payrollDash} fill="none" stroke={SERIES_PAYROLL} strokeWidth="2" strokeDasharray="4 4" />}
        {data.map((d, i) =>
          i === lastIdx && isPartial ? null : (
            <circle key={`p-${i}`} cx={xFor(i)} cy={yFor(d.payroll)} r="3" fill={SERIES_PAYROLL} />
          ),
        )}
        {isPartial && <circle cx={xFor(lastIdx)} cy={yFor(data[lastIdx].payroll)} r="3" fill={SERIES_PAYROLL} />}

        {/* crosshair */}
        {activeMonth !== null && (
          <line className={styles.crosshair} x1={xFor(activeMonth)} y1={PAD_T} x2={xFor(activeMonth)} y2={CHART_H - PAD_B} />
        )}

        {/* direct labels at final point, text ink, offset to avoid overlap */}
        <text className={styles.finalLabel} x={xFor(lastIdx) + 10} y={yFor(data[lastIdx].revenue) + 4}>
          {formatVnd(data[lastIdx].revenue)}
        </text>
        <text className={styles.finalLabel} x={xFor(lastIdx) + 10} y={yFor(data[lastIdx].payroll) + 4 + 18}>
          {formatVnd(data[lastIdx].payroll)}
        </text>
      </svg>

      {activeMonth !== null && (
        <div
          className={styles.tooltip}
          style={{ left: `${(xFor(activeMonth) / CHART_W) * 100}%` }}
          role="status"
        >
          <strong>{data[activeMonth].month}</strong>
          <span>Thu học phí: {formatVnd(data[activeMonth].revenue)}</span>
          <span>Chi lương: {formatVnd(data[activeMonth].payroll)}</span>
        </div>
      )}

      {isPartial && <p className={styles.chartNote}>T8 chưa hết tháng</p>}
    </div>
  );
}

function buildPath(points: readonly (readonly [number, number])[]): string {
  let d = `M ${points[0][0].toFixed(1)},${points[0][1].toFixed(1)}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i][0].toFixed(1)},${points[i][1].toFixed(1)}`;
  }
  return d;
}
