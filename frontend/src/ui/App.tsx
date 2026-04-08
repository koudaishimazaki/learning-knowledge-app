import { useEffect, useMemo, useState } from "react";

type HealthResponse = { status: string };

export function App() {
  const apiBaseUrl = useMemo(() => import.meta.env.VITE_API_BASE_URL, []);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        setError(null);
        const res = await fetch(`${apiBaseUrl}/health`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as HealthResponse;
        if (!cancelled) setHealth(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl]);

  return (
    <div style={{ fontFamily: "system-ui", padding: 24, maxWidth: 720 }}>
      <h1 style={{ margin: 0 }}>MyKnowledge</h1>
      <p style={{ marginTop: 8, color: "#555" }}>
        学習メモを小粒に残し、後から検索して再利用する。
      </p>

      <div
        style={{
          marginTop: 16,
          border: "1px solid #ddd",
          borderRadius: 12,
          padding: 16,
        }}
      >
        <div style={{ fontWeight: 600 }}>Backend health</div>
        <div style={{ marginTop: 8 }}>
          Base URL: <code>{apiBaseUrl}</code>
        </div>
        <div style={{ marginTop: 8 }}>
          {error ? (
            <span style={{ color: "#b00020" }}>Error: {error}</span>
          ) : health ? (
            <span>
              OK: <code>{health.status}</code>
            </span>
          ) : (
            "Loading..."
          )}
        </div>
      </div>
    </div>
  );
}

