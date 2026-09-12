"use client";

/**
 * /student/invoices/[invoiceId] — one invoice: period, amounts, payment history.
 *
 * Contract: docs/front-end-design-docs/pages/student-pages/student-invoice-detail.md
 * Feature: S-BILL-2 (detail + payments). This is the `new_invoice`
 * notification's deep-link target (06-billing.md §10, Q-BILL-8).
 *
 * `not_found` deliberately covers "does not exist", "not yours" and "voided":
 * the API answers all three the same way (INV-BILLING-33), so the screen does
 * too — never a hint that another id exists. Money renders from envelope
 * strings; totals are three separate server values, no subtraction anywhere.
 */

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ReceiptText, TriangleAlert } from "lucide-react";
import {
  Chip,
  EmptyState,
  ErrorState,
  PageHead,
  Panel,
  SkeletonPanel,
} from "@/components/student/primitives";
import {
  fetchMyInvoiceDetail,
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_TONES,
  formatMoney,
  formatPeriod,
  isValidInvoiceId,
  resolveMyInvoiceOutcome,
  resolveRecorderName,
  type StudentInvoiceDetail,
} from "@/lib/student/invoices-service";

function formatPaymentDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("vi-VN");
}

export default function StudentInvoiceDetailPage() {
  const params = useParams<{ invoiceId: string }>();
  const invoiceId = decodeURIComponent(params?.invoiceId ?? "");

  const validId = isValidInvoiceId(invoiceId);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [detail, setDetail] = useState<StudentInvoiceDetail | null>(null);

  const loadDetail = useCallback(async () => {
    if (!validId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await fetchMyInvoiceDetail(invoiceId);
      setDetail(result);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [invoiceId, validId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const outcome = resolveMyInvoiceOutcome(loading, validId, error, detail);

  return (
    <div className="stack gap-6">
      <Link href="/student/invoices" className="backlink">
        <ArrowLeft size={15} /> Hóa đơn học phí
      </Link>

      {outcome === "loading" ? (
        <>
          <PageHead title="Đang tải hóa đơn..." sub="Vui lòng chờ giây lát" />
          <SkeletonPanel rows={4} height={72} />
        </>
      ) : null}

      {outcome === "invalid_id" || outcome === "not_found" ? (
        <Panel className="panel--pad">
          <EmptyState
            title="Không tìm thấy hóa đơn"
            text="Hóa đơn này không tồn tại, không thuộc về bạn, hoặc đã bị hủy."
            icon={<TriangleAlert size={28} aria-hidden="true" />}
          />
        </Panel>
      ) : null}

      {outcome === "error" ? (
        <Panel className="panel--pad">
          <ErrorState title="Không thể tải hóa đơn" onRetry={loadDetail} />
        </Panel>
      ) : null}

      {outcome === "ready" && detail ? (
        <>
          <PageHead
            eyebrow="Học phí"
            title={detail.code}
            sub={`Kỳ ${formatPeriod(detail.periodStart, detail.periodEnd)} · Hạn thanh toán ${formatPeriod(detail.dueDate, detail.dueDate)}`}
            action={
              <Chip tone={INVOICE_STATUS_TONES[detail.status]}>
                {INVOICE_STATUS_LABELS[detail.status]}
              </Chip>
            }
          />

          <div className="row gap-4 wrap">
            <Panel className="panel--pad grow">
              <p className="lms-card__meta">TỔNG HÓA ĐƠN</p>
              <strong style={{ fontSize: "1.35rem" }}>{formatMoney(detail.totalAmount)}</strong>
            </Panel>
            <Panel className="panel--pad grow">
              <p className="lms-card__meta">ĐÃ THANH TOÁN</p>
              <strong style={{ fontSize: "1.35rem" }}>{formatMoney(detail.paidAmount)}</strong>
            </Panel>
            <Panel className="panel--pad grow">
              <p className="lms-card__meta">CÒN LẠI</p>
              <strong style={{ fontSize: "1.35rem" }}>{formatMoney(detail.outstandingAmount)}</strong>
            </Panel>
          </div>

          <Panel className="panel--pad">
            <h2 className="panel__title" style={{ display: "flex", gap: "var(--sp-2)", alignItems: "center" }}>
              <ReceiptText size={18} aria-hidden="true" /> Lịch sử thanh toán
            </h2>

            {detail.payments.length === 0 ? (
              <p className="lms-card__meta" style={{ padding: "var(--sp-4) 0" }}>
                Trung tâm chưa ghi nhận khoản thanh toán nào cho hóa đơn này.
              </p>
            ) : (
              <ul className="stack gap-0 list-none" style={{ padding: 0, margin: 0 }}>
                {detail.payments.map((p) => (
                  <li
                    key={p.id}
                    className="row gap-3 wrap items-center"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      borderTop: "1px solid var(--line)",
                      padding: "var(--sp-4) 0",
                    }}
                  >
                    <span className="stack gap-1">
                      <strong>{formatMoney(p.amount)}</strong>
                      <span className="lms-card__meta">
                        {formatPaymentDate(p.paidAt)} · {p.paymentMethod}
                        {p.transactionReference ? ` · ${p.transactionReference}` : ""}
                      </span>
                      <span className="lms-card__meta">
                        Ghi nhận bởi {resolveRecorderName(p.recordedBy)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </>
      ) : null}
    </div>
  );
}
