"use client";

import Link from "next/link";
import { ArrowLeft, Construction, type LucideIcon } from "lucide-react";
import { Card, GhostButton } from "@/components/student/ui";

export function ComingSoon({
  title,
  desc,
  icon: Icon,
  bullets,
}: {
  title: string;
  desc: string;
  icon: LucideIcon;
  bullets: string[];
}) {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/student"
          className="sp-press flex h-10 w-10 items-center justify-center rounded-xl border border-sp-line bg-sp-card text-sp-ink2 hover:text-sp-primary"
          aria-label="Quay lại Tổng quan"
        >
          <ArrowLeft size={18} aria-hidden="true" />
        </Link>
        <h1 className="sp-font-head text-2xl font-black text-sp-ink sm:text-3xl">{title}</h1>
      </div>

      <Card className="p-8 text-center sm:p-12">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-sp-primary-soft text-sp-primary">
          <Icon size={30} aria-hidden="true" />
        </span>
        <h2 className="sp-font-head mt-5 text-xl font-black text-sp-ink">Sắp ra mắt</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-sp-ink2">{desc}</p>
        <ul className="mx-auto mt-6 max-w-sm space-y-2 text-left">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-2 text-sm text-sp-ink2">
              <Construction size={15} className="mt-0.5 shrink-0 text-sp-warn" aria-hidden="true" />
              {b}
            </li>
          ))}
        </ul>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/student"
            className="sp-press sp-font-head inline-flex items-center justify-center rounded-xl bg-sp-primary px-5 py-3 text-sm font-extrabold text-white hover:bg-sp-primary-strong"
          >
            Quay lại Tổng quan
          </Link>
          <GhostButton>Tiếp tục học bài hiện tại</GhostButton>
        </div>
      </Card>
    </div>
  );
}
