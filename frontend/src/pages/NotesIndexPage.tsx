import { useNavigate, useSearchParams } from "react-router-dom";

export function NotesIndexPage() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();

  return (
    <div className="notion-view-inner">
      <div style={{ color: "var(--muted)", fontSize: 14 }}>
        左の一覧からノートを選択してください。
      </div>
      <div style={{ marginTop: 14 }}>
        <button type="button" className="btn-primary" onClick={() => navigate(`/manage?${sp.toString()}`)}>
          新規ノートを作る
        </button>
      </div>
    </div>
  );
}

