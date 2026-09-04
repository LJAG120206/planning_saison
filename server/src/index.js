import path from "node:path";
import { fileURLToPath } from "node:url";
import cors from "cors";
import express from "express";
import {
  CATEGORIES,
  DEFAULT_CATEGORY,
  EVENT_TYPES,
  OFFICIAL_EVENT_TYPE,
  OFFICIAL_VENUE_TYPES,
  VENUE_TYPES,
  getCategory,
} from "./categories.js";
import * as db from "./db.js";
import { buildSunday, isChampionshipCode, normalizeLeagueCode, resolveLeagueState, suggestLeagueCode } from "./season.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_DIST = path.resolve(__dirname, "..", "..", "client", "dist");
const PORT = Number(process.env.API_PORT || process.env.PORT) || 47128;

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/meta", (_req, res) => {
  res.json({
    season: "2026-2027",
    categories: CATEGORIES,
    eventTypes: EVENT_TYPES,
    venueTypes: VENUE_TYPES,
    officialVenueTypes: OFFICIAL_VENUE_TYPES,
    lastCategory: db.getSetting("last_category") ?? DEFAULT_CATEGORY,
  });
});

app.get("/api/season", (req, res) => {
  const categoryId = String(req.query.category || db.getSetting("last_category") || DEFAULT_CATEGORY);
  const filter = String(req.query.filter || "all");
  const category = getCategory(categoryId);

  if (!category) {
    return res.status(400).json({ error: "Catégorie inconnue." });
  }

  db.setSetting("last_category", categoryId);

  const sundays = buildSeasonSundays(categoryId);
  const overrideCount = sundays.filter((sunday) => sunday.overridden).length;

  const stats = {
    officialMatchdays: sundays.filter((sunday) => sunday.official).length,
    freeSlots: sundays.filter((sunday) => !sunday.official && !sunday.event).length,
    friendlies: sundays.filter((sunday) => sunday.event?.type === "amical").length,
    tournaments: sundays.filter((sunday) => sunday.event?.type === "tournoi").length,
    overriddenDays: overrideCount,
  };

  const visible = sundays.filter((sunday) => {
    if (filter === "available") return !sunday.official && !sunday.event;
    if (filter === "planned") {
      return Boolean(sunday.event) && sunday.event.type !== OFFICIAL_EVENT_TYPE;
    }
    return true;
  });

  res.json({
    category,
    filter,
    stats,
    suggestedLeagueCode: suggestLeagueCode(sundays.filter((sunday) => sunday.official).map((sunday) => sunday.leagueCode)),
    sundays: visible,
    months: groupByMonth(visible),
  });
});

app.put("/api/calendar/overrides", (req, res) => {
  const categoryId = String(req.body?.categoryId || "");
  const sundayDate = String(req.body?.sundayDate || "");
  const mode = String(req.body?.mode || "");
  const clearConflictingEvent = Boolean(req.body?.clearConflictingEvent);

  if (!getCategory(categoryId)) {
    return res.status(400).json({ error: "Catégorie inconnue." });
  }
  if (!db.getCalendarDay(sundayDate)) {
    return res.status(400).json({ error: "Date absente du calendrier de saison." });
  }
  if (!["official", "free", "reset"].includes(mode)) {
    return res.status(400).json({ error: "Indiquez si la date est officielle, libre, ou à rétablir." });
  }

  const applied = applyCalendarOverride({
    categoryId,
    sundayDate,
    mode,
    leagueCode: req.body?.leagueCode,
    clearConflictingEvent,
  });
  if (applied.error) {
    return res.status(applied.status).json({
      error: applied.error,
      conflict: applied.conflict ?? false,
    });
  }

  res.json({ ok: true, overridden: applied.overridden });
});

