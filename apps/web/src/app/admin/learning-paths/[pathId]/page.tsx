"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ApiError } from "@/lib/api-client";
import { formatDateTime } from "@/lib/formatters";
import { CatalogBadge, CatalogDialog, CatalogShell, CatalogSkeleton } from "@/components/admin-catalog/catalog-ui";
import { catalogError, fetchAdminCatalogDetail, isCatalogConflict, moderateCatalogPath, unpublishCatalogUnit, type CatalogAction, type CatalogDetail, type CatalogUnit } from "@/lib/admin-learning-catalog-service";
import styles from "@/components/admin-catalog/catalog.module.css";

const labels: Record<CatalogAction, string> = { approve: "Duyệt", reject: "Từ chối", suspend: "Tạm ẩn", restore: "Khôi phục" };
const consequences: Record<CatalogAction, string> = {
  approve: "Duyệt lộ trình này? Giáo viên có thể publish bài học cho học viên toàn nền tảng.",
  reject: "Giáo viên sẽ nhận lý do từ chối và có thể sửa rồi gửi lại.",
  suspend: "Tạm ẩn lộ trình? Học viên sẽ không thấy nội dung này nữa. Tiến độ đã học vẫn được giữ.",
  restore: "Khôi phục lộ trình? Học viên sẽ thấy lại đúng các bài đang publish.",
};
type Decision = { action: CatalogAction } | { action: "unpublish"; unit: CatalogUnit };

