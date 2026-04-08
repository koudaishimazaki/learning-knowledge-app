import { useMemo, useState } from "react";
import { login, register } from "../api/auth";
import { setAccessToken } from "../auth/token";

type Props = {
  onAuthed: () => void;
};

export function AuthPage({ onAuthed }: Props) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const title = useMemo(() => (mode === "login" ? "ログイン" : "サインアップ"), [mode]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res =
        mode === "login" ? await login(email, password) : await register(email, password);
      setAccessToken(res.access_token);
      onAuthed();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "40px auto", padding: 16 }}>
      <h1 style={{ margin: 0 }}>MyKnowledge</h1>
      <p style={{ marginTop: 8, color: "#555" }}>{title}</p>

      <form onSubmit={submit} style={{ marginTop: 16, display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span>Email</span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
            autoComplete="email"
            style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc" }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Password</span>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
            minLength={8}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            style={{ padding: 10, borderRadius: 10, border: "1px solid #ccc" }}
          />
        </label>

        {error ? <div style={{ color: "#b00020" }}>{error}</div> : null}

        <button
          type="submit"
          disabled={busy}
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #222",
            background: "#222",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          {busy ? "処理中..." : title}
        </button>
      </form>

      <div style={{ marginTop: 12 }}>
        {mode === "login" ? (
          <button
            onClick={() => setMode("register")}
            style={{ background: "transparent", border: 0, color: "#0066cc", cursor: "pointer" }}
          >
            はじめてですか？ サインアップ
          </button>
        ) : (
          <button
            onClick={() => setMode("login")}
            style={{ background: "transparent", border: 0, color: "#0066cc", cursor: "pointer" }}
          >
            すでにアカウントがありますか？ ログイン
          </button>
        )}
      </div>
    </div>
  );
}

