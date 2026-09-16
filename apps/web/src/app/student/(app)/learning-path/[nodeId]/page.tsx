"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Bar,
  Chip,
  ErrorState,
  PageHead,
  Panel,
  SkeletonPanel,
} from "@/components/student/primitives";
import { ApiError } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth/auth-store";
import {
  fetchLearningUnit,
  updateLearningUnit,
  type LearningDetail,
} from "@/lib/student/learning-path-service";
import styles from "../learning-path.module.css";

export default function LearningUnitPage() {
  const { nodeId: slug } = useParams<{ nodeId: string }>();
  const userId = useAuthStore((s) => s.user?.id);
  const [data, setData] = useState<LearningDetail | null>(null);
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ title: string; text: string } | null>(
    null,
  );
  const [index, setIndex] = useState(0),
    [choice, setChoice] = useState(""),
    [retry, setRetry] = useState(false);
  const generation = useRef(0),
    lock = useRef(false);
  const accept = useCallback((result: LearningDetail) => {
    setData(result);
    const first = result.progress?.answers.findIndex((a) => !a) ?? 0;
    const next = first < 0 ? 0 : first;
    setIndex(next);
    setChoice(result.progress?.answers[next] ?? "");
  }, []);
  const fail = useCallback((err: unknown) => {
    const code = err instanceof ApiError ? err.code : "";
    setError(
      code === "LEARNING_UNIT_LOCKED"
        ? {
            title: "Bài học chưa mở",
            text: "Hoàn thành bài trước trong lộ trình để học bài này.",
          }
        : code === "LEARNING_UNIT_NOT_FOUND"
          ? {
              title: "Không tìm thấy bài học",
              text: "Bài học không tồn tại hoặc chưa được phát hành.",
            }
          : {
              title: "Không tải hoặc lưu được bài học",
              text: "Kết nối hoặc tiến độ đã thay đổi. Hãy tải lại trước khi tiếp tục.",
            },
    );
  }, []);
  const load = useCallback(async () => {
    const current = ++generation.current;
    setLoading(true);
    setError(null);
    setData(null);
    setRetry(false);
    try {
      const result = await fetchLearningUnit(slug);
      if (current === generation.current) accept(result);
    } catch (err) {
      if (current === generation.current) fail(err);
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }, [slug, accept, fail]);
  const invalidate = useCallback(() => {
    generation.current += 1;
  }, []);
  useEffect(() => {
    void load();
    return invalidate;
  }, [load, userId, invalidate]);
  async function mutate(action: "start" | "study" | "answers" | "complete") {
    if (lock.current || !data || error) return;
    lock.current = true;
    setBusy(true);
    const current = generation.current;
    try {
      const body =
        action === "start"
          ? undefined
          : {
              revision: data.progress!.revision,
              ...(action === "study"
                ? { index: data.progress!.studyIndex }
                : {}),
              ...(action === "answers" ? { index, choiceId: choice } : {}),
            };
      const result = await updateLearningUnit(slug, action, body);
      if (current !== generation.current) return;
      setData(result);
      if (action === "answers") {
        const next = Math.min(index + 1, result.quiz.length - 1);
        setIndex(next);
        setChoice(result.progress?.answers[next] ?? "");
      }
      if (action === "complete") setRetry(false);
    } catch (err) {
      if (current === generation.current) fail(err);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const progress = data?.progress;
  const studyWord =
    data && progress ? data.unit.words[progress.studyIndex] : null;
  const completed = progress?.status === "completed";
  const showResult = !!data?.result && !retry;
  const allAnswered =
    progress?.answers.length === data?.quiz.length &&
    progress?.answers.every(Boolean);
  return (
    <div className={styles.page}>
      <Link
        className="backlink"
        href={`/student/learning-path?curriculum=hanlo_vocabulary&level=${data?.unit.level ?? 1}`}
      >
        ← Quay lại lộ trình
      </Link>
      {loading ? (
        <SkeletonPanel rows={4} />
      ) : error ? (
        <ErrorState
          title={error.title}
          text={error.text}
          onRetry={() => void load()}
        />
      ) : (
        data && (
          <div className={styles.lesson}>
            <PageHead
              title={data.unit.title}
              sub={`${data.unit.words.length} từ · Học → Luyện tập → Hoàn thành`}
            />
            <div className={styles.summary}>
              <Chip tone={completed ? "success" : "accent"}>
                {completed ? "Hoàn thành" : progress ? "Đang học" : "Sẵn sàng"}
              </Chip>
              <span>
                {progress?.studyIndex ?? 0}/{data.unit.words.length} từ đã học
              </span>
            </div>
            <Bar
              value={
                ((progress?.studyIndex ?? 0) / data.unit.words.length) * 100
              }
              label="Tiến độ học từ"
            />
            {!progress ? (
              <Panel className="panel--pad">
                <h2>Học và nhận biết nghĩa của từ</h2>
                <p className={styles.note}>
                  Học đủ từ, trả lời các câu hỏi và đạt ít nhất 80% để mở bài
                  tiếp theo. Tiến độ được lưu theo tài khoản.
                </p>
                <div className={styles.actions}>
                  <button
                    className="btn btn--primary"
                    disabled={busy}
                    onClick={() => void mutate("start")}
                  >
                    Bắt đầu học
                  </button>
                </div>
              </Panel>
            ) : showResult ? (
              <Panel className="panel--pad">
                <h2>
                  {data.result!.passed
                    ? "Đã hoàn thành bài học"
                    : "Cần luyện thêm"}
                </h2>
                <p className={styles.note}>
                  Kết quả: {data.result!.score}/{data.result!.total} câu đúng.
                  Điểm cao nhất: {progress.bestScore}/{data.result!.total}.
                </p>
                <ul className={styles.feedback}>
                  {data.result!.feedback.map((f, i) => (
                    <li key={i}>
                      <strong>{f.hanzi}</strong> · {f.meaning}{" "}
                      <Chip tone={f.correct ? "success" : "warn"}>
                        {f.correct ? "Đúng" : "Chưa đúng"}
                      </Chip>
                    </li>
                  ))}
                </ul>
                <div className={styles.actions}>
                  {completed ? (
                    data.nextSlug ? (
                      <Link
                        className="btn btn--primary"
                        href={`/student/learning-path/${data.nextSlug}`}
                      >
                        Học bài tiếp theo
                      </Link>
                    ) : (
                      <Link
                        className="btn btn--primary"
                        href={`/student/learning-path?level=${data.unit.level}`}
                      >
                        Về lộ trình
                      </Link>
                    )
                  ) : (
                    <button
                      className="btn btn--primary"
                      onClick={() => {
                        setRetry(true);
                        setIndex(0);
                        setChoice(progress.answers[0] ?? "");
                      }}
                    >
                      Luyện lại
                    </button>
                  )}
                </div>
              </Panel>
            ) : studyWord ? (
              <Panel className="panel--pad">
                <p className="eyebrow">
                  Học từ {progress.studyIndex + 1}/{data.unit.words.length}
                </p>
                <div className={styles.word}>
                  <h2 className={styles.hanzi}>{studyWord.hanzi}</h2>
                  <p className={styles.pinyin}>{studyWord.pinyin}</p>
                  <p className={styles.meaning}>{studyWord.meaning}</p>
                </div>
                <button
                  className="btn btn--primary"
                  disabled={busy}
                  onClick={() => void mutate("study")}
                >
                  Đã học từ này
                </button>
              </Panel>
            ) : (
              <Panel className="panel--pad">
                <p className="eyebrow">
                  Luyện tập · Câu {index + 1}/{data.quiz.length}
                </p>
                <h2 className={styles.hanzi}>{data.quiz[index].prompt}</h2>
                <fieldset className={styles.options} disabled={busy}>
                  <legend>Chọn nghĩa đúng</legend>
                  {data.quiz[index].options.map((o) => (
                    <label key={o.id} className={styles.option}>
                      <input
                        type="radio"
                        name="meaning"
                        value={o.id}
                        checked={choice === o.id}
                        onChange={() => setChoice(o.id)}
                      />
                      <span>{o.text}</span>
                    </label>
                  ))}
                </fieldset>
                <div className={styles.actions}>
                  <button
                    className="btn btn--outline"
                    disabled={busy || index === 0}
                    onClick={() => {
                      setIndex(index - 1);
                      setChoice(progress.answers[index - 1] ?? "");
                    }}
                  >
                    Câu trước
                  </button>
                  <button
                    className="btn btn--primary"
                    disabled={busy || !choice}
                    onClick={() => void mutate("answers")}
                  >
                    Lưu câu trả lời
                  </button>
                  {allAnswered && (
                    <button
                      className="btn btn--primary"
                      disabled={busy || choice !== progress.answers[index]}
                      onClick={() => void mutate("complete")}
                    >
                      Kiểm tra kết quả
                    </button>
                  )}
                </div>
                <p className={styles.note}>
                  {progress.answers.filter(Boolean).length}/{data.quiz.length}{" "}
                  câu đã lưu. Kết quả chỉ được xác nhận sau khi server chấm.
                </p>
              </Panel>
            )}
            {busy && <p role="status">Đang lưu tiến độ…</p>}
          </div>
        )
      )}
    </div>
  );
}
