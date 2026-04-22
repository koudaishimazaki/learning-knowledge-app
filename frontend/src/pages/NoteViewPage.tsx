import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useNavigate, useOutletContext, useParams, useSearchParams } from "react-router-dom";
import { deleteNote, getNote } from "../api/notes";
import type { Note, Tag, Topic } from "../types/notes";

type ShellContext = {
  topics: Topic[];
  tags: Tag[];
  onRefreshNotes: () => Promise<void> | void;
  setFocusMode: (v: boolean) => void;
};

type TocItem = { level: number; text: string; id: string };

function slugify(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

function extractToc(md: string): TocItem[] {
  const lines = md.split(/\r?\n/);
  const toc: TocItem[] = [];
  let inCode = false;
  const used = new Map<string, number>();

  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      inCode = !inCode;
      continue;
    }
    if (inCode) continue;
    const m = /^(#{1,4})\s+(.+?)\s*$/.exec(line);
    if (!m) continue;
    const level = m[1].length;
    const text = m[2].replace(/\s+#+\s*$/, "").trim();
    if (!text) continue;
    const base = slugify(text) || "section";
    const n = (used.get(base) ?? 0) + 1;
    used.set(base, n);
    const id = n === 1 ? base : `${base}-${n}`;
    toc.push({ level, text, id });
  }
  return toc;
}

export function NoteViewPage() {
  const navigate = useNavigate();
  const { noteId } = useParams();
  const [sp] = useSearchParams();
  const { topics, tags, onRefreshNotes, setFocusMode } = useOutletContext<ShellContext>();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<Note | null>(null);
  const [mode, setMode] = useState<"preview" | "raw">("preview");
  const [activeTocId, setActiveTocId] = useState<string>("");
  const mdRef = useRef<HTMLDivElement | null>(null);
  const headingCountsRef = useRef<Map<string, number>>(new Map());

  const tagById = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags]);
  const toc = useMemo(() => extractToc(note?.markdown_content ?? ""), [note?.markdown_content]);
  const components = useMemo(() => {
    return {
      h1: (props: any) => {
        const text = String(props.children?.[0] ?? "").trim();
        const base = slugify(text) || "section";
        const n = (headingCountsRef.current.get(base) ?? 0) + 1;
        headingCountsRef.current.set(base, n);
        const id = n === 1 ? base : `${base}-${n}`;
        return <h1 id={id} {...props} />;
      },
      h2: (props: any) => {
        const text = String(props.children?.[0] ?? "").trim();
        const base = slugify(text) || "section";
        const n = (headingCountsRef.current.get(base) ?? 0) + 1;
        headingCountsRef.current.set(base, n);
        const id = n === 1 ? base : `${base}-${n}`;
        return <h2 id={id} {...props} />;
      },
      h3: (props: any) => {
        const text = String(props.children?.[0] ?? "").trim();
        const base = slugify(text) || "section";
        const n = (headingCountsRef.current.get(base) ?? 0) + 1;
        headingCountsRef.current.set(base, n);
        const id = n === 1 ? base : `${base}-${n}`;
        return <h3 id={id} {...props} />;
      },
      h4: (props: any) => {
        const text = String(props.children?.[0] ?? "").trim();
        const base = slugify(text) || "section";
        const n = (headingCountsRef.current.get(base) ?? 0) + 1;
        headingCountsRef.current.set(base, n);
        const id = n === 1 ? base : `${base}-${n}`;
        return <h4 id={id} {...props} />;
      },
    };
  }, []);

  async function load() {
    if (!noteId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await getNote(noteId);
      setNote(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId]);

  useEffect(() => {
    headingCountsRef.current = new Map();
    setActiveTocId(toc[0]?.id ?? "");
  }, [note?.markdown_content, toc]);

  useEffect(() => {
    if (mode !== "preview") return;
    const root = mdRef.current;
    if (!root) return;
    const headings = root.querySelectorAll("h1[id], h2[id], h3[id], h4[id]");
    if (!headings.length) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (a.boundingClientRect.top ?? 0) - (b.boundingClientRect.top ?? 0));
        const first = visible[0]?.target as HTMLElement | undefined;
        const id = first?.id;
        if (id) setActiveTocId(id);
      },
      { root: root, threshold: [0.3, 0.6] },
    );
    headings.forEach((h) => obs.observe(h));
    return () => obs.disconnect();
  }, [mode, note?.markdown_content]);

  async function onDelete() {
    if (!noteId) return;
    if (!confirm("このノートを削除しますか？")) return;
    setBusy(true);
    setError(null);
    try {
      await deleteNote(noteId);
      await onRefreshNotes();
      navigate(`/notes?${sp.toString()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  if (!noteId) {
    return <div className="notion-view-inner">ノートを選択してください</div>;
  }

  return (
    <div className="notion-view-inner">
      <div className="notion-view-header">
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 900, fontSize: 18, overflow: "hidden", textOverflow: "ellipsis" }}>
            {note?.title ?? "Loading..."}
          </div>
          {note ? (
            <div style={{ marginTop: 6, display: "flex", gap: 10, flexWrap: "wrap", color: "var(--muted-2)", fontSize: 12 }}>
              <span>{note.is_starred ? "★ starred" : "☆"}</span>
              <span>updated: {new Date(note.updated_at).toLocaleString()}</span>
              <span>
                topic:{" "}
                {note.topic_id
                  ? topics.find((t) => t.id === note.topic_id)?.name ?? "（不明）"
                  : "なし"}
              </span>
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button type="button" onClick={() => setMode((m) => (m === "preview" ? "raw" : "preview"))} disabled={!note}>
            {mode === "preview" ? "Raw" : "Preview"}
          </button>
          <button type="button" onClick={() => setFocusMode(true)} title="本文を最大化">
            Maximize
          </button>
          <button type="button" onClick={() => setFocusMode(false)} title="通常表示に戻す">
            Unfocus
          </button>
          <button type="button" className="btn-primary" onClick={() => navigate(`/notes/${noteId}/edit?${sp.toString()}`)} disabled={!note}>
            編集
          </button>
          <button
            type="button"
            onClick={() => void onDelete()}
            disabled={busy}
            style={{
              borderColor: "rgba(255, 77, 109, 0.45)",
              background: "rgba(255, 77, 109, 0.10)",
              color: "rgba(255, 255, 255, 0.92)",
            }}
          >
            削除
          </button>
        </div>
      </div>

      {error ? <div className="error">{error}</div> : null}

      {note ? (
        <>
          {note.tag_ids.length ? (
            <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {note.tag_ids.slice(0, 40).map((id) => (
                <span
                  key={id}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 999,
                    border: "1px solid var(--border)",
                    background: "rgba(255, 255, 255, 0.06)",
                    fontSize: 12,
                  }}
                >
                  {tagById.get(id)?.name ?? "unknown"}
                </span>
              ))}
            </div>
          ) : null}

          <div className="notion-view-grid">
            <div ref={mdRef} className={`notion-markdown ${mode === "preview" ? "md" : ""}`}>
              {mode === "preview" ? (
                <ReactMarkdown components={components as any}>{note.markdown_content || ""}</ReactMarkdown>
              ) : (
                <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{note.markdown_content || ""}</pre>
              )}
            </div>

            <div className="notion-outline">
              <div style={{ fontWeight: 800, marginBottom: 8 }}>目次</div>
              {toc.length === 0 ? (
                <div style={{ color: "var(--muted-2)", fontSize: 12 }}>見出しなし</div>
              ) : (
                <div style={{ display: "grid", gap: 6 }}>
                  {toc.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={`outline-link ${activeTocId === t.id ? "is-active" : ""}`}
                      style={{ paddingLeft: (t.level - 1) * 10 }}
                      onClick={() => {
                        const el = document.getElementById(t.id);
                        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                      title={t.text}
                    >
                      {t.text}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div style={{ marginTop: 12, color: "var(--muted)" }}>{busy ? "Loading..." : "Not found"}</div>
      )}
    </div>
  );
}

