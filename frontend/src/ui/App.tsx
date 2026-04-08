import { useEffect, useState } from "react";
import { getAccessToken } from "../auth/token";
import { AuthPage } from "../pages/AuthPage";
import { NotesPage } from "../pages/NotesPage";

export function App() {
  const [authed, setAuthed] = useState<boolean>(() => Boolean(getAccessToken()));

  useEffect(() => {
    setAuthed(Boolean(getAccessToken()));
  }, []);

  if (!authed) {
    return <AuthPage onAuthed={() => setAuthed(true)} />;
  }

  return <NotesPage onLogout={() => setAuthed(false)} />;
}

