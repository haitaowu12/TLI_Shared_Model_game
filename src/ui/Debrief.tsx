import { allProjectCards } from "../content/projectRun";
import { fieldLabel } from "../content/sharedModel";
import { modeLabels } from "../domain/scoring";
import { exportSession } from "../persistence/sessionStorage";
import { MeterStack } from "../rendering/MeterStack";
import { SharedModelPlayfield } from "../rendering/SharedModelPlayfield";
import type { GameSession } from "../types";

export function Debrief({
  session,
  onTransferActionChange,
  onReset,
}: {
  session: GameSession;
  onTransferActionChange: (value: string) => void;
  onReset: () => void;
}) {
  if (!session.debrief) return null;
  const debrief = session.debrief;
  const passed = debrief.rubric.filter((result) => result.passed).length;
  const finalOutcome = debrief.finalOutcome ?? {
    title: passed >= 5 ? "Model discipline held" : "Model gaps visible",
    tone: "mixed" as const,
    summary: "The run surfaced which parts of the Shared Model were visible and which stayed implicit.",
  };
  const heading = finalOutcome.title;
  const cleanRounds = debrief.roundOutcomes.filter(
    (outcome) => outcome.missingFields.length === 0 && outcome.misplacedCardIds.length === 0,
  ).length;
  const missedLabels = debrief.missedAnchors.map(fieldLabel);

  function downloadExport() {
    const blob = new Blob([exportSession(session)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "shared-model-training-session.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="debrief-screen">
      <section className={`debrief-summary debrief-summary--${finalOutcome.tone}`}>
        <div className="debrief-summary__copy">
          <p className="eyebrow">Project outcome</p>
          <h1>{heading}</h1>
          <p>{finalOutcome.summary}</p>
        </div>
        <dl className="debrief-stats" aria-label="Debrief summary">
          <div>
            <dt>Scenario</dt>
            <dd>{debrief.scenarioTitle}</dd>
          </div>
          <div>
            <dt>Mode</dt>
            <dd>{modeLabels[debrief.mode]}</dd>
          </div>
          <div>
            <dt>Clean rounds</dt>
            <dd>
              {cleanRounds}/{debrief.roundOutcomes.length}
            </dd>
          </div>
          <div>
            <dt>Fields used</dt>
            <dd>{debrief.allTags.length}</dd>
          </div>
        </dl>
        <div className="debrief-actions">
          <button type="button" onClick={downloadExport}>
            Export report
          </button>
          <button className="primary-action primary-action--compact" type="button" onClick={onReset}>
            New run
          </button>
        </div>
      </section>

      <section className="debrief-layout">
        <div className="debrief-main">
          <article className="debrief-panel">
            <h2>Round impacts</h2>
            <div className="rubric-list rubric-list--wide">
              {debrief.roundOutcomes.map((outcome, index) => (
                <div
                  className={
                    outcome.missingFields.length === 0 && outcome.misplacedCardIds.length === 0
                      ? "rubric-item rubric-item--pass"
                      : "rubric-item"
                  }
                  key={outcome.roundId}
                >
                  <strong>
                    Round {index + 1}: {outcome.title}
                  </strong>
                  <span>{outcome.consequence}</span>
                  {outcome.missingFields.length > 0 && (
                    <small>Weak fields: {outcome.missingFields.map(fieldLabel).join(", ")}</small>
                  )}
                </div>
              ))}
            </div>
          </article>

          <div className="debrief-model-header">
            <div>
              <p className="eyebrow">Model snapshot</p>
              <h2>Final evidence map</h2>
            </div>
            <span>{missedLabels.length > 0 ? `Missed: ${missedLabels.join(", ")}` : "No missed anchors"}</span>
          </div>

          <SharedModelPlayfield
            assignments={session.boardAssignments}
            cards={allProjectCards()}
            focusFields={[]}
            missedFields={debrief.missedAnchors}
            readOnly
          />
        </div>

        <aside className="debrief-side">
          <article className="debrief-panel">
            <h2>Meter movement</h2>
            <MeterStack meters={debrief.nextMeters} />
          </article>

          <article className="debrief-panel">
            <h2>Model field diagnosis</h2>
            <div className="rubric-list">
              {debrief.rubric.map((item) => (
                <div className={item.passed ? "rubric-item rubric-item--pass" : "rubric-item"} key={item.id}>
                  <strong>{item.label}</strong>
                  <span>{item.message}</span>
                  {item.missingTags.length > 0 && (
                    <small>Missing: {item.missingTags.map(fieldLabel).join(", ")}</small>
                  )}
                </div>
              ))}
            </div>
          </article>

          <article className="debrief-panel">
            <h2>Transfer action</h2>
            <label className="transfer-label" htmlFor="transfer-action">
              What will you apply to a real project this week?
            </label>
            <textarea
              id="transfer-action"
              value={debrief.transferAction}
              rows={6}
              onChange={(event) => onTransferActionChange(event.target.value)}
            />
          </article>
        </aside>
      </section>
    </main>
  );
}
