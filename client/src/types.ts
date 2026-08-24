export type EventType = "amical" | "tournoi" | "stage" | "repos" | "seance" | "officiel";
export type VenueType = "domicile" | "exterieur" | "neutre";
export type FilterId = "all" | "available" | "planned";

export type Category = {
  id: string;
  group: string;
  label: string;
};

export type PlannedEvent = {
  id: number;
  type: EventType;
  title: string;
  venueType: VenueType;
  venueDetail: string;
  time: string;
  notes: string;
};

export type Sunday = {
  date: string;
  weekday: string;
  day: number;
  month: string;
  year: number;
  monthKey: string;
  monthLabel: string;
  official: boolean;
  blocked: boolean;
  leagueLabel: string | null;
  leagueCode: string | null;
  context: string | null;
  event: PlannedEvent | null;
};

export type MonthGroup = {
  key: string;
  label: string;
  sundays: Sunday[];
};

export type SeasonStats = {
  officialMatchdays: number;
  freeSlots: number;
  friendlies: number;
  tournaments: number;
};

export type SeasonResponse = {
  category: Category;
  filter: FilterId;
  stats: SeasonStats;
  sundays: Sunday[];
  months: MonthGroup[];
};

export type MetaResponse = {
  season: string;
  categories: Category[];
  eventTypes: Record<Exclude<EventType, "officiel">, string>;
  venueTypes: Record<VenueType, string>;
  officialVenueTypes: Record<"domicile" | "exterieur", string>;
  lastCategory: string;
};

export type EventPayload = {
  categoryId: string;
  sundayDate: string;
  eventType: EventType;
  title: string;
  venueType: VenueType;
  venueDetail: string;
  time: string;
  notes: string;
};
