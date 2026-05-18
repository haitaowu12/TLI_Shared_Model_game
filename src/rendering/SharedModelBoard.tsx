import { fieldLabel, sharedModelFields } from "../content/sharedModel";
import type { FieldId } from "../types";

const fieldAreas: Record<FieldId, string> = {
  internal_stakeholders: "internal",
  external_stakeholders: "external",
  vision: "vision",
  scope: "scope",
  project_manager: "project",
  rationale: "rationale",
  as_is_state: "asis",
  strategy: "strategy",
  team_governance: "governance",
  kpis: "kpis",
  responsible: "responsible",
  accountable: "accountable",
  success_criteria: "success",
  team: "team",
  logistical_constraints: "constraints",
  resources_knowledge: "resources",
};

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
        <strong>{selected.size}/{sharedModelFields.length} anchored</strong>
      </div>
      <div className="model-board__canvas">
        {sharedModelFields.map((field) => {
          const className = [
            "model-field",
            `model-field--${field.group}`,
            ["internal_stakeholders", "external_stakeholders"].includes(field.id) ? "model-field--side" : "",
            ["vision", "scope", "logistical_constraints", "resources_knowledge"].includes(field.id) ? "model-field--band" : "",
            selected.has(field.id) ? "model-field--selected" : "",
            required.has(field.id) ? "model-field--required" : "",
            missed.has(field.id) ? "model-field--missed" : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <article className={className} key={field.id} style={{ gridArea: fieldAreas[field.id] }}>
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
