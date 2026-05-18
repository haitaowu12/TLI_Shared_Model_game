import type { Scenario } from "../types";

export const scenarios: Scenario[] = [
  {
    id: "smoke_blind_manager",
    title: "The Smoke-Blind Manager",
    phase: "Early Deployment",
    setup:
      "Three parallel defects appear during integration. Standups are turning into pure defect tracking. The team language is losing the why, and quieter disciplines are starting to hold back weak signals.",
    context:
      "National emergency drone response network. Goal: reduce rural emergency response time by 30% while maintaining regulatory compliance, public trust, and enough psychological safety for the team to keep surfacing bad news early.",
    stakeholders: ["ops_d", "comms_i", "finance_c", "safety_s"],
    interrupts: [
      {
        id: "ops-defect-drift",
        atStep: 1,
        from: "ops_d",
        line: "Daily standup is now just defect burndown. Are we fixing the right things?",
        requiredTags: ["strategy", "responsible"],
      },
      {
        id: "comms-safety-story",
        atStep: 2,
        from: "comms_i",
        line: "Media is asking: Is this system unsafe?",
        requiredTags: ["vision", "external_stakeholders"],
      },
      {
        id: "finance-kpi-pressure",
        atStep: 3,
        from: "finance_c",
        line: "Budget burn is rising. What KPI are we protecting?",
        requiredTags: ["kpis", "logistical_constraints"],
      },
    ],
    constraints: ["Budget capped", "Regulatory compliance required", "Public trust is sensitive", "Team voice quality is degrading"],
    successCriteria: [
      "Name one 48-hour action owner.",
      "Protect the vision and public-trust rationale.",
      "State the boundary between containment and redesign.",
      "Tie the response to at least one KPI or current-state fact.",
      "Keep the team safe enough to surface dissenting evidence.",
    ],
  },
];

export function activeScenario(): Scenario {
  return scenarios[0];
}

export function scenarioById(id: string): Scenario {
  const scenario = scenarios.find((candidate) => candidate.id === id);
  if (!scenario) throw new Error(`Unknown scenario: ${id}`);
  return scenario;
}
