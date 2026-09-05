"use client";

import { useMemo, useState } from "react";
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
import {
  classStatusLabels,
  generateEnrollmentCode,
  mockTeacherClasses,
  mockTeacherProfile,
  type TeacherClass,
} from "@/lib/teacher-data";
import { formatDate } from "@/lib/formatters";
import styles from "./dashboard.module.css";

export default function TeacherDashboardPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<TeacherClass[]>(mockTeacherClasses);
  const [reviewState, setReviewState] = useState<ReviewState>("ready");
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState("");

  const activeClasses = useMemo(() => classes.filter((c) => c.status === "active"), [classes]);
  const shown = activeClasses.slice(0, 6);

  function handleCreate(name: string, hskLevel: number, description: string) {
    // MOCK: POST /api/v1/teacher/classes returns data.class with enrollmentCode
    const created: TeacherClass = {
      id: "c" + (classes.length + 1) + "-" + Date.now(),
      name,
      hskLevel,
      enrollmentCode: generateEnrollmentCode(hskLevel),
      studentCount: 0,
      status: "active",
      createdAt: new Date().toISOString().slice(0, 10),
      description,
    };
    setClasses((current) => [created, ...current]);
    setCreating(false);
    setToast("Đã tạo lớp " + name + " — mã ghi danh " + created.enrollmentCode);
    window.setTimeout(() => setToast(""), 3200);
  }

  return (
    <TeacherShell crumbs={[{ label: "Giáo viên" }, { label: "Tổng quan" }]}>
      <div className={styles.head}>
        <div>
          <p className={styles.eyebrow}>BẢNG ĐIỀU KHIỂN</p>
          <h1>Chào, {mockTeacherProfile.nickname}</h1>
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
            <span>Vui lòng kiểm tra kết nối và thử lại.</span>
          </div>
          <button onClick={() => setReviewState("ready")}>Thử lại</button>
        </div>
      )}

      {reviewState === "loading" ? (
        <div className={styles.cardGrid} aria-busy="true" aria-label="Đang tải">
          {[1, 2, 3].map((i) => (
            <div key={i} className={styles.cardSkeleton} />
          ))}
        </div>
      ) : reviewState === "empty" || activeClasses.length === 0 ? (
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
        <>
          <section aria-label="Lớp của tôi">
            <div className={styles.sectionHead}>
              <h2>Lớp của tôi</h2>
              <button className={styles.seeAll} onClick={() => router.push("/teacher/classes")}>
                Xem tất cả ({classes.length})
              </button>
            </div>
            <div className={styles.cardGrid}>
              {shown.map((cls) => (
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
        </>
      )}

      <ReviewSwitcher value={reviewState} onChange={setReviewState} />
      {toast && <Toast message={toast} />}
      {creating && <CreateClassModal onClose={() => setCreating(false)} onCreate={handleCreate} />}
    </TeacherShell>
  );
}
