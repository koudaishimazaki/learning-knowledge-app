import { useEffect, useMemo, useState } from "react";
import { clearAccessToken } from "../auth/token";
import { me } from "../api/auth";
import {
  createNote,
  deleteNote,
  listNotes,
  listTags,
  listTopics,
  updateNote,
} from "../api/notes";
import type { Note, Tag, Topic } from "../types/notes";

type Props = {
  onLogout: () => void;
};

function TopicChip({ topic }: { topic: Topic }) {
  const icon =
    topic.icon_type === "emoji" ? topic.icon_emoji : topic.icon_image_url ? "🖼" : "•";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 10px",
        borderRadius: 999,
        border: "1px solid #ddd",
        background: "#fff",
      }}
      title={topic.name}
    >
      <span>{icon}</span>
      <span>{topic.name}</span>
    </span>
  );
}

export function NotesPage({ onLogout }: Props) {
  const [email, setEmail] = useState<string>("");
  const [notes, setNotes] = useState<Note[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  const [q, setQ] = useState("");
  const [starredOnly, setStarredOnly] = useState(false);
  const [topicId, setTopicId] = useState<string>("");
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [sort, setSort] = useState<"updated_desc" | "created_desc" | "relevance">("updated_desc");

  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedNote = useMemo(
    () => notes.find((n) => n.id === selectedId) ?? null,
    [notes, selectedId],
  );

  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editStarred, setEditStarred] = useState(false);
  const [editTopicId, setEditTopicId] = useState<string | null>(null);
  const [editTagIds, setEditTagIds] = useState<string[]>([]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canUseRelevance = useMemo(() => q.trim().length > 0, [q]);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const [meRes, topicsRes, tagsRes, notesRes] = await Promise.all([
        me(),
        listTopics(),
        listTags(),
        listNotes({
          q: q.trim() || undefined,
          starred: starredOnly ? true : undefined,
          topic_id: topicId || undefined,
          tag_ids: tagIds.length ? tagIds : undefined,
          sort: sort === "relevance" && !canUseRelevance ? "updated_desc" : sort,
          limit: 50,
          offset: 0,
        }),
      ]);
      setEmail(meRes.email);
      setTopics(topicsRes);
      setTags(tagsRes);
      setNotes(notesRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedNote) return;
    setEditTitle(selectedNote.title);
    setEditBody(selectedNote.markdown_content);
    setEditStarred(selectedNote.is_starred);
    setEditTopicId(selectedNote.topic_id);
    setEditTagIds(selectedNote.tag_ids);
  }, [selectedNote]);

  async function submitNewNote(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await createNote({ title: newTitle.trim(), markdown_content: newBody });
      setNewTitle("");
      setNewBody("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  function toggleTag(id: string) {
    setTagIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function toggleEditTag(id: string) {
    setEditTagIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function logout() {
    clearAccessToken();
    onLogout();
  }

  async function saveSelected() {
    if (!selectedNote) return;
    setBusy(true);
    setError(null);
    try {
      await updateNote(selectedNote.id, {
        title: editTitle.trim(),
        markdown_content: editBody,
        is_starred: editStarred,
        topic_id: editTopicId,
        tag_ids: editTagIds,
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function deleteSelected() {
    if (!selectedNote) return;
    const ok = window.confirm("このノートを削除しますか？");
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      await deleteNote(selectedNote.id);
      setSelectedId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 980, margin: "24px auto", padding: 16, fontFamily: "system-ui" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0 }}>MyKnowledge</h1>
          <div style={{ marginTop: 6, color: "#555" }}>{email}</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={() => void load()}
            disabled={busy}
            style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #ddd" }}
          >
            再読込
          </button>
          <button
            onClick={() => void logout()}
            style={{
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid #222",
              background: "#fff",
            }}
          >
            ログアウト
          </button>
        </div>
      </div>

      <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
        <div
          style={{
            border: "1px solid #ddd",
            borderRadius: 12,
            padding: 12,
            background: "#fff",
          }}
        >
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={`検索（例: jwt / "cleanup" / jwt -refresh）`}
                style={{
                  flex: "1 1 320px",
                  padding: 10,
                  borderRadius: 10,
                  border: "1px solid #ccc",
                }}
              />
              <label style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={starredOnly}
                  onChange={(e) => setStarredOnly(e.target.checked)}
                />
                スターのみ
              </label>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as typeof sort)}
                style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc" }}
              >
                <option value="updated_desc">更新順</option>
                <option value="created_desc">作成順</option>
                <option value="relevance" disabled={!canUseRelevance}>
                  関連度（q必須）
                </option>
              </select>
              <button
                onClick={() => void load()}
                disabled={busy}
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #222",
                  background: "#222",
                  color: "#fff",
                }}
              >
                検索
              </button>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <select
                value={topicId}
                onChange={(e) => setTopicId(e.target.value)}
                style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc" }}
              >
                <option value="">Topic: すべて</option>
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.icon_type === "emoji" ? t.icon_emoji : "🖼"} {t.name}
                  </option>
                ))}
              </select>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {tags.slice(0, 20).map((t) => {
                  const active = tagIds.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      onClick={() => toggleTag(t.id)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 999,
                        border: `1px solid ${active ? "#222" : "#ddd"}`,
                        background: active ? "#222" : "#fff",
                        color: active ? "#fff" : "#222",
                        cursor: "pointer",
                      }}
                    >
                      {t.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {error ? <div style={{ color: "#b00020" }}>{error}</div> : null}

        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
          <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
            <div style={{ fontWeight: 700 }}>クイック追加</div>
            <form onSubmit={submitNewNote} style={{ display: "grid", gap: 8, marginTop: 10 }}>
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="タイトル（必須）"
                required
                style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc" }}
              />
              <textarea
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                placeholder="本文（Markdown、任意）"
                rows={6}
                style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc" }}
              />
              <button
                type="submit"
                disabled={busy}
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid #222",
                  background: "#222",
                  color: "#fff",
                }}
              >
                追加
              </button>
            </form>
          </div>

          <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
            <div style={{ fontWeight: 700 }}>Topics</div>
            <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {topics.length === 0 ? <div style={{ color: "#666" }}>Topicなし</div> : null}
              {topics.map((t) => (
                <TopicChip key={t.id} topic={t} />
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
          <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
            <div style={{ fontWeight: 700 }}>Notes（{notes.length}）</div>
            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              {busy ? <div>Loading...</div> : null}
              {notes.map((n) => {
                const selected = n.id === selectedId;
                return (
                  <button
                    key={n.id}
                    onClick={() => setSelectedId(n.id)}
                    style={{
                      textAlign: "left",
                      border: selected ? "2px solid #222" : "1px solid #eee",
                      borderRadius: 12,
                      padding: 12,
                      background: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ fontWeight: 650 }}>{n.title}</div>
                      <div style={{ color: "#777", fontSize: 12 }}>
                        {new Date(n.updated_at).toLocaleString()}
                      </div>
                    </div>
                    {n.summary ? (
                      <div style={{ marginTop: 6, color: "#444" }}>{n.summary}</div>
                    ) : null}
                    <div style={{ marginTop: 8, color: "#666", fontSize: 12 }}>
                      {n.is_starred ? "★" : "☆"} / tags: {n.tag_ids.length ? n.tag_ids.length : 0}
                    </div>
                  </button>
                );
              })}
              {!busy && notes.length === 0 ? (
                <div style={{ color: "#666" }}>ノートが見つかりません</div>
              ) : null}
            </div>
          </div>

          <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontWeight: 700 }}>詳細/編集</div>
              {selectedNote ? (
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => void saveSelected()}
                    disabled={busy}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 10,
                      border: "1px solid #222",
                      background: "#222",
                      color: "#fff",
                    }}
                  >
                    保存
                  </button>
                  <button
                    onClick={() => void deleteSelected()}
                    disabled={busy}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 10,
                      border: "1px solid #b00020",
                      background: "#fff",
                      color: "#b00020",
                    }}
                  >
                    削除
                  </button>
                </div>
              ) : null}
            </div>

            {!selectedNote ? (
              <div style={{ marginTop: 12, color: "#666" }}>ノートを選択してください</div>
            ) : (
              <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                <label style={{ display: "grid", gap: 6 }}>
                  <span>タイトル</span>
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc" }}
                  />
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                  <span>本文（Markdown）</span>
                  <textarea
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    rows={10}
                    style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc" }}
                  />
                </label>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <label style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                    <input
                      type="checkbox"
                      checked={editStarred}
                      onChange={(e) => setEditStarred(e.target.checked)}
                    />
                    スター
                  </label>

                  <select
                    value={editTopicId ?? ""}
                    onChange={(e) => setEditTopicId(e.target.value || null)}
                    style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc" }}
                  >
                    <option value="">Topic: なし</option>
                    {topics.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.icon_type === "emoji" ? t.icon_emoji : "🖼"} {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>Tags</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {tags.slice(0, 30).map((t) => {
                      const active = editTagIds.includes(t.id);
                      return (
                        <button
                          key={t.id}
                          onClick={() => toggleEditTag(t.id)}
                          style={{
                            padding: "6px 10px",
                            borderRadius: 999,
                            border: `1px solid ${active ? "#222" : "#ddd"}`,
                            background: active ? "#222" : "#fff",
                            color: active ? "#fff" : "#222",
                            cursor: "pointer",
                          }}
                        >
                          {t.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

