export const DISC = {
  D: "Dominance",
  i: "Influence",
  S: "Steadiness",
  C: "Conscientiousness",
};

export const STAKEHOLDERS = [
  {
    id: "ops_d",
    name: "Morgan",
    role: "Operations Lead",
    disc: "D",
    bio: "Decisive. Wants immediate action and clear accountability.",
    background: "Morgan spent 8 years in emergency response coordination before joining the drone network. They've seen firsthand how delayed decisions cost lives in the field. Known for cutting through bureaucracy to get results.",
    motivations: ["Protect field responders", "Deliver measurable outcomes", "Maintain operational credibility"],
    pressures: ["Ministerial demo deadlines", "Field teams bypassing broken systems", "Political scrutiny on response times"],
    systemRole: "Ensures the drone response network delivers real-world operational impact. Bridges the gap between strategic intent and field execution.",
    interrupts: [
      "Stop. What's the 48-hour move?",
      "You're drifting—commit to an action owner.",
      "If this ships late, we fail in the real world.",
    ],
    rewards: {
      strategy: 3,
      responsible: 3,
      accountable: 2,
      kpis: 1,
      success_criteria: 1,
      vision: 1,
    },
    dislikes: {
      team_governance: 1,
      resources_knowledge: 1,
    },
    recommendedTags: ["responsible", "strategy", "accountable"],
  },
  {
    id: "comms_i",
    name: "Ravi",
    role: "Public Trust & Comms",
    disc: "i",
    bio: "Persuasive. Wants a story people can believe and repeat.",
    background: "Ravi built their career in crisis communications during natural disasters. They understand how public trust can make or break emergency response programs. Excels at translating complex technical decisions into human stories.",
    motivations: ["Build public trust", "Create clear narratives", "Ensure community buy-in"],
    pressures: ["Media scrutiny", "Misinformation campaigns", "Competing stakeholder messages"],
    systemRole: "Maintains the social license to operate. Ensures the drone network remains trusted by communities, regulators, and partners.",
    interrupts: [
      "If you can't say it plainly, the public won't trust it.",
      "What do we tell partners and responders today?",
      "This sounds like corporate wallpaper—make it real.",
    ],
    rewards: {
      vision: 3,
      rationale: 2,
      external_stakeholders: 2,
      internal_stakeholders: 1,
      success_criteria: 1,
    },
    dislikes: {
      tools_processes: 1,
      logistical_constraints: 1,
    },
    recommendedTags: ["vision", "rationale", "external_stakeholders"],
  },
  {
    id: "safety_s",
    name: "Aisha",
    role: "Safety & Training",
    disc: "S",
    bio: "Stabilizing. Wants safety boundaries and team alignment under stress.",
    background: "Aisha is a former flight instructor who transitioned to safety systems design. She believes that sustainable speed comes from robust safety culture, not shortcuts. Trusted by field teams for protecting their wellbeing.",
    motivations: ["Zero safety incidents", "Team psychological safety", "Consistent training standards"],
    pressures: ["Schedule pressure vs safety checks", "Cognitive overload in field teams", "Regulatory compliance audits"],
    systemRole: "Guardian of operational safety and team sustainability. Ensures the network scales without compromising human factors.",
    interrupts: [
      "If we cut the safety check, we lose the field teams.",
      "Who needs to be aligned before we change anything?",
      "This is raising cognitive load—protect the team.",
    ],
    rewards: {
      team_governance: 3,
      internal_stakeholders: 2,
      scope: 1,
      logistical_constraints: 1,
      vision: 1,
    },
    dislikes: {
      strategy: 1,
    },
    recommendedTags: ["team_governance", "internal_stakeholders", "scope"],
  },
  {
    id: "finance_c",
    name: "Elena",
    role: "Finance & Compliance",
    disc: "C",
    bio: "Analytical. Wants boundaries, constraints, and lifecycle impact made explicit.",
    background: "Elena came from defense sector acquisition where whole-of-life costing prevented capability failures. She tracks every dollar's impact on long-term system viability. Known for asking the hard questions others avoid.",
    motivations: ["Sustainable funding model", "Transparent KPIs", "Avoid hidden costs"],
    pressures: ["Budget caps", "Audit requirements", "Unplanned rework costs"],
    systemRole: "Ensures financial sustainability and compliance. Protects the network from short-term decisions that create long-term liabilities.",
    interrupts: [
      "Where's the boundary? What will we NOT compromise?",
      "Show the whole-of-life impact, not just the milestone.",
      "Which KPI will move, and how do we measure it?",
    ],
    rewards: {
      kpis: 3,
      as_is_state: 2,
      logistical_constraints: 2,
      scope: 2,
      tools_processes: 1,
    },
    dislikes: {
      external_stakeholders: 1,
    },
    recommendedTags: ["kpis", "logistical_constraints", "as_is_state"],
  },
];

export function stakeholderById(id) {
  return STAKEHOLDERS.find((s) => s.id === id) || null;
}

