import type { EventType, PlayerContribution } from "./types";

export function isMatchEventType(type: EventType) {
  return type === "officiel" || type === "amical" || type === "tournoi";
}

export function formatContributions(entries: PlayerContribution[] | undefined) {
  if (!entries?.length) return "";
  return entries
    .filter((item) => item.name.trim())
    .map((item) => (item.count > 1 ? `${item.name} (${item.count})` : item.name))
    .join(", ");
}

export function emptyPlayerRow(): PlayerContribution {
  return { name: "", count: 1 };
}

export function filledPlayerRows(entries: PlayerContribution[] | undefined) {
  const rows = (entries ?? []).filter((item) => item.name.trim());
  return rows.length ? rows : [emptyPlayerRow()];
}
