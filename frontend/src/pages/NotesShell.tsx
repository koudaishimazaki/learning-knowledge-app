import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { clearAccessToken } from "../auth/token";
import { me } from "../api/auth";
import { listNoteItems, listTags, listTopics, type NotesListParams } from "../api/notes";
import type { NoteListItem, Tag, Topic } from "../types/notes";

type Props = {
  onLogout: () => void;
};

function TopicRow({ topic }: { topic: Topic }) {
  const icon = topic.icon_type === "emoji" ? topic.icon_emoji : topic.icon_image_url ? "🖼" : "•";
  return (
    <span style={{ display: "inline-flex", gap: 8, alignItems: "center", minWidth: 0 }}>
      <span>{icon}</span>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{topic.name}</span>
    </span>
  );
}

export function NotesShell({ onLogout }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  const [sp, setSp] = useSearchParams();

  const [email, setEmail] = useState<string>("");
  const [topics, setTopics] = useState<Topic[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [notes, setNotes] = useState<NoteListItem[]>([]);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const q = sp.get("q") ?? "";
  const sort = (sp.get("sort") ?? "updated_desc") as NotesListParams["sort"];
  const topicId = sp.get("topic_id") ?? "";
  const tagIds = useMemo(() => (sp.get("tag_ids") ?? "").split(",").filter(Boolean), [sp]);

  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => localStorage.getItem("mk.sidebar") === "1");
  const [listCollapsed, setListCollapsed] = useState<boolean>(() => localStorage.getItem("mk.list") === "1");
  const [focusMode, setFocusMode] = useState<boolean>(() => localStorage.getItem("mk.focus") === "1");
  const [topicOpen, setTopicOpen] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem("mk.topicOpen") || "{}") as Record<string, boolean>;
    } catch {
      return {};
    }
  });

  useEffect(() => localStorage.setItem("mk.sidebar", sidebarCollapsed ? "1" : "0"), [sidebarCollapsed]);
  useEffect(() => localStorage.setItem("mk.list", listCollapsed ? "1" : "0"), [listCollapsed]);
  useEffect(() => localStorage.setItem("mk.focus", focusMode ? "1" : "0"), [focusMode]);
  useEffect(() => localStorage.setItem("mk.topicOpen", JSON.stringify(topicOpen)), [topicOpen]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setFocusMode(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const selectedNoteId = useMemo(() => {
    const m = location.pathname.match(/^\/notes\/([^/]+)/);
    return m?.[1] ?? null;
  }, [location.pathname]);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const [meRes, topicsRes, tagsRes] = await Promise.all([me(), listTopics(), listTags()]);
      setEmail(meRes.email);
      setTopics(topicsRes);
      setTags(tagsRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function loadNotes() {
    setBusy(true);
    setError(null);
    try {
      const items = await listNoteItems({
        q: q.trim() || undefined,
        sort,
        topic_id: topicId || undefined,
        tag_ids: tagIds.length ? tagIds : undefined,
        limit: 200,
        offset: 0,
      });
      setNotes(items);
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
    void loadNotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, sort, topicId, tagIds.join(",")]);

  function logout() {
    clearAccessToken();
    onLogout();
  }

  function updateQuery(next: Partial<{ q: string; sort: string; topic_id: string; tag_ids: string[] }>) {
    const nextSp = new URLSearchParams(sp);
    if (next.q !== undefined) nextSp.set("q", next.q);
    if (next.sort !== undefined) nextSp.set("sort", next.sort);
    if (next.topic_id !== undefined) {
      if (next.topic_id) nextSp.set("topic_id", next.topic_id);
      else nextSp.delete("topic_id");
    }
    if (next.tag_ids !== undefined) {
      if (next.tag_ids.length) nextSp.set("tag_ids", next.tag_ids.join(","));
      else nextSp.delete("tag_ids");
    }
    setSp(nextSp, { replace: true });
  }

  function goToNotesWith(next: Partial<{ q: string; sort: string; topic_id: string; tag_ids: string[] }>) {
    const nextSp = new URLSearchParams(sp);
    if (next.q !== undefined) nextSp.set("q", next.q);
    if (next.sort !== undefined) nextSp.set("sort", next.sort);
    if (next.topic_id !== undefined) {
      if (next.topic_id) nextSp.set("topic_id", next.topic_id);
      else nextSp.delete("topic_id");
    }
    if (next.tag_ids !== undefined) {
      if (next.tag_ids.length) nextSp.set("tag_ids", next.tag_ids.join(","));
      else nextSp.delete("tag_ids");
    }
    navigate(`/notes?${nextSp.toString()}`);
  }

  function toggleTag(id: string) {
    const next = tagIds.includes(id) ? tagIds.filter((x) => x !== id) : [...tagIds, id];
    updateQuery({ tag_ids: next });
  }

  const recentNotes = useMemo(() => {
    return [...notes]
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 10);
  }, [notes]);

  const starredNotes = useMemo(() => {
    return notes
      .filter((n) => n.is_starred)
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 10);
  }, [notes]);

  const notesByTopic = useMemo(() => {
    const m = new Map<string, NoteListItem[]>();
    for (const n of notes) {
      if (!n.topic_id) continue;
      const arr = m.get(n.topic_id) ?? [];
      arr.push(n);
      m.set(n.topic_id, arr);
    }
    for (const [k, arr] of m.entries()) {
      arr.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      m.set(k, arr);
    }
    return m;
  }, [notes]);

  function openNote(id: string) {
    navigate(`/notes/${id}?${sp.toString()}`);
  }

  function toggleTopicOpen(id: string) {
    setTopicOpen((prev) => ({ ...prev, [id]: !(prev[id] ?? false) }));
  }

  return (
    <div
      className={`notion-root ${focusMode ? "is-focus" : ""}`}
      style={{
        gridTemplateColumns: focusMode
          ? "1fr"
          : `${sidebarCollapsed ? "84px" : "280px"} ${listCollapsed ? "96px" : "380px"} 1fr`,
      }}
    >
      <div className={`notion-sidebar ${sidebarCollapsed ? "is-collapsed" : ""}`}>
        <div className="notion-sidebar-header">
          {!sidebarCollapsed ? (
            <>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 850, letterSpacing: 0.2 }}>MyKnowledge</div>
                <div style={{ fontSize: 12, color: "var(--muted-2)", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {email}
                </div>
              </div>
              <button
                type="button"
                className="notion-collapse-btn"
                onClick={() => setSidebarCollapsed((v) => !v)}
                title="サイドバーを閉じる"
              >
                ◀
              </button>
            </>
          ) : (
            <button
              type="button"
              className="notion-collapse-btn is-collapsed"
              onClick={() => setSidebarCollapsed(false)}
              title="サイドバーを開く"
            >
              ▶
            </button>
          )}
        </div>

        {!sidebarCollapsed ? <div className="notion-sidebar-body">
          <div className="notion-nav-group">
            <NavLink to={`/notes?${sp.toString()}`} className="notion-nav">
              All notes
            </NavLink>
            <NavLink to="/manage" className="notion-nav">
              Manage
            </NavLink>
          </div>

          <div className="notion-nav-group">
            <div className="notion-nav-title">Recent</div>
            {recentNotes.map((n) => (
              <button
                key={n.id}
                type="button"
                className={`notion-subnote ${selectedNoteId === n.id ? "is-active" : ""}`}
                onClick={() => openNote(n.id)}
                title={n.title}
              >
                <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{n.title}</span>
              </button>
            ))}
          </div>

          <div className="notion-nav-group">
            <div className="notion-nav-title">Starred</div>
            {starredNotes.length === 0 ? (
              <div style={{ color: "var(--muted-2)", fontSize: 12 }}>なし</div>
            ) : (
              starredNotes.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  className={`notion-subnote ${selectedNoteId === n.id ? "is-active" : ""}`}
                  onClick={() => openNote(n.id)}
                  title={n.title}
                >
                  <span style={{ flexShrink: 0 }}>★</span>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{n.title}</span>
                </button>
              ))
            )}
          </div>

          <div className="notion-nav-group">
            <div className="notion-nav-title">Topics</div>
            <button type="button" className="notion-nav" onClick={() => updateQuery({ topic_id: "" })}>
              すべて
            </button>
            {topics.map((t) => (
              <div key={t.id} style={{ display: "grid", gap: 6 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button
                    type="button"
                    className="notion-twist"
                    onClick={() => toggleTopicOpen(t.id)}
                    aria-label="toggle"
                    title="展開/折りたたみ"
                  >
                    {topicOpen[t.id] ? "▾" : "▸"}
                  </button>
                  <button
                    type="button"
                    className={`notion-nav ${topicId === t.id ? "is-active" : ""}`}
                    onClick={() => updateQuery({ topic_id: t.id })}
                    title={t.name}
                    style={{ flex: 1, minWidth: 0 }}
                  >
                    <TopicRow topic={t} />
                  </button>
                </div>

                {topicOpen[t.id] ? (
                  <div style={{ display: "grid", gap: 6, paddingLeft: 20 }}>
                    {(notesByTopic.get(t.id) ?? []).slice(0, 12).map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        className={`notion-subnote ${selectedNoteId === n.id ? "is-active" : ""}`}
                        onClick={() => openNote(n.id)}
                        title={n.title}
                      >
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{n.title}</span>
                      </button>
                    ))}
                    {(notesByTopic.get(t.id) ?? []).length > 12 ? (
                      <button
                        type="button"
                        className="btn-link"
                        onClick={() => goToNotesWith({ topic_id: t.id })}
                        style={{ textAlign: "left" }}
                      >
                        …more（一覧へ）
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          <div className="notion-nav-group">
            <div className="notion-nav-title">Tags</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {tags.slice(0, 24).map((t) => {
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
                      fontSize: 12,
                    }}
                  >
                    {t.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div> : null}

        {!sidebarCollapsed ? (
          <div className="notion-sidebar-footer">
            <button type="button" onClick={() => void load()} disabled={busy}>
              再読込
            </button>
            <button type="button" onClick={logout}>
              ログアウト
            </button>
          </div>
        ) : null}
      </div>

      <div className={`notion-list ${listCollapsed ? "is-collapsed" : ""}`}>
        <div className="notion-list-header">
          {!listCollapsed ? (
            <>
              <div style={{ display: "flex", gap: 8, alignItems: "center", minWidth: 0 }}>
                <button
                  type="button"
                  className="notion-collapse-btn"
                  onClick={() => setListCollapsed(true)}
                  title="一覧を閉じる"
                >
                  ◀
                </button>
                <div style={{ fontWeight: 800 }}>Notes</div>
                <div style={{ fontSize: 12, color: "var(--muted-2)" }}>({notes.length})</div>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => setFocusMode((v) => !v)}
                  title="本文最大化（サイドバー/一覧の表示を切替）"
                >
                  {focusMode ? "Unfocus" : "Focus"}
                </button>
                <button type="button" className="btn-primary" onClick={() => navigate("/manage")}>
                  新規
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              className="notion-collapse-btn is-collapsed"
              onClick={() => setListCollapsed(false)}
              title="一覧を開く"
            >
              ▶
            </button>
          )}
        </div>

        {!listCollapsed ? <div style={{ padding: 12, display: "grid", gap: 10 }}>
          <input
            value={q}
            onChange={(e) => updateQuery({ q: e.target.value })}
            placeholder={`検索（例: jwt / "cleanup" / jwt -refresh）`}
          />

          <select value={sort ?? "updated_desc"} onChange={(e) => updateQuery({ sort: e.target.value })}>
            <option value="updated_desc">更新順</option>
            <option value="created_desc">作成順</option>
            <option value="relevance" disabled={q.trim().length === 0}>
              関連度（q必須）
            </option>
          </select>

          {error ? <div className="error">{error}</div> : null}
        </div> : null}

        {!listCollapsed ? <div className="notion-list-body">
          {busy ? <div style={{ padding: 12, color: "var(--muted)" }}>Loading...</div> : null}
          {notes.map((n) => {
            const selected = selectedNoteId === n.id;
            return (
              <button
                key={n.id}
                type="button"
                className={`notion-note-row ${selected ? "is-selected" : ""}`}
                onClick={() => navigate(`/notes/${n.id}?${sp.toString()}`)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ fontWeight: 750, overflow: "hidden", textOverflow: "ellipsis" }}>
                    {n.is_starred ? "★ " : ""}
                    {n.title}
                  </div>
                  <div style={{ color: "var(--muted-2)", fontSize: 12, flexShrink: 0 }}>
                    {new Date(n.updated_at).toLocaleDateString()}
                  </div>
                </div>
                {n.summary ? (
                  <div style={{ marginTop: 6, color: "var(--muted)", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis" }}>
                    {n.summary}
                  </div>
                ) : null}
              </button>
            );
          })}
          {!busy && notes.length === 0 ? <div style={{ padding: 12, color: "var(--muted)" }}>ノートが見つかりません</div> : null}
        </div> : null}
      </div>

      <div className="notion-view">
        {focusMode ? (
          <div className="focus-floating">
            <button type="button" onClick={() => setFocusMode(false)}>
              Unfocus（Esc）
            </button>
          </div>
        ) : null}
        <Outlet context={{ topics, tags, onRefreshNotes: loadNotes, setFocusMode }} />
      </div>
    </div>
  );
}

