"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PageHead, Panel } from "@/components/student/primitives";
import { fetchMistakeSession, reviewMistake, type Mistake } from "@/lib/student/mistakes-service";
export default function MistakeReviewPage() {
 const [queue, setQueue] = useState<Mistake[]>([]);
 const [index, setIndex] = useState(0);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState("");
 const [skipped, setSkipped] = useState(0);
 const [picked, setPicked] = useState<string[]>([]);
 const [text, setText] = useState("");
 const [revealed, setRevealed] = useState(false);
 const [feedback, setFeedback] = useState<{correct: boolean; explanation: string | null} | null>(null);
 const [busy, setBusy] = useState(false);
 const lock = useRef(false);
 const load = useCallback(async () => {
  setLoading(true); setError(""); setQueue([]); setIndex(0); setFeedback(null);
  setPicked([]); setText(""); setRevealed(false);
  try {
   const items = await fetchMistakeSession();
   setSkipped(items.filter(i => !i.available).length);
   setQueue(items.filter(i => i.available));
  } catch { setError("Không tải được phiên ôn. Vui lòng thử lại."); }
  finally { setLoading(false); }
 }, []);
 useEffect(() => { void load(); }, [load]);
 const item = queue[index];
 async function submit(recalled?: boolean) {
  if (!item || lock.current || feedback) return;
  lock.current = true; setBusy(true); setError("");
  try {
   const answer = item.sourceType === "flashcard" ? {recalled: recalled === true}
    : {selectedOptions: item.options.length ? picked : text.split(",").map(s => s.trim()).filter(Boolean)};
   setFeedback(await reviewMistake(item, answer));
  } catch { setError("Không lưu được kết quả hoặc phiên đã thay đổi. Hãy tải lại phiên trước khi tiếp tục."); }
  finally { lock.current = false; setBusy(false); }
 }
 function next() {
  setIndex(i => i + 1); setFeedback(null); setPicked([]); setText(""); setRevealed(false); setError("");
 }
 return <div className="stack gap-5">
  <Link href="/student/mistakes" className="backlink">← Sổ tay lỗi sai</Link>
  <PageHead title="Ôn lỗi sai" sub="Kết quả được lưu theo tài khoản; không thay đổi điểm bài tập chính thức." />
  {loading ? <p role="status">Đang tải phiên ôn…</p> : <>
   {skipped > 0 && <p>{skipped} nội dung gốc không còn khả dụng đã được bỏ qua.</p>}
   {error && <Panel className="panel--pad"><p role="alert">{error}</p><button disabled={busy} className="btn btn--outline" onClick={() => void load()}>Tải lại phiên</button></Panel>}
   {!error && !item && <Panel className="panel--pad"><h2>{queue.length ? "Đã hoàn thành phiên ôn" : "Không có lỗi sai cần ôn"}</h2>
    <p>Câu ôn chưa đúng vẫn ở lại sổ tay để bạn luyện tiếp.</p><button className="btn btn--primary" onClick={() => void load()}>Kiểm tra lại</button></Panel>}
   {item && <Panel className="panel--pad stack gap-4">
    <p>{index + 1}/{queue.length} · {item.sourceType === "flashcard" ? "Từ vựng" : "Câu hỏi"}</p>
    <h2 style={{overflowWrap: "anywhere", whiteSpace: "pre-wrap"}}>{item.prompt}</h2>
    {item.audioUrl && <audio controls src={item.audioUrl} style={{width: "100%"}} />}
    {item.sourceType === "flashcard" ? <>
     {!revealed ? <button className="btn btn--outline" onClick={() => setRevealed(true)}>Hiện nghĩa</button>
      : <><p>{item.pinyin}</p><p>{item.meaning}</p>
      <div className="row gap-3" style={{flexWrap: "wrap"}}>
       <button className="btn btn--outline" disabled={busy || !!feedback || !!error} onClick={() => void submit(false)}>Chưa nhớ</button>
       <button className="btn btn--primary" disabled={busy || !!feedback || !!error} onClick={() => void submit(true)}>Đã nhớ</button>
      </div></>}
    </> : <fieldset disabled={busy || !!feedback || !!error} style={{minWidth: 0, border: 0, padding: 0}}>
     <legend>Chọn câu trả lời</legend>
     {item.options.length ? item.options.map(o => <label key={o.id} className="row gap-3" style={{overflowWrap: "anywhere", paddingBlock: 8}}>
      <input type="checkbox" checked={picked.includes(o.id)} onChange={() => setPicked(p => p.includes(o.id) ? p.filter(v => v !== o.id) : [...p, o.id])} />
      <span>{o.id}. {o.text}</span></label>)
      : <label>Câu trả lời (nhiều phần ngăn cách bằng dấu phẩy)<input style={{width: "100%", boxSizing: "border-box"}} value={text} onChange={e => setText(e.target.value)} /></label>}
     <button className="btn btn--primary" onClick={() => void submit()}>Kiểm tra</button>
    </fieldset>}
    {busy && <p role="status">Đang lưu…</p>}
    {feedback && <div role="status"><p>{feedback.correct ? "Đúng — đã lưu trạng thái đã ôn." : "Chưa đúng — nội dung vẫn cần ôn."}</p>
     {feedback.explanation && <p style={{overflowWrap: "anywhere"}}>{feedback.explanation}</p>}
     <button className="btn btn--primary" onClick={next}>Tiếp tục</button></div>}
   </Panel>}
  </>}
 </div>;
}
