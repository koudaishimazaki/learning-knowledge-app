import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createNote, createTag, createTopic, deleteTag, listTags, listTopics, updateTag, updateTopic } from "../api/notes";
import type { Tag, Topic } from "../types/notes";

function TopicChip({ topic }: { topic: Topic }) {
  const icon = topic.icon_type === "emoji" ? topic.icon_emoji : topic.icon_image_url ? "🖼" : "•";
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

export function ManagePage() {
  const navigate = useNavigate();
  const [sp] = useSearchParams();

  const [topics, setTopics] = useState<Topic[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");

  const [topicMode, setTopicMode] = useState<"create" | "edit">("create");
  const [selectedTopicId, setSelectedTopicId] = useState<string>("");
  const selectedTopic = useMemo(() => topics.find((t) => t.id === selectedTopicId) ?? null, [topics, selectedTopicId]);

  const [topicName, setTopicName] = useState("");
  const [topicColor, setTopicColor] = useState("blue");
  const [topicIconType, setTopicIconType] = useState<"emoji" | "image">("emoji");
  const [topicIconEmoji, setTopicIconEmoji] = useState("🧠");
  const [topicIconUrl, setTopicIconUrl] = useState("");

  const [newTagName, setNewTagName] = useState("");
  const [tagManageId, setTagManageId] = useState<string | null>(null);
  const [tagManageName, setTagManageName] = useState("");

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const [topicsRes, tagsRes] = await Promise.all([listTopics(), listTags()]);
      setTopics(topicsRes);
      setTags(tagsRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

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
      const note = await createNote({ title: newTitle.trim(), markdown_content: newBody });
      setNewTitle("");
      setNewBody("");
      await load();
      navigate(`/notes/${note.id}?${sp.toString()}`);
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

  function startEditTag(t: Tag) {
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
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="notion-view-inner">
      <div className="notion-view-header">
        <div style={{ fontWeight: 900, fontSize: 18 }}>Manage</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={() => navigate(`/notes?${sp.toString()}`)} disabled={busy}>
            戻る
          </button>
          <button type="button" onClick={() => void load()} disabled={busy}>
            再読込
          </button>
        </div>
      </div>

      {error ? <div className="error">{error}</div> : null}

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
        <div className="card">
          <div className="card-inner">
            <div className="section-title">新規ノート</div>
            <form onSubmit={submitNewNote} style={{ display: "grid", gap: 8, marginTop: 10 }}>
              <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="タイトル（必須）" required />
              <textarea value={newBody} onChange={(e) => setNewBody(e.target.value)} placeholder="本文（Markdown、任意）" rows={10} />
              <button type="submit" disabled={busy} className="btn-primary">
                作成
              </button>
            </form>
          </div>
        </div>

        <div className="card">
          <div className="card-inner">
            <div className="section-title">Topic管理</div>
            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ display: "inline-flex", gap: 12, alignItems: "center" }}>
                  <label style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                    <input type="radio" checked={topicMode === "create"} onChange={() => setTopicMode("create")} />
                    新規
                  </label>
                  <label style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                    <input type="radio" checked={topicMode === "edit"} onChange={() => setTopicMode("edit")} />
                    編集
                  </label>
                </div>

                {topicMode === "edit" ? (
                  <select value={selectedTopicId} onChange={(e) => setSelectedTopicId(e.target.value)}>
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
                <label style={{ display: "grid", gap: 6 }}>
                  <span>名前</span>
                  <input value={topicName} onChange={(e) => setTopicName(e.target.value)} required />
                </label>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <label style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                    <span>color</span>
                    <select value={topicColor} onChange={(e) => setTopicColor(e.target.value)}>
                      {["blue", "purple", "green", "orange", "red", "gray"].map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                    <input type="radio" checked={topicIconType === "emoji"} onChange={() => setTopicIconType("emoji")} />
                    emoji
                  </label>
                  <label style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                    <input type="radio" checked={topicIconType === "image"} onChange={() => setTopicIconType("image")} />
                    image URL
                  </label>
                </div>

                {topicIconType === "emoji" ? (
                  <label style={{ display: "grid", gap: 6 }}>
                    <span>emoji</span>
                    <input value={topicIconEmoji} onChange={(e) => setTopicIconEmoji(e.target.value)} placeholder="例: ⚛️" />
                  </label>
                ) : (
                  <label style={{ display: "grid", gap: 6 }}>
                    <span>image URL</span>
                    <input value={topicIconUrl} onChange={(e) => setTopicIconUrl(e.target.value)} placeholder="https://..." />
                  </label>
                )}

                <button type="submit" disabled={busy || (topicMode === "edit" && !selectedTopicId)} className="btn-primary">
                  {topicMode === "create" ? "作成" : "更新"}
                </button>
              </form>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {topics.length === 0 ? <div style={{ color: "var(--muted)" }}>Topicなし</div> : null}
                {topics.map((t) => (
                  <TopicChip key={t.id} topic={t} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="card-inner">
          <div className="section-title">Tag管理</div>

          <form onSubmit={submitTag} style={{ marginTop: 10, display: "flex", gap: 8 }}>
            <input value={newTagName} onChange={(e) => setNewTagName(e.target.value)} placeholder="例: react" style={{ flex: "1 1 240px" }} />
            <button type="submit" disabled={busy} className="btn-primary">
              追加
            </button>
          </form>

          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            {tagManageId ? (
              <form onSubmit={submitEditTag} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input value={tagManageName} onChange={(e) => setTagManageName(e.target.value)} placeholder="タグ名" style={{ flex: "1 1 220px" }} />
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

            <div style={{ display: "grid", gap: 6, maxHeight: 320, overflow: "auto" }}>
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
                    <div style={{ fontWeight: 650, overflow: "hidden", textOverflow: "ellipsis" }}>{t.name}</div>
                    <div style={{ color: "var(--muted-2)", fontSize: 12 }}>usage: {t.usage_count ?? 0}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <button type="button" onClick={() => startEditTag(t)} disabled={busy}>
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
    </div>
  );
}

