import type { EventType, FormationId, PlayerContribution } from "./types";

export const FORMATIONS: FormationId[] = ["4-4-2", "3-5-2", "4-2-3-1", "4-3-3", "4-1-4-1", "4-2-4"];

export const FORMATION_LINES: Record<FormationId, { label: string; count: number }[]> = {
  "4-4-2": [
    { label: "Gardien", count: 1 },
    { label: "Défense", count: 4 },
    { label: "Milieu", count: 4 },
    { label: "Attaque", count: 2 },
  ],
  "3-5-2": [
    { label: "Gardien", count: 1 },
    { label: "Défense", count: 3 },
    { label: "Milieu", count: 5 },
    { label: "Attaque", count: 2 },
  ],
  "4-2-3-1": [
    { label: "Gardien", count: 1 },
    { label: "Défense", count: 4 },
    { label: "Milieux défensifs", count: 2 },
    { label: "Milieux offensifs", count: 3 },
    { label: "Attaque", count: 1 },
  ],
  "4-3-3": [
    { label: "Gardien", count: 1 },
    { label: "Défense", count: 4 },
    { label: "Milieu", count: 3 },
    { label: "Attaque", count: 3 },
  ],
  "4-1-4-1": [
    { label: "Gardien", count: 1 },
    { label: "Défense", count: 4 },
    { label: "Milieu défensif", count: 1 },
    { label: "Milieu", count: 4 },
    { label: "Attaque", count: 1 },
  ],
  "4-2-4": [
    { label: "Gardien", count: 1 },
    { label: "Défense", count: 4 },
    { label: "Milieu", count: 2 },
    { label: "Attaque", count: 4 },
  ],
};

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

export function padNames(names: string[] | undefined, length: number) {
  return Array.from({ length }, (_, index) => names?.[index] ?? "");
}

export function namedPlayers(...lists: (string[] | undefined)[]) {
  return lists.flat().map((name) => (name ?? "").trim()).filter(Boolean);
}

