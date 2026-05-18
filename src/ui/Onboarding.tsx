import { paper151LearningContext } from "../content/paper151";
import { onboardingSteps } from "../content/training";
import { SharedModelBoard } from "../rendering/SharedModelBoard";

export function Onboarding({ onComplete }: { onComplete: () => void }) {
  return (
    <main className="screen screen--onboarding">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Self-guided training</p>
          <h1>Shared Model Under Pressure</h1>
          <p className="hero-copy">
            Practice turning delivery pressure into an explicit shared model: what the work is, why it matters,
            who is involved, how the team works, what constraints exist, and how success is recognized.
          </p>
        </div>
      </section>

      <section className="primer-layout" aria-label="Shared Model explanation">
        <article className="primer-card">
          <p className="eyebrow">Cohort 9 paper</p>
          <h2>What this model is for</h2>
          <p className="research-question">{paper151LearningContext.researchQuestion}</p>
          <p>{paper151LearningContext.sharedModelPurpose}</p>
          <p>{paper151LearningContext.gamePurpose}</p>
          <h3>Pressure patterns the model counters</h3>
          <ul className="barrier-list">
            {paper151LearningContext.barriers.map((barrier) => (
              <li key={barrier}>{barrier}</li>
            ))}
          </ul>
        </article>
        <SharedModelBoard selectedTags={[]} requiredTags={[]} />
      </section>

      <section className="play-loop" aria-label="How the game works">
        <h2>How the game works</h2>
        <ol>
          <li>Read a pressure scenario from a multidisciplinary project.</li>
          <li>Place evidence cards directly into the Shared Model fields they clarify.</li>
          <li>Choose a project action after deciding which fields to protect.</li>
          <li>Watch the project meters move as stakeholder pressure hits the model.</li>
          <li>Review the debrief to see which field choices changed the project outcome.</li>
        </ol>
      </section>

      <section className="step-grid" aria-label="Training path">
        {onboardingSteps.map((step, index) => (
          <article className="step-card" key={step.title}>
            <span className="step-card__index">{index + 1}</span>
            <h2>{step.title}</h2>
            <p>{step.body}</p>
          </article>
        ))}
      </section>

      <div className="start-row">
        <button className="primary-action" type="button" onClick={onComplete}>
          Start guided scenario
        </button>
      </div>
    </main>
  );
}