export default function AdminLearningPathDetailPage({ params }: { params: { pathId: string } }) {
  const { pathId } = params;
  const [detail, setDetail] = useState<CatalogDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [forbidden, setForbidden] = useState(false);
  const [missing, setMissing] = useState(false);
  const [revision, setRevision] = useState(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    let active = true;
    setLoading(true); setError(""); setForbidden(false); setMissing(false);
    void fetchAdminCatalogDetail(pathId).then((value) => { if (active) setDetail(value); }).catch((err: unknown) => {
      if (!active) return;
      setError(catalogError(err));
      setForbidden(err instanceof ApiError && err.isForbidden);
      setMissing(err instanceof ApiError && err.statusCode === 404);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [pathId, revision]);

  async function confirm(reason: string) {
    if (!decision) return;
    try {
      if (decision.action === "unpublish") {
        const updated = await unpublishCatalogUnit(decision.unit.id);
        setDetail((current) => {
          if (!current) return current;
          const units = current.units.map((unit) => unit.id === updated.id ? updated : unit);
          return { ...current, units, publishedUnitCount: units.filter((unit) => unit.published).length };
        });
        setNotice("Đã gỡ bài học. Tiến độ học viên được giữ nguyên.");
      } else {
        const updated = await moderateCatalogPath(pathId, decision.action, reason);
        setDetail(updated);
        setNotice({ approve: "Đã duyệt lộ trình", reject: "Đã từ chối lộ trình", suspend: "Đã tạm ẩn lộ trình", restore: "Đã khôi phục lộ trình" }[decision.action]);
      }
      setDecision(null);
    } catch (err) {
      if (isCatalogConflict(err)) {
        setDecision(null); setNotice("Lộ trình đã được xử lý bởi người khác. Đang tải lại trạng thái mới nhất.");
        setRevision((value) => value + 1);
      } else throw err;
    }
  }
  const actions: CatalogAction[] = detail?.status === "pending_review" ? ["approve", "reject"] : detail?.status === "approved" ? ["suspend"] : detail?.status === "suspended" ? ["restore"] : [];
  return <CatalogShell detail>
    <Link href="/admin/learning-paths">← Về danh sách lộ trình</Link>
    {notice && <p className={styles.notice} role="status">{notice}</p>}
    {loading ? <CatalogSkeleton /> : error ? <section className={styles.error} role="alert"><h1>{forbidden ? "Không có quyền truy cập" : missing ? "Không tìm thấy lộ trình" : "Không tải được lộ trình"}</h1><p>{error}</p>{!forbidden && !missing && <button className={styles.retry} onClick={() => setRevision((value) => value + 1)}>Thử lại</button>}</section> : detail && <>
      <header className={styles.header}><div><h1>{detail.title || "Lộ trình chưa có tên"}</h1><p>{detail.owner?.nickname || "—"} · Gửi lúc {formatDateTime(detail.submittedAt)}</p><CatalogBadge status={detail.status} /></div></header>
      {detail.status === "suspended" && <p className={styles.notice}>Lộ trình đang bị tạm ẩn. Học viên không thấy nội dung; tiến độ đã học vẫn còn.</p>}
      {detail.status === "approved" && <p className={styles.notice}>Lộ trình đã được duyệt. Học viên chỉ thấy những bài giáo viên đã publish.</p>}
      <section className={`${styles.card} ${styles.padded}`}><h2>Mô tả lộ trình</h2><p className={styles.description}>{detail.description || "Chưa có mô tả."}</p></section>
      <section className={`${styles.card} ${styles.padded}`} aria-label="Bài học trong lộ trình"><h2>Bài học ({detail.units.length})</h2>
        {detail.units.length === 0 ? <p>Lộ trình chưa có bài học nào.</p> : detail.units.map((unit) => <article className={styles.card} key={unit.id}>
          <div className={`${styles.unitHeader} ${styles.padded}`}><div><button aria-expanded={expanded === unit.id} aria-controls={`preview-${unit.id}`} onClick={() => setExpanded(expanded === unit.id ? null : unit.id)}><strong>{unit.order}. {unit.title || "Bài học chưa có tên"}</strong></button><small>HSK {unit.level} · {unit.kind === "reference" ? "Tham chiếu" : "Tự soạn"} · {unit.wordCount ?? "—"} từ · {unit.published ? "Đã publish" : "Chưa publish"}</small></div>{unit.published && <div className={styles.actions}><button onClick={() => setDecision({ action: "unpublish", unit })}>Gỡ</button></div>}</div>
          {expanded === unit.id && <div className={styles.preview} id={`preview-${unit.id}`}><UnitWords unit={unit} /></div>}
        </article>)}
      </section>
      <section className={`${styles.card} ${styles.padded}`}><h2>Thông tin kiểm duyệt</h2><dl className={styles.audit}><div><dt>Người duyệt</dt><dd>{detail.reviewedBy?.nickname || "—"}</dd></div><div><dt>Thời điểm duyệt</dt><dd>{formatDateTime(detail.reviewedAt)}</dd></div><div><dt>Lý do từ chối</dt><dd className={styles.description}>{detail.rejectionReason || "—"}</dd></div>{detail.suspendedAt && <div><dt>Tạm ẩn</dt><dd>{detail.suspendedBy?.nickname || "—"} · {formatDateTime(detail.suspendedAt)}</dd></div>}{detail.restoredAt && <div><dt>Khôi phục</dt><dd>{detail.restoredBy?.nickname || "—"} · {formatDateTime(detail.restoredAt)}</dd></div>}</dl></section>
      {actions.length > 0 && <div className={`${styles.actions} ${styles.detailActions}`} aria-label="Thao tác kiểm duyệt">{actions.map((action) => <button key={action} className={action === "approve" ? styles.primary : undefined} disabled={action === "approve" && detail.units.length === 0} title={action === "approve" && detail.units.length === 0 ? "Lộ trình chưa có bài học nào" : undefined} onClick={() => setDecision({ action })}>{labels[action]}</button>)}</div>}
    </>}
    {decision && <CatalogDialog title={decision.action === "unpublish" ? "Gỡ bài học" : `${labels[decision.action]} lộ trình`} label={decision.action === "unpublish" ? "Gỡ bài học" : `${labels[decision.action]} lộ trình`} reject={decision.action === "reject"} description={decision.action === "unpublish" ? `Gỡ “${decision.unit.title}” khỏi nền tảng? Tiến độ học viên đã học vẫn được giữ.` : consequences[decision.action]} onClose={() => setDecision(null)} onConfirm={confirm} />}
  </CatalogShell>;
}

function UnitWords({ unit }: { unit: CatalogUnit }) {
  return <>{unit.kind === "reference" && <p className={styles.muted}>Bài học này dùng từ vựng của một bài có sẵn trong catalog: {unit.referenceSlug || "—"}.</p>}{unit.words?.length ? <div className={styles.words}>{unit.words.map((word, index) => <div key={`${word.hanzi}-${index}`} className={styles.word}><strong lang="zh">{word.hanzi}</strong><span>{word.pinyin}</span><span>{word.meaning}</span></div>)}</div> : <p className={styles.notice}>{unit.kind === "reference" ? "Chưa xem được nội dung bài tham chiếu tại đây." : "Chưa có nội dung từ vựng để hiển thị."}</p>}</>;
}
