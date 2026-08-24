import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import initSqlJs from "sql.js";
import { DEFAULT_CATEGORY } from "./categories.js";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
const DATA_DIR = path.join(ROOT, "data");
const DB_PATH = path.join(DATA_DIR, "saison.sqlite");
const CALENDAR_PATH = path.join(DATA_DIR, "calendrier.json");
const WASM_PATH = path.join(
  path.dirname(require.resolve("sql.js")),
  "sql-wasm.wasm",
);

let db;

export async function initDb() {
  const SQL = await initSqlJs({
    locateFile: () => WASM_PATH,
  });

  if (fs.existsSync(DB_PATH)) {
    db = new SQL.Database(fs.readFileSync(DB_PATH));
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS calendar_days (
      sunday_date TEXT PRIMARY KEY,
      competitions_json TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id TEXT NOT NULL,
      sunday_date TEXT NOT NULL,
      event_type TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      venue_type TEXT NOT NULL DEFAULT 'domicile',
      venue_detail TEXT NOT NULL DEFAULT '',
      time TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      UNIQUE(category_id, sunday_date)
    );
  `);

  seedCalendar();
  if (!getSetting("last_category")) {
    setSetting("last_category", DEFAULT_CATEGORY);
  }
  save();
  return db;
}

function seedCalendar() {
  const alreadySeeded = queryOne("SELECT COUNT(*) AS n FROM calendar_days").n;
  if (alreadySeeded > 0) return;

  const days = JSON.parse(fs.readFileSync(CALENDAR_PATH, "utf8"));
  const insert = db.prepare(
    "INSERT INTO calendar_days (sunday_date, competitions_json) VALUES (?, ?)",
  );
  for (const day of days) {
    insert.run([day.date, JSON.stringify(day.competitions)]);
  }
  insert.free();
}

export function save() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
}

export function query(sql, params = []) {
  const statement = db.prepare(sql);
  statement.bind(params);
  const rows = [];
  while (statement.step()) {
    rows.push(statement.getAsObject());
  }
  statement.free();
  return rows;
}

export function queryOne(sql, params = []) {
  return query(sql, params)[0] ?? null;
}

export function run(sql, params = []) {
  db.run(sql, params);
  save();
}

export function getSetting(key) {
  return queryOne("SELECT value FROM settings WHERE key = ?", [key])?.value ?? null;
}

export function setSetting(key, value) {
  run(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value],
  );
}

export function listCalendarDays() {
  return query(
    "SELECT sunday_date, competitions_json FROM calendar_days ORDER BY sunday_date ASC",
  ).map((row) => ({
    date: row.sunday_date,
    competitions: JSON.parse(row.competitions_json),
  }));
}

export function listEvents(categoryId) {
  return query(
    `SELECT id, category_id, sunday_date, event_type, title, venue_type, venue_detail, time, notes
     FROM events WHERE category_id = ? ORDER BY sunday_date ASC`,
    [categoryId],
  );
}

export function getEventById(id) {
  return queryOne(
    `SELECT id, category_id, sunday_date, event_type, title, venue_type, venue_detail, time, notes
     FROM events WHERE id = ?`,
    [id],
  );
}

export function getEventForDay(categoryId, sundayDate) {
  return queryOne(
    `SELECT id FROM events WHERE category_id = ? AND sunday_date = ?`,
    [categoryId, sundayDate],
  );
}

export function insertEvent(payload) {
  run(
    `INSERT INTO events (category_id, sunday_date, event_type, title, venue_type, venue_detail, time, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      payload.categoryId,
      payload.sundayDate,
      payload.eventType,
      payload.title,
      payload.venueType,
      payload.venueDetail,
      payload.time,
      payload.notes,
    ],
  );
  return getEventForDay(payload.categoryId, payload.sundayDate);
}

export function updateEvent(id, payload) {
  run(
    `UPDATE events
     SET event_type = ?, title = ?, venue_type = ?, venue_detail = ?, time = ?, notes = ?
     WHERE id = ?`,
    [
      payload.eventType,
      payload.title,
      payload.venueType,
      payload.venueDetail,
      payload.time,
      payload.notes,
      id,
    ],
  );
}

export function deleteEvent(id) {
  run("DELETE FROM events WHERE id = ?", [id]);
}
