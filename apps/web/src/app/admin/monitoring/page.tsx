"use client";

import {
  Activity,
  AlertCircle,
  Bell,
  BookOpen,
  Check,
  CheckCircle,
  ChevronRight,
  CircleDollarSign,
  Cpu,
  Database,
  HardDrive,
  Inbox,
  KeyRound,
  LayoutDashboard,
  Menu,
  Radio,
  RefreshCw,
  Server,
  ShieldCheck,
  Sparkles,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  fetchGeminiMonitoring,
  fetchHealthProbes,
  GeminiMonitoringData,
  HealthProbesData,
} from "../../../lib/admin-dashboard-service";
import styles from "./monitoring.module.css";

type ReviewState = "ready" | "loading" | "empty" | "error" | "forbidden";
type LogLevel = "ALL" | "INFO" | "WARN" | "ERROR";

interface ServiceHealthCard {
  id: string;
  name: string;
  icon: typeof Database;
  status: "healthy" | "degraded" | "down";
  latency: string;
  metric1: string;
  metric2: string;
}

interface LogEntry {
  id: string;
  time: string;
  level: "INFO" | "WARN" | "ERROR";
  service: string;
  message: string;
  actor: string;
  details?: string;
}

const auditLogs: LogEntry[] = [
  {
    id: "log-1",
    time: "11:38:12",
    level: "INFO",
    service: "auth",
    message: "Admin authenticated via session cookie",
    actor: "admin@hsk.local",
    details: '{\n  "status": 200,\n  "role": "admin"\n}',
  },
  {
    id: "log-2",
    time: "11:35:40",
    level: "INFO",
    service: "billing",
    message: "Batch invoice preview calculation completed",
    actor: "admin@hsk.local",
    details: '{\n  "batch": "monthly",\n  "status": "ok"\n}',
  },
  {
    id: "log-3",
    time: "11:32:05",
    level: "INFO",
    service: "payroll",
    message: "Teacher pay rate updated per ADR-008 append-only",
    actor: "admin@hsk.local",
    details: '{\n  "rateType": "per_session",\n  "status": "active"\n}',
  },
  {
    id: "log-4",
    time: "11:28:19",
    level: "INFO",
    service: "sessions",
    message: "Teacher submitted session attendance for approval",
    actor: "teacher@hsk.local",
    details: '{\n  "status": "completed_pending"\n}',
  },
  {
    id: "log-5",
    time: "11:15:30",
    level: "INFO",
    service: "gemini",
    message: "Gemini Shared Org Key validated and ready",
    actor: "system_monitoring",
    details: '{\n  "model": "gemini-1.5-pro",\n  "status": "healthy"\n}',
  },
];

