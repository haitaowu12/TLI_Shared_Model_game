import type { Stakeholder } from "../types";

export const stakeholders: Stakeholder[] = [
  {
    id: "ops_d",
    name: "Morgan",
    role: "Operations Lead",
    preference: "direct",
    bio: "Decisive. Wants immediate action and clear accountability.",
    motivations: ["Protect field responders", "Deliver measurable outcomes", "Maintain operational credibility"],
    pressures: ["Ministerial demo deadlines", "Field teams bypassing broken systems", "Political scrutiny"],
    systemRole: "Keeps the response network tied to operational reality.",
    rewards: { strategy: 3, responsible: 3, accountable: 2, kpis: 1, success_criteria: 1, vision: 1 },
    dislikes: { resources_knowledge: 1 },
    recommendedTags: ["responsible", "strategy", "accountable"],
  },
  {
    id: "comms_i",
    name: "Ravi",
    role: "Public Trust & Comms",
    preference: "narrative",
    bio: "Persuasive. Wants a story people can believe and repeat.",
    motivations: ["Build public trust", "Create clear narratives", "Ensure community buy-in"],
    pressures: ["Media scrutiny", "Misinformation", "Competing stakeholder messages"],
    systemRole: "Maintains the social license to operate.",
    rewards: { vision: 3, rationale: 2, external_stakeholders: 2, internal_stakeholders: 1, success_criteria: 1 },
    dislikes: { tools_processes: 1 },
    recommendedTags: ["vision", "rationale", "external_stakeholders"],
  },
  {
    id: "safety_s",
    name: "Aisha",
    role: "Safety & Training",
    preference: "stabilizing",
    bio: "Stabilizing. Wants safety boundaries and team alignment under stress.",
    motivations: ["Zero safety incidents", "Team psychological safety", "Consistent training standards"],
    pressures: ["Schedule pressure", "Cognitive overload", "Regulatory compliance audits"],
    systemRole: "Protects operating safety and team sustainability.",
    rewards: { team_governance: 3, internal_stakeholders: 2, scope: 1, logistical_constraints: 1, vision: 1 },
    dislikes: { strategy: 1 },
    recommendedTags: ["team_governance", "internal_stakeholders", "scope"],
  },
  {
    id: "finance_c",
    name: "Elena",
    role: "Finance & Compliance",
    preference: "analytical",
    bio: "Analytical. Wants boundaries, constraints, and lifecycle impact made explicit.",
    motivations: ["Sustainable funding model", "Transparent KPIs", "Avoid hidden costs"],
    pressures: ["Budget caps", "Audit requirements", "Unplanned rework costs"],
    systemRole: "Protects the effort from short-term decisions that create long-term liabilities.",
    rewards: { kpis: 3, as_is_state: 2, logistical_constraints: 2, scope: 2, tools_processes: 1 },
    dislikes: { external_stakeholders: 1 },
    recommendedTags: ["kpis", "logistical_constraints", "as_is_state"],
  },
];

export function stakeholderById(id: string): Stakeholder {
  const stakeholder = stakeholders.find((candidate) => candidate.id === id);
  if (!stakeholder) throw new Error(`Unknown stakeholder: ${id}`);
  return stakeholder;
}