app.delete("/api/calendar/overrides", (req, res) => {
  const categoryId = String(req.query.category || "");
  if (!getCategory(categoryId)) {
    return res.status(400).json({ error: "Catégorie inconnue." });
  }

  const overrides = db.listOverrides(categoryId);
  db.deleteOverridesForCategory(categoryId);
  for (const override of overrides) {
    syncEventWithDay(categoryId, override.sunday_date);
  }

  res.json({ ok: true });
});

app.post("/api/events", (req, res) => {
  const payload = parseEventPayload(req.body);
  if (payload.error) return res.status(400).json({ error: payload.error });

  const officialDay = isOfficialDay(payload.categoryId, payload.sundayDate);
  if (officialDay && payload.eventType !== OFFICIAL_EVENT_TYPE) {
    return res.status(409).json({
      error: "Sur une journée officielle, seuls l'adversaire et le lieu du match de championnat peuvent être renseignés.",
    });
  }
  if (!officialDay && payload.eventType === OFFICIAL_EVENT_TYPE) {
    return res.status(409).json({
      error: "Un match officiel ne peut être renseigné que sur une journée de championnat.",
    });
  }

  if (db.getEventForDay(payload.categoryId, payload.sundayDate)) {
    return res.status(409).json({ error: "Un événement est déjà planifié sur cette date." });
  }

  const created = db.insertEvent(payload);
  res.status(201).json({ id: created.id });
});

app.put("/api/events/:id", (req, res) => {
  const id = Number(req.params.id);
  const existing = db.getEventById(id);
  if (!existing) return res.status(404).json({ error: "Événement introuvable." });

  const payload = parseEventPayload({
    ...req.body,
    categoryId: existing.category_id,
    sundayDate: existing.sunday_date,
  });
  if (payload.error) return res.status(400).json({ error: payload.error });

  const officialDay = isOfficialDay(existing.category_id, existing.sunday_date);
  if (officialDay && payload.eventType !== OFFICIAL_EVENT_TYPE) {
    return res.status(409).json({
      error: "Sur une journée officielle, seuls l'adversaire et le lieu du match de championnat peuvent être renseignés.",
    });
  }

  db.updateEvent(id, payload);
  res.json({ ok: true });
});

app.delete("/api/events/:id", (req, res) => {
  const id = Number(req.params.id);
  const existing = db.getEventById(id);
  if (!existing) return res.status(404).json({ error: "Événement introuvable." });
  db.deleteEvent(id);
  res.json({ ok: true });
});

app.use(express.static(CLIENT_DIST));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  res.sendFile(path.join(CLIENT_DIST, "index.html"), (error) => {
    if (error) next();
  });
});

await db.initDb();
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || "Erreur serveur." });
});

app.listen(PORT, () => {
  console.log(`Calendrier de saison prêt sur http://127.0.0.1:${PORT}`);
});

function buildSeasonSundays(categoryId) {
  const events = db.listEvents(categoryId);
  const eventsByDate = new Map(events.map((event) => [event.sunday_date, event]));
  const overrides = new Map(db.listOverrides(categoryId).map((row) => [row.sunday_date, row]));

  return db.listCalendarDays().map((day) => {
    const baseCode = day.competitions[categoryId] ?? null;
    const resolved = resolveLeagueState(baseCode, overrides.get(day.date) ?? null);
    return buildSunday(day.date, resolved.code, eventsByDate.get(day.date) ?? null, {
      official: resolved.official,
      overridden: resolved.overridden,
      baseCode,
    });
  });
}

