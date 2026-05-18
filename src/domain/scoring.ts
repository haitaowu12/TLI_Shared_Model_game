import { responseSections } from "../content/rubric";
import { fieldLabel } from "../content/sharedModel";
import type {
  BoardAssignment,
  DebriefReport,
  FinalOutcome,
  FieldId,
  Meters,
  ProjectRound,
  ResponseMode,
  ResponseSectionId,
  ResponseSubmission,
  RoundOutcome,
  RubricResult,
  Scenario,
  Stakeholder,
  StakeholderScore,
} from "../types";

export const defaultMeters: Meters = {
  sharedModelStability: 70,
  visionIntegrity: 72,
  stakeholderConfidence: 68,
  systemHealth: 70,
  burnRate: 32,
};

export const modeLabels: Record<ResponseMode, string> = {
  tactical_patch: "Mode A - Tactical Patch",
  strategic_pause: "Mode B - Strategic Pause",
  model_reframe: "Mode C - Model Reframe",
};

export function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

export function createEmptySubmission(): ResponseSubmission {
  return {
    mode: "model_reframe",
    timedOut: false,
    acknowledgedInterrupts: [],
    requiredInterruptTags: [],
    sections: {
      purpose_anchor: { text: "", tags: [] },
      immediate_48h_action: { text: "", tags: [] },
      boundary_statement: { text: "", tags: [] },
      lifecycle_impact: { text: "", tags: [] },
      stakeholder_message: { text: "", tags: [] },
    },
  };
}

export function allSelectedTags(submission: ResponseSubmission): FieldId[] {
  const tags = Object.values(submission.sections).flatMap((section) => section.tags);
  return Array.from(new Set(tags));
}

function sectionHasAlternative(sectionTags: Set<FieldId>, alternatives: FieldId[] | undefined): boolean {
  if (!alternatives?.length) return true;
  return alternatives.some((tag) => sectionTags.has(tag));
}

export function validateSubmission(submission: ResponseSubmission): RubricResult[] {
  return responseSections.map((section) => {
    const response = submission.sections[section.id];
    const tags = new Set(response.tags);
    const missingRequired = section.requiredTags.filter((tag) => !tags.has(tag));
    const missingAlternative = sectionHasAlternative(tags, section.alternativeTags) ? [] : section.alternativeTags ?? [];
    const missingTags = [...missingRequired, ...missingAlternative];
    const hasText = response.text.trim().length >= 24;
    const passed = hasText && missingTags.length === 0;

    return {
      id: section.id,
      label: section.label,
      passed,
      missingTags,
      message: passed
        ? "Anchored with enough model evidence."
        : `${hasText ? "Needs model anchors" : "Needs a concrete sentence"} for ${section.label}.`,
    };
  });
}

export function validateInterrupts(submission: ResponseSubmission): RubricResult {
  const allTags = new Set(allSelectedTags(submission));
  const missingTags = submission.requiredInterruptTags.filter((tag) => !allTags.has(tag));
  return {
    id: "interrupts",
    label: "Stakeholder Interrupts",
    passed: missingTags.length === 0,
    missingTags,
    message:
      missingTags.length === 0
        ? "Stakeholder pressure was connected back to the model."
        : "Some interrupt anchors never appeared in the response.",
  };
}

export function scoreStakeholderAlignment(stakeholders: Stakeholder[], allTags: FieldId[]): StakeholderScore[] {
  const tagSet = new Set(allTags);

  return stakeholders.map((stakeholder) => {
    let score = 0;
    const matchedTags: FieldId[] = [];

    for (const [tag, weight] of Object.entries(stakeholder.rewards) as [FieldId, number][]) {
      if (tagSet.has(tag)) {
        score += weight;
        matchedTags.push(tag);
      }
    }

    for (const [tag, weight] of Object.entries(stakeholder.dislikes) as [FieldId, number][]) {
      if (tagSet.has(tag)) score -= weight;
    }

    return { stakeholderId: stakeholder.id, score: clamp(score, -6, 10), matchedTags };
  });
}

