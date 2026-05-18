import { fieldLabel, sharedModelFields } from "../content/sharedModel";
import type { FieldId } from "../types";

export function SharedModelBoard({
  selectedTags,
  requiredTags,
  missedTags = [],
}: {
  selectedTags: FieldId[];
  requiredTags: FieldId[];
  missedTags?: FieldId[];
}) {
  const selected = new Set(selectedTags);
  const required = new Set(requiredTags);
  const missed = new Set(missedTags);

  return (
    <section className="model-board" aria-label="Shared Model board">
      <div className="model-board__header">
        <span>Shared Model Canvas</span>
        <strong>{selected.size}/17 anchored</strong>
      </div>
      <div className="model-board__grid">
        {sharedModelFields.map((field) => {
          const className = [
            "model-field",
            `model-field--${field.group}`,
            selected.has(field.id) ? "model-field--selected" : "",
            required.has(field.id) ? "model-field--required" : "",
            missed.has(field.id) ? "model-field--missed" : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <article className={className} key={field.id}>
              <span className="model-field__group">{field.group}</span>
              <h3>{fieldLabel(field.id)}</h3>
              <p>{field.prompt}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
