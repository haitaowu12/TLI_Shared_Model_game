export const TRAINING_STEPS = [
  {
    step: 0,
    title: "Understanding the Shared Model Canvas",
    instruction: "Welcome! The Shared Model Canvas is your anchor. It contains Vision, Scope, Strategy, and other elements that keep your team aligned.",
    action: "auto-open-canvas",
    highlightFields: ["vision", "strategy", "kpis"],
    continueButton: "I understand",
    reward: {
      message: "Great! You've learned about the Canvas.",
      meters: { sharedModelStability: 5, visionIntegrity: 5, stakeholderConfidence: 5, systemHealth: 5 }
    }
  },
  {
    step: 1,
    title: "Selecting Response Modes (A/B/C)",
    instruction: "Choose your response mode. Mode A is quick but tactical. Mode C is thorough but takes more time. Mode C now uses a step-by-step stepper — complete one section at a time.",
    action: "select-mode",
    recommendedMode: "C",
    explanation: "Mode C uses a progressive stepper. Complete each section (text + tags) and it auto-advances to the next. You can click any section header to navigate directly.",
    continueButton: null,
    reward: {
      message: "Perfect! Mode C helps you maintain strategic coherence.",
      meters: { sharedModelStability: 5, visionIntegrity: 5, stakeholderConfidence: 5, systemHealth: 5 }
    }
  },
  {
    step: 2,
    title: "Tagging Responses Correctly",
    instruction: "Tags connect your response to the Shared Model. Without tags, your response doesn't count!",
    action: "tag-response",
    example: "Type: 'We need to align on vision' then tag Vision + Strategy",
    requiredTagCount: { min: 2, max: 3 },
    continueButton: null,
    reward: {
      message: "Great! You tagged 2 fields. This counts toward your score.",
      meters: { sharedModelStability: 5, visionIntegrity: 5, stakeholderConfidence: 5, systemHealth: 5 }
    }
  },
  {
    step: 3,
    title: "Handling Stakeholder Interrupts",
    instruction: "Stakeholders will interrupt with urgent requests. Pause, read their message, and include their required tag. You'll hear a notification sound when stakeholders interrupt — each DiSC type has a distinct tone.",
    action: "handle-interrupt",
    simulatedInterrupt: {
      from: "ops_d",
      line: "Critical: We need immediate action on the dispatch issue!",
      requiredTag: "responsible"
    },
    continueButton: null,
    reward: {
      message: "Excellent! You handled the interrupt and included the required tag.",
      meters: { sharedModelStability: 5, visionIntegrity: 5, stakeholderConfidence: 5, systemHealth: 5 }
    }
  },
  {
    step: 4,
    title: "Reading Debrief Feedback",
    instruction: "After each round, review your enhanced debrief. It now includes visual meter delta bars, a tag coverage radar chart, stakeholder alignment scores, and actionable recommendations.",
    action: "review-debrief",
    mockDebrief: {
      tagCoverage: "85%",
      meterChanges: "Visual delta bars show before/after values for each meter",
      feedback: "Excellent work! Your debrief now includes stakeholder alignment scores and a radar chart showing tag coverage across model categories."
    },
    continueButton: "Complete Training",
    reward: {
      message: "Training complete! You're ready for the real challenge.",
      badge: "Training Graduate",
      meters: { sharedModelStability: 5, visionIntegrity: 5, stakeholderConfidence: 5, systemHealth: 5 }
    }
  }
];

export const TRAINING_SCENE = {
  id: "training_scene",
  title: "Training Scenario",
  phase: "Learning Mode",
  setup: "This is a practice round. Take your time to learn the mechanics.",
  system_context: "National emergency drone response network. Goal: reduce rural emergency response time by 30% while maintaining regulatory compliance and public trust.",
  stakeholders: ["ops_d", "comms_i", "finance_c"],
  injections: [
    {
      at_s: 45,
      window: 5,
      from: "ops_d",
      line: "Critical: We need immediate action on the dispatch issue!",
    },
  ],
  constraints: ["No time pressure", "No negative consequences", "Learning focused"],
};

export const STORAGE_KEY = "sharedModelGame_trainingCompleted";

export function isTrainingCompleted() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "true";
  } catch (e) {
    console.warn("localStorage not available:", e);
    return false;
  }
}

export function markTrainingCompleted() {
  try {
    localStorage.setItem(STORAGE_KEY, "true");
    return true;
  } catch (e) {
    console.warn("Failed to save training completion:", e);
    return false;
  }
}

export function resetTrainingCompletion() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (e) {
    console.warn("Failed to reset training completion:", e);
    return false;
  }
}

export function getTrainingStep() {
  try {
    const stored = localStorage.getItem("sharedModelGame_trainingStep");
    return stored ? parseInt(stored, 10) : 0;
  } catch (e) {
    console.warn("localStorage not available:", e);
    return 0;
  }
}

export function saveTrainingStep(step) {
  try {
    localStorage.setItem("sharedModelGame_trainingStep", step.toString());
    return true;
  } catch (e) {
    console.warn("Failed to save training step:", e);
    return false;
  }
}
