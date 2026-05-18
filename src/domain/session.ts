import { activeScenario } from "../content/scenarios";
import { stakeholderById } from "../content/stakeholders";
import type { FieldId, GameEvent, GamePhase, GameSession, ResponseMode, ResponseSectionId } from "../types";
import {
  applyDeltas,
  buildDebriefReport,
  computeMeterDeltas,
  createEmptySubmission,
  defaultMeters,
  scoreStakeholderAlignment,
  validateInterrupts,
  validateSubmission,
} from "./scoring";

export type SessionAction =
  | { type: "COMPLETE_ONBOARDING" }
  | { type: "START_RESPONSE" }
  | { type: "SET_MODE"; mode: ResponseMode }
  | { type: "UPDATE_SECTION_TEXT"; sectionId: ResponseSectionId; text: string }
  | { type: "TOGGLE_TAG"; sectionId: ResponseSectionId; tag: FieldId }
  | { type: "ACKNOWLEDGE_INTERRUPT"; interruptId: string }
  | { type: "ADD_INTERRUPT_TAGS"; interruptId: string; sectionId: ResponseSectionId }
  | { type: "SUBMIT_RESPONSE" }
  | { type: "SET_TRANSFER_ACTION"; transferAction: string }
  | { type: "RESET" }
  | { type: "RESTORE"; session: GameSession };

function now() {
  return new Date().toISOString();
}

function makeEvent(label: string, detail: string): GameEvent {
  return {
    id: crypto.randomUUID?.() ?? `event-${Date.now()}-${Math.random()}`,
    at: now(),
    label,
    detail,
  };
}

export function createInitialSession(phase: GamePhase = "onboarding"): GameSession {
  const timestamp = now();
  return {
    version: 2,
    phase,
    scenarioId: activeScenario().id,
    createdAt: timestamp,
    updatedAt: timestamp,
    meters: { ...defaultMeters },
    previousMeters: { ...defaultMeters },
    response: createEmptySubmission(),
    debrief: null,
    autosaveStatus: "idle",
    eventLog: [makeEvent("Session created", "Self-guided Shared Model training initialized.")],
  };
}

function withUpdate(session: GameSession, patch: Partial<GameSession>, event?: GameEvent): GameSession {
  return {
    ...session,
    ...patch,
    updatedAt: now(),
    eventLog: event ? [...session.eventLog, event] : session.eventLog,
  };
}

export function sessionReducer(session: GameSession, action: SessionAction): GameSession {
  switch (action.type) {
    case "COMPLETE_ONBOARDING":
      return withUpdate(session, { phase: "briefing" }, makeEvent("Onboarding complete", "Player reviewed model discipline."));

    case "START_RESPONSE":
      return withUpdate(session, { phase: "responding" }, makeEvent("Scenario started", activeScenario().title));

    case "SET_MODE":
      return withUpdate(session, {
        response: { ...session.response, mode: action.mode },
      });

    case "UPDATE_SECTION_TEXT":
      return withUpdate(session, {
        response: {
          ...session.response,
          sections: {
            ...session.response.sections,
            [action.sectionId]: {
              ...session.response.sections[action.sectionId],
              text: action.text,
            },
          },
        },
      });

    case "TOGGLE_TAG": {
      const current = session.response.sections[action.sectionId];
      const nextTags = current.tags.includes(action.tag)
        ? current.tags.filter((tag) => tag !== action.tag)
        : [...current.tags, action.tag];

      return withUpdate(session, {
        response: {
          ...session.response,
          sections: {
            ...session.response.sections,
            [action.sectionId]: { ...current, tags: nextTags },
          },
        },
      });
    }

    case "ACKNOWLEDGE_INTERRUPT": {
      const interrupt = activeScenario().interrupts.find((candidate) => candidate.id === action.interruptId);
      if (!interrupt) return session;
      const requiredInterruptTags = Array.from(new Set([...session.response.requiredInterruptTags, ...interrupt.requiredTags]));
      const acknowledgedInterrupts = Array.from(new Set([...session.response.acknowledgedInterrupts, action.interruptId]));

      return withUpdate(
        session,
        { response: { ...session.response, requiredInterruptTags, acknowledgedInterrupts } },
        makeEvent("Interrupt acknowledged", interrupt.line),
      );
    }

    case "ADD_INTERRUPT_TAGS": {
      const interrupt = activeScenario().interrupts.find((candidate) => candidate.id === action.interruptId);
      if (!interrupt) return session;
      const current = session.response.sections[action.sectionId];
      const sectionTags = Array.from(new Set([...current.tags, ...interrupt.requiredTags]));
      const requiredInterruptTags = Array.from(new Set([...session.response.requiredInterruptTags, ...interrupt.requiredTags]));
      const acknowledgedInterrupts = Array.from(new Set([...session.response.acknowledgedInterrupts, action.interruptId]));

      return withUpdate(
        session,
        {
          response: {
            ...session.response,
            requiredInterruptTags,
            acknowledgedInterrupts,
            sections: {
              ...session.response.sections,
              [action.sectionId]: { ...current, tags: sectionTags },
            },
          },
        },
        makeEvent("Interrupt anchors added", interrupt.line),
      );
    }

    case "SUBMIT_RESPONSE": {
      const scenario = activeScenario();
      const stakeholders = scenario.stakeholders.map(stakeholderById);
      const submission = { ...session.response, submittedAt: now() };
      const rubric = [...validateSubmission(submission), validateInterrupts(submission)];
      const allTags = Object.values(submission.sections).flatMap((section) => section.tags);
      const stakeholderScores = scoreStakeholderAlignment(stakeholders, Array.from(new Set(allTags)));
      const meterDeltas = computeMeterDeltas(submission, rubric, stakeholderScores);
      const nextMeters = applyDeltas(session.meters, meterDeltas);
      const debrief = buildDebriefReport({
        submission,
        scenario,
        stakeholders,
        previousMeters: session.meters,
        nextMeters,
        transferAction: session.debrief?.transferAction,
      });

      return withUpdate(
        session,
        {
          phase: "debrief",
          previousMeters: session.meters,
          meters: nextMeters,
          response: submission,
          debrief,
        },
        makeEvent("Response submitted", "Debrief generated from model anchors and stakeholder pressure."),
      );
    }

    case "SET_TRANSFER_ACTION":
      if (!session.debrief) return session;
      return withUpdate(session, {
        debrief: { ...session.debrief, transferAction: action.transferAction },
      });

    case "RESET":
      return createInitialSession();

    case "RESTORE":
      return action.session;

    default:
      return session;
  }
}
