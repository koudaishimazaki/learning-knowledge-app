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
    <div className="container" style={{ maxWidth: 440 }}>
      <div className="card">
        <div className="card-inner">
          <div className="brand">
            <h1>MyKnowledge</h1>
            <p>{title}</p>
          </div>

          <form onSubmit={submit} style={{ marginTop: 16, display: "grid", gap: 12 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Email</span>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                required
                autoComplete="email"
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
              />
            </label>

            {error ? <div className="error">{error}</div> : null}

            <button type="submit" disabled={busy} className="btn-primary">
              {busy ? "処理中..." : title}
            </button>
          </form>

          <div style={{ marginTop: 12 }}>
            {mode === "login" ? (
              <button onClick={() => setMode("register")} className="btn-link" type="button">
                はじめてですか？ サインアップ
              </button>
            ) : (
              <button onClick={() => setMode("login")} className="btn-link" type="button">
                すでにアカウントがありますか？ ログイン
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

