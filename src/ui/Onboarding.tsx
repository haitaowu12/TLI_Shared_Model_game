import { onboardingSteps } from "../content/training";

export function Onboarding({ onComplete }: { onComplete: () => void }) {
  return (
    <main className="screen screen--onboarding">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Self-guided training</p>
          <h1>Shared Model Under Pressure</h1>
          <p className="hero-copy">
            Practice turning delivery pressure into visible model anchors: vision, scope, owner, KPI, lifecycle impact, and stakeholder message.
          </p>
        </div>
        <button className="primary-action" type="button" onClick={onComplete}>
          Begin scenario
        </button>
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
    </main>
  );
}
