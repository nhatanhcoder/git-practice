"use client";

import Link from "next/link";
import { Hammer, Home } from "lucide-react";
import { Panel } from "./primitives";

export function UnavailableState({
  title = "Tính năng đang được phát triển",
  description = "Chức năng này chưa được kết nối với máy chủ dữ liệu trong phiên bản hiện tại. Tiến độ thực tế sẽ được cập nhật khi tính năng ra mắt.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="student-container" style={{ padding: "var(--sp-8) var(--sp-4)" }}>
      <Panel className="unavailable-state stack items-center text-center gap-4" style={{ padding: "var(--sp-8)" }}>
        <div
          className="avatar avatar--lg"
          style={{
            backgroundColor: "var(--surface-3)",
            color: "var(--accent)",
            width: 64,
            height: 64,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          aria-hidden="true"
        >
          <Hammer size={32} />
        </div>
        <div className="stack gap-2 max-w-md">
          <h1 style={{ fontSize: "var(--step-2)", fontWeight: 700, margin: 0 }}>{title}</h1>
          <p style={{ color: "var(--text-3)", fontSize: "var(--step--1)", lineHeight: 1.6 }}>
            {description}
          </p>
        </div>
        <div className="row gap-3" style={{ marginTop: "var(--sp-2)" }}>
          <Link href="/student" className="btn btn--primary">
            <Home size={16} /> Về trang chủ học viên
          </Link>
        </div>
      </Panel>
    </div>
  );
}
