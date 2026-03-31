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
    interrupts: [
      "Stop. What’s the 48-hour move?",
      "You’re drifting—commit to an action owner.",
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
  },
  {
    id: "comms_i",
    name: "Ravi",
    role: "Public Trust & Comms",
    disc: "i",
    bio: "Persuasive. Wants a story people can believe and repeat.",
    interrupts: [
      "If you can’t say it plainly, the public won’t trust it.",
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
  },
  {
    id: "safety_s",
    name: "Aisha",
    role: "Safety & Training",
    disc: "S",
    bio: "Stabilizing. Wants safety boundaries and team alignment under stress.",
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
  },
  {
    id: "finance_c",
    name: "Elena",
    role: "Finance & Compliance",
    disc: "C",
    bio: "Analytical. Wants boundaries, constraints, and lifecycle impact made explicit.",
    interrupts: [
      "Where’s the boundary? What will we NOT compromise?",
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
  },
];

export function stakeholderById(id) {
  return STAKEHOLDERS.find((s) => s.id === id) || null;
}