function zeroMeters(): Meters {
  return {
    sharedModelStability: 0,
    visionIntegrity: 0,
    stakeholderConfidence: 0,
    systemHealth: 0,
    burnRate: 0,
  };
}

function addMeterDeltas(base: Meters, patch: Partial<Meters>): Meters {
  return {
    sharedModelStability: base.sharedModelStability + (patch.sharedModelStability ?? 0),
    visionIntegrity: base.visionIntegrity + (patch.visionIntegrity ?? 0),
    stakeholderConfidence: base.stakeholderConfidence + (patch.stakeholderConfidence ?? 0),
    systemHealth: base.systemHealth + (patch.systemHealth ?? 0),
    burnRate: base.burnRate + (patch.burnRate ?? 0),
  };
}

function uniqueFields(fields: FieldId[]): FieldId[] {
  return Array.from(new Set(fields));
}

export function allAssignedFields(assignments: BoardAssignment[]): FieldId[] {
  return uniqueFields(assignments.map((assignment) => assignment.fieldId));
}

export function evaluateRound(round: ProjectRound, assignments: BoardAssignment[], actionId: string): RoundOutcome {
  const action = round.actions.find((candidate) => candidate.id === actionId) ?? round.actions[0];
  const roundAssignments = assignments.filter((assignment) => assignment.roundId === round.id);
  const cardsById = new Map(round.cards.map((card) => [card.id, card]));
  const assignedCardIds = new Set(roundAssignments.map((assignment) => assignment.cardId));
  const upheldFields = new Set<FieldId>();
  const misplacedCardIds: string[] = [];

  for (const assignment of roundAssignments) {
    const card = cardsById.get(assignment.cardId);
    if (!card) continue;

    if (card.idealFields.includes(assignment.fieldId)) {
      upheldFields.add(assignment.fieldId);
    } else {
      misplacedCardIds.push(card.id);
    }
  }

  const missingFields = round.focusFields.filter((field) => !upheldFields.has(field));
  const unplacedCardIds = round.cards.filter((card) => !assignedCardIds.has(card.id)).map((card) => card.id);
  const supportHits = action.supports.filter((field) => upheldFields.has(field)).length;
  const unresolvedRisks = action.risks.filter((field) => !upheldFields.has(field)).length;
  let meterDeltas = addMeterDeltas(zeroMeters(), action.meterDeltas);

  meterDeltas = addMeterDeltas(meterDeltas, {
    sharedModelStability: upheldFields.size * 3 + supportHits * 2 - missingFields.length * 4 - misplacedCardIds.length * 2,
    stakeholderConfidence: upheldFields.size * 2 - missingFields.length * 3 - unresolvedRisks * 2,
    systemHealth:
      ["as_is_state", "strategy", "scope", "kpis"].filter((field) => upheldFields.has(field as FieldId)).length * 2 -
      ["as_is_state", "strategy", "scope", "kpis"].filter((field) => missingFields.includes(field as FieldId)).length * 3,
    burnRate: missingFields.length * 3 + misplacedCardIds.length * 2 + unplacedCardIds.length,
  });

  if (upheldFields.has("vision")) {
    meterDeltas.visionIntegrity += 6;
  } else if (round.focusFields.includes("vision") || action.risks.includes("vision")) {
    meterDeltas.visionIntegrity -= 7;
  }

  if (missingFields.length === 0 && misplacedCardIds.length === 0) {
    meterDeltas.sharedModelStability += 4;
    meterDeltas.stakeholderConfidence += 2;
  }

  const upheld = uniqueFields([...upheldFields]);
  const missingLabels = missingFields.map(fieldLabel).join(", ");
  const upheldLabels = upheld.map(fieldLabel).join(", ");
  const summary =
    missingFields.length === 0
      ? `${action.label} held the round together because the key model fields were explicit.`
      : `${action.label} created movement, but ${missingLabels} stayed weak.`;
  const consequence =
    missingFields.length === 0
      ? `Project confidence improved around ${upheldLabels || "the model"}; pressure became shared context instead of noise.`
      : `The project absorbed the pressure, but the missing model anchors increased drift risk around ${missingLabels}.`;

  return {
    roundId: round.id,
    title: round.title,
    actionId: action.id,
    actionLabel: action.label,
    upheldFields: upheld,
    missingFields,
    misplacedCardIds,
    unplacedCardIds,
    meterDeltas,
    summary,
    consequence,
  };
}

