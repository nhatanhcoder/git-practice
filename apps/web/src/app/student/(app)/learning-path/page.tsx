"use client";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { BookOpen, Check, Lock, Play } from "lucide-react";
import {
  Bar,
  Chip,
  EmptyState,
  ErrorState,
  PageHead,
  Panel,
  SkeletonPanel,
} from "@/components/student/primitives";
import { useAuthStore } from "@/lib/auth/auth-store";
import {
  fetchLearningPath,
  LEARNING_CURRICULA,
  type LearningCatalog,
  type LearningState,
} from "@/lib/student/learning-path-service";
import styles from "./learning-path.module.css";

const labels: Record<LearningState, string> = {
  locked: "Chưa mở",
  available: "Sẵn sàng",
  in_progress: "Đang học",
  completed: "Hoàn thành",
};
export default function LearningPathPage() {
  return (
    <Suspense fallback={<SkeletonPanel />}>
      <LearningPathInner />
    </Suspense>
  );
}
function LearningPathInner() {
  const router = useRouter(),
    params = useSearchParams();
  const userId = useAuthStore((s) => s.user?.id);
  const raw = params.get("curriculum");
  const curriculum =
    LEARNING_CURRICULA.find((c) => c.id === raw)?.id ?? "hanlo_vocabulary";
  const rawLevel = Number(params.get("level") ?? 1),
    rawPage = Number(params.get("page") ?? 1);
  const level =
    Number.isInteger(rawLevel) && rawLevel >= 1 && rawLevel <= 9 ? rawLevel : 1;
  const page =
    Number.isInteger(rawPage) && rawPage >= 1 && rawPage <= 10000 ? rawPage : 1;
  const view = params.get("view") === "list" ? "list" : "map";
  const [data, setData] = useState<LearningCatalog | null>(null);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(false);
  const generation = useRef(0);
  const load = useCallback(async () => {
    const current = ++generation.current;
    setLoading(true);
    setError(false);
    setData(null);
    try {
      const result = await fetchLearningPath(curriculum, level, page);
      if (current === generation.current) setData(result);
    } catch {
      if (current === generation.current) setError(true);
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }, [curriculum, level, page]);
  const invalidate = useCallback(() => {
    generation.current += 1;
  }, []);
  useEffect(() => {
    void load();
    return invalidate;
  }, [load, userId, invalidate]);
  function filter(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    next.set(key, value);
    if (key === "level" || key === "curriculum") next.delete("page");
    router.push(`/student/learning-path?${next}`, { scroll: false });
  }
  return (
    <div className={styles.page}>
      <Link href="/student" className="backlink">
        ← Quay lại Dashboard
      </Link>
      <PageHead
        title="Lộ trình từ vựng"
        sub="Học từng nhóm từ, luyện nghĩa và tiếp tục từ đúng chỗ bạn đã dừng."
      />
      <div className={styles.filters}>
        <label>
          Nguồn học
          <select
            value={curriculum}
            onChange={(e) => filter("curriculum", e.target.value)}
          >
            {LEARNING_CURRICULA.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Cấp độ
          <select
            value={level}
            onChange={(e) => filter("level", e.target.value)}
          >
            {Array.from({ length: 9 }, (_, i) => (
              <option value={i + 1} key={i}>
                HSK {i + 1}
              </option>
            ))}
          </select>
        </label>
        <div className={styles.toggle} role="group" aria-label="Kiểu hiển thị">
          <button
            className="btn btn--outline"
            aria-pressed={view === "map"}
            onClick={() => filter("view", "map")}
          >
            Lộ trình
          </button>
          <button
            className="btn btn--outline"
            aria-pressed={view === "list"}
            onClick={() => filter("view", "list")}
          >
            Danh sách
          </button>
        </div>
      </div>
      {loading ? (
        <SkeletonPanel rows={4} />
      ) : error ? (
        <ErrorState
          text="Không tải được lộ trình. Kiểm tra kết nối rồi thử lại."
          onRetry={() => void load()}
        />
      ) : (
        data && (
          <>
            {data.total > 0 && (
              <Panel className="panel--pad">
                <div className={styles.summary}>
                  <strong>HSK {level}</strong>
                  <span>
                    {data.completed}/{data.total} bài đã hoàn thành
                  </span>
                </div>
                <Bar
                  value={(data.completed / data.total) * 100}
                  label="Tiến độ cấp độ"
                />
                <p className={styles.note}>
                  Từ vựng theo nguồn Hán Lộ; học bài trước để mở bài tiếp theo.
                  Mỗi cấp độ bắt đầu độc lập.
                </p>
              </Panel>
            )}
            {!data.total ? (
              <EmptyState
                title={
                  curriculum === "hanlo_vocabulary"
                    ? "Chưa có bài học ở cấp độ này"
                    : "Chưa có nội dung giáo trình"
                }
                text={
                  curriculum === "hanlo_vocabulary"
                    ? "Nội dung chưa được phát hành. Bạn có thể chọn cấp độ khác."
                    : "Nội dung giáo trình đang chờ xác minh. Bạn có thể học từ vựng Hán Lộ ngay."
                }
                action={
                  curriculum !== "hanlo_vocabulary" ? (
                    <button
                      className="btn btn--primary"
                      onClick={() => filter("curriculum", "hanlo_vocabulary")}
                    >
                      Học từ vựng Hán Lộ
                    </button>
                  ) : undefined
                }
              />
            ) : !data.units.length ? (
              <EmptyState
                title="Trang này không có bài học"
                action={
                  <button
                    className="btn btn--outline"
                    onClick={() => filter("page", "1")}
                  >
                    Về trang đầu
                  </button>
                }
              />
            ) : (
              <ol className={view === "map" ? styles.trail : styles.list}>
                {data.units.map((u) => (
                  <li key={u.slug} className={styles.unit} data-state={u.state}>
                    <span className={styles.marker} aria-hidden="true">
                      {u.state === "completed" ? (
                        <Check size={22} />
                      ) : u.state === "locked" ? (
                        <Lock size={20} />
                      ) : (
                        <BookOpen size={22} />
                      )}
                    </span>
                    <Panel className="panel--pad">
                      <div className={styles.summary}>
                        <span className="eyebrow">Bài {u.order}</span>
                        <Chip
                          tone={
                            u.state === "completed"
                              ? "success"
                              : u.state === "in_progress"
                                ? "accent"
                                : "neutral"
                          }
                        >
                          {labels[u.state]}
                        </Chip>
                      </div>
                      <h2>{u.title}</h2>
                      <p>{u.wordCount} từ · Học và luyện nghĩa</p>
                      {u.state === "locked" ? (
                        <p className={styles.note}>
                          Hoàn thành bài trước để mở khóa.
                        </p>
                      ) : (
                        <Link
                          className="btn btn--primary"
                          href={`/student/learning-path/${u.slug}`}
                        >
                          <Play size={16} />
                          {u.state === "completed"
                            ? "Xem lại"
                            : u.state === "in_progress"
                              ? "Tiếp tục học"
                              : "Học bài"}
                        </Link>
                      )}
                    </Panel>
                  </li>
                ))}
              </ol>
            )}
            {data.totalPages > 1 && (
              <nav
                className={styles.pagination}
                aria-label="Phân trang bài học"
              >
                <button
                  className="btn btn--outline"
                  disabled={page <= 1}
                  onClick={() => filter("page", String(page - 1))}
                >
                  Trước
                </button>
                <span>
                  {page}/{data.totalPages}
                </span>
                <button
                  className="btn btn--outline"
                  disabled={page >= data.totalPages}
                  onClick={() => filter("page", String(page + 1))}
                >
                  Sau
                </button>
              </nav>
            )}
          </>
        )
      )}
    </div>
  );
}
