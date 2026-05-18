import type { ModelContentCard, ProjectRound } from "../types";

export const projectRounds: ProjectRound[] = [
  {
    id: "defect-drift",
    title: "Defect Drift",
    learningGoal: "Use the canvas to keep current-state facts, strategy, ownership, and governance visible before defect pressure narrows the conversation.",
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
    learningGoal: "Turn stakeholder pressure into one model-based story: vision, rationale, external context, and success criteria.",
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
    learningGoal: "Separate protected measures, constraints, scope, and reusable learning so cost pressure does not collapse into tactical churn.",
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
  {
    id: "safety-fault-line",
    title: "Psychological Safety Fault Line",
    learningGoal:
      "Protect the team's ability to raise weak signals by balancing leadership style, explicit accountability, and model-based success criteria.",
    stakeholderId: "safety_s",
    pressure:
      "A decisive architect is closing the review quickly. Two disciplines have stopped challenging assumptions after sharp pushback.",
    prompt: "Use the Shared Model to reopen safe contribution without losing delivery control.",
    focusFields: ["internal_stakeholders", "team_governance", "accountable", "success_criteria"],
    cards: [
      {
        id: "card-quiet-discipline",
        roundId: "safety-fault-line",
        title: "Quiet discipline",
        body: "The training representative has stopped raising edge cases after two concerns were challenged in front of the room.",
        source: "Safety observation",
        stakeholderId: "safety_s",
        idealFields: ["internal_stakeholders", "team_governance"],
      },
      {
        id: "card-style-clash",
        roundId: "safety-fault-line",
        title: "Style clash",
        body: "The architecture lead wants proof for every concern; the field lead needs a no-blame path for weak signals.",
        source: "Leadership style check",
        idealFields: ["team_governance", "rationale"],
      },
      {
        id: "card-decision-rights",
        roundId: "safety-fault-line",
        title: "Decision rights unclear",
        body: "The team agrees a 24-hour safety reset may be needed, but nobody owns whether the demo boundary changes.",
        source: "Project room",
        idealFields: ["accountable", "scope"],
      },
      {
        id: "card-safety-success",
        roundId: "safety-fault-line",
        title: "Safety success signal",
        body: "A useful reset should end with one protected success condition and a visible channel for dissenting evidence.",
        source: "Psychological safety review",
        idealFields: ["success_criteria", "resources_knowledge"],
      },
    ],
    actions: [
      {
        id: "force-final-alignment",
        label: "Force final alignment",
        description: "Close the review now and ask silent disciplines to bring evidence later.",
        supports: ["accountable", "success_criteria"],
        risks: ["team_governance", "internal_stakeholders", "resources_knowledge"],
        meterDeltas: { sharedModelStability: -6, stakeholderConfidence: -5, systemHealth: 2, burnRate: -2 },
      },
      {
        id: "style-aware-reset",
        label: "Run style-aware safety reset",
        description: "Name the accountable owner, protect dissenting evidence, and turn the reset into a model update.",
        supports: ["internal_stakeholders", "team_governance", "accountable", "success_criteria"],
        risks: [],
        meterDeltas: { sharedModelStability: 6, visionIntegrity: 2, stakeholderConfidence: 4, systemHealth: 5 },
      },
      {
        id: "keep-conflict-informal",
        label: "Keep conflict informal",
        description: "Let leads smooth it over offline so the demo cadence is not disrupted.",
        supports: ["internal_stakeholders"],
        risks: ["accountable", "success_criteria", "resources_knowledge"],
        meterDeltas: { stakeholderConfidence: -3, sharedModelStability: -4, burnRate: 1, systemHealth: -2 },
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
