import { fieldLabel } from "../content/sharedModel";
import { stakeholderById } from "../content/stakeholders";
import type { Interrupt, ResponseSectionId } from "../types";

export function InterruptPanel({
  interrupts,
  acknowledgedInterrupts,
  onAddTags,
}: {
  interrupts: Interrupt[];
  acknowledgedInterrupts: string[];
  onAddTags: (interruptId: string, sectionId: ResponseSectionId) => void;
}) {
  const acknowledged = new Set(acknowledgedInterrupts);

  return (
    <section className="interrupt-panel" aria-label="Stakeholder interrupts">
      <div className="section-heading">
        <h2>Stakeholder pressure</h2>
        <span>{acknowledged.size}/{interrupts.length} handled</span>
      </div>
      {interrupts.map((interrupt) => {
        const source = stakeholderById(interrupt.from);
        return (
          <article className={acknowledged.has(interrupt.id) ? "interrupt-card interrupt-card--done" : "interrupt-card"} key={interrupt.id}>
            <div>
              <span className="interrupt-card__source">
                {source.name} / {source.role}
              </span>
              <p>{interrupt.line}</p>
              <div className="anchor-row">
                {interrupt.requiredTags.map((tag) => (
                  <span key={tag}>{fieldLabel(tag)}</span>
                ))}
              </div>
            </div>
            <button type="button" onClick={() => onAddTags(interrupt.id, "stakeholder_message")}>
              Add anchors
            </button>
          </article>
        );
      })}
    </section>
  );
}
