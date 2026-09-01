"use client";

// MOCK(T-INC-*): payroll periods in-memory until /api/v1/teacher/payroll exists.
// View-only per RBAC — no mutation anywhere on this screen.

import { useMemo, useState } from "react";
import { CircleCheck, Wallet, X } from "lucide-react";
import { TeacherShell } from "@/components/teacher/teacher-shell";
import {
  ReviewSwitcher,
  StatusPill,
  Toast,
  type ReviewState,
} from "@/components/teacher/teacher-widgets";
import {
  mockPayrollPeriods,
  payrollStatusLabels,
  type PayrollPeriod,
} from "@/lib/teacher/payroll-data";
import { formatDate, formatVnd } from "@/lib/formatters";
import styles from "./income.module.css";

export default function TeacherIncomePage() {
  const [periods] = useState<PayrollPeriod[]>(mockPayrollPeriods);
  const [reviewState, setReviewState] = useState<ReviewState>("ready");
  const [open, setOpen] = useState<PayrollPeriod | null>(null);
  const [toast, setToast] = useState("");

  const stats = useMemo(() => {
    const current = periods.find((p) => p.status !== "paid") ?? periods[0] ?? null;
    const paidTotal = periods
      .filter((p) => p.status === "paid")
      .reduce((s, p) => s + p.total, 0);
    const approvedSessions = periods
      .flatMap((p) => p.sessions)
      .length;
    return { current, paidTotal, approvedSessions };
  }, [periods]);

  const display = reviewState === "empty" ? [] : periods;

  void setToast;

  return (
    <TeacherShell crumbs={[{ label: "Giáo viên" }, { label: "Thu nhập" }]}>
      <header className={styles.titleRow}>
        <div>
          <p className={styles.eyebrow}>THU NHẬP</p>
          <h1>Kỳ lương của tôi</h1>
          <p className={styles.subtitle}>
            Chỉ tính từ buổi học được Admin duyệt. Lương được tạo và thanh toán bởi Admin.
          </p>
        </div>
      </header>

      {reviewState === "error" && (
        <div className={styles.errorBanner} role="alert">
          <strong>Không tải được dữ liệu lương.</strong>
          <button onClick={() => setReviewState("ready")}>Thử lại</button>
        </div>
      )}

      <section className={styles.statStrip} aria-label="Tổng quan thu nhập">
        <div className={styles.statCard}>
          <span className={styles.statIcon}><Wallet size={19} /></span>
          <div>
            <small>Kỳ gần nhất</small>
            <strong>{stats.current ? stats.current.monthLabel : "—"}</strong>
            <em>{stats.current ? payrollStatusLabels[stats.current.status] : "chưa có"}</em>
          </div>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statIcon}><CircleCheck size={19} /></span>
          <div>
            <small>Buổi đã tính lương</small>
            <strong>{stats.approvedSessions}</strong>
            <em>trên toàn bộ các kỳ</em>
          </div>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statIcon}><Wallet size={19} /></span>
          <div>
            <small>Đã nhận (các kỳ đã trả)</small>
            <strong>{formatVnd(stats.paidTotal)}</strong>
            <em>chuyển khoản qua Admin</em>
          </div>
        </div>
      </section>

      <section className={styles.tableCard} aria-label="Danh sách kỳ lương">
        {reviewState === "loading" ? (
          <div aria-busy="true" aria-label="Đang tải">
            {[1, 2, 3].map((r) => <div key={r} className={styles.skeletonRow}><span /><span /><span /></div>)}
          </div>
        ) : display.length === 0 ? (
          <div className={styles.emptyState}>
            <Wallet size={38} />
            <h2>Chưa có kỳ lương nào</h2>
            <p>Kỳ lương xuất hiện ở đây sau khi Admin tạo và đưa buổi học được duyệt vào kỳ.</p>
          </div>
        ) : (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Kỳ lương</th>
                    <th>Trạng thái</th>
                    <th>Số buổi</th>
                    <th>Mức / buổi</th>
                    <th>Tổng</th>
                  </tr>
                </thead>
                <tbody>
                  {display.map((p) => (
                    <tr key={p.id} tabIndex={0} onClick={() => setOpen(p)} onKeyDown={(e) => e.key === "Enter" && setOpen(p)}>
                      <td><strong className={styles.periodName}>{p.monthLabel}</strong></td>
                      <td><StatusPill status={p.status} label={payrollStatusLabels[p.status]} /></td>
                      <td className={styles.numeric}>{p.sessions.length}</td>
                      <td className={styles.numeric}>{formatVnd(p.ratePerSession)}</td>
                      <td className={styles.numeric}><strong>{formatVnd(p.total)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={styles.mobileList}>
              {display.map((p) => (
                <article key={p.id} className={styles.mobileCard} onClick={() => setOpen(p)}>
                  <div className={styles.mobileCardHead}>
                    <strong>{p.monthLabel}</strong>
                    <StatusPill status={p.status} label={payrollStatusLabels[p.status]} />
                  </div>
                  <p className={styles.mobileMeta}>
                    {p.sessions.length} buổi · {formatVnd(p.ratePerSession)}/buổi · tổng <strong>{formatVnd(p.total)}</strong>
                  </p>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      <ReviewSwitcher value={reviewState} onChange={setReviewState} />
      {toast && <Toast message={toast} />}

      {open && (
        <div className={styles.drawerBackdrop} role="dialog" aria-modal="true" aria-label={"Kỳ lương " + open.monthLabel}>
          <button className={styles.drawerScrim} onClick={() => setOpen(null)} aria-label="Đóng" />
          <div className={styles.drawer}>
            <div className={styles.drawerHead}>
              <div>
                <h2>{open.monthLabel}</h2>
                <p>
                  <StatusPill status={open.status} label={payrollStatusLabels[open.status]} /> · {open.sessions.length} buổi · mức {formatVnd(open.ratePerSession)}/buổi
                </p>
              </div>
              <button className={styles.drawerClose} onClick={() => setOpen(null)} aria-label="Đóng"><X size={18} /></button>
            </div>
            <div className={styles.drawerBody}>
              <table className={styles.sessionTable}>
                <thead>
                  <tr>
                    <th>Ngày</th>
                    <th>Lớp / Chủ đề</th>
                    <th>Thời lượng</th>
                    <th>Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {open.sessions.map((s) => (
                    <tr key={s.sessionId}>
                      <td className={styles.numeric}>{formatDate(s.date)}</td>
                      <td>
                        <div className={styles.sessionCell}>
                          <strong>{s.className}</strong>
                          <small>{s.topic ?? "—"}</small>
                        </div>
                      </td>
                      <td className={styles.numeric}>{s.minutes} phút</td>
                      <td className={styles.numeric}>{formatVnd(s.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={styles.drawerFoot}>
              <span>Tổng kỳ này</span>
              <strong>{formatVnd(open.total)}</strong>
            </div>
          </div>
        </div>
      )}
    </TeacherShell>
  );
}
