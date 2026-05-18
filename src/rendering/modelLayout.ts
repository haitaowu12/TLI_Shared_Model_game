import type { FieldId } from "../types";

export const fieldAreas: Record<FieldId, string> = {
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

export function modelFieldTone(fieldId: FieldId): string[] {
  return [
    ["internal_stakeholders", "external_stakeholders"].includes(fieldId) ? "model-field--side" : "",
    ["vision", "scope", "logistical_constraints", "resources_knowledge"].includes(fieldId) ? "model-field--band" : "",
  ].filter(Boolean);
}