export function classifyFinalOutcome(meters: Meters, outcomes: RoundOutcome[]): FinalOutcome {
  const missedCount = outcomes.reduce((sum, outcome) => sum + outcome.missingFields.length, 0);

  if (
    meters.sharedModelStability >= 82 &&
    meters.visionIntegrity >= 78 &&
    meters.stakeholderConfidence >= 72 &&
    meters.burnRate <= 48
  ) {
    return {
      title: "Aligned Recovery",
      tone: "strong",
      summary: "The team used the Shared Model as a working canvas, not a slogan. Pressure clarified the model instead of fragmenting it.",
    };
  }

  if (meters.visionIntegrity < 62) {
    return {
      title: "Tactical Drift",
      tone: "risk",
      summary: "The project kept moving, but the why eroded. The next run should protect Vision and Rationale earlier.",
    };
  }

  if (meters.stakeholderConfidence < 62) {
    return {
      title: "Stakeholder Fracture",
      tone: "risk",
      summary: "Internal movement and external confidence diverged. The next run should make stakeholder context and success criteria explicit.",
    };
  }

  if (meters.burnRate > 68) {
    return {
      title: "Overloaded Delivery",
      tone: "risk",
      summary: "The model carried too many unresolved constraints. The next run should make Scope and Logistical Constraints sharper.",
    };
  }

  return {
    title: missedCount <= 3 ? "Sustainable Delivery" : "Partial Alignment",
    tone: missedCount <= 3 ? "strong" : "mixed",
    summary:
      missedCount <= 3
        ? "The team preserved enough of the Shared Model to keep delivery coherent under pressure."
        : "The team found some useful anchors, but key model fields stayed implicit long enough to create avoidable churn.",
  };
}

export function computeMeterDeltas(
  submission: ResponseSubmission,
  rubric: RubricResult[],
  stakeholderScores: StakeholderScore[],
): Meters {
  const deltas = zeroMeters();
  const passedCount = rubric.filter((result) => result.passed).length;
  const missedCount = rubric.length - passedCount;
  const tagCoverage = allSelectedTags(submission).length;
  const stakeholderScore = stakeholderScores.reduce((sum, item) => sum + item.score, 0);

  if (submission.mode === "tactical_patch") {
    deltas.sharedModelStability -= 8;
    deltas.visionIntegrity -= 7;
    deltas.systemHealth -= 5;
    deltas.burnRate += 10;
    deltas.stakeholderConfidence += 2;
  }

  if (submission.mode === "strategic_pause") {
    deltas.sharedModelStability += 1;
    deltas.visionIntegrity += 2;
    deltas.systemHealth += 3;
    deltas.burnRate += 2;
    deltas.stakeholderConfidence -= 1;
  }

  if (submission.mode === "model_reframe") {
    deltas.sharedModelStability += 6;
    deltas.visionIntegrity += 5;
    deltas.systemHealth += 4;
    deltas.burnRate -= 3;
  }

  deltas.sharedModelStability += passedCount * 3 - missedCount * 4 + Math.min(4, Math.floor(tagCoverage / 4));
  deltas.visionIntegrity += submission.sections.purpose_anchor.tags.includes("vision") ? 3 : -5;
  deltas.stakeholderConfidence += Math.round(stakeholderScore / 3);
  deltas.systemHealth += submission.sections.lifecycle_impact.tags.some((tag) => tag === "kpis" || tag === "as_is_state")
    ? 3
    : -3;

  const interruptResult = rubric.find((result) => result.id === "interrupts");
  if (interruptResult && !interruptResult.passed) {
    deltas.stakeholderConfidence -= interruptResult.missingTags.length * 2;
    deltas.sharedModelStability -= interruptResult.missingTags.length;
  }

  return deltas;
}