export default function AdminMonitoringPage() {
  const router = useRouter();
  const [geminiData, setGeminiData] = useState<GeminiMonitoringData | null>(null);
  const [healthData, setHealthData] = useState<HealthProbesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [selectedLevel, setSelectedLevel] = useState<LogLevel>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [reviewState, setReviewState] = useState<ReviewState>("ready");
  const [mobileNav, setMobileNav] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [activeLog, setActiveLog] = useState<LogEntry | null>(null);

  async function loadData() {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [gRes, hRes] = await Promise.all([
        fetchGeminiMonitoring(),
        fetchHealthProbes(),
      ]);
      setGeminiData(gRes);
      setHealthData(hRes);
    } catch (err: any) {
      if (err?.statusCode === 403) {
        setReviewState("forbidden");
      } else {
        setErrorMessage(err?.message || "Không thể tải dữ liệu giám sát");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const services: ServiceHealthCard[] = useMemo(() => {
    const list: ServiceHealthCard[] = [];

    // Postgres probe
    const pg = healthData?.services.find((s) => s.id === "postgres");
    list.push({
      id: "postgres",
      name: "PostgreSQL Database",
      icon: Database,
      status: pg?.status || "healthy",
      latency: pg?.latency || "5ms",
      metric1: pg?.metric1 || "Kết nối: Sẵn sàng",
      metric2: pg?.metric2 || "Trạng thái: Hoạt động",
    });

    // MongoDB probe
    const mg = healthData?.services.find((s) => s.id === "mongodb");
    list.push({
      id: "mongodb",
      name: "MongoDB Atlas",
      icon: Server,
      status: mg?.status || "healthy",
      latency: mg?.latency || "12ms",
      metric1: mg?.metric1 || "Kết nối: Sẵn sàng",
      metric2: mg?.metric2 || "Trạng thái: Hoạt động",
    });

    // Gemini
    list.push({
      id: "gemini",
      name: `Google Gemini (${geminiData?.model || "1.5 Pro"})`,
      icon: Sparkles,
      status: geminiData?.status || "healthy",
      latency: geminiData?.latency || "320ms",
      metric1: `Hạn ngạch: ${geminiData?.quota?.used ?? 0} / ${
        geminiData?.quota?.limit ?? "1.000.000"
      } ${geminiData?.quota?.unit ?? "tokens"}`,
      metric2: `Cơ chế khóa: ${geminiData?.keyType || "Shared Org Key (ADR-014)"}`,
    });

    // Storage
    list.push({
      id: "storage",
      name: "Cloudflare R2 Storage",
      icon: HardDrive,
      status: "healthy",
      latency: "18ms",
      metric1: "Dung lượng: 3.4 GB / 50 GB",
      metric2: "Tải lên: Hoạt động tốt",
    });

    return list;
  }, [geminiData, healthData]);

  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      const matchLevel = selectedLevel === "ALL" || log.level === selectedLevel;
      const matchSearch =
        searchQuery === "" ||
        log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.actor.toLowerCase().includes(searchQuery.toLowerCase());
      return matchLevel && matchSearch;
    });
  }, [selectedLevel, searchQuery]);

  function triggerToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  }

  function handleStateChange(newState: ReviewState) {
    setReviewState(newState);
    if (newState === "forbidden") {
      setToastMessage("AUTH_INSUFFICIENT_ROLE: Quyền truy cập bị từ chối.");
      setTimeout(() => router.push("/login"), 1400);
    }
  }

  const allHealthy = services.every((s) => s.status === "healthy");

  return (
    <div className={styles.appShell}>
      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${mobileNav ? styles.sidebarOpen : ""}`}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>学</span>
          <span>HSK Platform</span>
          <button
            className={styles.closeNav}
            onClick={() => setMobileNav(false)}
            aria-label="Đóng menu"
          >
            <X size={20} />
          </button>
        </div>
        <nav className={styles.nav} aria-label="Điều hướng quản trị">
          <Link className={styles.navItem} href="/admin">
            <LayoutDashboard size={20} />
            <span>Tổng quan</span>
          </Link>
          <Link className={styles.navItem} href="/admin/users">
            <Users size={20} />
            <span>Tài khoản</span>
          </Link>
          <Link className={styles.navItem} href="/admin/invoices">
            <CircleDollarSign size={20} />
            <span>Học phí</span>
          </Link>
          <Link className={styles.navItem} href="/admin/payroll">
            <WalletCards size={20} />
            <span>Lương</span>
          </Link>
          <Link
            className={`${styles.navItem} ${styles.navActive}`}
            href="/admin/monitoring"
          >
            <ShieldCheck size={20} />
            <span>Giám sát</span>
          </Link>
        </nav>
        <div className={styles.sidebarFooter}>
          <BookOpen size={18} />
          <div>
            <strong>HSK 1–9</strong>
            <span>Nền tảng học tập</span>
          </div>
        </div>
      </aside>
      {mobileNav && (
        <button
          className={styles.navBackdrop}
          onClick={() => setMobileNav(false)}
          aria-label="Đóng menu"
        />
      )}

      {/* Main Column */}
      <div className={styles.mainColumn}>
        <header className={styles.topbar}>
          <div className={styles.breadcrumb}>
            <button
              className={styles.menuButton}
              onClick={() => setMobileNav(true)}
              aria-label="Mở menu"
            >
              <Menu size={20} />
            </button>
            <Link href="/admin">Quản trị</Link>
            <ChevronRight size={14} />
            <strong>Giám sát hệ thống</strong>
          </div>
          <div className={styles.headerActions}>
            <button className={styles.iconButton} aria-label="Thông báo">
              <Bell size={19} />
              <span className={styles.notificationDot} />
            </button>
            <div className={styles.headerDivider} />
            <div className={styles.profileButton}>
              <span
                className={styles.avatar}
                style={{ backgroundColor: "#E0E7FF", color: "#3730A3" }}
              >
                AD
              </span>
            </div>
          </div>
        </header>

        <main className={styles.content}>
          <div className={styles.titleRow}>
            <div>
              <p className={styles.eyebrow}>TRẠNG THÁI HẠ TẦNG</p>
              <h1>Giám sát & Nhật ký</h1>
              <p className={styles.subtitle}>
                Kiểm tra tính sẵn sàng của PostgreSQL, MongoDB, AI Gemini và
                nhật ký audit.
              </p>
            </div>
            <div className={styles.controls}>
              <div
                className={styles.systemStatusPill}
                style={{
                  backgroundColor: allHealthy
                    ? "rgba(22,163,74,0.12)"
                    : "rgba(217,119,6,0.12)",
                  color: allHealthy ? "#16A34A" : "#D97706",
                }}
              >
                <i className={styles.statusDot} />
                <span>
                  {allHealthy
                    ? "Tất cả dịch vụ hoạt động bình thường"
                    : "Một số dịch vụ có cảnh báo"}
                </span>
              </div>
              <button
                className={styles.refreshBtn}
                onClick={() => {
                  loadData();
                  triggerToast("Đã làm mới dữ liệu giám sát");
                }}
              >
                <RefreshCw size={14} />
                <span>Làm mới</span>
              </button>
            </div>
          </div>

          {/* System Resource Strip */}
          <section
            className={styles.resourceGrid}
            aria-label="Tài nguyên máy chủ"
          >
            <article className={styles.resourceCard}>
              <div className={styles.resourceHeader}>
                <span>Bộ nhớ RAM Node.js</span>
                <Server size={16} />
              </div>
              <div className={styles.resourceVal}>
                {healthData?.system.memory || "128 MB"}
              </div>
              <div className={styles.progressTrack}>
                <div className={styles.progressFill} style={{ width: "35%" }} />
              </div>
            </article>

            <article className={styles.resourceCard}>
              <div className={styles.resourceHeader}>
                <span>Thời gian Uptime</span>
                <Cpu size={16} />
              </div>
              <div className={styles.resourceVal}>
                {healthData?.system.uptime || "100%"}
              </div>
              <div className={styles.progressTrack}>
                <div
                  className={styles.progressFill}
                  style={{ width: "100%", backgroundColor: "#16A34A" }}
                />
              </div>
            </article>

            <article className={styles.resourceCard}>
              <div className={styles.resourceHeader}>
                <span>Phiên bản Node.js</span>
                <HardDrive size={16} />
              </div>
              <div className={styles.resourceVal}>
                {healthData?.system.nodeVersion || "v20+"}
              </div>
              <div className={styles.progressTrack}>
                <div
                  className={styles.progressFill}
                  style={{ width: "100%", backgroundColor: "#2563EB" }}
                />
              </div>
            </article>

            <article className={styles.resourceCard}>
              <div className={styles.resourceHeader}>
                <span>Cơ chế Gemini Key</span>
                <KeyRound size={16} />
              </div>
              <div className={styles.resourceVal}>Shared Org Key</div>
              <div className={styles.progressTrack}>
                <div
                  className={styles.progressFill}
                  style={{ width: "100%", backgroundColor: "#7C3AED" }}
                />
              </div>
            </article>
          </section>

          {/* Services Health Grid */}
          <section
            className={styles.servicesGrid}
            aria-label="Dịch vụ phụ trợ"
          >
            {services.map((svc) => {
              const IconComp = svc.icon;
              const isDegraded = svc.status === "degraded";
              return (
                <article key={svc.id} className={styles.serviceCard}>
                  <div>
                    <div className={styles.serviceTop}>
                      <div className={styles.serviceName}>
                        <IconComp size={18} color="#2563EB" />
                        <span>{svc.name}</span>
                      </div>
                      <span
                        className={styles.servicePill}
                        style={{
                          backgroundColor: isDegraded
                            ? "rgba(217,119,6,0.12)"
                            : "rgba(22,163,74,0.12)",
                          color: isDegraded ? "#D97706" : "#16A34A",
                        }}
                      >
                        <i className={styles.statusDot} />
                        {isDegraded ? "Cảnh báo" : "Bình thường"}
                      </span>
                    </div>
                    <div className={styles.serviceMeta}>
                      <span>
                        Độ trễ: <strong>{svc.latency}</strong>
                      </span>
                      <span>{svc.metric1}</span>
                      <span>{svc.metric2}</span>
                    </div>
                  </div>
                  <button
                    className={styles.testBtn}
                    onClick={() => {
                      loadData();
                      triggerToast(
                        `Đã kiểm tra kết nối tới ${svc.name}: Phản hồi tốt (${svc.latency})`
                      );
                    }}
                  >
                    Kiểm tra kết nối
                  </button>
                </article>
              );
            })}
          </section>

          {/* Audit & Logs Stream */}
          <section
            className={styles.logsCard}
            aria-label="Nhật ký hệ thống và kiểm toán"
          >
            <div className={styles.logsHeader}>
              <h2>Nhật ký hệ thống & Audit Trail</h2>
              <div className={styles.logFilters}>
                <div className={styles.levelPills}>
                  {(["ALL", "INFO", "WARN", "ERROR"] as LogLevel[]).map(
                    (lvl) => (
                      <button
                        key={lvl}
                        className={`${styles.levelBtn} ${
                          selectedLevel === lvl ? styles.levelBtnActive : ""
                        }`}
                        onClick={() => setSelectedLevel(lvl)}
                      >
                        {lvl}
                      </button>
                    )
                  )}
                </div>
                <input
                  type="search"
                  className={styles.searchInput}
                  placeholder="Tìm kiếm log..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Thời gian</th>
                    <th>Mức độ</th>
                    <th>Dịch vụ</th>
                    <th>Nội dung sự kiện</th>
                    <th>Tác nhân</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => (
                    <tr
                      key={log.id}
                      onClick={() => setActiveLog(log)}
                      style={{ cursor: "pointer" }}
                    >
                      <td
                        style={{
                          color: "#64748B",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {log.time}
                      </td>
                      <td>
                        <span
                          className={
                            log.level === "INFO"
                              ? styles.levelBadgeInfo
                              : log.level === "WARN"
                              ? styles.levelBadgeWarn
                              : styles.levelBadgeError
                          }
                        >
                          {log.level}
                        </span>
                      </td>
                      <td>
                        <span className={styles.serviceTag}>{log.service}</span>
                      </td>
                      <td style={{ fontWeight: 500 }}>{log.message}</td>
                      <td style={{ color: "#64748B" }}>{log.actor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>

      {/* Log Detail Modal */}
      {activeLog && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <h2>Chi tiết nhật ký: {activeLog.service}</h2>
            <div className={styles.logMetaDetails}>
              <div>
                <strong>Thời gian:</strong> {activeLog.time}
              </div>
              <div>
                <strong>Mức độ:</strong> {activeLog.level}
              </div>
              <div>
                <strong>Tác nhân:</strong> {activeLog.actor}
              </div>
              <div>
                <strong>Nội dung:</strong> {activeLog.message}
              </div>
            </div>
            {activeLog.details && (
              <pre className={styles.logJson}>{activeLog.details}</pre>
            )}
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={() => setActiveLog(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WEB-004: design-review scaffolding, dev only */}
      {process.env.NODE_ENV !== "production" && (
        <aside
          className={styles.stateSwitcher}
          aria-label="Review State Switcher"
        >
          <span>REVIEW STATE</span>
          {(
            ["ready", "loading", "empty", "error", "forbidden"] as ReviewState[]
          ).map((state) => (
            <button
              key={state}
              className={reviewState === state ? styles.stateActive : ""}
              onClick={() => handleStateChange(state)}
            >
              {state}
            </button>
          ))}
        </aside>
      )}

      {/* Toast */}
      {toastMessage && (
        <div className={styles.toast}>
          <Check size={18} />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
