const CUP_CODES = new Set([
  "C",
  "MC",
  "MR/C",
  "Cad",
  "FR",
  "1TF",
  "32e",
  "16e",
  "8e",
  "1/4",
  "1/2",
  "F",
]);

const HOLIDAYS = [
  {
    label: "Grandes vacances",
    start: "2026-07-04",
    end: "2026-09-01",
  },
  {
    label: "Vacances de la Toussaint",
    start: "2026-10-17",
    end: "2026-11-02",
  },
  {
    label: "Vacances de Noël",
    start: "2026-12-19",
    end: "2027-01-04",
  },
  {
    label: "Vacances d'hiver",
    start: "2027-02-13",
    end: "2027-03-01",
  },
  {
    label: "Vacances de printemps",
    start: "2027-04-10",
    end: "2027-04-26",
  },
  {
    label: "Pont de l'Ascension",
    start: "2027-05-05",
    end: "2027-05-10",
  },
];

export function isChampionshipCode(code) {
  if (!code) return false;
  if (code === "JA" || code === "TP" || code === "Bat" || code === "Ba2") {
    return true;
  }
  return /J\d+/.test(code);
}

export function championshipLabel(code) {
  if (code === "JA") return "Championnat — Journée d'accueil";
  if (code === "TP") return "Championnat — Tournoi de promotion";
  if (code === "Bat") return "Championnat — Barrage aller";
  if (code === "Ba2") return "Championnat — Barrage retour";

  const match = String(code).match(/J(\d+)/);
  if (match) return `Championnat — J${match[1]}`;
  return `Championnat — ${code}`;
}

export function holidayLabel(isoDate) {
  const period = HOLIDAYS.find(
    (item) => isoDate >= item.start && isoDate <= item.end,
  );
  return period?.label ?? null;
}

export function isCupCode(code) {
  if (!code) return false;
  if (CUP_CODES.has(code)) return true;
  return /^T\d+$/.test(code);
}

export function availabilityContext(code, isoDate) {
  const parts = [];
  const holiday = holidayLabel(isoDate);
  if (holiday) parts.push(holiday);
  if (isCupCode(code)) parts.push("Coupe / Repli");
  return parts.join(" · ");
}

export function buildSunday(isoDate, code, event) {
  const date = parseIsoDate(isoDate);
  const official = isChampionshipCode(code);

  return {
    date: isoDate,
    weekday: "Dimanche",
    day: date.getDate(),
    month: date.toLocaleDateString("fr-FR", { month: "long" }),
    year: date.getFullYear(),
    monthKey: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
    monthLabel: date.toLocaleDateString("fr-FR", {
      month: "long",
      year: "numeric",
    }),
    official,
    blocked: official,
    leagueLabel: official ? championshipLabel(code) : null,
    leagueCode: code,
    context: official ? null : availabilityContext(code, isoDate),
    event: event
      ? {
          id: event.id,
          type: event.event_type,
          title: event.title,
          venueType: event.venue_type,
          venueDetail: event.venue_detail,
          time: event.time,
          notes: event.notes,
        }
      : null,
  };
}

function parseIsoDate(isoDate) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day);
}
