import { useEffect, useMemo, useState } from "react";
import { createEvent, deleteEvent, fetchMeta, fetchSeason, updateEvent } from "./api";
import EventModal from "./components/EventModal";
import SundayTile from "./components/SundayTile";
import type {
  Category,
  EventPayload,
  EventType,
  FilterId,
  MetaResponse,
  SeasonResponse,
  Sunday,
  VenueType,
} from "./types";

const FILTERS: { id: FilterId; label: string }[] = [
  { id: "all", label: "Toute la saison" },
  { id: "available", label: "Créneaux disponibles" },
  { id: "planned", label: "Événements du coach" },
];

export default function App() {
  const [meta, setMeta] = useState<MetaResponse | null>(null);
  const [season, setSeason] = useState<SeasonResponse | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [filter, setFilter] = useState<FilterId>("all");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Sunday | null>(null);

  useEffect(() => {
    fetchMeta()
      .then((data) => {
        setMeta(data);
        setCategoryId(data.lastCategory);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!categoryId) return;
    setLoading(true);
    fetchSeason(categoryId, filter)
      .then((data) => {
        setSeason(data);
        setError("");
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [categoryId, filter]);

  const groupedCategories = useMemo(() => groupCategories(meta?.categories ?? []), [meta]);

  async function handleSave(payload: EventPayload) {
    if (selected?.event) {
      await updateEvent(selected.event.id, payload);
    } else {
      await createEvent(payload);
    }
    const data = await fetchSeason(categoryId, filter);
    setSeason(data);
    setSelected(null);
  }

  async function handleDelete(id: number) {
    await deleteEvent(id);
    const data = await fetchSeason(categoryId, filter);
    setSeason(data);
    setSelected(null);
  }

  return (
    <div className="app">
      <header className="hero">
        <div>
          <p className="eyebrow">Saison {meta?.season ?? "2026-2027"}</p>
          <h1>Planificateur & calendrier</h1>
          <p>
            Visualisez chaque dimanche, identifiez les week-ends sans championnat
            officiel et planifiez amicaux, tournois, stages ou repos.
          </p>
        </div>
        <div className="category-box">
          <label htmlFor="category">Catégorie / niveau</label>
          <select
            id="category"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
          >
            {groupedCategories.map((group) => (
              <optgroup key={group.name} label={group.name}>
                {group.items.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      </header>

      <section className="board">
        <div className="toolbar">
          <div className="stats">
            <article className="stat">
              <span className="stat-label">Journées officielles</span>
              <strong>{season?.stats.officialMatchdays ?? "–"}</strong>
            </article>
            <article className="stat">
              <span className="stat-label">Créneaux libres</span>
              <strong>{season?.stats.freeSlots ?? "–"}</strong>
            </article>
            <article className="stat">
              <span className="stat-label">Amicaux calés</span>
              <strong>{season?.stats.friendlies ?? "–"}</strong>
            </article>
            <article className="stat">
              <span className="stat-label">Tournois calés</span>
              <strong>{season?.stats.tournaments ?? "–"}</strong>
            </article>
          </div>
          <div className="filters" role="tablist" aria-label="Filtres d'affichage">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                className={`filter-btn${filter === item.id ? " active" : ""}`}
                onClick={() => setFilter(item.id)}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {error ? <p className="error-banner">{error}</p> : null}
        {loading && !season ? <p className="loading">Chargement du calendrier…</p> : null}

        {season?.months.length ? (
          season.months.map((month) => (
            <section className="month-block" key={month.key}>
              <h2 className="month-title">{month.label}</h2>
              <div className="grid">
                {month.sundays.map((sunday) => (
                  <SundayTile
                    key={sunday.date}
                    sunday={sunday}
                    eventTypes={meta?.eventTypes ?? ({} as Record<Exclude<EventType, "officiel">, string>)}
                    venueTypes={meta?.venueTypes ?? ({} as Record<VenueType, string>)}
                    onPlan={() => setSelected(sunday)}
                  />
                ))}
              </div>
            </section>
          ))
        ) : !loading && season ? (
          <p className="empty-state">Aucun dimanche ne correspond à ce filtre.</p>
        ) : null}
      </section>

      {selected && meta ? (
        <EventModal
          sunday={selected}
          categoryId={categoryId}
          eventTypes={meta.eventTypes}
          venueTypes={meta.venueTypes}
          officialVenueTypes={meta.officialVenueTypes}
          onClose={() => setSelected(null)}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      ) : null}
    </div>
  );
}

function groupCategories(categories: Category[]) {
  const groups: { name: string; items: Category[] }[] = [];
  for (const category of categories) {
    const current = groups[groups.length - 1];
    if (!current || current.name !== category.group) {
      groups.push({ name: category.group, items: [category] });
    } else {
      current.items.push(category);
    }
  }
  return groups;
}
