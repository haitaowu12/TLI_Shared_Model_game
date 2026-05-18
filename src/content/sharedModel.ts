import type { FieldId, SharedModelField } from "../types";

export const sharedModelFields: SharedModelField[] = [
  {
    id: "vision",
    label: "Vision",
    group: "purpose",
    prompt: "What's the big picture?",
    examples: ["Rural response time improves without trading away safety or trust."],
  },
  {
    id: "scope",
    label: "Scope",
    group: "purpose",
    prompt: "What are we talking about?",
    examples: ["48-hour containment is in scope; permanent redesign is a follow-up decision."],
  },
  {
    id: "rationale",
    label: "Rationale",
    group: "purpose",
    prompt: "Why are we talking about this?",
    examples: ["Response delays create preventable harm and public confidence risk."],
  },
  {
    id: "as_is_state",
    label: "As-is State",
    group: "core",
    prompt: "What do we have right now?",
    examples: ["Legacy dispatch interfaces are brittle and training load is already high."],
  },
  {
    id: "strategy",
    label: "Strategy",
    group: "core",
    prompt: "How are we going to achieve the vision?",
    examples: ["Stabilize the core workflow, preserve telemetry, then iterate with field feedback."],
  },
  {
    id: "success_criteria",
    label: "Success Criteria",
    group: "core",
    prompt: "How do we know we've succeeded?",
    examples: ["No safety incidents, public update approved, and defect recurrence path logged."],
  },
  {
    id: "kpis",
    label: "Key Performance Indicators",
    group: "core",
    prompt: "What are they?",
    examples: ["Median response time, training completion, demo uptime, trust score."],
  },
  {
    id: "internal_stakeholders",
    label: "Internal Stakeholder Context",
    group: "stakeholder",
    prompt: "Who do we need to take into consideration?",
    examples: ["Operations, engineering, safety, procurement, finance, executive sponsor."],
  },
  {
    id: "external_stakeholders",
    label: "External Stakeholder Context",
    group: "stakeholder",
    prompt: "Who do we need to take into consideration?",
    examples: ["First responders, regulators, rural communities, media, partners."],
  },
  {
    id: "resources_knowledge",
    label: "Resources/Knowledge Management",
    group: "execution",
    prompt: "Tools and processes",
    examples: ["Incident review, decision log, onboarding notes, shared glossary, working agreements."],
  },
  {
    id: "logistical_constraints",
    label: "Logistical Constraints",
    group: "execution",
    prompt: "Budget, time, time zones",
    examples: ["Budget cap, ministerial demo, regulatory approvals, team capacity."],
  },
  {
    id: "team_governance",
    label: "Team Governance",
    group: "governance",
    prompt: "How are we working together?",
    examples: ["Named escalation path, weekly alignment review, stop-think-reflect reset."],
  },
  {
    id: "team",
    label: "Team",
    group: "governance",
    prompt: "Who is participating?",
    examples: ["Engineering, operations, safety, procurement, data, contractor reps."],
  },
  {
    id: "project_manager",
    label: "Project Manager",
    group: "governance",
    prompt: "Who is leading day-to-day?",
    examples: ["Program lead coordinates integrated outcome and stakeholder cadence."],
  },
  {
    id: "responsible",
    label: "Responsible",
    group: "governance",
    prompt: "Who does the work?",
    examples: ["Named workstream owner handles the next 48-hour action."],
  },
  {
    id: "accountable",
    label: "Accountable",
    group: "governance",
    prompt: "Who owns the outcome?",
    examples: ["Program lead owns the integrated result and public trust posture."],
  },
];

export const fieldIds = sharedModelFields.map((field) => field.id);

export function fieldById(id: FieldId): SharedModelField {
  const field = sharedModelFields.find((candidate) => candidate.id === id);
  if (!field) throw new Error(`Unknown Shared Model field: ${id}`);
  return field;
}

export function fieldLabel(id: FieldId): string {
  return fieldById(id).label;
}
