export const CONSEQUENCES = {
  rework_cascade: {
    id: "rework_cascade",
    title: "Rework Cascade",
    desc:
      "Tactical relief has compounded. Hidden coupling surfaces: more defects, tighter constraints, and stakeholder fragmentation.",
    effects: {
      sharedModelStability: -12,
      visionIntegrity: -8,
      stakeholderConfidence: -6,
      systemHealth: -14,
      burnRate: +18,
    },
    persistent: {
      injectionExtra: true,
      burnMultiplier: 1.15,
    },
  },
  timeout_penalty: {
    id: "timeout_penalty",
    title: "Time Compression",
    desc: "The clock ran out. Under stress, the model vanished from language.",
    effects: {
      sharedModelStability: -10,
      visionIntegrity: -10,
      stakeholderConfidence: -6,
      systemHealth: -6,
      burnRate: +10,
    },
  },
};

