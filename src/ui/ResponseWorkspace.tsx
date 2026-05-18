import { responseSections } from "../content/rubric";
import { allSelectedTags } from "../domain/scoring";
import { MeterStack } from "../rendering/MeterStack";
import { PressureTimeline } from "../rendering/PressureTimeline";
import { SharedModelBoard } from "../rendering/SharedModelBoard";
import type { FieldId, GameSession, ResponseMode, ResponseSectionId, Scenario } from "../types";
import { InterruptPanel } from "./InterruptPanel";
import { ModeSelector } from "./ModeSelector";
import { TagPicker } from "./TagPicker";

export function ResponseWorkspace({
  session,
  scenario,
  onModeChange,
  onTextChange,
  onTagToggle,
  onAddInterruptTags,
  onSubmit,
}: {
  session: GameSession;
  scenario: Scenario;
  onModeChange: (mode: ResponseMode) => void;
  onTextChange: (sectionId: ResponseSectionId, text: string) => void;
  onTagToggle: (sectionId: ResponseSectionId, tag: FieldId) => void;
  onAddInterruptTags: (interruptId: string, sectionId: ResponseSectionId) => void;
  onSubmit: () => void;
}) {
  const selectedTags = allSelectedTags(session.response);

  return (
    <main className="workspace">
      <section className="workspace__left">
        <div className="workspace__topline">
          <div>
            <p className="eyebrow">{scenario.phase}</p>
            <h1>{scenario.title}</h1>
          </div>
          <button className="primary-action primary-action--compact" type="button" onClick={onSubmit}>
            Generate debrief
          </button>
        </div>
        <p className="scenario-copy">{scenario.setup}</p>
        <ModeSelector value={session.response.mode} onChange={onModeChange} />
        <div className="response-sections">
          {responseSections.map((section) => {
            const response = session.response.sections[section.id];
            const requiredTags = [...section.requiredTags, ...(section.alternativeTags ?? [])];
            return (
              <article className="response-card" key={section.id}>
                <label htmlFor={section.id}>
                  <strong>{section.label}</strong>
                  <span>{section.prompt}</span>
                </label>
                <textarea
                  id={section.id}
                  value={response.text}
                  rows={4}
                  onChange={(event) => onTextChange(section.id, event.target.value)}
                />
                <TagPicker
                  selected={response.tags}
                  requiredTags={requiredTags}
                  onToggle={(tag) => onTagToggle(section.id, tag)}
                />
              </article>
            );
          })}
        </div>
      </section>

      <aside className="workspace__right">
        <MeterStack meters={session.meters} />
        <SharedModelBoard selectedTags={selectedTags} requiredTags={session.response.requiredInterruptTags} />
        <InterruptPanel
          interrupts={scenario.interrupts}
          acknowledgedInterrupts={session.response.acknowledgedInterrupts}
          onAddTags={onAddInterruptTags}
        />
        <PressureTimeline scenario={scenario} acknowledgedInterrupts={session.response.acknowledgedInterrupts} />
      </aside>
    </main>
  );
}
