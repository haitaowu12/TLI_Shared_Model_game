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
        window: 10,
        from: "ops_d",
        line: "Daily standup is now just defect burndown. Are we fixing the right things?",
      },
      { at_s: 60, window: 10, from: "comms_i", line: "Media is asking: \"Is this system unsafe?\"" },
      {
        at_s: 90,
        window: 10,
        from: "finance_c",
        line: "Budget burn is rising. What's the KPI we're protecting?",
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
      { at_s: 30, window: 10, from: "finance_c", line: "It met the contract. Why isn't that enough?" },
      {
        at_s: 60,
        window: 10,
        from: "ops_d",
        line: "Field responders are bypassing the new API. We need a fix today.",
      },
      {
        at_s: 90,
        window: 10,
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
        window: 10,
        from: "comms_i",
        line: "People are rolling their eyes. Translate this into concrete behavior shifts.",
      },
      { at_s: 60, window: 10, from: "safety_s", line: "Overload is real. What will we stop doing?" },
      { at_s: 90, window: 10, from: "ops_d", line: "Give me one unifying theme I can execute on." },
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
      { at_s: 30, window: 10, from: "safety_s", line: "They're proposing to bypass a safety check to hit velocity." },
      { at_s: 60, window: 10, from: "finance_c", line: "Show them the KPIs and success criteria—now." },
      { at_s: 90, window: 10, from: "comms_i", line: "If they ship this, we'll be answering questions for months." },
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
      { at_s: 30, window: 10, from: "finance_c", line: "Telemetry removal shifts cost to sustainment. Quantify impact." },
      { at_s: 60, window: 10, from: "ops_d", line: "Minister visit in two weeks. Don't slow momentum." },
      { at_s: 90, window: 10, from: "comms_i", line: "If we can't explain it, trust erodes. Anchor the purpose." },
    ],
    constraints: ["Whole-of-life considerations", "Demo credibility", "Sustainment cost"],
  },
  {
    id: "trust_deficit",
    title: "The Trust Deficit",
    phase: "Public Incident",
    setup: "A drone malfunction during a live public demonstration has gone viral. Social media is amplifying every detail. The team must respond while maintaining model coherence — panic will make it worse.",
    system_context: "A drone lost GPS lock during a ministerial demo and executed an emergency landing in a populated area. No injuries, but footage has 2M+ views. Public trust in the system is collapsing.",
    stakeholders: ["comms_i", "safety_s", "ops_d"],
    injections: [
      { at_s: 30, window: 10, from: "comms_i", line: "The media narrative is out of control. We need a coherent public statement anchored to our vision — now." },
      { at_s: 60, window: 10, from: "safety_s", line: "The emergency landing protocol worked perfectly. Why isn't anyone talking about that?" },
      { at_s: 90, window: 10, from: "ops_d", line: "Stop managing perception and fix the GPS integration. What's the 48-hour action?" },
    ],
    constraints: ["Public trust is fragile", "Regulatory investigation imminent", "Demo credibility at stake", "Must not appear defensive"],
  },
  {
    id: "scope_creep_avalanche",
    title: "The Scope Creep Avalanche",
    phase: "Requirements Evolution",
    setup: "Five seemingly minor scope additions have accumulated over three sprints. Individually each seems harmless, but together they threaten the shared model's coherence, budget, and timeline.",
    system_context: "Stakeholders have added: thermal imaging, multi-language UI, maritime radar integration, real-time weather overlay, and automated compliance reporting. None were in the original scope but all have champions.",
    stakeholders: ["finance_c", "comms_i", "safety_s"],
    injections: [
      { at_s: 30, window: 10, from: "finance_c", line: "Each addition seemed small, but the cumulative budget impact is 40%. Show me the boundary." },
      { at_s: 60, window: 10, from: "comms_i", line: "Three different stakeholders are telling three different stories about what we're building. Align the narrative." },
      { at_s: 90, window: 10, from: "safety_s", line: "Maritime radar integration has safety implications nobody evaluated. We need a proper impact assessment." },
    ],
    constraints: ["Budget capped at original +15%", "No safety compromises", "Must maintain coherent scope narrative", "Champion stakeholders are influential"],
  },
  {
    id: "knowledge_gap",
    title: "The Knowledge Gap",
    phase: "Team Transition",
    setup: "The lead systems engineer — who held the institutional knowledge for the dispatch integration — has resigned. Two weeks notice. The shared model must capture what's in their head before it walks out the door.",
    system_context: "Dr. Chen designed the original dispatch architecture, owns the integration test strategy, and maintains the stakeholder relationship with the regulator. Their departure creates a critical knowledge vacuum across multiple model fields.",
    stakeholders: ["safety_s", "finance_c", "ops_d"],
    injections: [
      { at_s: 30, window: 10, from: "safety_s", line: "Dr. Chen's safety case documentation is incomplete. If we can't transfer that knowledge, we lose regulatory approval." },
      { at_s: 60, window: 10, from: "finance_c", line: "Replacing institutional knowledge costs 3-5x the salary. What's our knowledge preservation KPI?" },
      { at_s: 90, window: 10, from: "ops_d", line: "Field teams trust Dr. Chen personally. How do we transfer that trust to the model and the process?" },
    ],
    constraints: ["Two-week transition window", "Regulatory continuity required", "No single point of failure going forward", "Must document tacit knowledge"],
  },
];

