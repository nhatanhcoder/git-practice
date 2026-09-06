export default function StudentLoading() {
  return (
    <div className="stack gap-6" role="status" aria-live="polite" aria-label="Đang tải khu vực học">
      <span className="sr-only">Đang tải khu vực học…</span>
      <div className="stack gap-3" aria-hidden="true">
        <span className="skel" style={{ width: 96, height: 11, borderRadius: 6 }} />
        <span className="skel" style={{ width: "min(520px, 78%)", height: 44, borderRadius: 10 }} />
        <span className="skel" style={{ width: "min(660px, 92%)", height: 16, borderRadius: 8 }} />
      </div>
      <div className="panel panel--pad stack gap-4" aria-hidden="true">
        <span className="skel" style={{ width: "35%", height: 18, borderRadius: 8 }} />
        <span className="skel" style={{ width: "100%", height: 180, borderRadius: 14 }} />
        <span className="skel" style={{ width: "82%", height: 14, borderRadius: 7 }} />
        <span className="skel" style={{ width: "64%", height: 14, borderRadius: 7 }} />
      </div>
    </div>
  );
}
