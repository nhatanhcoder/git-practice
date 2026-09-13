"use client";

/**
 * /student/invoices — the learner's own tuition invoices, read-only.
 *
 * Contract: docs/front-end-design-docs/pages/student-pages/student-invoices.md
 * Features: S-BILL-1 (list). S-BILL-2 (detail) lives one click deeper.
 *
 * Money rule: every amount renders straight from the envelope decimal string
 * (formatMoney groups digits; it never parses or computes). The FE subtracts
 * nothing — `outstandingAmount` arrives already derived (INV-BILLING-16).
 * Voided invoices never reach here: the API filters them server-side
 * (06-billing.md §5), so this screen has no void branch to draw.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, ReceiptText } from "lucide-react";
import {
  Chip,
  EmptyState,
  ErrorState,
  PageHead,
  Panel,
  SkeletonPanel,
} from "@/components/student/primitives";
import {
  fetchMyInvoices,
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_TONES,
  formatMoney,
  formatPeriod,
  formatDate,
  resolveInvoicesOutcome,
  type InvoiceListMeta,
  type StudentInvoice,
} from "@/lib/student/invoices-service";

const PAGE_SIZE = 20;

export default function StudentInvoicesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [invoices, setInvoices] = useState<StudentInvoice[]>([]);
  const [meta, setMeta] = useState<InvoiceListMeta | null>(null);
  const [page, setPage] = useState(1);

  const loadInvoices = useCallback(async (nextPage: number) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchMyInvoices(nextPage, PAGE_SIZE);
      setInvoices(result.invoices);
      setMeta(result.meta);
      setPage(nextPage);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInvoices(1);
  }, [loadInvoices]);

  const outcome = resolveInvoicesOutcome(loading, error, invoices.length);

  return (
    <div className="stack gap-6">
      <PageHead
        eyebrow="Học phí"
        title="Hóa đơn học phí"
        sub={
          loading
            ? "Đang tải hóa đơn..."
            : error
              ? "Không tải được danh sách hóa đơn."
              : invoices.length > 0 && meta
                ? `${meta.total} hóa đơn`
                : "Trung tâm phát hành hóa đơn học phí theo tháng."
        }
      />

      {outcome === "loading" ? <SkeletonPanel rows={4} height={72} /> : null}

      {outcome === "error" ? (
        <Panel className="panel--pad">
          <ErrorState
            title="Không thể tải danh sách hóa đơn"
            onRetry={() => loadInvoices(page)}
          />
        </Panel>
      ) : null}

      {outcome === "empty" ? (
        <Panel className="panel--pad">
          <EmptyState
            title="Chưa có hóa đơn nào"
            text="Khi trung tâm phát hành hóa đơn học phí tháng, nó sẽ xuất hiện ở đây cùng với lịch sử thanh toán."
            icon={<ReceiptText size={28} aria-hidden="true" />}
          />
        </Panel>
      ) : null}

      {outcome === "ready" ? (
        <Panel className="panel--pad">
          <ul className="stack gap-0 list-none" style={{ padding: 0, margin: 0 }}>
            {invoices.map((inv) => (
              <li key={inv.id} style={{ borderTop: "1px solid var(--line)" }}>
                <Link
                  href={`/student/invoices/${inv.id}`}
                  className="row gap-3 wrap items-center"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "var(--sp-4) 0",
                    textDecoration: "none",
                  }}
                >
                  <span className="stack gap-1 grow">
                    <span className="row gap-2 wrap items-center">
                      <strong style={{ fontWeight: 650 }}>{inv.code}</strong>
                      <Chip tone={INVOICE_STATUS_TONES[inv.status]}>
                        {INVOICE_STATUS_LABELS[inv.status]}
                      </Chip>
                    </span>
                    <span className="lms-card__meta">
                      Kỳ {formatPeriod(inv.periodStart, inv.periodEnd)} · Hạn{" "}
                      {formatDate(inv.dueDate)}
                    </span>
                  </span>
                  <span className="stack gap-1" style={{ textAlign: "right" }}>
                    <strong>{formatMoney(inv.totalAmount)}</strong>
                    {inv.status !== "paid" ? (
                      <span className="lms-card__meta">
                        Còn lại {formatMoney(inv.outstandingAmount)}
                      </span>
                    ) : null}
                  </span>
                  <ChevronRight size={16} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>

          {meta && meta.totalPages > 1 ? (
            <div className="row gap-3 wrap" style={{ justifyContent: "center", marginTop: "var(--sp-4)" }}>
              <button
                type="button"
                className="btn btn--outline"
                disabled={page <= 1 || loading}
                onClick={() => loadInvoices(page - 1)}
              >
                ← Trang trước
              </button>
              <span className="lms-card__meta" style={{ alignSelf: "center" }}>
                Trang {page} / {meta.totalPages}
              </span>
              <button
                type="button"
                className="btn btn--outline"
                disabled={page >= meta.totalPages || loading}
                onClick={() => loadInvoices(page + 1)}
              >
                Trang sau →
              </button>
            </div>
          ) : null}
        </Panel>
      ) : null}
    </div>
  );
}
