"use client";

// MOCK(T-CLASS-1,2,5): class list, create and archive stay in-memory until
// /api/v1/teacher/classes endpoints exist.

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Archive, Inbox, MoreHorizontal, Plus, Search } from "lucide-react";
import { TeacherShell } from "@/components/teacher/teacher-shell";
import {
  ConfirmModal,
  CopyChip,
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
  type TeacherClass,
} from "@/lib/teacher-data";
import {
  fetchTeacherClasses,
  createTeacherClass,
  archiveTeacherClass,
} from "@/lib/teacher-service";
import { useDismissMenu } from "@/hooks/use-overlay";
import { formatDate } from "@/lib/formatters";
import styles from "./classes.module.css";

export default function TeacherClassesPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<TeacherClass[]>(mockTeacherClasses);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "archived">("all");
  const [reviewState, setReviewState] = useState<ReviewState>("ready");
  const [creating, setCreating] = useState(false);
  const [archiving, setArchiving] = useState<TeacherClass | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    let isMounted = true;
    fetchTeacherClasses()
      .then((res) => {
        if (!isMounted) return;
        setClasses(res.classes);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("vi");
    return classes
      .filter((c) => statusFilter === "all" || c.status === statusFilter)
      .filter((c) => !q || (c.name + " " + c.enrollmentCode).toLocaleLowerCase("vi").includes(q));
  }, [classes, query, statusFilter]);

  const hasFilters = Boolean(query) || statusFilter !== "all";
  const display = reviewState === "empty" ? [] : filtered;

  function flash(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2800);
  }

  async function handleCreate(name: string, hskLevel: number, description: string) {
    const res = await createTeacherClass({ name, hskLevel, description });
    setClasses((current) => [res.classItem, ...current]);
    setCreating(false);
    flash("Đã tạo lớp — mã ghi danh " + res.classItem.enrollmentCode);
  }

  async function handleArchive() {
    if (!archiving) return;
    try {
      await archiveTeacherClass(archiving.id);
    } catch {}
    setClasses((current) =>
      current.map((c) => (c.id === archiving.id ? { ...c, status: "archived" } : c)),
    );
    flash("Đã lưu trữ " + archiving.name);
    setArchiving(null);
  }

  return (
    <TeacherShell crumbs={[{ label: "Giáo viên" }, { label: "Lớp học" }]}>
      <header className={styles.titleRow}>
        <div>
          <p className={styles.eyebrow}>LỚP HỌC</p>
          <h1>Lớp của tôi</h1>
          <p className={styles.subtitle}>
            {classes.filter((c) => c.status === "active").length} lớp đang hoạt động ·{" "}
            {classes.filter((c) => c.status === "archived").length} đã lưu trữ
          </p>
        </div>
        <button className={styles.primaryButton} onClick={() => setCreating(true)}>
          <Plus size={16} />
          <span>Tạo lớp mới</span>
        </button>
      </header>

      <section className={styles.filterCard} aria-label="Bộ lọc lớp học">
        <label className={styles.searchBox}>
          <span className={styles.fieldLabel}>Tìm kiếm</span>
          <span className={styles.inputControl}>
            <Search size={17} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tên lớp hoặc mã ghi danh"
            />
          </span>
        </label>
        <label className={styles.selectField}>
          <span className={styles.fieldLabel}>Trạng thái</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          >
            <option value="all">Tất cả</option>
            <option value="active">Đang hoạt động</option>
            <option value="archived">Đã lưu trữ</option>
          </select>
        </label>
        <div className={styles.filterMeta}>
          {hasFilters && (
            <button
              className={styles.clearButton}
              onClick={() => {
                setQuery("");
                setStatusFilter("all");
                setReviewState("ready");
              }}
            >
              Xóa lọc
            </button>
          )}
          <span>{display.length} lớp</span>
        </div>
      </section>

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

      <section className={styles.tableCard} aria-label="Danh sách lớp">
        {reviewState === "loading" ? (
          <div className={styles.loading} aria-busy="true" aria-label="Đang tải">
            {[1, 2, 3, 4].map((r) => (
              <div key={r} className={styles.skeletonRow}>
                <span />
                <span />
                <span />
              </div>
            ))}
          </div>
        ) : display.length === 0 ? (
          <div className={styles.emptyState}>
            <Inbox size={38} />
            <h2>{hasFilters ? "Không tìm thấy lớp phù hợp" : "Chưa có lớp nào"}</h2>
            <p>
              {hasFilters
                ? "Thử thay đổi từ khóa hoặc bộ lọc hiện tại."
                : "Tạo lớp đầu tiên để chia sẻ mã ghi danh với học sinh."}
            </p>
            {!hasFilters && (
              <button className={styles.primaryButton} onClick={() => setCreating(true)}>
                <Plus size={16} />
                <span>Tạo lớp đầu tiên</span>
              </button>
            )}
          </div>
        ) : (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Lớp học</th>
                    <th>Cấp HSK</th>
                    <th>Mã ghi danh</th>
                    <th>Học sinh</th>
                    <th>Trạng thái</th>
                    <th>Ngày tạo</th>
                    <th>
                      <span className="sr-only">Thao tác</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {display.map((cls) => (
                    <ClassRow
                      key={cls.id}
                      cls={cls}
                      activeMenu={activeMenu === cls.id}
                      onToggleMenu={() => setActiveMenu(activeMenu === cls.id ? null : cls.id)}
                      onOpen={() => router.push("/teacher/classes/" + cls.id)}
                      onArchive={() => {
                        setActiveMenu(null);
                        setArchiving(cls);
                      }}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <div className={styles.mobileList}>
              {display.map((cls) => (
                <ClassCard key={cls.id} cls={cls} onOpen={() => router.push("/teacher/classes/" + cls.id)} onArchive={() => setArchiving(cls)} />
              ))}
            </div>
          </>
        )}
      </section>

      <ReviewSwitcher value={reviewState} onChange={setReviewState} />
      {toast && <Toast message={toast} />}
      {creating && <CreateClassModal onClose={() => setCreating(false)} onCreate={handleCreate} />}
      {archiving && (
        <ConfirmModal
          title="Lưu trữ lớp"
          description={"Lớp " + archiving.name + " sẽ chuyển sang trạng thái đã lưu trữ. Học sinh không thể tham gia bằng mã ghi danh cũ. Hành động này không thể hoàn tác."}
          confirmLabel="Lưu trữ lớp"
          danger
          onClose={() => setArchiving(null)}
          onConfirm={handleArchive}
        />
      )}
    </TeacherShell>
  );
}

function ClassRow({
  cls,
  activeMenu,
  onToggleMenu,
  onOpen,
  onArchive,
}: {
  cls: TeacherClass;
  activeMenu: boolean;
  onToggleMenu: () => void;
  onOpen: () => void;
  onArchive: () => void;
}) {
  // C3: dismissal lives with the row that owns the menu.
  const menuRef = useDismissMenu<HTMLTableCellElement>(activeMenu, () => { if (activeMenu) onToggleMenu(); });
  return (
    <tr tabIndex={0} onClick={onOpen} onKeyDown={(e) => e.key === "Enter" && onOpen()}>
      <td>
        <div className={styles.nameCell}>
          <strong>{cls.name}</strong>
          <small>{cls.description || "—"}</small>
        </div>
      </td>
      <td>
        <span className={styles.levelBadge}>HSK {cls.hskLevel}</span>
      </td>
      <td onClick={(e) => e.stopPropagation()}>
        <CopyChip value={cls.enrollmentCode} />
      </td>
      <td className={styles.numeric}>{cls.studentCount}</td>
      <td>
        <StatusPill status={cls.status} label={classStatusLabels[cls.status]} />
      </td>
      <td className={styles.numeric}>{formatDate(cls.createdAt)}</td>
      <td className={styles.actionCell} onClick={(e) => e.stopPropagation()} ref={activeMenu ? menuRef : undefined}>
        <button
          className={styles.moreButton}
          onClick={onToggleMenu}
          aria-label={"Thao tác cho " + cls.name}
          aria-haspopup="menu"
          aria-expanded={activeMenu}
          aria-controls={"cmenu-" + cls.id}
        >
          <MoreHorizontal size={19} />
        </button>
        {activeMenu && (
          <div className={styles.actionMenu} id={"cmenu-" + cls.id} role="menu">
            <button onClick={onOpen}>Xem chi tiết</button>
            {cls.status === "active" && (
              <button className={styles.dangerAction} onClick={onArchive}>
                <Archive size={14} />
                Lưu trữ
              </button>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}

function ClassCard({
  cls,
  onOpen,
  onArchive,
}: {
  cls: TeacherClass;
  onOpen: () => void;
  onArchive: () => void;
}) {
  return (
    <article className={styles.mobileCard}>
      <div className={styles.mobileCardHead}>
        <div className={styles.nameCell}>
          <strong>{cls.name}</strong>
          <small>HSK {cls.hskLevel}</small>
        </div>
        <StatusPill status={cls.status} label={classStatusLabels[cls.status]} />
      </div>
      <div className={styles.mobileCardMeta}>
        <CopyChip value={cls.enrollmentCode} />
        <span>{cls.studentCount} học sinh</span>
        <span>{formatDate(cls.createdAt)}</span>
      </div>
      <div className={styles.mobileCardActions}>
        <button onClick={onOpen}>Xem chi tiết</button>
        {cls.status === "active" && <button onClick={onArchive}>Lưu trữ</button>}
      </div>
    </article>
  );
}
