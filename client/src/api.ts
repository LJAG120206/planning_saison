import type { EventPayload, MetaResponse, SeasonResponse } from "./types";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });

  const body = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    throw new Error(body.error || "Une erreur est survenue.");
  }
  return body;
}

export function fetchMeta() {
  return request<MetaResponse>("/api/meta");
}

export function fetchSeason(category: string, filter: string) {
  const params = new URLSearchParams({ category, filter });
  return request<SeasonResponse>(`/api/season?${params.toString()}`);
}

export function createEvent(payload: EventPayload) {
  return request<{ id: number }>("/api/events", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateEvent(id: number, payload: EventPayload) {
  return request<{ ok: boolean }>(`/api/events/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteEvent(id: number) {
  return request<{ ok: boolean }>(`/api/events/${id}`, {
    method: "DELETE",
  });
}
