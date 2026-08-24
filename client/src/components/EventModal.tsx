import { FormEvent, useEffect, useState } from "react";
import type { EventPayload, EventType, Sunday, VenueType } from "../types";

type CoachEventType = Exclude<EventType, "officiel">;

type Props = {
  sunday: Sunday;
  categoryId: string;
  eventTypes: Record<CoachEventType, string>;
  venueTypes: Record<VenueType, string>;
  officialVenueTypes: Record<"domicile" | "exterieur", string>;
  onClose: () => void;
  onSave: (payload: EventPayload) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
};

export default function EventModal({
  sunday,
  categoryId,
  eventTypes,
  venueTypes,
  officialVenueTypes,
  onClose,
  onSave,
  onDelete,
}: Props) {
  const existing = sunday.event;
  const official = sunday.official;
  const [eventType, setEventType] = useState<CoachEventType>(
    existing && existing.type !== "officiel" ? existing.type : "amical",
  );
  const [title, setTitle] = useState(existing?.title ?? "");
  const [venueType, setVenueType] = useState<VenueType>(
    existing?.venueType ?? "domicile",
  );
  const [venueDetail, setVenueDetail] = useState(existing?.venueDetail ?? "");
  const [time, setTime] = useState(existing?.time ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await onSave({
        categoryId,
        sundayDate: sunday.date,
        eventType: official ? "officiel" : eventType,
        title,
        venueType: official && venueType === "neutre" ? "domicile" : venueType,
        venueDetail,
        time,
        notes,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!existing) return;
    const message = official
      ? "Effacer l'adversaire et le lieu de cette journée officielle ?"
      : "Supprimer cet événement et libérer le créneau ?";
    if (!window.confirm(message)) return;
    setBusy(true);
    setError("");
    try {
      await onDelete(existing.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suppression impossible.");
      setBusy(false);
    }
  }

  const venues = official ? officialVenueTypes : venueTypes;

  return (
    <div className="overlay" onClick={onClose} role="presentation">
      <form
        className="modal"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <h2>
          {official
            ? existing
              ? "Modifier le match officiel"
              : "Renseigner le match officiel"
            : existing
              ? "Modifier l'action"
              : "Planifier une action"}
        </h2>
        <p className="modal-date">
          {sunday.weekday} {sunday.day} {sunday.month} {sunday.year}
          {sunday.leagueLabel ? ` · ${sunday.leagueLabel}` : ""}
        </p>

        <div className="form-grid">
          {official ? null : (
            <label className="field">
              <span className="field-label">Type d'événement</span>
              <select
                value={eventType}
                onChange={(event) => setEventType(event.target.value as CoachEventType)}
              >
                {(Object.entries(eventTypes) as [CoachEventType, string][]).map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="field">
            <span className="field-label">{official ? "Adversaire" : "Intitulé / adversaire"}</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={official ? "Nom de l'équipe adverse" : "Nom de l'équipe, du tournoi ou du stage"}
              required={official}
            />
          </label>

          <fieldset className="field" style={{ border: 0, margin: 0, padding: 0 }}>
            <legend className="field-label">Lieu</legend>
            <div className={`venue-row${official ? " two" : ""}`}>
              {(Object.entries(venues) as [VenueType, string][]).map(([id, label]) => (
                <label key={id}>
                  <input
                    type="radio"
                    name="venue"
                    checked={venueType === id}
                    onChange={() => setVenueType(id)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="field">
            <span className="field-label">Adresse / complexe (optionnel)</span>
            <input
              value={venueDetail}
              onChange={(event) => setVenueDetail(event.target.value)}
              placeholder="Stade, gymnase, adresse"
            />
          </label>

          <label className="field">
            <span className="field-label">Horaire</span>
            <input
              type="time"
              value={time}
              onChange={(event) => setTime(event.target.value)}
            />
          </label>

          <label className="field">
            <span className="field-label">Notes libres & contacts</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Éducateur adverse, logistique, arbitres…"
            />
          </label>
        </div>

        {error ? <p className="form-error">{error}</p> : null}

        <div className="modal-actions">
          <button className="primary" disabled={busy} type="submit">
            Enregistrer
          </button>
          <button className="ghost" onClick={onClose} type="button">
            Annuler
          </button>
          {existing ? (
            <button className="danger" disabled={busy} onClick={handleDelete} type="button">
              {official ? "Effacer les infos" : "Supprimer"}
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
