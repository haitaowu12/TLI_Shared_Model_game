import type { ResponseSection } from "../types";

export const responseSections: ResponseSection[] = [
  {
    id: "purpose_anchor",
    label: "Purpose Anchor",
    prompt: "Restate the vision and why it matters under this pressure.",
    requiredTags: ["vision"],
    alternativeTags: ["rationale", "success_criteria", "kpis"],
  },
  {
    id: "immediate_48h_action",
    label: "Immediate 48h Action",
    prompt: "Name the next move and who owns it.",
    requiredTags: ["strategy"],
    alternativeTags: ["responsible", "accountable"],
  },
  {
    id: "boundary_statement",
    label: "Boundary Statement",
    prompt: "Set the scope boundary and the constraints the team will respect.",
    requiredTags: ["scope", "logistical_constraints"],
  },
  {
    id: "lifecycle_impact",
    label: "Lifecycle Impact",
    prompt: "Connect the choice to measured outcomes or current-state reality.",
    requiredTags: [],
    alternativeTags: ["kpis", "as_is_state"],
  },
  {
    id: "stakeholder_message",
    label: "Stakeholder Message",
    prompt: "Say what stakeholders need to hear and how the team will stay aligned.",
    requiredTags: ["team_governance"],
    alternativeTags: ["internal_stakeholders", "external_stakeholders"],
  },
];
