export const SHARED_MODEL_FIELDS = [
  { id: "vision", label: "Vision", prompt: "What's the big picture?" },
  { id: "scope", label: "Scope", prompt: "What are we talking about?" },
  { id: "rationale", label: "Rationale", prompt: "Why are we talking about this?" },
  { id: "as_is_state", label: "As-is State", prompt: "What do we have right now?" },
  { id: "strategy", label: "Strategy", prompt: "How are we going to achieve the vision?" },
  { id: "success_criteria", label: "Success Criteria", prompt: "How do we know we’ve succeeded?" },
  { id: "kpis", label: "Key Performance Indicators", prompt: "What are they?" },

  {
    id: "internal_stakeholders",
    label: "Internal Stakeholder Context",
    prompt: "Who do we need to take into consideration?",
  },
  {
    id: "external_stakeholders",
    label: "External Stakeholder Context",
    prompt: "Who do we need to take into consideration?",
  },

  {
    id: "resources_knowledge",
    label: "Resources/Knowledge Management",
    prompt: "Tools and processes (and RoE capture).",
  },
  { id: "tools_processes", label: "Tools and Processes", prompt: "How do we work?" },
  {
    id: "logistical_constraints",
    label: "Logistical Constraints",
    prompt: "Budget, Time, Time Zones",
  },

  { id: "team_governance", label: "Team Governance", prompt: "How are we working together?" },
  { id: "team", label: "Team", prompt: "Who’s involved?" },
  { id: "project_manager", label: "Project Manager", prompt: "Who is leading day-to-day?" },
  { id: "responsible", label: "Responsible", prompt: "Who does the work?" },
  { id: "accountable", label: "Accountable", prompt: "Who owns the outcome?" },
];

export const FIELD_ID_SET = new Set(SHARED_MODEL_FIELDS.map((f) => f.id));

export function fieldById(id) {
  return SHARED_MODEL_FIELDS.find((f) => f.id === id) || null;
}

