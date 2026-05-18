import type { Scenario } from "../types";

export const scenarios: Scenario[] = [
  {
    id: "smoke_blind_manager",
    title: "The Smoke-Blind Manager",
    phase: "Early Deployment",
    setup:
      "Three parallel defects appear during integration. Standups are turning into pure defect tracking. The team language is losing the why.",
    context:
      "National emergency drone response network. Goal: reduce rural emergency response time by 30% while maintaining regulatory compliance and public trust.",
    stakeholders: ["ops_d", "comms_i", "finance_c"],
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
    constraints: ["Budget capped", "Regulatory compliance required", "Public trust is sensitive"],
    successCriteria: [
      "Name one 48-hour action owner.",
      "Protect the vision and public-trust rationale.",
      "State the boundary between containment and redesign.",
      "Tie the response to at least one KPI or current-state fact.",
    ],
  },
];

export function activeScenario(): Scenario {
  return scenarios[0];
}
