import { apiFetch } from "./http";

export type NamedCount = { id: string; name: string; count: number };
export type StatsSummary = {
  notes_total: number;
  starred_total: number;
  tags: NamedCount[];
  topics: NamedCount[];
};

export async function getStatsSummary(): Promise<StatsSummary> {
  return apiFetch<StatsSummary>("/api/stats/summary");
}

