import { scheduleInterrupts } from "../domain/interruptSchedule";
import type { Scenario } from "../types";

export function PressureTimeline({
  scenario,
  acknowledgedInterrupts,
}: {
  scenario: Scenario;
  acknowledgedInterrupts: string[];
}) {
  const acknowledged = new Set(acknowledgedInterrupts);
  return (
    <ol className="timeline" aria-label="Stakeholder pressure timeline">
      {scheduleInterrupts(scenario.interrupts).map((interrupt) => (
        <li className={acknowledged.has(interrupt.id) ? "timeline__item timeline__item--done" : "timeline__item"} key={interrupt.id}>
          <span className="timeline__dot" aria-hidden="true" />
          <span className="timeline__step">Pressure {interrupt.stepOrder}</span>
          <span>{interrupt.line}</span>
        </li>
      ))}
    </ol>
  );
}
