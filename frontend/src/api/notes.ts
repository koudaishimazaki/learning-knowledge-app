import { apiFetch } from "./http";
import type { Note, Tag, Topic } from "../types/notes";

export type NotesListParams = {
  q?: string;
  starred?: boolean;
  topic_id?: string;
  tag_ids?: string[]; // sent as comma-separated
  sort?: "updated_desc" | "created_desc" | "relevance";
  limit?: number;
  offset?: number;
};

function toQuery(params: NotesListParams): string {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.starred !== undefined) sp.set("starred", String(params.starred));
  if (params.topic_id) sp.set("topic_id", params.topic_id);
  if (params.tag_ids && params.tag_ids.length > 0) sp.set("tag_ids", params.tag_ids.join(","));
  if (params.sort) sp.set("sort", params.sort);
  if (params.limit !== undefined) sp.set("limit", String(params.limit));
  if (params.offset !== undefined) sp.set("offset", String(params.offset));
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

export async function listNotes(params: NotesListParams): Promise<Note[]> {
  return apiFetch<Note[]>(`/api/notes${toQuery(params)}`);
}

export async function createNote(input: {
  title: string;
  markdown_content?: string;
  is_starred?: boolean;
  topic_id?: string | null;
  tag_ids?: string[];
}): Promise<Note> {
  return apiFetch<Note>("/api/notes", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function getNote(id: string): Promise<Note> {
  return apiFetch<Note>(`/api/notes/${id}`);
}

export async function updateNote(
  id: string,
  input: Partial<{
    title: string;
    markdown_content: string;
    summary: string | null;
    is_starred: boolean;
    topic_id: string | null;
    tag_ids: string[];
  }>,
): Promise<Note> {
  return apiFetch<Note>(`/api/notes/${id}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export async function deleteNote(id: string): Promise<void> {
  return apiFetch<void>(`/api/notes/${id}`, { method: "DELETE" });
}

export async function listTopics(): Promise<Topic[]> {
  return apiFetch<Topic[]>("/api/topics");
}

export async function listTags(): Promise<Tag[]> {
  return apiFetch<Tag[]>("/api/tags");
}

