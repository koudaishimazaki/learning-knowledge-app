import { useEffect, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { getAccessToken } from "../auth/token";
import { AuthPage } from "../pages/AuthPage";
import { ManagePage } from "../pages/ManagePage";
import { NoteEditPage } from "../pages/NoteEditPage";
import { NotesIndexPage } from "../pages/NotesIndexPage";
import { NotesShell } from "../pages/NotesShell";
import { NoteViewPage } from "../pages/NoteViewPage";

export function App() {
  const [authed, setAuthed] = useState<boolean>(() => Boolean(getAccessToken()));

  useEffect(() => {
    setAuthed(Boolean(getAccessToken()));
  }, []);

  if (!authed) {
    return <AuthPage onAuthed={() => setAuthed(true)} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<NotesShell onLogout={() => setAuthed(false)} />}>
          <Route path="/" element={<Navigate to="/notes" replace />} />
          <Route path="/notes" element={<NotesIndexPage />} />
          <Route path="/notes/:noteId" element={<NoteViewPage />} />
          <Route path="/notes/:noteId/edit" element={<NoteEditPage />} />
          <Route path="/manage" element={<ManagePage />} />
          <Route path="*" element={<Navigate to="/notes" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

