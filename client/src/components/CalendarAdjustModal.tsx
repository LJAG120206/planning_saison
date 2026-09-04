import { FormEvent, useEffect, useState } from "react";
import type { Sunday } from "../types";

type Mode = "official" | "free";

type Props = {
  sunday: Sunday;
  suggestedLeagueCode: string;
  onClose: () => void;
  onSave: (mode: Mode | "reset", leagueCode: string, clearConflictingEvent: boolean) => Promise<void>;
};

const CODE_HINTS = [
  ...Array.from({ length: 22 }, (_, index) => `J${index + 1}`),
  "JA",
  "TP",
  "Bat",
  "Ba2",
];

export default function CalendarAdjustModal({
  sunday,
  suggestedLeagueCode,
  onClose,
  onSave,
}: Props) {
  const [mode, setMode] = useState<Mode>(sunday.official ? "official" : "free");
  const [leagueCode, setLeagueCode] = useState(
    sunday.leagueCode || sunday.defaultLeagueCode || suggestedLeagueCode,
  );
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit(nextMode: Mode | "reset") {
    const willClear = needsClear(sunday, nextMode);
    if (willClear) {
      const confirmed = window.confirm(
        nextMode === "official"
          ? "L'action coach planifiée sur cette date sera supprimée."
          : nextMode === "free"
            ? "Les infos du match officiel (adversaire, lieu) seront effacées."
            : "Les infos incompatibles avec le calendrier officiel seront effacées.",
      );
      if (!confirmed) return;
    }

    setBusy(true);
    setError("");
    try {
      await onSave(nextMode, leagueCode, willClear);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible.");
      setBusy(false);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void submit(mode);
  }

  const officialSource = sunday.defaultOfficial
    ? sunday.defaultLeagueLabel
    : "date libre selon le district";

  return (
    <div className="overlay" onClick={onClose} role="presentation">
      <form
        className="modal"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <h2>Surcharger le championnat</h2>
        <p className="modal-date">
          {sunday.weekday} {sunday.day} {sunday.month} {sunday.year}
          {" · "}
          Calendrier officiel : {officialSource}
        </p>

        <fieldset className="venue-field">
          <legend className="field-label">Statut de ce dimanche</legend>
          <div className="venue-row two" role="radiogroup" aria-label="Statut de la date">
            <label className="venue-choice">
              <input
                type="radio"
                name="calendar-mode"
                value="official"
                checked={mode === "official"}
                onChange={() => setMode("official")}
              />
              <span className="venue-card">
                <strong>Journée officielle</strong>
                <span className="venue-hint">Match de championnat</span>
              </span>
            </label>
            <label className="venue-choice">
              <input
                type="radio"
                name="calendar-mode"
                value="free"
                checked={mode === "free"}
                onChange={() => setMode("free")}
              />
              <span className="venue-card">
                <strong>Date libre</strong>
                <span className="venue-hint">Créneau coach</span>
              </span>
            </label>
          </div>
        </fieldset>

        {mode === "official" ? (
          <label className="field">
            <span className="field-label">Code de journée</span>
            <input
              value={leagueCode}
              onChange={(event) => setLeagueCode(event.target.value)}
              list="league-codes"
              placeholder={suggestedLeagueCode}
              required
            />
            <datalist id="league-codes">
              {CODE_HINTS.map((code) => (
                <option key={code} value={code} />
              ))}
            </datalist>
            <span className="field-help">Exemples : J5, JA, TP, Bat, Ba2</span>
          </label>
        ) : null}

        {error ? <p className="form-error">{error}</p> : null}

        <div className="modal-actions">
          <button className="primary" disabled={busy} type="submit">
            Enregistrer
          </button>
          <button className="ghost" onClick={onClose} type="button">
            Annuler
          </button>
          {sunday.overridden ? (
            <button
              className="danger"
              disabled={busy}
              onClick={() => void submit("reset")}
              type="button"
            >
              Rétablir le district
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}

function needsClear(sunday: Sunday, mode: Mode | "reset") {
  if (!sunday.event) return false;
  if (mode === "official") return sunday.event.type !== "officiel";
  if (mode === "free") return sunday.event.type === "officiel";
  if (sunday.defaultOfficial) return sunday.event.type !== "officiel";
  return sunday.event.type === "officiel";
}
