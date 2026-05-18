import { projectRounds } from "../content/projectRun";
import { fieldLabel } from "../content/sharedModel";
import { stakeholderById } from "../content/stakeholders";
import { MeterStack } from "../rendering/MeterStack";
import { SharedModelPlayfield } from "../rendering/SharedModelPlayfield";
import type { FieldId, GameSession, Scenario } from "../types";

export function ResponseWorkspace({
  session,
  scenario,
  onSelectCard,
  onAssignCard,
  onUnassignCard,
  onSelectAction,
  onAdvanceRound,
}: {
  session: GameSession;
  scenario: Scenario;
  onSelectCard: (cardId?: string) => void;
  onAssignCard: (cardId: string, fieldId: FieldId) => void;
  onUnassignCard: (cardId: string) => void;
  onSelectAction: (actionId: string) => void;
  onAdvanceRound: () => void;
}) {
  const round = projectRounds[session.currentRoundIndex];
  const stakeholder = stakeholderById(round.stakeholderId);
  const placedCardIds = new Set(session.boardAssignments.map((assignment) => assignment.cardId));
  const selectedAction = round.actions.find((action) => action.id === session.selectedActionId);
  const lastOutcome = session.roundOutcomes.at(-1);
  const isFinalRound = session.currentRoundIndex === projectRounds.length - 1;

  return (
    <main className="run-screen">
      <section className="run-header">
        <div>
          <p className="eyebrow">
            Round {session.currentRoundIndex + 1} / {projectRounds.length} · {scenario.phase}
          </p>
          <h1>{round.title}</h1>
          <p className="scenario-copy">{round.pressure}</p>
          <p className="learning-goal">{round.learningGoal}</p>
        </div>
        <MeterStack meters={session.meters} />
      </section>

      <section className="run-stage">
        <aside className="card-tray" aria-label="Evidence cards">
          <div>
            <p className="eyebrow">Pressure source</p>
            <h2>{stakeholder.name}</h2>
            <strong>{stakeholder.role}</strong>
            <p>{round.prompt}</p>
          </div>

          <div className="evidence-stack">
            {round.cards.map((card) => {
              const placed = placedCardIds.has(card.id);
              const selected = session.selectedCardId === card.id;
              return (
                <button
                  aria-pressed={selected}
                  className={[
                    "evidence-card",
                    selected ? "evidence-card--selected" : "",
                    placed ? "evidence-card--placed" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  draggable
                  key={card.id}
                  type="button"
                  onClick={() => onSelectCard(selected ? undefined : card.id)}
                  onDragStart={(event) => {
                    event.dataTransfer.setData("text/plain", card.id);
                    onSelectCard(card.id);
                  }}
                >
                  <span>{placed ? "Placed" : "Evidence"}</span>
                  <strong>{card.title}</strong>
                  <p>{card.body}</p>
                  <small>{card.source}</small>
                </button>
              );
            })}
          </div>
        </aside>

        <SharedModelPlayfield
          assignments={session.boardAssignments}
          cards={projectRounds.flatMap((item) => item.cards)}
          focusFields={round.focusFields}
          selectedCardId={session.selectedCardId}
          onSelectCard={onSelectCard}
          onAssignCard={onAssignCard}
          onUnassignCard={onUnassignCard}
        />

        <aside className="decision-panel" aria-label="Project decision">
          <div>
            <p className="eyebrow">This round protects</p>
            <div className="focus-list">
              {round.focusFields.map((field) => (
                <span key={field}>{fieldLabel(field)}</span>
              ))}
            </div>
          </div>

          <div>
            <h2>Choose project action</h2>
            <div className="action-list">
              {round.actions.map((action) => (
                <button
                  aria-pressed={session.selectedActionId === action.id}
                  className={session.selectedActionId === action.id ? "action-option action-option--selected" : "action-option"}
                  key={action.id}
                  type="button"
                  onClick={() => onSelectAction(action.id)}
                >
                  <strong>{action.label}</strong>
                  <span>{action.description}</span>
                </button>
              ))}
            </div>
          </div>

          {lastOutcome && (
            <article className="outcome-preview">
              <p className="eyebrow">Last project impact</p>
              <h2>{lastOutcome.title}</h2>
              <p>{lastOutcome.consequence}</p>
            </article>
          )}

          <button className="primary-action run-advance" disabled={!selectedAction} type="button" onClick={onAdvanceRound}>
            {isFinalRound ? "Resolve project outcome" : "Advance project"}
          </button>
        </aside>
      </section>
    </main>
  );
}
