export type FieldGroup = "purpose" | "core" | "stakeholder" | "execution" | "governance";

export type FieldId =
  | "vision"
  | "scope"
  | "rationale"
  | "as_is_state"
  | "strategy"
  | "success_criteria"
  | "kpis"
  | "internal_stakeholders"
  | "external_stakeholders"
  | "resources_knowledge"
  | "logistical_constraints"
  | "team_governance"
  | "team"
  | "project_manager"
  | "responsible"
  | "accountable";

export interface SharedModelField {
  id: FieldId;
  label: string;
  group: FieldGroup;
  prompt: string;
  examples: string[];
}

export interface Stakeholder {
  id: string;
  name: string;
  role: string;
  preference: "direct" | "narrative" | "stabilizing" | "analytical";
  bio: string;
  motivations: string[];
  pressures: string[];
  systemRole: string;
  rewards: Partial<Record<FieldId, number>>;
  dislikes: Partial<Record<FieldId, number>>;
  recommendedTags: FieldId[];
}

export interface Interrupt {
  id: string;
  atStep: number;
  from: string;
  line: string;
  requiredTags: FieldId[];
}

export interface Scenario {
  id: string;
  title: string;
  phase: string;
  setup: string;
  context: string;
  constraints: string[];
  stakeholders: string[];
  interrupts: Interrupt[];
  successCriteria: string[];
}

export interface ModelContentCard {
  id: string;
  roundId: string;
  title: string;
  body: string;
  source: string;
  idealFields: FieldId[];
  stakeholderId?: string;
}

export interface ProjectAction {
  id: string;
  label: string;
  description: string;
  supports: FieldId[];
  risks: FieldId[];
  meterDeltas: Partial<Meters>;
}

export interface ProjectRound {
  id: string;
  title: string;
  pressure: string;
  prompt: string;
  stakeholderId: string;
  focusFields: FieldId[];
  cards: ModelContentCard[];
  actions: ProjectAction[];
}

export interface BoardAssignment {
  cardId: string;
  fieldId: FieldId;
  roundId: string;
}

export interface RoundOutcome {
  roundId: string;
  title: string;
  actionId: string;
  actionLabel: string;
  upheldFields: FieldId[];
  missingFields: FieldId[];
  misplacedCardIds: string[];
  unplacedCardIds: string[];
  meterDeltas: Meters;
  summary: string;
  consequence: string;
}

export interface FinalOutcome {
  title: string;
  tone: "strong" | "mixed" | "risk";
  summary: string;
}

export type ResponseMode = "tactical_patch" | "strategic_pause" | "model_reframe";

export type ResponseSectionId =
  | "purpose_anchor"
  | "immediate_48h_action"
  | "boundary_statement"
  | "lifecycle_impact"
  | "stakeholder_message";

export interface ResponseSection {
  id: ResponseSectionId;
  label: string;
  prompt: string;
  requiredTags: FieldId[];
  alternativeTags?: FieldId[];
}

export interface SectionResponse {
  text: string;
  tags: FieldId[];
}

export interface ResponseSubmission {
  mode: ResponseMode;
  sections: Record<ResponseSectionId, SectionResponse>;
  requiredInterruptTags: FieldId[];
  acknowledgedInterrupts: string[];
  submittedAt?: string;
  timedOut: boolean;
}

export interface Meters {
  sharedModelStability: number;
  visionIntegrity: number;
  stakeholderConfidence: number;
  systemHealth: number;
  burnRate: number;
}

export type GamePhase = "onboarding" | "briefing" | "responding" | "debrief";

export interface GameEvent {
  id: string;
  at: string;
  label: string;
  detail: string;
}

export interface RubricResult {
  id: string;
  label: string;
  passed: boolean;
  message: string;
  missingTags: FieldId[];
}

export interface StakeholderScore {
  stakeholderId: string;
  score: number;
  matchedTags: FieldId[];
}

export interface DebriefReport {
  id: string;
  createdAt: string;
  scenarioTitle: string;
  mode: ResponseMode;
  rubric: RubricResult[];
  stakeholderScores: StakeholderScore[];
  allTags: FieldId[];
  missedAnchors: FieldId[];
  meterDeltas: Meters;
  previousMeters: Meters;
  nextMeters: Meters;
  notes: string[];
  transferAction: string;
  roundOutcomes: RoundOutcome[];
  finalOutcome: FinalOutcome;
}

export interface GameSession {
  version: 3;
  phase: GamePhase;
  scenarioId: string;
  createdAt: string;
  updatedAt: string;
  meters: Meters;
  previousMeters: Meters;
  response: ResponseSubmission;
  currentRoundIndex: number;
  boardAssignments: BoardAssignment[];
  selectedCardId?: string;
  selectedActionId?: string;
  roundOutcomes: RoundOutcome[];
  eventLog: GameEvent[];
  debrief: DebriefReport | null;
  autosaveStatus: "idle" | "saved" | "unavailable";
}