export function applyDeltas(meters: Meters, deltas: Meters): Meters {
  return {
    sharedModelStability: clamp(meters.sharedModelStability + deltas.sharedModelStability),
    visionIntegrity: clamp(meters.visionIntegrity + deltas.visionIntegrity),
    stakeholderConfidence: clamp(meters.stakeholderConfidence + deltas.stakeholderConfidence),
    systemHealth: clamp(meters.systemHealth + deltas.systemHealth),
    burnRate: clamp(meters.burnRate + deltas.burnRate),
  };
}

export function buildDebriefReport(params: {
  submission: ResponseSubmission;
  scenario: Scenario;
  stakeholders: Stakeholder[];
  previousMeters: Meters;
  nextMeters: Meters;
  transferAction?: string;
}): DebriefReport {
  const sectionRubric = validateSubmission(params.submission);
  const interruptRubric = validateInterrupts(params.submission);
  const rubric = [...sectionRubric, interruptRubric];
  const allTags = allSelectedTags(params.submission);
  const stakeholderScores = scoreStakeholderAlignment(params.stakeholders, allTags);
  const meterDeltas = computeMeterDeltas(params.submission, rubric, stakeholderScores);
  const missedAnchors = Array.from(new Set(rubric.flatMap((result) => result.missingTags)));
  const notes = rubric
    .filter((result) => !result.passed)
    .map((result) => result.message);

  return {
    id: crypto.randomUUID?.() ?? `debrief-${Date.now()}`,
    createdAt: new Date().toISOString(),
    scenarioTitle: params.scenario.title,
    mode: params.submission.mode,
    rubric,
    stakeholderScores,
    allTags,
    missedAnchors,
    meterDeltas,
    previousMeters: params.previousMeters,
    nextMeters: params.nextMeters,
    notes,
    transferAction: params.transferAction ?? "",
    roundOutcomes: [],
    finalOutcome: classifyFinalOutcome(params.nextMeters, []),
  };
}

export function buildProjectDebriefReport(params: {
  scenario: Scenario;
  assignments: BoardAssignment[];
  roundOutcomes: RoundOutcome[];
  previousMeters: Meters;
  nextMeters: Meters;
  transferAction?: string;
}): DebriefReport {
  const missedAnchors = uniqueFields(params.roundOutcomes.flatMap((outcome) => outcome.missingFields));
  const allTags = allAssignedFields(params.assignments);
  const finalOutcome = classifyFinalOutcome(params.nextMeters, params.roundOutcomes);
  const meterDeltas = {
    sharedModelStability: params.nextMeters.sharedModelStability - params.previousMeters.sharedModelStability,
    visionIntegrity: params.nextMeters.visionIntegrity - params.previousMeters.visionIntegrity,
    stakeholderConfidence: params.nextMeters.stakeholderConfidence - params.previousMeters.stakeholderConfidence,
    systemHealth: params.nextMeters.systemHealth - params.previousMeters.systemHealth,
    burnRate: params.nextMeters.burnRate - params.previousMeters.burnRate,
  };
  const rubric: RubricResult[] = params.roundOutcomes.map((outcome, index) => ({
    id: `round-${index + 1}`,
    label: `Round ${index + 1}: ${outcome.title}`,
    passed: outcome.missingFields.length === 0 && outcome.misplacedCardIds.length === 0,
    missingTags: outcome.missingFields,
    message: outcome.consequence,
  }));

  return {
    id: crypto.randomUUID?.() ?? `debrief-${Date.now()}`,
    createdAt: new Date().toISOString(),
    scenarioTitle: params.scenario.title,
    mode: "model_reframe",
    rubric,
    stakeholderScores: [],
    allTags,
    missedAnchors,
    meterDeltas,
    previousMeters: params.previousMeters,
    nextMeters: params.nextMeters,
    notes: params.roundOutcomes.map((outcome) => outcome.summary),
    transferAction: params.transferAction ?? "",
    roundOutcomes: params.roundOutcomes,
    finalOutcome,
  };
}

export function responseSectionById(id: ResponseSectionId) {
  const section = responseSections.find((candidate) => candidate.id === id);
  if (!section) throw new Error(`Unknown response section: ${id}`);
  return section;
}