function groupByMonth(sundays) {
  const months = [];
  for (const sunday of sundays) {
    const current = months[months.length - 1];
    if (!current || current.key !== sunday.monthKey) {
      months.push({
        key: sunday.monthKey,
        label: capitalize(sunday.monthLabel),
        sundays: [sunday],
      });
    } else {
      current.sundays.push(sunday);
    }
  }
  return months;
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function isOfficialDay(categoryId, sundayDate) {
  const day = db.getCalendarDay(sundayDate);
  if (!day) return false;
  const baseCode = day.competitions[categoryId] ?? null;
  return resolveLeagueState(baseCode, db.getOverride(categoryId, sundayDate)).official;
}

function applyCalendarOverride({ categoryId, sundayDate, mode, leagueCode, clearConflictingEvent }) {
  const day = db.getCalendarDay(sundayDate);
  const baseCode = day.competitions[categoryId] ?? null;
  const defaultOfficial = isChampionshipCode(baseCode);

  if (mode === "reset") {
    db.deleteOverride(categoryId, sundayDate);
    syncEventWithDay(categoryId, sundayDate);
    return { overridden: false };
  }

  let nextMode = mode;
  let nextCode = "";

  if (mode === "official") {
    nextCode = normalizeLeagueCode(leagueCode);
    if (!isChampionshipCode(nextCode)) {
      return {
        status: 400,
        error: "Indiquez un code de journée officiel (ex. J5, JA, TP).",
      };
    }
  }

  const matchesDefault =
    (mode === "free" && !defaultOfficial) ||
    (mode === "official" && defaultOfficial && nextCode === baseCode);

  if (matchesDefault) {
    db.deleteOverride(categoryId, sundayDate);
    syncEventWithDay(categoryId, sundayDate);
    return { overridden: false };
  }

  const nextOfficial = nextMode === "official";
  const existing = db.getEventByDay(categoryId, sundayDate);
  const conflict =
    existing &&
    ((nextOfficial && existing.event_type !== OFFICIAL_EVENT_TYPE) ||
      (!nextOfficial && existing.event_type === OFFICIAL_EVENT_TYPE));

  if (conflict && !clearConflictingEvent) {
    return {
      status: 409,
      conflict: true,
      error: nextOfficial
        ? "Une action coach est déjà planifiée sur cette date. Confirmez pour la supprimer et marquer la journée officielle."
        : "Les infos du match officiel seront effacées si vous libérez cette date.",
    };
  }

  db.upsertOverride({
    categoryId,
    sundayDate,
    mode: nextMode,
    leagueCode: nextCode,
  });
  syncEventWithDay(categoryId, sundayDate);
  return { overridden: true };
}

function syncEventWithDay(categoryId, sundayDate) {
  const official = isOfficialDay(categoryId, sundayDate);
  const event = db.getEventByDay(categoryId, sundayDate);
  if (!event) return;
  if (official && event.event_type !== OFFICIAL_EVENT_TYPE) db.deleteEvent(event.id);
  if (!official && event.event_type === OFFICIAL_EVENT_TYPE) db.deleteEvent(event.id);
}

function parseEventPayload(body = {}) {
  const categoryId = String(body.categoryId || "");
  const sundayDate = String(body.sundayDate || "");
  const eventType = String(body.eventType || "");
  const title = String(body.title || "").trim();
  const venueType = String(body.venueType || "domicile");
  const venueDetail = String(body.venueDetail || "").trim();
  const time = String(body.time || "").trim();
  const notes = String(body.notes || "").trim();

  if (!getCategory(categoryId)) return { error: "Catégorie inconnue." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(sundayDate)) return { error: "Date invalide." };
  if (eventType === OFFICIAL_EVENT_TYPE) {
    if (!title) return { error: "Indiquez le nom de l'adversaire." };
    if (!OFFICIAL_VENUE_TYPES[venueType]) {
      return { error: "Choisissez domicile ou extérieur." };
    }
  } else {
    if (!EVENT_TYPES[eventType]) return { error: "Type d'événement invalide." };
    if (!VENUE_TYPES[venueType]) return { error: "Lieu invalide." };
    if (eventType !== "repos" && !title) {
      return { error: "Indiquez un intitulé ou un adversaire." };
    }
  }

  return {
    categoryId,
    sundayDate,
    eventType,
    title,
    venueType,
    venueDetail,
    time,
    notes,
  };
}
