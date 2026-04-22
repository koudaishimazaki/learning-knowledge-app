import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useNavigate, useOutletContext, useParams, useSearchParams } from "react-router-dom";
import { getNote, updateNote } from "../api/notes";
import type { Note, Tag, Topic } from "../types/notes";

type ShellContext = {
  topics: Topic[];
  tags: Tag[];
  onRefreshNotes: () => Promise<void> | void;
  setFocusMode: (v: boolean) => void;
};

function slugify(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

export function NoteEditPage() {
  const navigate = useNavigate();
  const { noteId } = useParams();
  const [sp] = useSearchParams();
  const { topics, tags, onRefreshNotes, setFocusMode } = useOutletContext<ShellContext>();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<Note | null>(null);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [starred, setStarred] = useState(false);
  const [topicId, setTopicId] = useState<string | null>(null);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [tagQuery, setTagQuery] = useState("");

  const filteredTags = useMemo(() => {
    const qq = tagQuery.trim().toLowerCase();
    if (!qq) return tags;
    return tags.filter((t) => t.name.toLowerCase().includes(qq));
  }, [tagQuery, tags]);

  const isDirty = useMemo(() => {
    if (!note) return false;
    const a = [...tagIds].sort().join(",");
    const b = [...note.tag_ids].sort().join(",");
    return (
      title !== note.title ||
      body !== note.markdown_content ||
      starred !== note.is_starred ||
      (topicId ?? null) !== (note.topic_id ?? null) ||
      a !== b
    );
  }, [body, note, starred, tagIds, title, topicId]);

  async function load() {
    if (!noteId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await getNote(noteId);
      setNote(res);
      setTitle(res.title);
      setBody(res.markdown_content);
      setStarred(res.is_starred);
      setTopicId(res.topic_id);
      setTagIds(res.tag_ids);
      setTagQuery("");
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

  function toggleTag(id: string) {
    setTagIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function save() {
    if (!noteId) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await updateNote(noteId, {
        title: title.trim(),
        markdown_content: body,
        is_starred: starred,
        topic_id: topicId,
        tag_ids: tagIds,
      });
      setNote(updated);
      await onRefreshNotes();
      navigate(`/notes/${noteId}?${sp.toString()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  if (!noteId) return <div className="notion-view-inner">Not found</div>;

  return (
    <div className="notion-view-inner">
      <div className="notion-view-header">
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 900, fontSize: 18, overflow: "hidden", textOverflow: "ellipsis" }}>
            編集: {note?.title ?? ""}
          </div>
          <div style={{ marginTop: 6, color: "var(--muted-2)", fontSize: 12 }}>
            {isDirty ? "未保存の変更があります" : "変更なし"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button type="button" onClick={() => navigate(`/notes/${noteId}?${sp.toString()}`)} disabled={busy}>
            戻る
          </button>
          <button type="button" onClick={() => setFocusMode(true)} title="本文を最大化">
            Maximize
          </button>
          <button type="button" onClick={() => setFocusMode(false)} title="通常表示に戻す">
            Unfocus
          </button>
          <button type="button" className="btn-primary" onClick={() => void save()} disabled={busy || !isDirty}>
            保存
          </button>
        </div>
      </div>

      {error ? <div className="error">{error}</div> : null}

      <div className="editor-grid">
        <div className="editor-pane">
          <label style={{ display: "grid", gap: 6 }}>
            <span>タイトル</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 10 }}>
            <label style={{ display: "inline-flex", gap: 6, alignItems: "center", whiteSpace: "nowrap" }}>
              <input type="checkbox" checked={starred} onChange={(e) => setStarred(e.target.checked)} />
              スター
            </label>

            <select value={topicId ?? ""} onChange={(e) => setTopicId(e.target.value || null)} style={{ maxWidth: 360 }}>
              <option value="">Topic: なし</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.icon_type === "emoji" ? t.icon_emoji : "🖼"} {t.name}
                </option>
              ))}
            </select>
          </div>

          <label style={{ display: "grid", gap: 6, marginTop: 10 }}>
            <span>本文（Markdown）</span>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={22} />
          </label>

          <div style={{ marginTop: 12 }}>
            <div style={{ fontWeight: 750, marginBottom: 8 }}>Tags</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <input
                value={tagQuery}
                onChange={(e) => setTagQuery(e.target.value)}
                placeholder="タグ絞り込み（例: react）"
                style={{ flex: "1 1 260px" }}
              />
              <button type="button" onClick={() => setTagIds([])} disabled={busy || tagIds.length === 0}>
                クリア
              </button>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
              {filteredTags.map((t) => {
                const active = tagIds.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleTag(t.id)}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 999,
                      border: active ? "1px solid rgba(124, 92, 255, 0.65)" : "1px solid var(--border)",
                      background: active ? "rgba(124, 92, 255, 0.22)" : "rgba(255, 255, 255, 0.06)",
                    }}
                  >
                    {t.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="editor-pane">
          <div style={{ fontWeight: 750, marginBottom: 8 }}>Preview</div>
          <div className="notion-markdown md" style={{ maxHeight: "calc(100vh - 220px)" }}>
            <ReactMarkdown
              components={{
                h1: (props: any) => {
                  const text = String(props.children?.[0] ?? "").trim();
                  return <h1 id={slugify(text)} {...props} />;
                },
                h2: (props: any) => {
                  const text = String(props.children?.[0] ?? "").trim();
                  return <h2 id={slugify(text)} {...props} />;
                },
                h3: (props: any) => {
                  const text = String(props.children?.[0] ?? "").trim();
                  return <h3 id={slugify(text)} {...props} />;
                },
                h4: (props: any) => {
                  const text = String(props.children?.[0] ?? "").trim();
                  return <h4 id={slugify(text)} {...props} />;
                },
              }}
            >
              {body || ""}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}

