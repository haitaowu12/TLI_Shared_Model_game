import { fieldLabel } from "../content/sharedModel";
import { stakeholderById } from "../content/stakeholders";
import { modeLabels } from "../domain/scoring";
import { exportSession } from "../persistence/sessionStorage";
import { MeterStack } from "../rendering/MeterStack";
import { SharedModelBoard } from "../rendering/SharedModelBoard";
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
      <section className="debrief-hero">
        <div>
          <p className="eyebrow">Debrief</p>
          <h1>{passed >= 5 ? "Model discipline held" : "Model gaps visible"}</h1>
          <p>
            {debrief.scenarioTitle} / {modeLabels[debrief.mode]} / {debrief.allTags.length} model anchors used.
          </p>
        </div>
        <div className="debrief-actions">
          <button type="button" onClick={downloadExport}>
            Export report
          </button>
          <button className="primary-action primary-action--compact" type="button" onClick={onReset}>
            New run
          </button>
        </div>
      </section>

      <section className="debrief-grid">
        <article className="debrief-panel">
          <h2>Rubric</h2>
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
          <h2>Stakeholder alignment</h2>
          <div className="stakeholder-score-list">
            {debrief.stakeholderScores.map((score) => {
              const stakeholder = stakeholderById(score.stakeholderId);
              return (
                <div className="stakeholder-score" key={score.stakeholderId}>
                  <div>
                    <strong>{stakeholder.name}</strong>
                    <span>{stakeholder.role}</span>
                  </div>
                  <b>{score.score}</b>
                  <small>{score.matchedTags.map(fieldLabel).join(", ") || "No strong matches"}</small>
                </div>
              );
            })}
          </div>
        </article>

        <article className="debrief-panel">
          <h2>Meter movement</h2>
          <MeterStack meters={debrief.nextMeters} />
        </article>

        <article className="debrief-panel">
          <h2>Transfer action</h2>
          <label className="transfer-label" htmlFor="transfer-action">
            What will you apply to a real project this week?
          </label>
          <textarea
            id="transfer-action"
            value={debrief.transferAction}
            rows={5}
            onChange={(event) => onTransferActionChange(event.target.value)}
          />
        </article>
      </section>

      <SharedModelBoard
        selectedTags={debrief.allTags}
        requiredTags={session.response.requiredInterruptTags}
        missedTags={debrief.missedAnchors}
      />
    </main>
  );
}
