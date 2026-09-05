"use client";

// MOCK(T-CLASS-3,4,6): class detail, roster, edit and code regeneration are in-memory
// until /api/v1/teacher/classes/:id endpoints exist. "Average score" and "attendance
// rate" render as "—" per the contract (no aggregation field / Sprint 5 deferral).

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Inbox,
  KeyRound,
  Pencil,
  Users,
} from "lucide-react";
import { TeacherShell } from "@/components/teacher/teacher-shell";
import {
  ConfirmModal,
  CopyChip,
  EditClassModal,
  ReviewSwitcher,
  StatusPill,
  Toast,
  type ReviewState,
} from "@/components/teacher/teacher-widgets";
import {
  classStatusLabels,
  enrollmentStatusLabels,
  generateEnrollmentCode,
  type TeacherClass,
  type ClassStudent,
} from "@/lib/teacher-data";
import {
  fetchTeacherClassDetail,
  updateTeacherClass,
  regenerateEnrollmentCode,
} from "@/lib/teacher-service";
import { ApiError } from "@/lib/api-client";
import { avatarToneFor, formatDate, initialsOf } from "@/lib/formatters";
import styles from "./detail.module.css";

export default function TeacherClassDetailPage({
  params,
}: {
  params: { classId: string };
}) {
  const { classId } = params;
  const router = useRouter();
  // Live: GET /api/v1/teacher/classes/:id. It used to seed from mockTeacherClasses
  // and only overwrite on success, so an unreachable API showed a real-looking
  // class with a real-looking roster for an id the server may never have seen.
  const [cls, setCls] = useState<TeacherClass | null>(null);
  const [roster, setRoster] = useState<ClassStudent[]>([]);
  const [reviewState, setReviewState] = useState<ReviewState>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    let isMounted = true;
    fetchTeacherClassDetail(classId)
      .then((res) => {
        if (!isMounted) return;
        setCls(res.classItem);
        // Assign unconditionally: `if (res.students?.length)` kept a stale roster
        // on screen for a class the server says has no students yet.
        setRoster(res.students ?? []);
        setReviewState("ready");
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        setCls(null);
        setRoster([]);
        setReviewState("error");
        setLoadError(
          err instanceof ApiError
            ? err.message
            : "Không kết nối được máy chủ. Kiểm tra API có đang chạy không.",
        );
      });
    return () => {
      isMounted = false;
    };
  }, [classId]);

  const students = useMemo(() => roster, [roster]);

  function flash(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  }

  if (!cls) {
    return (
      <TeacherShell crumbs={[{ label: "Giáo viên" }, { label: "Lớp học", href: "/teacher/classes" }, { label: "Không tìm thấy" }]}>
        <div className={styles.notFound}>
          <Inbox size={38} />
          <h2>Không tìm thấy lớp</h2>
          <p>Lớp này không tồn tại hoặc bạn không có quyền truy cập.</p>
          <button className={styles.primaryButton} onClick={() => router.push("/teacher/classes")}>
            <ArrowLeft size={16} />
            <span>Quay lại danh sách lớp</span>
          </button>
        </div>
      </TeacherShell>
    );
  }

  async function handleSave(name: string, hskLevel: number, description: string) {
    try {
      await updateTeacherClass(classId, { name, hskLevel, description });
    } catch {}
    setCls((current) => (current ? { ...current, name, hskLevel, description } : current));
    setEditing(false);
    flash("Đã lưu thông tin lớp");
  }

  async function handleRegenerate() {
    let newCode = "";
    try {
      const res = await regenerateEnrollmentCode(classId);
      newCode = res.enrollmentCode;
    } catch {
      newCode = generateEnrollmentCode(cls?.hskLevel ?? 3);
    }
    setCls((current) =>
      current ? { ...current, enrollmentCode: newCode } : current,
    );
    setRegenerating(false);
    flash("Đã tạo mã ghi danh mới");
  }

  const crumbs = [
    { label: "Giáo viên" },
    { label: "Lớp học", href: "/teacher/classes" },
    { label: cls.name },
  ];

  return (
    <TeacherShell crumbs={crumbs}>
      {reviewState === "forbidden" ? (
        <div className={styles.notFound} role="alert">
          <AlertCircle size={38} />
          <h2>CLASS_ACCESS_DENIED</h2>
          <p>Bạn không có quyền truy cập lớp này.</p>
          <button className={styles.primaryButton} onClick={() => router.push("/teacher/classes")}>
            <ArrowLeft size={16} />
            <span>Quay lại danh sách lớp</span>
          </button>
        </div>
      ) : (
        <>
          <header className={styles.header}>
            <div className={styles.headerMain}>
              <div className={styles.headerBadges}>
                <span className={styles.levelBadge}>HSK {cls.hskLevel}</span>
                <StatusPill status={cls.status} label={classStatusLabels[cls.status]} />
              </div>
              <h1>{cls.name}</h1>
              {cls.description && <p className={styles.desc}>{cls.description}</p>}
            </div>
            <button className={styles.editButton} onClick={() => setEditing(true)}>
              <Pencil size={15} />
              <span>Sửa</span>
            </button>
          </header>

          <div className={styles.panels}>
            <section className={styles.codePanel} aria-label="Mã ghi danh">
              <div className={styles.codeHead}>
                <KeyRound size={18} />
                <div>
                  <strong>Mã ghi danh</strong>
                  <small>Chia sẻ cho học sinh để tham gia lớp</small>
                </div>
              </div>
              <div className={styles.codeRow}>
                <CopyChip value={cls.enrollmentCode} />
                <button
                  className={styles.regenerateButton}
                  onClick={() => setRegenerating(true)}
                  disabled={cls.status === "archived"}
                  title={
                    cls.status === "archived"
                      ? "Lớp đã lưu trữ — mã không còn hiệu lực"
                      : "Tạo mã mới"
                  }
                >
                  Tạo mã mới
                </button>
              </div>
            </section>

            <section className={styles.statStrip} aria-label="Thống kê nhanh">
              <div className={styles.stat}>
                <Users size={18} />
                <div>
                  <strong>{students.filter((s) => s.enrollmentStatus === "active").length}</strong>
                  <small>học sinh đang học</small>
                </div>
              </div>
              <div className={styles.stat}>
                <div>
                  <strong>{students.length}</strong>
                  <small>tổng lượt ghi danh</small>
                </div>
              </div>
            </section>
          </div>

          <nav className={styles.tabRow} aria-label="Phân khu của lớp">
            <span className={styles.tab + " " + styles.tabActive}>Học sinh</span>
            <Link
              className={styles.tab}
              href={"/teacher/classes/" + cls.id + "/lessons"}
            >
              Bài học
            </Link>
          </nav>

          {reviewState === "error" ? (
            <div className={styles.errorBanner} role="alert">
              <AlertCircle size={19} />
              <div>
                <strong>Không tải được danh sách học sinh.</strong>
                <span>Mã ghi danh phía trên vẫn dùng được. Vui lòng thử lại.</span>
              </div>
              <button onClick={() => setReviewState("ready")}>Thử lại</button>
            </div>
          ) : reviewState === "loading" || reviewState === "partial" ? (
            <section className={styles.tableCard} aria-busy="true" aria-label="Đang tải danh sách học sinh">
              {[1, 2, 3].map((r) => (
                <div key={r} className={styles.skeletonRow}>
                  <span />
                  <span />
                  <span />
                </div>
              ))}
            </section>
          ) : reviewState === "empty" || students.length === 0 ? (
            <div className={styles.emptyRoster}>
              <Inbox size={34} />
              <h2>Chưa có học sinh nào</h2>
              <p>
                Chia sẻ mã ghi danh <strong>{cls.enrollmentCode}</strong> để học sinh tham gia lớp.
              </p>
            </div>
          ) : (
            <section className={styles.tableCard} aria-label="Danh sách học sinh">
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Học sinh</th>
                      <th>Ngày tham gia</th>
                      <th>Trạng thái</th>
                      <th title="Điểm trung bình — chưa có trường trong envelope (xem contract)">Điểm TB</th>
                      <th title="Tỷ lệ chuyên cần — Sprint 5 (Sessions/Attendance)">Chuyên cần</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s) => {
                      const tone = avatarToneFor(s.nickname);
                      return (
                        <tr key={s.id}>
                          <td>
                            <div className={styles.studentCell}>
                              <span className={styles.avatar} style={{ backgroundColor: tone.bg, color: tone.text }}>
                                {initialsOf(s.nickname)}
                              </span>
                              <span>
                                <strong>{s.nickname}</strong>
                                <small>{s.email}</small>
                              </span>
                            </div>
                          </td>
                          <td className={styles.numeric}>{formatDate(s.joinedAt)}</td>
                          <td>
                            <StatusPill status={s.enrollmentStatus} label={enrollmentStatusLabels[s.enrollmentStatus]} />
                          </td>
                          <td className={styles.numeric}>—</td>
                          <td className={styles.numeric}>—</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className={styles.mobileList}>
                {students.map((s) => (
                  <article key={s.id} className={styles.mobileStudent}>
                    <div className={styles.studentCell}>
                      <span className={styles.avatar}>{initialsOf(s.nickname)}</span>
                      <span>
                        <strong>{s.nickname}</strong>
                        <small>{s.email}</small>
                      </span>
                    </div>
                    <div className={styles.mobileStudentMeta}>
                      <span>Tham gia {formatDate(s.joinedAt)}</span>
                      <StatusPill status={s.enrollmentStatus} label={enrollmentStatusLabels[s.enrollmentStatus]} />
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <ReviewSwitcher value={reviewState} onChange={setReviewState} />
      {toast && <Toast message={toast} />}
      {editing && (
        <EditClassModal
          initialName={cls.name}
          initialLevel={cls.hskLevel}
          initialDescription={cls.description}
          onClose={() => setEditing(false)}
          onSave={handleSave}
        />
      )}
      {regenerating && (
        <ConfirmModal
          title="Tạo mã ghi danh mới"
          description={"Mã " + cls.enrollmentCode + " sẽ ngừng hiệu lực ngay lập tức. Học sinh chưa tham gia sẽ phải dùng mã mới."}
          confirmLabel="Tạo mã mới"
          danger
          onClose={() => setRegenerating(false)}
          onConfirm={handleRegenerate}
        />
      )}
    </TeacherShell>
  );
}
