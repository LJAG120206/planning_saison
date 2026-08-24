export const CATEGORIES = [
  { id: "u15_u14", group: "Jeunes", label: "U15-U14 Poule de 12" },
  { id: "u13_criterium_a", group: "Jeunes", label: "U13 Critérium A" },
  { id: "u13_criterium_b_c", group: "Jeunes", label: "U13 Critérium B/C" },
  { id: "u16_r1_r2", group: "Jeunes", label: "U16 R1 / R2" },
  { id: "u18_r1", group: "Jeunes", label: "U18 R1" },
  { id: "u18_r2", group: "Jeunes", label: "U18 R2" },
  { id: "u20_r1_r2", group: "Jeunes", label: "U20 R1 / R2" },
  { id: "regional_1", group: "Seniors", label: "Seniors Régional 1" },
  { id: "regional_2", group: "Seniors", label: "Seniors Régional 2" },
  { id: "regional_3", group: "Seniors", label: "Seniors Régional 3" },
  { id: "regional_1_fem", group: "Féminines", label: "Seniors Féminines R1" },
  { id: "regional_2_fem", group: "Féminines", label: "Seniors Féminines R2" },
  { id: "u18_fem_r1", group: "Féminines", label: "U18 Féminines R1" },
  { id: "u18_fem_r2_p7", group: "Féminines", label: "U18 Féminines R2 Poule 7" },
  { id: "u18_fem_r2_p6", group: "Féminines", label: "U18 Féminines R2 Poule 6" },
  { id: "futsal_r1", group: "Futsal", label: "Futsal R1" },
  { id: "futsal_r2", group: "Futsal", label: "Futsal R2" },
  { id: "futsal_u18_g", group: "Futsal", label: "Futsal U18" },
  { id: "futsal_seniors_fem", group: "Futsal", label: "Futsal Seniors Féminines" },
];

export const DEFAULT_CATEGORY = "u15_u14";

export const EVENT_TYPES = {
  amical: "Match amical",
  tournoi: "Tournoi",
  stage: "Stage",
  repos: "Repos staff / joueurs",
  seance: "Séance spécifique",
};

export const OFFICIAL_EVENT_TYPE = "officiel";

export const VENUE_TYPES = {
  domicile: "Domicile",
  exterieur: "Extérieur",
  neutre: "Neutre",
};

export const OFFICIAL_VENUE_TYPES = {
  domicile: "Domicile",
  exterieur: "Extérieur",
};

export function getCategory(id) {
  return CATEGORIES.find((category) => category.id === id) ?? null;
}
