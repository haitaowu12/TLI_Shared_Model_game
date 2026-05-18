import { responseSections } from "../content/rubric";
import type {
  DebriefReport,
  FieldId,
  Meters,
  ResponseMode,
  ResponseSectionId,
  ResponseSubmission,
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
  };
}

export function responseSectionById(id: ResponseSectionId) {
  const section = responseSections.find((candidate) => candidate.id === id);
  if (!section) throw new Error(`Unknown response section: ${id}`);
  return section;
}
