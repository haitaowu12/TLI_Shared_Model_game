import { clamp, uniq } from "./utils.js";

export const MODES = {
  A: "tactical_patch",
  B: "strategic_pause",
  C: "model_reframe",
};

export const MODE_LABEL = {
  [MODES.A]: "Mode A — Tactical Patch",
  [MODES.B]: "Mode B — Strategic Pause",
  [MODES.C]: "Mode C — Model Reframe",
};

export const MODE_C_SECTIONS = [
  "purpose_anchor",
  "immediate_48h_action",
  "boundary_statement",
  "lifecycle_impact",
  "stakeholder_message",
];

export function validateModeCResponse({ textBySection, tagsBySection }) {
  const missingText = [];
  const missingTags = [];
  for (const sec of MODE_C_SECTIONS) {
    const t = (textBySection?.[sec] || "").trim();
    if (!t) missingText.push(sec);
    const tags = Array.isArray(tagsBySection?.[sec]) ? tagsBySection[sec] : [];
    if (!tags.length) missingTags.push(sec);
  }

  const violations = [];
  const purposeTags = new Set(tagsBySection?.purpose_anchor || []);
  const boundaryTags = new Set(tagsBySection?.boundary_statement || []);
  const actionTags = new Set(tagsBySection?.immediate_48h_action || []);
  const lifecycleTags = new Set(tagsBySection?.lifecycle_impact || []);
  const stakeholderTags = new Set(tagsBySection?.stakeholder_message || []);

  const hasVision = purposeTags.has("vision");
  const hasPurposePlusOne =
    purposeTags.has("rationale") || purposeTags.has("success_criteria") || purposeTags.has("kpis");
  if (!hasVision || !hasPurposePlusOne) {
    violations.push({
      code: "purpose_anchor_requirements",
      message: "Purpose Anchor must include Vision + one of Rationale/Success Criteria/KPIs tags.",
    });
  }

  const actionOk =
    actionTags.has("strategy") && (actionTags.has("responsible") || actionTags.has("accountable"));
  if (!actionOk) {
    violations.push({
      code: "immediate_action_requirements",
      message: "Immediate 48h Action must include Strategy + Responsible or Accountable tags.",
    });
  }

  const boundaryOk = boundaryTags.has("scope") && boundaryTags.has("logistical_constraints");
  if (!boundaryOk) {
    violations.push({
      code: "boundary_requirements",
      message: "Boundary Statement must include Scope + Logistical Constraints tags.",
    });
  }

  const lifecycleOk = lifecycleTags.has("kpis") || lifecycleTags.has("as_is_state");
  if (!lifecycleOk) {
    violations.push({
      code: "lifecycle_requirements",
      message: "Lifecycle Impact must include KPIs and/or As-is State tags.",
    });
  }

  const stakeholderOk =
    (stakeholderTags.has("internal_stakeholders") || stakeholderTags.has("external_stakeholders")) &&
    stakeholderTags.has("team_governance");
  if (!stakeholderOk) {
    violations.push({
      code: "stakeholder_requirements",
      message:
        "Stakeholder Message must include Internal/External Stakeholder Context + Team Governance tags.",
    });
  }

  const ok = !missingText.length && !missingTags.length && !violations.length;
  return { ok, missingText, missingTags, violations };
}

function discScoreForStakeholder(stakeholder, usedTagIds) {
  if (!stakeholder) return 0;
  const used = new Set(usedTagIds);

  let score = 0;
  const rewards = stakeholder.rewards || {};
  for (const [tag, w] of Object.entries(rewards)) {
    if (used.has(tag)) score += w;
  }
  const dislikes = stakeholder.dislikes || {};
  for (const [tag, w] of Object.entries(dislikes)) {
    if (used.has(tag)) score -= w;
  }

  // normalize to ~[-6..+10] (roughly)
  return clamp(score, -6, 10);
}

