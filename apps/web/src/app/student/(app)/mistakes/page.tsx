"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageHead, Panel } from "@/components/student/primitives";
import { fetchMistakes, type Mistake } from "@/lib/student/mistakes-service";
export default function MistakeNotebookPage() {
 const [items, setItems] = useState<Mistake[]>([]);
 const [page, setPage] = useState(1);
 const [pages, setPages] = useState(0);
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState(false);
 const load = useCallback(async () => {
  setLoading(true); setError(false); setItems([]);
  try { const res = await fetchMistakes(page); setItems(res.items); setPages(res.totalPages); }
  catch { setError(true); }
  finally { setLoading(false); }
 }, [page]);
 useEffect(() => { void load(); }, [load]);
 return <div className="stack gap-5">
  <PageHead title="Sổ tay lỗi sai" sub="Những lần ôn từ chưa nhớ và câu trả lời sai trong bài đã chấm." />
  <Link className="btn btn--primary" href="/student/mistakes/review">Ôn lỗi sai</Link>
  {loading ? <Panel className="panel--pad"><p role="status">Đang tải lỗi sai…</p></Panel>
   : error ? <Panel className="panel--pad"><p role="alert">Không tải được sổ tay lỗi sai.</p><button className="btn btn--outline" onClick={() => void load()}>Thử lại</button></Panel>
   : !items.length ? <Panel className="panel--pad"><h2>Chưa có lỗi sai</h2><p>Khi bạn ôn chưa nhớ hoặc trả lời sai trong bài đã chấm, nội dung sẽ xuất hiện ở đây.</p></Panel>
   : <><div className="stack gap-3">{items.map(item => <Panel key={item.id} className="panel--pad">
    <p className="eyebrow">{item.sourceType === "flashcard" ? "Từ vựng" : "Câu hỏi trong bài tập"}</p>
    <p style={{overflowWrap: "anywhere", whiteSpace: "pre-wrap"}}>{item.prompt}</p>
    {item.pinyin && <p>{item.pinyin}</p>}
    <p>{item.available ? item.status === "reviewed" ? "Đã ôn đúng" : "Cần ôn" : "Nội dung gốc không còn khả dụng"}</p>
   </Panel>)}</div>
   <nav aria-label="Phân trang lỗi sai" className="row gap-3">
    <button className="btn btn--outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Trước</button>
    <span>{page}/{pages}</span>
    <button className="btn btn--outline" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Sau</button>
   </nav></>}
 </div>;
}
