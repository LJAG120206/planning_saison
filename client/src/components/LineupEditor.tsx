import { FORMATION_LINES, FORMATIONS, padNames } from "../match";
import type { FormationId } from "../types";

type Props = {
  formation: FormationId;
  starters: string[];
  substitutes: string[];
  onFormationChange: (formation: FormationId) => void;
  onStarterChange: (index: number, name: string) => void;
  onSubstituteChange: (index: number, name: string) => void;
};

export default function LineupEditor({
  formation,
  starters,
  substitutes,
  onFormationChange,
  onStarterChange,
  onSubstituteChange,
}: Props) {
  const lines = FORMATION_LINES[formation];
  let offset = 0;
  const indexedLines = lines.map((line) => {
    const start = offset;
    offset += line.count;
    return { ...line, start };
  });
  const outfield = [...indexedLines.slice(1)].reverse();
  const goalkeeper = indexedLines[0];

  return (
    <fieldset className="lineup-field">
      <legend className="field-label">Composition</legend>
      <label className="field">
        <span className="field-label">Formation</span>
        <select
          value={formation}
          onChange={(event) => onFormationChange(event.target.value as FormationId)}
        >
          {FORMATIONS.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
      </label>

      <div className="pitch" aria-label={`Schéma ${formation}`}>
        {outfield.map((line) => (
          <div className="pitch-line" key={`${formation}-${line.label}`}>
            {Array.from({ length: line.count }, (_, index) => {
              const slot = line.start + index;
              return (
                <input
                  aria-label={`${line.label} ${index + 1}`}
                  className="pitch-slot"
                  key={slot}
                  onChange={(event) => onStarterChange(slot, event.target.value)}
                  placeholder={line.label}
                  value={starters[slot] ?? ""}
                />
              );
            })}
          </div>
        ))}
        <div className="pitch-line">
          <input
            aria-label="Gardien"
            className="pitch-slot keeper"
            onChange={(event) => onStarterChange(goalkeeper.start, event.target.value)}
            placeholder="Gardien"
            value={starters[goalkeeper.start] ?? ""}
          />
        </div>
      </div>

      <div className="subs-row">
        {padNames(substitutes, 3).map((name, index) => (
          <label className="field" key={`sub-${index}`}>
            <span className="field-label">Remplaçant {index + 1}</span>
            <input
              onChange={(event) => onSubstituteChange(index, event.target.value)}
              placeholder={`Remplaçant ${index + 1}`}
              value={name}
            />
          </label>
        ))}
      </div>
    </fieldset>
  );
}
