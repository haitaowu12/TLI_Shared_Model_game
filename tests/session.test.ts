import { describe, expect, it } from "vitest";
import { createInitialSession, sessionReducer } from "../src/domain/session";

describe("session reducer", () => {
  it("moves through the self-guided flow", () => {
    let session = createInitialSession();
    session = sessionReducer(session, { type: "COMPLETE_ONBOARDING" });
    session = sessionReducer(session, { type: "START_RESPONSE" });
    session = sessionReducer(session, { type: "SET_MODE", mode: "model_reframe" });
    session = sessionReducer(session, {
      type: "UPDATE_SECTION_TEXT",
      sectionId: "purpose_anchor",
      text: "The vision remains visible and tied to public trust.",
    });
    session = sessionReducer(session, { type: "TOGGLE_TAG", sectionId: "purpose_anchor", tag: "vision" });
    session = sessionReducer(session, { type: "ADD_INTERRUPT_TAGS", interruptId: "ops-defect-drift", sectionId: "stakeholder_message" });

    expect(session.phase).toBe("responding");
    expect(session.response.requiredInterruptTags).toContain("strategy");
    expect(session.response.sections.stakeholder_message.tags).toContain("responsible");
  });

  it("submits and generates debrief", () => {
    let session = createInitialSession("responding");
    const entries = [
      ["purpose_anchor", "The vision remains faster rural response without giving up safety or trust.", ["vision", "rationale"]],
      ["immediate_48h_action", "Morgan owns the next 48-hour containment move with daily progress checks.", ["strategy", "responsible"]],
      ["boundary_statement", "Containment is in scope; permanent redesign waits for evidence and capacity.", ["scope", "logistical_constraints"]],
      ["lifecycle_impact", "Protect response-time KPI and current training load from avoidable rework.", ["kpis"]],
      ["stakeholder_message", "Stakeholders get one message and the team uses one escalation path.", ["team_governance", "external_stakeholders"]],
    ] as const;

    for (const [sectionId, text, tags] of entries) {
      session = sessionReducer(session, { type: "UPDATE_SECTION_TEXT", sectionId, text });
      for (const tag of tags) {
        session = sessionReducer(session, { type: "TOGGLE_TAG", sectionId, tag });
      }
    }
    session = sessionReducer(session, { type: "ADD_INTERRUPT_TAGS", interruptId: "ops-defect-drift", sectionId: "stakeholder_message" });
    session = sessionReducer(session, { type: "ADD_INTERRUPT_TAGS", interruptId: "comms-safety-story", sectionId: "stakeholder_message" });
    session = sessionReducer(session, { type: "ADD_INTERRUPT_TAGS", interruptId: "finance-kpi-pressure", sectionId: "stakeholder_message" });
    session = sessionReducer(session, { type: "SUBMIT_RESPONSE" });

    expect(session.phase).toBe("debrief");
    expect(session.debrief?.scenarioTitle).toBe("The Smoke-Blind Manager");
  });
});
