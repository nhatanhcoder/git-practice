"use client";

// MOCK(A-DASH-3): GET /api/v1/admin/monitoring and health probe endpoints mock
// ASSUMPTION(decision-4): Single shared organization Gemini API key model

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
import { useMemo, useState } from "react";
import styles from "./monitoring.module.css";

type ReviewState = "ready" | "loading" | "empty" | "error" | "forbidden";
type LogLevel = "ALL" | "INFO" | "WARN" | "ERROR";

interface ServiceHealth {
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

const initialServices: ServiceHealth[] = [
  {
    id: "db",
    name: "PostgreSQL Database",
    icon: Database,
    status: "healthy",
    latency: "4ms",
    metric1: "Kết nối: 12 / 100",
    metric2: "Uptime: 99.98%",
  },
  {
    id: "redis",
    name: "Redis Cache",
    icon: Server,
    status: "healthy",
    latency: "1ms",
    metric1: "Bộ nhớ: 48MB / 512MB",
    metric2: "Hit rate: 94.2%",
  },
  {
    id: "gemini",
    name: "Google Gemini 1.5 Pro",
    icon: Sparkles,
    status: "healthy",
    latency: "480ms",
    metric1: "Hạn ngạch: 142k / 1M token",
    metric2: "Key: Shared Org Key",
  },
  {
    id: "storage",
    name: "Cloudflare R2 Storage",
    icon: HardDrive,
    status: "healthy",
    latency: "12ms",
    metric1: "Dung lượng: 3.4 GB / 50 GB",
    metric2: "Tải lên: Hoạt động tốt",
  },
];

const initialLogs: LogEntry[] = [
  {
    id: "log-1",
    time: "11:38:12",
    level: "INFO",
    service: "auth",
    message: "User admin@hsk.vn successfully authenticated via session cookie",
    actor: "admin@hsk.vn",
    details: '{\n  "ip": "118.69.182.4",\n  "userAgent": "Mozilla/5.0 Chrome/128.0",\n  "status": 200\n}',
  },
  {
    id: "log-2",
    time: "11:35:40",
    level: "INFO",
    service: "cron",
    message: "Batch invoice preview background calculation completed in 142ms",
    actor: "system_cron",
    details: '{\n  "batchId": "JOB-2608",\n  "eligibleStudents": 59,\n  "durationMs": 142\n}',
  },
  {
    id: "log-3",
    time: "11:32:05",
    level: "WARN",
    service: "cache",
    message: "Redis key teacher:rate:t2 near expiration threshold",
    actor: "redis_worker",
    details: '{\n  "key": "teacher:rate:t2",\n  "ttlRemainingSec": 12,\n  "action": "refresh_queued"\n}',
  },
  {
    id: "log-4",
    time: "11:28:19",
    level: "INFO",
    service: "payroll",
    message: "Payroll period PER-2607 draft created by admin",
    actor: "admin@hsk.vn",
    details: '{\n  "periodId": "PER-2607",\n  "sessionsCount": 18,\n  "totalAmount": 7500000\n}',
  },
  {
    id: "log-5",
    time: "11:15:30",
    level: "ERROR",
    service: "gemini",
    message: "Rate limit token quota exceeded on burst call — retry with exponential backoff",
    actor: "ai_grading_service",
    details: 'Error: 429 Too Many Requests\n  at GeminiClient.generateContent (client.ts:88)\n  at GradingQueue.process (worker.ts:42)',
  },
  {
    id: "log-6",
    time: "10:50:00",
    level: "INFO",
    service: "db",
    message: "Vacuum analyze finished on table student_invoices",
    actor: "postgres_daemon",
    details: '{\n  "table": "student_invoices",\n  "pagesRemoved": 42,\n  "durationMs": 85\n}',
  },
];

export default function AdminMonitoringPage() {
  const router = useRouter();
  const [services, setServices] = useState<ServiceHealth[]>(initialServices);
  const [logs, setLogs] = useState<LogEntry[]>(initialLogs);
  const [selectedLevel, setSelectedLevel] = useState<LogLevel>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [reviewState, setReviewState] = useState<ReviewState>("ready");
  const [mobileNav, setMobileNav] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Selected Log Modal
  const [activeLog, setActiveLog] = useState<LogEntry | null>(null);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchLevel = selectedLevel === "ALL" || log.level === selectedLevel;
      const matchSearch =
        searchQuery === "" ||
        log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.actor.toLowerCase().includes(searchQuery.toLowerCase());
      return matchLevel && matchSearch;
    });
  }, [logs, selectedLevel, searchQuery]);

  function triggerToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  }

  function testService(serviceName: string) {
    triggerToast(`Đã kiểm tra kết nối tới ${serviceName}: Phản hồi tốt (3ms)`);
  }

  function handleStateChange(newState: ReviewState) {
    setReviewState(newState);
    if (newState === "error") {
      setServices((prev) =>
        prev.map((s) => (s.id === "gemini" ? { ...s, status: "degraded", latency: "2400ms" } : s))
      );
    } else {
      setServices(initialServices);
    }
    if (newState === "forbidden") {
      setToastMessage("AUTH_INSUFFICIENT_ROLE: Quyền truy cập bị từ chối.");
      setTimeout(() => router.push("/login"), 1400);
    }
  }

  return (
    <div className={styles.appShell}>
      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${mobileNav ? styles.sidebarOpen : ""}`}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>学</span>
          <span>HSK Platform</span>
          <button className={styles.closeNav} onClick={() => setMobileNav(false)} aria-label="Đóng menu">
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
          <Link className={`${styles.navItem} ${styles.navActive}`} href="/admin/monitoring">
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
      {mobileNav && <button className={styles.navBackdrop} onClick={() => setMobileNav(false)} aria-label="Đóng menu" />}

      {/* Main Column */}
      <div className={styles.mainColumn}>
        <header className={styles.topbar}>
          <div className={styles.breadcrumb}>
            <button className={styles.menuButton} onClick={() => setMobileNav(true)} aria-label="Mở menu">
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
            <Link className={styles.profileButton} href="/admin/profile">
              <span className={styles.avatar} style={{ backgroundColor: "#E0E7FF", color: "#3730A3" }}>
                AT
              </span>
            </Link>
          </div>
        </header>

        <main className={styles.content}>
          <div className={styles.titleRow}>
            <div>
              <p className={styles.eyebrow}>TRẠNG THÁI HẠ TẦNG</p>
              <h1>Giám sát & Nhật ký</h1>
              <p className={styles.subtitle}>Kiểm tra tính sẵn sàng của cơ sở dữ liệu, bộ nhớ đệm, AI API và nhật ký audit.</p>
            </div>
            <div className={styles.controls}>
              <div
                className={styles.systemStatusPill}
                style={{
                  backgroundColor:
                    reviewState === "error" ? "rgba(217,119,6,0.12)" : "rgba(22,163,74,0.12)",
                  color: reviewState === "error" ? "#D97706" : "#16A34A",
                }}
              >
                <i className={styles.statusDot} />
                <span>
                  {reviewState === "error"
                    ? "1 dịch vụ cảnh báo (Gemini API)"
                    : "Tất cả dịch vụ hoạt động bình thường"}
                </span>
              </div>
              <button className={styles.refreshBtn} onClick={() => triggerToast("Đã làm mới dữ liệu giám sát")}>
                <RefreshCw size={14} />
                <span>Làm mới</span>
              </button>
            </div>
          </div>

          {/* System Resource Strip */}
          <section className={styles.resourceGrid} aria-label="Tài nguyên máy chủ">
            <article className={styles.resourceCard}>
              <div className={styles.resourceHeader}>
                <span>CPU Server</span>
                <Cpu size={16} />
              </div>
              <div className={styles.resourceVal}>18%</div>
              <div className={styles.progressTrack}>
                <div className={styles.progressFill} style={{ width: "18%" }} />
              </div>
            </article>

            <article className={styles.resourceCard}>
              <div className={styles.resourceHeader}>
                <span>Bộ nhớ RAM</span>
                <Server size={16} />
              </div>
              <div className={styles.resourceVal}>2.4 GB / 8 GB</div>
              <div className={styles.progressTrack}>
                <div className={styles.progressFill} style={{ width: "30%" }} />
              </div>
            </article>

            <article className={styles.resourceCard}>
              <div className={styles.resourceHeader}>
                <span>Ổ đĩa SSD</span>
                <HardDrive size={16} />
              </div>
              <div className={styles.resourceVal}>14.2 GB / 80 GB</div>
              <div className={styles.progressTrack}>
                <div className={styles.progressFill} style={{ width: "18%" }} />
              </div>
            </article>

            <article className={styles.resourceCard}>
              <div className={styles.resourceHeader}>
                <span>WebSocket Kết nối</span>
                <Radio size={16} />
              </div>
              <div className={styles.resourceVal}>38 active</div>
              <div className={styles.progressTrack}>
                <div className={styles.progressFill} style={{ width: "38%", backgroundColor: "#16A34A" }} />
              </div>
            </article>
          </section>

          {/* Services Health Grid */}
          <section className={styles.servicesGrid} aria-label="Dịch vụ phụ trợ">
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
                          backgroundColor: isDegraded ? "rgba(217,119,6,0.12)" : "rgba(22,163,74,0.12)",
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
                  <button className={styles.testBtn} onClick={() => testService(svc.name)}>
                    Kiểm tra kết nối
                  </button>
                </article>
              );
            })}
          </section>

          {/* Audit & Logs Stream */}
          <section className={styles.logsCard} aria-label="Nhật ký hệ thống và kiểm toán">
            <div className={styles.logsHeader}>
              <h2>Nhật ký hệ thống & Audit Trail</h2>
              <div className={styles.logFilters}>
                <div className={styles.levelPills}>
                  {(["ALL", "INFO", "WARN", "ERROR"] as LogLevel[]).map((lvl) => (
                    <button
                      key={lvl}
                      className={`${styles.levelBtn} ${selectedLevel === lvl ? styles.levelBtnActive : ""}`}
                      onClick={() => setSelectedLevel(lvl)}
                    >
                      {lvl}
                    </button>
                  ))}
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
                    <tr key={log.id} onClick={() => setActiveLog(log)}>
                      <td style={{ color: "#64748B", fontVariantNumeric: "tabular-nums" }}>{log.time}</td>
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

      {/* Log Details Modal */}
      {activeLog && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <h2>Chi tiết sự kiện: {activeLog.service}</h2>
            <p>{activeLog.message}</p>
            <div className={styles.codeBox}>{activeLog.details || "Không có stack trace"}</div>
            <div className={styles.modalActions}>
              <button className={styles.closeBtn} onClick={() => setActiveLog(null)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WEB-004: design-review scaffolding, dev only. Over live data it lets a

          failed load be repainted as a healthy one. */}

      {process.env.NODE_ENV !== "production" && (

        <aside className={styles.stateSwitcher} aria-label="Review State Switcher">
          <span>REVIEW STATE</span>
          {(["ready", "loading", "empty", "error", "forbidden"] as ReviewState[]).map((state) => (
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
