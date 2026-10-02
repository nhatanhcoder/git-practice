"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ApiError } from "@/lib/api-client";
import { formatDateTime } from "@/lib/formatters";
import { CatalogBadge, CatalogDialog, CatalogShell, CatalogSkeleton } from "@/components/admin-catalog/catalog-ui";
import { catalogLabels, catalogStatuses, catalogError, fetchAdminCatalogPaths, fetchAdminCatalogUnits, isCatalogConflict, moderateCatalogPath, unpublishCatalogUnit, type CatalogFilter, type CatalogPath, type CatalogUnit } from "@/lib/admin-learning-catalog-service";
import styles from "@/components/admin-catalog/catalog.module.css";

type Decision = { action: "approve" | "reject"; path: CatalogPath } | { action: "unpublish"; unit: CatalogUnit };
const emptyCopy: Record<CatalogFilter, string> = {
  pending_review: "Không có lộ trình nào chờ duyệt", approved: "Chưa có lộ trình đã duyệt",
  rejected: "Chưa có lộ trình bị từ chối", suspended: "Chưa có lộ trình tạm ẩn",
  draft: "Chưa có bản nháp", all: "Chưa có lộ trình nào",
};

export default function AdminLearningPathsPage() {
  return <Suspense fallback={<CatalogShell><CatalogSkeleton /></CatalogShell>}><Queue /></Suspense>;
}

