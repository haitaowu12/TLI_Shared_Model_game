import type { ModelContentCard, ProjectRound } from "../types";

export const projectRounds: ProjectRound[] = [
  {
    id: "defect-drift",
    title: "Defect Drift",
    stakeholderId: "ops_d",
    pressure:
      "Three defects have taken over standup. The project is moving, but the team no longer agrees what the movement is for.",
    prompt: "Place the evidence where it belongs in the Shared Model, then choose how the project should respond.",
    focusFields: ["as_is_state", "strategy", "responsible", "team_governance"],
    cards: [
      {
        id: "card-standup-drift",
        roundId: "defect-drift",
        title: "Standup drift",
        body: "Daily standup is now only defect burndown. Nobody is reconnecting fixes to the project vision.",
        source: "Morgan, Operations Lead",
        stakeholderId: "ops_d",
        idealFields: ["team_governance", "strategy"],
      },
      {
        id: "card-legacy-interface",
        roundId: "defect-drift",
        title: "Current system fact",
        body: "The legacy dispatch interface is brittle in two regions, but field crews still depend on it tonight.",
        source: "Integration review",
        idealFields: ["as_is_state", "logistical_constraints"],
      },
      {
        id: "card-owner-needed",
        roundId: "defect-drift",
        title: "Owner needed",
        body: "A 48-hour containment owner is needed before the next cross-functional sync.",
        source: "Project room",
        idealFields: ["responsible", "accountable"],
      },
      {
        id: "card-containment-path",
        roundId: "defect-drift",
        title: "Containment path",
        body: "Stabilize the core workflow now; leave permanent redesign for the evidence review.",
        source: "Technical lead",
        idealFields: ["strategy", "scope"],
      },
    ],
    actions: [
      {
        id: "burn-down-only",
        label: "Push defect burn-down",
        description: "Move fast on the visible defects and accept some model drift.",
        supports: ["responsible", "strategy"],
        risks: ["vision", "team_governance"],
        meterDeltas: { systemHealth: 2, burnRate: 7, visionIntegrity: -5 },
      },
      {
        id: "reframe-standup",
        label: "Reframe standup around the model",
        description: "Name the 48-hour owner, protect current operations, and restore the why before triage.",
        supports: ["as_is_state", "strategy", "responsible", "team_governance"],
        risks: [],
        meterDeltas: { sharedModelStability: 5, systemHealth: 4, burnRate: -2 },
      },
      {
        id: "freeze-redesign",
        label: "Freeze for redesign",
        description: "Pause the integration push until the team can redesign the brittle interface.",
        supports: ["scope", "as_is_state"],
        risks: ["logistical_constraints", "external_stakeholders"],
        meterDeltas: { systemHealth: 3, burnRate: 5, stakeholderConfidence: -5 },
      },
    ],
  },
  {
    id: "public-trust",
    title: "Public Trust Shock",
    stakeholderId: "comms_i",
    pressure:
      "Media asks whether the emergency response network is unsafe. Internal teams are preparing different answers.",
    prompt: "Protect the model before the story fragments across stakeholders.",
    focusFields: ["vision", "rationale", "external_stakeholders", "success_criteria"],
    cards: [
      {
        id: "card-public-question",
        roundId: "public-trust",
        title: "Public question",
        body: "People need to hear whether the system still protects safety and trust while rural response improves.",
        source: "Ravi, Public Trust",
        stakeholderId: "comms_i",
        idealFields: ["vision", "rationale"],
      },
      {
        id: "card-community-impact",
        roundId: "public-trust",
        title: "Community impact",
        body: "Rural communities, regulators, and field responders will experience the decision differently.",
        source: "Stakeholder map",
        idealFields: ["external_stakeholders", "internal_stakeholders"],
      },
      {
        id: "card-success-story",
        roundId: "public-trust",
        title: "Success signal",
        body: "A credible update needs concrete success conditions, not just reassurance.",
        source: "Comms review",
        idealFields: ["success_criteria", "kpis"],
      },
      {
        id: "card-why-now",
        roundId: "public-trust",
        title: "Why now",
        body: "Response delays create preventable harm, but rushing without trust creates another kind of failure.",
        source: "Cohort reflection",
        idealFields: ["rationale", "vision"],
      },
    ],
    actions: [
      {
        id: "deny-risk",
        label: "Deny safety concern",
        description: "Keep the message short and avoid exposing project uncertainty.",
        supports: ["external_stakeholders"],
        risks: ["vision", "rationale", "success_criteria"],
        meterDeltas: { stakeholderConfidence: -8, visionIntegrity: -6, burnRate: 4 },
      },
      {
        id: "shared-story",
        label: "Publish one model-based story",
        description: "Use vision, rationale, stakeholder context, and success criteria as the public narrative spine.",
        supports: ["vision", "rationale", "external_stakeholders", "success_criteria"],
        risks: [],
        meterDeltas: { stakeholderConfidence: 7, visionIntegrity: 6, sharedModelStability: 4 },
      },
      {
        id: "internal-only",
        label: "Align internally first",
        description: "Slow public response to make sure internal stakeholders do not contradict each other.",
        supports: ["team_governance", "internal_stakeholders"],
        risks: ["external_stakeholders", "logistical_constraints"],
        meterDeltas: { sharedModelStability: 3, stakeholderConfidence: -2, burnRate: 3 },
      },
    ],
  },
  {
    id: "budget-kpi",
    title: "Budget And KPI Pressure",
    stakeholderId: "finance_c",
    pressure:
      "Budget burn is rising before the ministerial demo. Finance wants to know which KPI is protected and what is out of scope.",
    prompt: "Use the model to prevent cost pressure from collapsing the project into a tactical scramble.",
    focusFields: ["kpis", "logistical_constraints", "scope", "resources_knowledge"],
    cards: [
      {
        id: "card-kpi-protected",
        roundId: "budget-kpi",
        title: "Protected KPI",
        body: "Median rural response time and demo uptime are the two measures leadership keeps asking about.",
        source: "Elena, Finance",
        stakeholderId: "finance_c",
        idealFields: ["kpis", "success_criteria"],
      },
      {
        id: "card-budget-cap",
        roundId: "budget-kpi",
        title: "Budget cap",
        body: "There is no new funding before the demo, and the current team is already near capacity.",
        source: "Finance constraint",
        idealFields: ["logistical_constraints", "scope"],
      },
      {
        id: "card-decision-log",
        roundId: "budget-kpi",
        title: "Reusable learning",
        body: "The incident review and decision log need to capture why containment was chosen over redesign.",
        source: "Knowledge management",
        idealFields: ["resources_knowledge", "rationale"],
      },
      {
        id: "card-scope-boundary",
        roundId: "budget-kpi",
        title: "Scope boundary",
        body: "Containment remains in scope for the demo; permanent redesign waits for funding and evidence.",
        source: "Project manager",
        idealFields: ["scope", "logistical_constraints"],
      },
    ],
    actions: [
      {
        id: "cut-visible-cost",
        label: "Cut visible cost",
        description: "Reduce burn by dropping documentation and alignment work first.",
        supports: ["logistical_constraints"],
        risks: ["resources_knowledge", "team_governance", "vision"],
        meterDeltas: { burnRate: -5, sharedModelStability: -7, systemHealth: -4 },
      },
      {
        id: "protect-kpi-boundary",
        label: "Protect KPI and scope boundary",
        description: "Make the protected KPI explicit, state the budget boundary, and keep the decision trail.",
        supports: ["kpis", "logistical_constraints", "scope", "resources_knowledge"],
        risks: [],
        meterDeltas: { stakeholderConfidence: 5, sharedModelStability: 5, burnRate: -3, systemHealth: 3 },
      },
      {
        id: "keep-all-commitments",
        label: "Keep every commitment",
        description: "Avoid a hard trade-off and ask every workstream to absorb the pressure.",
        supports: ["vision"],
        risks: ["logistical_constraints", "team_governance", "scope"],
        meterDeltas: { visionIntegrity: 2, burnRate: 10, systemHealth: -5, stakeholderConfidence: -3 },
      },
    ],
  },
];

export function projectRoundById(roundId: string): ProjectRound {
  const round = projectRounds.find((candidate) => candidate.id === roundId);
  if (!round) throw new Error(`Unknown project round: ${roundId}`);
  return round;
}

export function activeProjectRound(index: number): ProjectRound {
  return projectRounds[Math.min(index, projectRounds.length - 1)];
}

export function allProjectCards(): ModelContentCard[] {
  return projectRounds.flatMap((round) => round.cards);
}
