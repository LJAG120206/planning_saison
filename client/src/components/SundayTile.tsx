import type { EventType, Sunday, VenueType } from "../types";

type Props = {
  sunday: Sunday;
  eventTypes: Record<Exclude<EventType, "officiel">, string>;
  venueTypes: Record<VenueType, string>;
  onPlan: () => void;
};

export default function SundayTile({ sunday, eventTypes, venueTypes, onPlan }: Props) {
  const status = sunday.official ? "official" : sunday.event ? "planned" : "available";
  const officialDetails = sunday.official ? sunday.event : null;

  return (
    <article className={`tile ${status}`}>
      <p className="tile-kicker">{sunday.weekday}</p>
      <div className="tile-date">
        <strong>{sunday.day}</strong>
        <span>
          {sunday.month} {sunday.year}
        </span>
      </div>

      <div className="tile-body">
        {sunday.official ? (
          <>
            <span className="league-badge">{sunday.leagueLabel}</span>
            {officialDetails ? (
              <>
                <p className="event-title">{officialDetails.title}</p>
                <p className="event-meta">
                  {venueTypes[officialDetails.venueType]}
                  {officialDetails.venueDetail ? ` · ${officialDetails.venueDetail}` : ""}
                  {officialDetails.time ? ` · ${officialDetails.time}` : ""}
                </p>
              </>
            ) : (
              <p className="locked-copy">Journée officielle de championnat. Renseignez l'adversaire et le lieu.</p>
            )}
          </>
        ) : (
          <>
            <span className="context-badge">
              Date disponible{sunday.context ? ` · ${sunday.context}` : ""}
            </span>
            {sunday.event ? (
              <>
                <span className={`event-type ${sunday.event.type}`}>
                  {eventTypes[sunday.event.type as Exclude<EventType, "officiel">]}
                </span>
                <p className="event-title">
                  {sunday.event.title || eventTypes[sunday.event.type as Exclude<EventType, "officiel">]}
                </p>
                <p className="event-meta">
                  {venueTypes[sunday.event.venueType]}
                  {sunday.event.venueDetail ? ` · ${sunday.event.venueDetail}` : ""}
                  {sunday.event.time ? ` · ${sunday.event.time}` : ""}
                </p>
              </>
            ) : (
              <p className="empty-copy">Aucun événement planifié pour le staff.</p>
            )}
          </>
        )}
      </div>

      <button
        className={sunday.event ? "edit-btn" : "add-btn"}
        onClick={onPlan}
        type="button"
      >
        {sunday.official
          ? sunday.event
            ? "Modifier le match"
            : "Renseigner l'adversaire"
          : sunday.event
            ? "Modifier l'action"
            : "Ajouter une action"}
      </button>
    </article>
  );
}
