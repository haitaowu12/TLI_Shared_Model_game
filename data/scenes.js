export const SCENES = [
  {
    id: "smoke_blind_manager",
    title: "The Smoke‑Blind Manager",
    phase: "Early Deployment",
    setup:
      "Three parallel defects appear during integration. Standups are turning into pure defect tracking. The team’s language is losing the “why”.",
    system_context:
      "National emergency drone response network. Goal: reduce rural emergency response time by 30% while maintaining regulatory compliance and public trust.",
    stakeholders: ["ops_d", "comms_i", "finance_c"],
    injections: [
      {
        at_s: 30,
        from: "ops_d",
        line: "Daily standup is now just defect burndown. Are we fixing the right things?",
      },
      { at_s: 60, from: "comms_i", line: "Media is asking: “Is this system unsafe?”" },
      {
        at_s: 90,
        from: "finance_c",
        line: "Budget burn is rising. What’s the KPI we’re protecting?",
      },
    ],
    constraints: ["Budget capped", "Regulatory compliance required", "Public trust is sensitive"],
  },
  {
    id: "contractor_tunnel",
    title: "The Contractor Tunnel",
    phase: "Build & Integration",
    setup:
      "An external contractor delivered exactly what was specified—but not what was needed. Local optimization is breaking global alignment.",
    system_context:
      "The contractor shipped a new dispatch API that matches the interface spec but breaks field responder workflows.",
    stakeholders: ["ops_d", "safety_s", "finance_c"],
    injections: [
      { at_s: 30, from: "finance_c", line: "It met the contract. Why isn’t that enough?" },
      {
        at_s: 60,
        from: "ops_d",
        line: "Field responders are bypassing the new API. We need a fix today.",
      },
      {
        at_s: 90,
        from: "safety_s",
        line: "If we ship a workaround, training and safety procedures explode.",
      },
    ],
    constraints: ["Interoperability with legacy systems", "Contractual boundaries", "Training burden"],
  },
  {
    id: "kool_aid_vision",
    title: "The Kool‑Aid Vision",
    phase: "Quarterly Review",
    setup:
      "An executive repeats “challenge the status quo” in a town hall. The team is overloaded and risk‑averse. Cynicism is rising.",
    system_context:
      "Teams are reacting to escalations instead of improving system reliability.",
    stakeholders: ["comms_i", "safety_s", "ops_d"],
    injections: [
      {
        at_s: 30,
        from: "comms_i",
        line: "People are rolling their eyes. Translate this into concrete behavior shifts.",
      },
      { at_s: 60, from: "safety_s", line: "Overload is real. What will we stop doing?" },
      { at_s: 90, from: "ops_d", line: "Give me one unifying theme I can execute on." },
    ],
    constraints: ["Cognitive load is high", "Limited capacity", "Need one coherent message"],
  },
  {
    id: "strategic_amnesia",
    title: "The Strategic Amnesia",
    phase: "Onboarding",
    setup:
      "A new starter joins post‑needs stage. Onboarding time is limited. They optimize for visible tasks and miss the system intent.",
    system_context:
      "A new engineer starts changing flight-control heuristics without understanding public trust and lifecycle constraints.",
    stakeholders: ["safety_s", "finance_c", "comms_i"],
    injections: [
      { at_s: 30, from: "safety_s", line: "They’re proposing to bypass a safety check to hit velocity." },
      { at_s: 60, from: "finance_c", line: "Show them the KPIs and success criteria—now." },
      { at_s: 90, from: "comms_i", line: "If they ship this, we’ll be answering questions for months." },
    ],
    constraints: ["Limited onboarding time", "High risk of local optimization", "Public trust"],
  },
  {
    id: "lifecycle_blindspot",
    title: "The Lifecycle Blindspot",
    phase: "Design Decision",
    setup:
      "A design decision reduces build time but increases sustainment cost. The milestone is near. Long-term system impact is at risk.",
    system_context:
      "A vendor suggests removing telemetry to hit performance targets for the demo.",
    stakeholders: ["finance_c", "ops_d", "comms_i"],
    injections: [
      { at_s: 30, from: "finance_c", line: "Telemetry removal shifts cost to sustainment. Quantify impact." },
      { at_s: 60, from: "ops_d", line: "Minister visit in two weeks. Don’t slow momentum." },
      { at_s: 90, from: "comms_i", line: "If we can’t explain it, trust erodes. Anchor the purpose." },
    ],
    constraints: ["Whole-of-life considerations", "Demo credibility", "Sustainment cost"],
  },
];

