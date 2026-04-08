import { useEffect, useMemo, useState } from "react";
import { clearAccessToken } from "../auth/token";
import { me } from "../api/auth";
import { createNote, listNotes, listTags, listTopics } from "../api/notes";
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

  async function logout() {
    clearAccessToken();
    onLogout();
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

        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
          <div style={{ fontWeight: 700 }}>Notes（{notes.length}）</div>
          <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
            {busy ? <div>Loading...</div> : null}
            {notes.map((n) => (
              <div
                key={n.id}
                style={{
                  border: "1px solid #eee",
                  borderRadius: 12,
                  padding: 12,
                  background: "#fff",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ fontWeight: 650 }}>{n.title}</div>
                  <div style={{ color: "#777", fontSize: 12 }}>
                    {new Date(n.updated_at).toLocaleString()}
                  </div>
                </div>
                {n.summary ? <div style={{ marginTop: 6, color: "#444" }}>{n.summary}</div> : null}
                <div style={{ marginTop: 8, color: "#666", fontSize: 12 }}>
                  {n.is_starred ? "★" : "☆"}{" "}
                  {n.topic_id ? `topic: ${n.topic_id}` : "topic: -"} / tags:{" "}
                  {n.tag_ids.length ? n.tag_ids.join(", ") : "-"}
                </div>
              </div>
            ))}
            {!busy && notes.length === 0 ? (
              <div style={{ color: "#666" }}>ノートが見つかりません</div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

