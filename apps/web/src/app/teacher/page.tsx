"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, GraduationCap, Inbox, Plus, Users } from "lucide-react";
import { TeacherShell } from "@/components/teacher/teacher-shell";
import {
  CreateClassModal,
  ReviewSwitcher,
  StatusPill,
  Toast,
  type ReviewState,
} from "@/components/teacher/teacher-widgets";
import { classStatusLabels, type TeacherClass } from "@/lib/teacher-data";
import { fetchTeacherClasses, createTeacherClass } from "@/lib/teacher-service";
import { ApiError } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth/auth-store";
import { formatDate } from "@/lib/formatters";
import styles from "./dashboard.module.css";

export default function TeacherDashboardPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const teacherName = user?.nickname || "Giáo viên";

  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reviewState, setReviewState] = useState<ReviewState>("loading");
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    let isMounted = true;
    setReviewState("loading");
    setLoadError(null);

    fetchTeacherClasses()
      .then((res) => {
        if (!isMounted) return;
        setClasses(res.classes);
        setReviewState(res.classes.length === 0 ? "empty" : "ready");
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        setClasses([]);
        setReviewState("error");
        setLoadError(
          err instanceof ApiError ? err.message : "Không thể tải danh sách lớp học.",
        );
      });

    return () => {
      isMounted = false;
    };
  }, []);

  function handleRetry() {
    setReviewState("loading");
    setLoadError(null);

    fetchTeacherClasses()
      .then((res) => {
        setClasses(res.classes);
        setReviewState(res.classes.length === 0 ? "empty" : "ready");
      })
      .catch((err: unknown) => {
        setClasses([]);
        setReviewState("error");
        setLoadError(
          err instanceof ApiError ? err.message : "Không thể tải danh sách lớp học.",
        );
      });
  }

  async function handleCreate(name: string, hskLevel: number, description: string) {
    try {
      const res = await createTeacherClass({
        name,
        hskLevel,
        description: description.trim() ? description.trim() : undefined,
      });
      setClasses((current) => [res.classItem, ...current]);
      setCreating(false);
      setReviewState("ready");
      setToast("Đã tạo lớp " + res.classItem.name + " — mã ghi danh " + res.classItem.enrollmentCode);
      window.setTimeout(() => setToast(""), 3200);
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : "Không thể tạo lớp học.";
      setToast(msg);
      window.setTimeout(() => setToast(""), 3200);
    }
  }

  const activeClasses = useMemo(() => classes.filter((c) => c.status === "active"), [classes]);
  const shown = activeClasses.slice(0, 6);
  const display = reviewState === "empty" ? [] : shown;

  return (
    <TeacherShell crumbs={[{ label: "Giáo viên" }, { label: "Tổng quan" }]}>
      <div className={styles.head}>
        <div>
          <p className={styles.eyebrow}>BẢNG ĐIỀU KHIỂN</p>
          <h1>Chào, {teacherName}</h1>
          <p className={styles.subtitle}>
            {activeClasses.length > 0
              ? "Chọn một lớp để tiếp tục quản lý."
              : "Tạo lớp đầu tiên để bắt đầu giảng dạy."}
          </p>
        </div>
        {activeClasses.length > 0 && (
          <button className={styles.primaryButton} onClick={() => setCreating(true)}>
            <Plus size={16} />
            <span>Tạo lớp mới</span>
          </button>
        )}
      </div>

      {reviewState === "error" && (
        <div className={styles.errorBanner} role="alert">
          <AlertCircle size={19} />
          <div>
            <strong>Không tải được danh sách lớp.</strong>
            <span>{loadError || "Vui lòng kiểm tra kết nối và thử lại."}</span>
          </div>
          <button onClick={handleRetry}>Thử lại</button>
        </div>
      )}

      {reviewState === "loading" ? (
        <div className={styles.cardGrid} aria-busy="true" aria-label="Đang tải">
          {[1, 2, 3].map((i) => (
            <div key={i} className={styles.cardSkeleton} />
          ))}
        </div>
      ) : reviewState === "empty" || display.length === 0 ? (
        <div className={styles.emptyState}>
          <Inbox size={38} />
          <h2>Chưa có lớp nào</h2>
          <p>Tạo lớp đầu tiên để chia sẻ mã ghi danh với học sinh.</p>
          <button className={styles.primaryButton} onClick={() => setCreating(true)}>
            <Plus size={16} />
            <span>Tạo lớp đầu tiên</span>
          </button>
        </div>
      ) : (
        <section aria-label="Lớp của tôi">
          <div className={styles.sectionHead}>
            <h2>Lớp của tôi</h2>
            <button className={styles.seeAll} onClick={() => router.push("/teacher/classes")}>
              Xem tất cả ({classes.length})
            </button>
          </div>
          <div className={styles.cardGrid}>
            {display.map((cls) => (
              <button
                key={cls.id}
                className={styles.classCard}
                onClick={() => router.push("/teacher/classes/" + cls.id)}
                aria-label={"Mở lớp " + cls.name}
              >
                <div className={styles.cardTop}>
                  <span className={styles.levelBadge}>HSK {cls.hskLevel}</span>
                  <StatusPill status={cls.status} label={classStatusLabels[cls.status]} />
                </div>
                <h3>{cls.name}</h3>
                <p className={styles.cardDesc}>{cls.description || "—"}</p>
                <div className={styles.cardMeta}>
                  <span>
                    <Users size={15} />
                    {cls.studentCount} học sinh
                  </span>
                  <span>Tạo {formatDate(cls.createdAt)}</span>
                </div>
              </button>
            ))}
            <button className={styles.newCard} onClick={() => setCreating(true)}>
              <GraduationCap size={22} />
              <span>Tạo lớp mới</span>
            </button>
          </div>
        </section>
      )}

      {process.env.NODE_ENV !== "production" && (
        <ReviewSwitcher value={reviewState} onChange={setReviewState} />
      )}
      {toast && <Toast message={toast} />}
      {creating && <CreateClassModal onClose={() => setCreating(false)} onCreate={handleCreate} />}
    </TeacherShell>
  );
}
