import { useEffect, useReducer, useState } from "react";
import { activeScenario } from "./content/scenarios";
import { createInitialSession, sessionReducer } from "./domain/session";
import { clearSession, loadSession, saveSession } from "./persistence/sessionStorage";
import { Debrief } from "./ui/Debrief";
import { Onboarding } from "./ui/Onboarding";
import { ResponseWorkspace } from "./ui/ResponseWorkspace";
import { ScenarioBrief } from "./ui/ScenarioBrief";

function initSession() {
  return loadSession() ?? createInitialSession();
}

export function App() {
  const [session, dispatch] = useReducer(sessionReducer, undefined, initSession);
  const [saveState, setSaveState] = useState("Autosave idle");
  const scenario = activeScenario();

  useEffect(() => {
    const ok = saveSession(session);
    setSaveState(ok ? "Autosaved" : "Autosave unavailable");
  }, [session]);

  function reset() {
    clearSession();
    dispatch({ type: "RESET" });
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-title">Shared Model Under Pressure</span>
        </div>
        <nav aria-label="Session status">
          <span>{saveState}</span>
          <button type="button" onClick={reset}>
            Reset
          </button>
        </nav>
      </header>

      {session.phase === "onboarding" && <Onboarding onComplete={() => dispatch({ type: "COMPLETE_ONBOARDING" })} />}

      {session.phase === "briefing" && <ScenarioBrief scenario={scenario} onStart={() => dispatch({ type: "START_RESPONSE" })} />}

      {session.phase === "responding" && (
        <ResponseWorkspace
          session={session}
          scenario={scenario}
          onSelectCard={(cardId) => dispatch({ type: "SELECT_CARD", cardId })}
          onAssignCard={(cardId, fieldId) => dispatch({ type: "ASSIGN_CARD", cardId, fieldId })}
          onUnassignCard={(cardId) => dispatch({ type: "UNASSIGN_CARD", cardId })}
          onSelectAction={(actionId) => dispatch({ type: "SELECT_PROJECT_ACTION", actionId })}
          onAdvanceRound={() => dispatch({ type: "ADVANCE_ROUND" })}
        />
      )}

      {session.phase === "debrief" && (
        <Debrief
          session={session}
          onTransferActionChange={(transferAction) => dispatch({ type: "SET_TRANSFER_ACTION", transferAction })}
          onReset={reset}
        />
      )}
    </div>
  );
}
