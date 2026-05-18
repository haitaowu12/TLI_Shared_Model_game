import { stakeholderById } from "../content/stakeholders";
import type { Scenario } from "../types";

export function ScenarioBrief({ scenario, onStart }: { scenario: Scenario; onStart: () => void }) {
  return (
    <main className="screen">
      <section className="brief-layout">
        <article className="brief-card brief-card--primary">
          <p className="eyebrow">{scenario.phase}</p>
          <h1>{scenario.title}</h1>
          <p>{scenario.setup}</p>
          <p className="context-copy">{scenario.context}</p>
          <button className="primary-action" type="button" onClick={onStart}>
            Start response
          </button>
        </article>

        <aside className="brief-card">
          <h2>Success criteria</h2>
          <ul className="clean-list">
            {scenario.successCriteria.map((criterion) => (
              <li key={criterion}>{criterion}</li>
            ))}
          </ul>
          <h2>Constraints</h2>
          <ul className="constraint-list">
            {scenario.constraints.map((constraint) => (
              <li key={constraint}>{constraint}</li>
            ))}
          </ul>
        </aside>
      </section>

      <section className="stakeholder-strip" aria-label="Stakeholders">
        {scenario.stakeholders.map((id) => {
          const stakeholder = stakeholderById(id);
          return (
            <article className="stakeholder-card" key={stakeholder.id}>
              <span>{stakeholder.preference}</span>
              <h2>{stakeholder.name}</h2>
              <strong>{stakeholder.role}</strong>
              <p>{stakeholder.bio}</p>
            </article>
          );
        })}
      </section>
    </main>
  );
}
