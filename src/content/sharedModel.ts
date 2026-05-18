import type { FieldId, SharedModelField } from "../types";

export const sharedModelFields: SharedModelField[] = [
  {
    id: "vision",
    label: "Vision",
    group: "purpose",
    prompt: "What big-picture outcome must stay visible?",
    examples: ["Rural response time improves without trading away safety or trust."],
  },
  {
    id: "scope",
    label: "Scope",
    group: "purpose",
    prompt: "What is inside and outside this decision?",
    examples: ["48-hour containment is in scope; permanent redesign is a follow-up decision."],
  },
  {
    id: "rationale",
    label: "Rationale",
    group: "purpose",
    prompt: "Why does this matter now?",
    examples: ["Response delays create preventable harm and public confidence risk."],
  },
  {
    id: "as_is_state",
    label: "As-is State",
    group: "core",
    prompt: "What current reality must the team not ignore?",
    examples: ["Legacy dispatch interfaces are brittle and training load is already high."],
  },
  {
    id: "strategy",
    label: "Strategy",
    group: "core",
    prompt: "How will the team move without losing the vision?",
    examples: ["Stabilize the core workflow, preserve telemetry, then iterate with field feedback."],
  },
  {
    id: "success_criteria",
    label: "Success Criteria",
    group: "core",
    prompt: "How will success be recognized?",
    examples: ["No safety incidents, public update approved, and defect recurrence path logged."],
  },
  {
    id: "kpis",
    label: "KPIs",
    group: "core",
    prompt: "Which measures should move?",
    examples: ["Median response time, training completion, demo uptime, trust score."],
  },
  {
    id: "internal_stakeholders",
    label: "Internal Stakeholders",
    group: "stakeholder",
    prompt: "Who inside the effort needs alignment?",
    examples: ["Operations, engineering, safety, procurement, finance, executive sponsor."],
  },
  {
    id: "external_stakeholders",
    label: "External Stakeholders",
    group: "stakeholder",
    prompt: "Who outside the team will experience the decision?",
    examples: ["First responders, regulators, rural communities, media, partners."],
  },
  {
    id: "resources_knowledge",
    label: "Resources & Knowledge",
    group: "execution",
    prompt: "What knowledge must be captured or reused?",
    examples: ["Incident review, decision log, onboarding notes, shared glossary."],
  },
  {
    id: "tools_processes",
    label: "Tools & Processes",
    group: "execution",
    prompt: "What working system supports the decision?",
    examples: ["Issue tracker, decision record, comms playbook, integration test harness."],
  },
  {
    id: "logistical_constraints",
    label: "Logistical Constraints",
    group: "execution",
    prompt: "What constraints bound the response?",
    examples: ["Budget cap, ministerial demo, regulatory approvals, team capacity."],
  },
  {
    id: "team_governance",
    label: "Team Governance",
    group: "governance",
    prompt: "How will the team coordinate and decide?",
    examples: ["Named escalation path, weekly alignment review, stop-think-reflect reset."],
  },
  {
    id: "team",
    label: "Team",
    group: "governance",
    prompt: "Which people or roles must participate?",
    examples: ["Engineering, operations, safety, procurement, data, contractor reps."],
  },
  {
    id: "project_manager",
    label: "Project Manager",
    group: "governance",
    prompt: "Who orchestrates day-to-day movement?",
    examples: ["Program lead coordinates integrated outcome and stakeholder cadence."],
  },
  {
    id: "responsible",
    label: "Responsible",
    group: "governance",
    prompt: "Who does the immediate work?",
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
