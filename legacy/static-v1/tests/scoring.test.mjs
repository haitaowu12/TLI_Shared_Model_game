import test from "node:test";
import assert from "node:assert/strict";

import { computeRoundDeltas, MODES, validateModeCResponse } from "../site/lib/scoring.js";

const mkStakeholder = (overrides = {}) => ({
  rewards: { strategy: 2 },
  dislikes: {},
  disc: "D",
  ...overrides,
});

test("validateModeCResponse enforces required section tags", () => {
  const base = {
    textBySection: {
      purpose_anchor: "x",
      immediate_48h_action: "x",
      boundary_statement: "x",
      lifecycle_impact: "x",
      stakeholder_message: "x",
    },
    tagsBySection: {
      purpose_anchor: ["vision", "rationale"],
      immediate_48h_action: ["strategy", "responsible"],
      boundary_statement: ["scope", "logistical_constraints"],
      lifecycle_impact: ["kpis"],
      stakeholder_message: ["internal_stakeholders", "team_governance"],
    },
  };
  const ok = validateModeCResponse(base);
  assert.equal(ok.ok, true);

  const bad = validateModeCResponse({
    ...base,
    tagsBySection: { ...base.tagsBySection, purpose_anchor: ["rationale"] },
  });
  assert.equal(bad.ok, false);
  assert.ok(bad.violations.some((v) => v.code === "purpose_anchor_requirements"));
});

test("computeRoundDeltas triggers Rework Cascade on 3rd Mode A", () => {
  const out = computeRoundDeltas({
    mode: MODES.A,
    timedOut: false,
    textBySection: { summary: "patch now" },
    tagsBySection: { summary: ["strategy", "responsible"] },
    stakeholders: [mkStakeholder()],
    modeACountTotal: 2, // already chose A twice
    persistentMods: {},
    requiredTags: [],
  });
  assert.deepEqual(out.triggers, ["rework_cascade"]);
});

test("computeRoundDeltas penalizes unmet interrupt requirements", () => {
  const out = computeRoundDeltas({
    mode: MODES.B,
    timedOut: false,
    textBySection: { summary: "pause" },
    tagsBySection: { summary: ["scope"] },
    stakeholders: [mkStakeholder({ disc: "C", rewards: { kpis: 3 }, dislikes: {} })],
    modeACountTotal: 0,
    persistentMods: {},
    requiredTags: ["kpis", "team_governance"],
  });
  assert.ok(out.deltas.stakeholderConfidence < 0);
  assert.ok(out.notes.includes("unmet_interrupt_requirements"));
});

