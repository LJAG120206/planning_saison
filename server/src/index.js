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
import { buildSunday, isChampionshipCode } from "./season.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_DIST = path.resolve(__dirname, "..", "..", "client", "dist");
const PORT = Number(process.env.PORT) || 8787;

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

  const events = db.listEvents(categoryId);
  const eventsByDate = new Map(events.map((event) => [event.sunday_date, event]));
  const sundays = db.listCalendarDays().map((day) =>
    buildSunday(day.date, day.competitions[categoryId] ?? null, eventsByDate.get(day.date) ?? null),
  );

  const stats = {
    officialMatchdays: sundays.filter((sunday) => sunday.official).length,
    freeSlots: sundays.filter((sunday) => !sunday.official && !sunday.event).length,
    friendlies: sundays.filter((sunday) => sunday.event?.type === "amical").length,
    tournaments: sundays.filter((sunday) => sunday.event?.type === "tournoi").length,
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
    sundays: visible,
    months: groupByMonth(visible),
  });
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
  const day = db.listCalendarDays().find((item) => item.date === sundayDate);
  return isChampionshipCode(day?.competitions[categoryId] ?? null);
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