function Queue() {
  const params = useSearchParams();
  const rawStatus = params.get("status") || "pending_review";
  const status: CatalogFilter = rawStatus === "all" || catalogStatuses.includes(rawStatus as typeof catalogStatuses[number]) ? rawStatus as CatalogFilter : "pending_review";
  const unitsView = params.get("view") === "units";
  const page = Math.max(1, Number.parseInt(params.get("page") || "1", 10) || 1);
  const teacherId = params.get("teacherId") || undefined;
  const [paths, setPaths] = useState<CatalogPath[]>([]);
  const [units, setUnits] = useState<CatalogUnit[]>([]);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [forbidden, setForbidden] = useState(false);
  const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0);
  const [decision, setDecision] = useState<Decision | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true); setError(""); setForbidden(false);
    const request = unitsView ? fetchAdminCatalogUnits(page) : fetchAdminCatalogPaths(status, page, teacherId);
    void request.then((result) => {
      if (!active) return;
      if (unitsView) setUnits(result.items as CatalogUnit[]); else setPaths(result.items as CatalogPath[]);
      setTotal(result.total); setLimit(result.limit);
    }).catch((err: unknown) => {
      if (!active) return;
      setForbidden(err instanceof ApiError && err.isForbidden); setError(catalogError(err));
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [unitsView, status, page, teacherId, revision]);

  function href(nextStatus: CatalogFilter | "units", nextPage = 1) {
    const query = new URLSearchParams(nextStatus === "units" ? { view: "units" } : { status: nextStatus });
    if (nextPage > 1) query.set("page", String(nextPage));
    if (teacherId && nextStatus !== "units") query.set("teacherId", teacherId);
    return `/admin/learning-paths?${query}`;
  }
  async function confirm(reason: string) {
    if (!decision) return;
    try {
      if (decision.action === "unpublish") {
        const updated = await unpublishCatalogUnit(decision.unit.id);
        setUnits((current) => current.map((unit) => unit.id === updated.id ? updated : unit));
        setNotice("Đã gỡ bài học. Tiến độ học viên được giữ nguyên.");
      } else {
        await moderateCatalogPath(decision.path.id, decision.action, reason);
        setNotice(decision.action === "approve" ? "Đã duyệt lộ trình" : "Đã từ chối lộ trình");
        setRevision((value) => value + 1);
      }
      setDecision(null);
    } catch (err) {
      if (isCatalogConflict(err)) {
        setDecision(null); setNotice("Nội dung đã được xử lý bởi người khác. Đang tải lại trạng thái mới nhất.");
        setRevision((value) => value + 1);
      } else throw err;
    }
  }
  function actions(path: CatalogPath) {
    const enabled = status === "pending_review" && path.status === "pending_review";
    return <div className={styles.actions}><button className={styles.primary} disabled={!enabled || path.unitCount === 0} title={path.unitCount === 0 ? "Lộ trình chưa có bài học nào" : !enabled ? "Chỉ xử lý được ở tab Chờ duyệt" : undefined} onClick={() => setDecision({ action: "approve", path })}>Duyệt</button><button disabled={!enabled} title={!enabled ? "Chỉ xử lý được ở tab Chờ duyệt" : undefined} onClick={() => setDecision({ action: "reject", path })}>Từ chối</button></div>;
  }
  const rows = unitsView ? units : paths;
  const pages = Math.max(1, Math.ceil(total / limit));
  return <CatalogShell>
    <header className={styles.header}><div><span className={styles.eyebrow}>KIỂM DUYỆT NỘI DUNG</span><h1>Lộ trình học</h1><p>{loading ? "Đang tải danh sách…" : error ? "Chưa tải được danh sách" : `${total} ${unitsView ? "bài học" : "lộ trình"}`} · nội dung do giáo viên gửi</p></div></header>
    <nav className={styles.tabs} aria-label="Lọc lộ trình">{(["pending_review", "approved", "rejected", "suspended", "all"] as const).map((value) => <Link key={value} href={href(value)} aria-current={!unitsView && status === value ? "page" : undefined}>{value === "all" ? "Tất cả" : catalogLabels[value]}</Link>)}<Link href={href("units")} aria-current={unitsView ? "page" : undefined}>Bài học đã publish</Link></nav>
    {notice && <p className={styles.notice} role="status">{notice}</p>}
    {error ? <section className={styles.error} role="alert"><h2>{forbidden ? "Không có quyền truy cập" : "Không tải được danh sách"}</h2><p>{error}</p>{!forbidden && <button className={styles.retry} onClick={() => setRevision((value) => value + 1)}>Thử lại</button>}</section> : <section className={styles.card} aria-label={unitsView ? "Bài học đã publish" : "Danh sách lộ trình"} aria-busy={loading}>
      {loading ? <CatalogSkeleton /> : rows.length === 0 ? <div className={styles.empty}><h2>{unitsView ? "Chưa có bài học đã publish" : emptyCopy[status]}</h2><p>{page > 1 ? "Trang này không còn kết quả. Hãy quay về trang trước." : "Nội dung sẽ xuất hiện ở đây khi giáo viên gửi hoặc publish bài học."}</p></div> : unitsView ? <>
        <div className={styles.desktop}><table className={styles.table}><thead><tr><th>Bài học</th><th>HSK</th><th>Số từ</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{units.map((unit) => <tr key={unit.id}><td><strong>{unit.title || "—"}</strong><small>{unit.slug}</small></td><td>{unit.level}</td><td>{unit.wordCount ?? "—"}</td><td>{unit.published ? "Đã publish" : "Đã gỡ"}</td><td><div className={styles.actions}><button disabled={!unit.published} onClick={() => setDecision({ action: "unpublish", unit })}>Gỡ</button></div></td></tr>)}</tbody></table></div>
        <div className={styles.mobile}>{units.map((unit) => <article key={unit.id}><strong>{unit.title || "—"}</strong><p>HSK {unit.level} · {unit.wordCount ?? "—"} từ · {unit.published ? "Đã publish" : "Đã gỡ"}</p><div className={styles.actions}><button disabled={!unit.published} onClick={() => setDecision({ action: "unpublish", unit })}>Gỡ</button></div></article>)}</div>
      </> : <>
        <div className={styles.desktop}><table className={styles.table}><thead><tr><th>Lộ trình</th><th>Giáo viên</th><th>Bài học</th><th>Gửi lúc</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{paths.map((path) => <tr key={path.id}><td><Link className={styles.rowTitle} href={`/admin/learning-paths/${path.id}`}>{path.title || "Lộ trình chưa có tên"}</Link></td><td>{path.owner?.nickname || "—"}</td><td>{path.unitCount ?? "—"}</td><td className={styles.numeric}>{formatDateTime(path.submittedAt)}</td><td><CatalogBadge status={path.status} /></td><td>{actions(path)}</td></tr>)}</tbody></table></div>
        <div className={styles.mobile}>{paths.map((path) => <article key={path.id}><Link className={styles.rowTitle} href={`/admin/learning-paths/${path.id}`}>{path.title || "Lộ trình chưa có tên"}</Link><p>{path.owner?.nickname || "—"} · {path.unitCount ?? "—"} bài học</p><p className={styles.muted}>{formatDateTime(path.submittedAt)}</p><CatalogBadge status={path.status} />{actions(path)}</article>)}</div>
      </>}
      {!loading && <footer className={styles.pagination}><span>Trang {page} / {pages}</span><div>{page > 1 && <Link href={href(unitsView ? "units" : status, page - 1)}>Trang trước</Link>}{page < pages && <Link href={href(unitsView ? "units" : status, page + 1)}>Trang sau</Link>}</div></footer>}
    </section>}
    {decision && <CatalogDialog title={decision.action === "reject" ? "Từ chối lộ trình" : decision.action === "approve" ? "Duyệt lộ trình" : "Gỡ bài học"} label={decision.action === "reject" ? "Từ chối lộ trình" : decision.action === "approve" ? "Duyệt lộ trình" : "Gỡ bài học"} reject={decision.action === "reject"} description={decision.action === "unpublish" ? `Gỡ “${decision.unit.title}” khỏi nền tảng? Tiến độ học viên đã học vẫn được giữ.` : decision.action === "reject" ? `Từ chối “${decision.path.title}” và gửi lý do cho giáo viên.` : `Duyệt “${decision.path.title}”? Giáo viên có thể publish bài học cho học viên toàn nền tảng.`} onClose={() => setDecision(null)} onConfirm={confirm} />}
  </CatalogShell>;
}
