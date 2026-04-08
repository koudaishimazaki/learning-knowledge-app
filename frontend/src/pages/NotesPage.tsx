import { useEffect, useMemo, useState } from "react";
import { clearAccessToken } from "../auth/token";
import { me } from "../api/auth";
import {
  createNote,
  createTopic,
  deleteNote,
  createTag,
  deleteTag,
  listNotes,
  listTags,
  listTopics,
  updateTag,
  updateTopic,
  updateNote,
} from "../api/notes";
import type { Note, Tag, Topic } from "../types/notes";
import { getStatsSummary, type StatsSummary } from "../api/stats";

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
        border: "1px solid var(--border)",
        background: "rgba(255, 255, 255, 0.06)",
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
  const [stats, setStats] = useState<StatsSummary | null>(null);

  const [q, setQ] = useState("");
  const [starredOnly, setStarredOnly] = useState(false);
  const [topicId, setTopicId] = useState<string>("");
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [sort, setSort] = useState<"updated_desc" | "created_desc" | "relevance">("updated_desc");
  const [pageSize, setPageSize] = useState(20);
  const [offset, setOffset] = useState(0);

  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");

  const [topicMode, setTopicMode] = useState<"create" | "edit">("create");
  const [selectedTopicId, setSelectedTopicId] = useState<string>("");
  const selectedTopic = useMemo(
    () => topics.find((t) => t.id === selectedTopicId) ?? null,
    [topics, selectedTopicId],
  );

  const [topicName, setTopicName] = useState("");
  const [topicColor, setTopicColor] = useState("blue");
  const [topicIconType, setTopicIconType] = useState<"emoji" | "image">("emoji");
  const [topicIconEmoji, setTopicIconEmoji] = useState("🧠");
  const [topicIconUrl, setTopicIconUrl] = useState("");

  const [newTagName, setNewTagName] = useState("");
  const [tagManageId, setTagManageId] = useState<string | null>(null);
  const [tagManageName, setTagManageName] = useState("");

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
  const [editTagQuery, setEditTagQuery] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canUseRelevance = useMemo(() => q.trim().length > 0, [q]);

  const isDirty = useMemo(() => {
    if (!selectedNote) return false;
    const a = [...editTagIds].sort().join(",");
    const b = [...selectedNote.tag_ids].sort().join(",");
    return (
      editTitle !== selectedNote.title ||
      editBody !== selectedNote.markdown_content ||
      editStarred !== selectedNote.is_starred ||
      (editTopicId ?? null) !== (selectedNote.topic_id ?? null) ||
      a !== b
    );
  }, [editBody, editStarred, editTagIds, editTitle, editTopicId, selectedNote]);

  const filteredEditTags = useMemo(() => {
    const qq = editTagQuery.trim().toLowerCase();
    if (!qq) return tags;
    return tags.filter((t) => t.name.toLowerCase().includes(qq));
  }, [editTagQuery, tags]);

  async function load(nextOffset: number = offset) {
    setBusy(true);
    setError(null);
    try {
      const [meRes, topicsRes, tagsRes, statsRes, notesRes] = await Promise.all([
        me(),
        listTopics(),
        listTags(),
        getStatsSummary(),
        listNotes({
          q: q.trim() || undefined,
          starred: starredOnly ? true : undefined,
          topic_id: topicId || undefined,
          tag_ids: tagIds.length ? tagIds : undefined,
          sort: sort === "relevance" && !canUseRelevance ? "updated_desc" : sort,
          limit: pageSize,
          offset: nextOffset,
        }),
      ]);
      setEmail(meRes.email);
      setTopics(topicsRes);
      setTags(tagsRes);
      setStats(statsRes);
      setNotes(notesRes);
      setOffset(nextOffset);
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

  useEffect(() => {
    if (topicMode !== "edit" || !selectedTopic) return;
    setTopicName(selectedTopic.name);
    setTopicColor(selectedTopic.color);
    setTopicIconType(selectedTopic.icon_type);
    setTopicIconEmoji(selectedTopic.icon_emoji ?? "");
    setTopicIconUrl(selectedTopic.icon_image_url ?? "");
  }, [topicMode, selectedTopic]);

  async function submitNewNote(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await createNote({ title: newTitle.trim(), markdown_content: newBody });
      setNewTitle("");
      setNewBody("");
      await load(0);
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

  async function submitTopic(e: React.FormEvent) {
    e.preventDefault();
    if (!topicName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      if (topicMode === "create") {
        await createTopic({
          name: topicName.trim(),
          color: topicColor,
          icon_type: topicIconType,
          icon_emoji: topicIconType === "emoji" ? topicIconEmoji : null,
          icon_image_url: topicIconType === "image" ? topicIconUrl : null,
        });
      } else {
        if (!selectedTopic) return;
        await updateTopic(selectedTopic.id, {
          name: topicName.trim(),
          color: topicColor,
          icon_type: topicIconType,
          icon_emoji: topicIconType === "emoji" ? topicIconEmoji : null,
          icon_image_url: topicIconType === "image" ? topicIconUrl : null,
        });
      }
      await load();
      if (topicMode === "create") {
        setTopicName("");
        setTopicIconEmoji("🧠");
        setTopicIconUrl("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function submitTag(e: React.FormEvent) {
    e.preventDefault();
    if (!newTagName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await createTag({ name: newTagName.trim() });
      setNewTagName("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function startEditTag(t: Tag) {
    setTagManageId(t.id);
    setTagManageName(t.name);
  }

  async function submitEditTag(e: React.FormEvent) {
    e.preventDefault();
    if (!tagManageId) return;
    if (!tagManageName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await updateTag(tagManageId, { name: tagManageName.trim() });
      setTagManageId(null);
      setTagManageName("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function removeTag(id: string) {
    if (!confirm("タグを削除しますか？（紐づきも解除されます）")) return;
    setBusy(true);
    setError(null);
    try {
      await deleteTag(id);
      if (tagIds.includes(id)) setTagIds((prev) => prev.filter((x) => x !== id));
      if (editTagIds.includes(id)) setEditTagIds((prev) => prev.filter((x) => x !== id));
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container">
      <div className="topbar">
        <div className="brand">
          <h1>MyKnowledge</h1>
          <p>{email}</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={() => void load()}
            disabled={busy}
          >
            再読込
          </button>
          <button
            onClick={() => void logout()}
          >
            ログアウト
          </button>
        </div>
      </div>

      <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
        {stats ? (
          <div className="card">
            <div className="card-inner">
              <div className="section-title">Stats</div>
              <div style={{ marginTop: 10, display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
                <div>
                  <div style={{ color: "var(--muted-2)", fontSize: 12 }}>Totals</div>
                  <div style={{ marginTop: 6, display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <div>notes: <b>{stats.notes_total}</b></div>
                    <div>starred: <b>{stats.starred_total}</b></div>
                  </div>
                </div>
                <div>
                  <div style={{ color: "var(--muted-2)", fontSize: 12 }}>Top tags / topics</div>
                  <div style={{ marginTop: 6, display: "grid", gap: 6 }}>
                    <div style={{ color: "var(--muted)" }}>
                      tags: {stats.tags.slice(0, 5).map((t) => `${t.name}(${t.count})`).join(", ") || "-"}
                    </div>
                    <div style={{ color: "var(--muted)" }}>
                      topics: {stats.topics.slice(0, 5).map((t) => `${t.name}(${t.count})`).join(", ") || "-"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
        <div className="card">
          <div className="card-inner">
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={`検索（例: jwt / "cleanup" / jwt -refresh）`}
                style={{
                  flex: "1 1 320px",
                }}
              />
              <label style={{ display: "inline-flex", gap: 6, alignItems: "center", whiteSpace: "nowrap" }}>
                <input
                  type="checkbox"
                  checked={starredOnly}
                  onChange={(e) => setStarredOnly(e.target.checked)}
                />
                ★のみ
              </label>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as typeof sort)}
              >
                <option value="updated_desc">更新順</option>
                <option value="created_desc">作成順</option>
                <option value="relevance" disabled={!canUseRelevance}>
                  関連度（q必須）
                </option>
              </select>
              <button
                onClick={() => void load(0)}
                disabled={busy}
                className="btn-primary"
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
        </div>

        {error ? <div className="error">{error}</div> : null}

        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
          <div className="card">
            <div className="card-inner">
            <div className="section-title">クイック追加</div>
            <form onSubmit={submitNewNote} style={{ display: "grid", gap: 8, marginTop: 10 }}>
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="タイトル（必須）"
                required
              />
              <textarea
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                placeholder="本文（Markdown、任意）"
                rows={6}
              />
              <button type="submit" disabled={busy} className="btn-primary">
                追加
              </button>
            </form>
            </div>
          </div>

          <div className="card">
            <div className="card-inner">
            <div className="section-title">Topic管理</div>
            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ display: "inline-flex", gap: 12, alignItems: "center", flexWrap: "nowrap" }}>
                <label style={{ display: "inline-flex", gap: 6, alignItems: "center", whiteSpace: "nowrap", flexShrink: 0 }}>
                  <input
                    type="radio"
                    checked={topicMode === "create"}
                    onChange={() => setTopicMode("create")}
                  />
                  新規
                </label>
                <label style={{ display: "inline-flex", gap: 6, alignItems: "center", whiteSpace: "nowrap", flexShrink: 0 }}>
                  <input
                    type="radio"
                    checked={topicMode === "edit"}
                    onChange={() => setTopicMode("edit")}
                  />
                  編集
                </label>
                </div>

                {topicMode === "edit" ? (
                  <select
                    value={selectedTopicId}
                    onChange={(e) => setSelectedTopicId(e.target.value)}
                  >
                    <option value="">Topic選択</option>
                    {topics.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.icon_type === "emoji" ? t.icon_emoji : "🖼"} {t.name}
                      </option>
                    ))}
                  </select>
                ) : null}
              </div>

              <form onSubmit={submitTopic} style={{ display: "grid", gap: 8 }}>
                <div style={{ display: "grid", gap: 6 }}>
                  <span>名前</span>
                  <input
                    value={topicName}
                    onChange={(e) => setTopicName(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <label style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                    <span>color</span>
                    <select
                      value={topicColor}
                      onChange={(e) => setTopicColor(e.target.value)}
                    >
                      {["blue", "purple", "green", "orange", "red", "gray"].map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                    <input
                      type="radio"
                      checked={topicIconType === "emoji"}
                      onChange={() => setTopicIconType("emoji")}
                    />
                    emoji
                  </label>
                  <label style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                    <input
                      type="radio"
                      checked={topicIconType === "image"}
                      onChange={() => setTopicIconType("image")}
                    />
                    image URL
                  </label>
                </div>

                {topicIconType === "emoji" ? (
                  <div style={{ display: "grid", gap: 6 }}>
                    <span>emoji</span>
                    <input
                      value={topicIconEmoji}
                      onChange={(e) => setTopicIconEmoji(e.target.value)}
                      placeholder="例: ⚛️"
                    />
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 6 }}>
                    <span>image URL</span>
                    <input
                      value={topicIconUrl}
                      onChange={(e) => setTopicIconUrl(e.target.value)}
                      placeholder="https://..."
                    />
                  </div>
                )}

                <button type="submit" disabled={busy || (topicMode === "edit" && !selectedTopicId)} className="btn-primary">
                  {topicMode === "create" ? "作成" : "更新"}
                </button>
              </form>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {topics.length === 0 ? <div style={{ color: "#666" }}>Topicなし</div> : null}
                {topics.map((t) => (
                  <TopicChip key={t.id} topic={t} />
                ))}
              </div>
            </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-inner">
          <div className="section-title">Tag追加</div>
          <form onSubmit={submitTag} style={{ marginTop: 10, display: "flex", gap: 8 }}>
            <input
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="例: react"
              style={{ flex: "1 1 240px" }}
            />
            <button type="submit" disabled={busy} className="btn-primary">
              追加
            </button>
          </form>
          <div style={{ marginTop: 10, color: "var(--muted)", fontSize: 12 }}>
            追加したタグは、検索フィルタ・ノート編集のタグ候補に反映されます。
          </div>

          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            <div className="section-title" style={{ fontSize: 13 }}>
              Tag管理（{tags.length}）
            </div>

            {tagManageId ? (
              <form onSubmit={submitEditTag} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  value={tagManageName}
                  onChange={(e) => setTagManageName(e.target.value)}
                  placeholder="タグ名"
                  style={{ flex: "1 1 220px" }}
                />
                <button type="submit" className="btn-primary" disabled={busy}>
                  更新
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTagManageId(null);
                    setTagManageName("");
                  }}
                  disabled={busy}
                >
                  キャンセル
                </button>
              </form>
            ) : null}

            <div style={{ display: "grid", gap: 6, maxHeight: 220, overflow: "auto" }}>
              {tags.map((t) => (
                <div
                  key={t.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    padding: "8px 10px",
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "rgba(255, 255, 255, 0.04)",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 650, overflow: "hidden", textOverflow: "ellipsis" }}>
                      {t.name}
                    </div>
                    <div style={{ color: "var(--muted-2)", fontSize: 12 }}>
                      usage: {t.usage_count ?? 0}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <button type="button" onClick={() => void startEditTag(t)} disabled={busy}>
                      編集
                    </button>
                    <button type="button" onClick={() => void removeTag(t.id)} disabled={busy}>
                      削除
                    </button>
                  </div>
                </div>
              ))}
              {tags.length === 0 ? <div style={{ color: "var(--muted)" }}>Tagなし</div> : null}
            </div>
          </div>
          </div>
        </div>

        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
          <div className="card">
            <div className="card-inner">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div className="section-title">Notes（{notes.length}）</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  style={{ width: 120 }}
                  disabled={busy}
                >
                  {[10, 20, 50, 100].map((n) => (
                    <option key={n} value={n}>
                      {n}/page
                    </option>
                  ))}
                </select>
                <button type="button" onClick={() => void load(Math.max(0, offset - pageSize))} disabled={busy || offset === 0}>
                  前へ
                </button>
                <button type="button" onClick={() => void load(offset + pageSize)} disabled={busy || notes.length < pageSize}>
                  次へ
                </button>
                <div style={{ color: "var(--muted-2)", fontSize: 12 }}>
                  offset: {offset}
                </div>
              </div>
            </div>
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
                      border: selected ? "2px solid rgba(124, 92, 255, 0.75)" : "1px solid var(--border)",
                      borderRadius: 12,
                      padding: 12,
                      background: "rgba(255, 255, 255, 0.06)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ fontWeight: 650 }}>{n.title}</div>
                      <div style={{ color: "var(--muted-2)", fontSize: 12 }}>
                        {new Date(n.updated_at).toLocaleString()}
                      </div>
                    </div>
                    {n.summary ? (
                      <div style={{ marginTop: 6, color: "var(--muted)" }}>{n.summary}</div>
                    ) : null}
                    <div style={{ marginTop: 8, color: "var(--muted-2)", fontSize: 12 }}>
                      {n.is_starred ? "★" : "☆"} / tags: {n.tag_ids.length ? n.tag_ids.length : 0}
                    </div>
                  </button>
                );
              })}
              {!busy && notes.length === 0 ? (
                <div style={{ color: "var(--muted)" }}>ノートが見つかりません</div>
              ) : null}
            </div>
            </div>
          </div>

          <div className="card">
            <div className="card-inner">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <div className="section-title">詳細/編集</div>
              {selectedNote ? (
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => void saveSelected()}
                    disabled={busy || !isDirty}
                    className="btn-primary"
                  >
                    保存{isDirty ? "（未保存）" : ""}
                  </button>
                  <button
                    onClick={() => void deleteSelected()}
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
                  />
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                  <span>本文（Markdown）</span>
                  <textarea
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    rows={10}
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
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <input
                      value={editTagQuery}
                      onChange={(e) => setEditTagQuery(e.target.value)}
                      placeholder="タグ絞り込み（例: react）"
                      style={{ flex: "1 1 220px" }}
                    />
                    <button
                      type="button"
                      onClick={() => setEditTagIds([])}
                      disabled={busy || editTagIds.length === 0}
                    >
                      クリア
                    </button>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                    {filteredEditTags.map((t) => {
                      const active = editTagIds.includes(t.id);
                      return (
                        <button
                          key={t.id}
                          onClick={() => toggleEditTag(t.id)}
                          style={{
                            padding: "6px 10px",
                            borderRadius: 999,
                            border: active
                              ? "1px solid rgba(124, 92, 255, 0.65)"
                              : "1px solid var(--border)",
                            background: active
                              ? "rgba(124, 92, 255, 0.22)"
                              : "rgba(255, 255, 255, 0.06)",
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
    </div>
  );
}

