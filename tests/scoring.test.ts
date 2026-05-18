import { describe, expect, it } from "vitest";
import { activeScenario } from "../src/content/scenarios";
import { stakeholderById } from "../src/content/stakeholders";
import {
  applyDeltas,
  buildDebriefReport,
  createEmptySubmission,
  defaultMeters,
  validateInterrupts,
  validateSubmission,
} from "../src/domain/scoring";

function completeSubmission() {
  const submission = createEmptySubmission();
  submission.sections.purpose_anchor = {
    text: "The vision remains faster rural response without giving up safety, public trust, or regulatory confidence.",
    tags: ["vision", "rationale"],
  };
  submission.sections.immediate_48h_action = {
    text: "Morgan owns a 48-hour containment plan that protects the core workflow and reports progress daily.",
    tags: ["strategy", "responsible"],
  };
  submission.sections.boundary_statement = {
    text: "The team will contain defect triage in scope while deferring permanent redesign until evidence is reviewed.",
    tags: ["scope", "logistical_constraints"],
  };
  submission.sections.lifecycle_impact = {
    text: "The team will protect median response-time, demo uptime, and current training load from avoidable rework.",
    tags: ["kpis", "as_is_state"],
  };
  submission.sections.stakeholder_message = {
    text: "Operations, public trust, and finance get one message and one escalation path for alignment.",
    tags: ["team_governance", "external_stakeholders", "kpis", "vision", "logistical_constraints"],
  };
  submission.requiredInterruptTags = ["strategy", "responsible", "vision", "external_stakeholders", "kpis", "logistical_constraints"];
  return submission;
}

describe("scoring", () => {
  it("passes a complete model reframe response", () => {
    const submission = completeSubmission();
    const rubric = validateSubmission(submission);
    const interrupt = validateInterrupts(submission);

    expect(rubric.every((result) => result.passed)).toBe(true);
    expect(interrupt.passed).toBe(true);
  });

  it("surfaces missing anchors", () => {
    const submission = createEmptySubmission();
    submission.sections.purpose_anchor.text = "This response has words but no model anchors at all.";

    const rubric = validateSubmission(submission);
    const purpose = rubric.find((result) => result.id === "purpose_anchor");

    expect(purpose?.passed).toBe(false);
    expect(purpose?.missingTags).toContain("vision");
  });

  it("builds a debrief with positive meter movement for a valid response", () => {
    const scenario = activeScenario();
    const stakeholders = scenario.stakeholders.map(stakeholderById);
    const submission = completeSubmission();
    const debrief = buildDebriefReport({
      submission,
      scenario,
      stakeholders,
      previousMeters: defaultMeters,
      nextMeters: applyDeltas(defaultMeters, {
        sharedModelStability: 10,
        visionIntegrity: 8,
        stakeholderConfidence: 4,
        systemHealth: 5,
        burnRate: -3,
      }),
    });

    expect(debrief.rubric.filter((result) => result.passed).length).toBeGreaterThanOrEqual(5);
    expect(debrief.allTags).toContain("vision");
    expect(debrief.stakeholderScores.length).toBe(3);
  });
});