export function computeRoundDeltas({
  mode,
  timedOut,
  textBySection,
  tagsBySection,
  stakeholders,
  modeACountTotal,
  persistentMods,
  requiredTags = [],
}) {
  const allTags = uniq(
    Object.values(tagsBySection || {})
      .flat()
      .filter(Boolean),
  );

  const tagCoverage = new Set(allTags).size; // distinct fields referenced
  const purposeHasVision = (tagsBySection?.purpose_anchor || []).includes("vision");

  const base = {
    sharedModelStability: 0,
    visionIntegrity: 0,
    stakeholderConfidence: 0,
    systemHealth: 0,
    burnRate: 0,
  };

  let notes = [];

  if (timedOut) {
    base.sharedModelStability -= 10;
    base.visionIntegrity -= 10;
    base.stakeholderConfidence -= 6;
    base.systemHealth -= 6;
    base.burnRate += 10;
    notes.push("timeout");
  }

  if (mode === MODES.A) {
    base.sharedModelStability -= 8;
    base.visionIntegrity -= 7;
    base.systemHealth -= 6;
    base.burnRate += 10;
    base.stakeholderConfidence += 4; // short-term relief
    notes.push("mode_a");
  } else if (mode === MODES.B) {
    base.sharedModelStability -= 2;
    base.visionIntegrity += 1;
    base.systemHealth += 4;
    base.burnRate += 2;
    base.stakeholderConfidence -= 3; // perceived slowdown
    notes.push("mode_b");
  } else if (mode === MODES.C) {
    const v = validateModeCResponse({ textBySection, tagsBySection });
    if (v.ok) {
      base.sharedModelStability += 10;
      base.visionIntegrity += 8;
      base.systemHealth += 6;
      base.burnRate -= 3;
      base.stakeholderConfidence += 4;
      notes.push("mode_c_ok");
    } else {
      base.sharedModelStability -= 4;
      base.visionIntegrity -= 3;
      base.systemHealth -= 2;
      base.burnRate += 3;
      notes.push("mode_c_incomplete");
      if (v.violations.length) notes.push("violations");
    }
  }

  // Tag coverage matters: reward explicit model use, regardless of eloquence.
  // Keep it small so Mode choice remains dominant.
  base.sharedModelStability += clamp(Math.floor(tagCoverage / 4), 0, 4);
  base.visionIntegrity += purposeHasVision ? 1 : -3;

  // DiSC stakeholder weighting (light touch): reward alignment with persona preferences.
  const discTotal = stakeholders
    .map((s) => discScoreForStakeholder(s, allTags))
    .reduce((a, b) => a + b, 0);
  base.stakeholderConfidence += clamp(Math.round(discTotal / 3), -4, 6);

  // Persistent modifiers (e.g., Rework Cascade makes burn worse).
  const burnMult = persistentMods?.burnMultiplier || 1;
  base.burnRate = Math.round(base.burnRate * burnMult);

  // Interrupt requirements: penalize if the player ignores what stakeholders explicitly asked to anchor.
  const unmetRequired = (requiredTags || []).filter((t) => !new Set(allTags).has(t));
  if (unmetRequired.length) {
    base.stakeholderConfidence -= clamp(unmetRequired.length * 2, 2, 6);
    base.sharedModelStability -= clamp(unmetRequired.length, 1, 4);
    notes.push("unmet_interrupt_requirements");
  }

  // Rework Cascade trigger after 3 total Mode A selections.
  const triggers = [];
  if (mode === MODES.A && modeACountTotal + 1 === 3) {
    triggers.push("rework_cascade");
    notes.push("trigger_rework_cascade");
  }

  return { deltas: base, notes, triggers, tagCoverage, allTags };
}

export function applyDeltas(meters, deltas) {
  return {
    sharedModelStability: clamp(meters.sharedModelStability + deltas.sharedModelStability, 0, 100),
    visionIntegrity: clamp(meters.visionIntegrity + deltas.visionIntegrity, 0, 100),
    stakeholderConfidence: clamp(meters.stakeholderConfidence + deltas.stakeholderConfidence, 0, 100),
    systemHealth: clamp(meters.systemHealth + deltas.systemHealth, 0, 100),
    burnRate: clamp(meters.burnRate + deltas.burnRate, 0, 100),
  };
}
