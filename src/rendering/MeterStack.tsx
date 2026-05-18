import type { Meters } from "../types";

const meterLabels: Record<keyof Meters, string> = {
  sharedModelStability: "Model Stability",
  visionIntegrity: "Vision Integrity",
  stakeholderConfidence: "Stakeholder Confidence",
  systemHealth: "System Health",
  burnRate: "Burn Rate",
};

export function MeterStack({ meters }: { meters: Meters }) {
  return (
    <div className="meter-stack" aria-label="Training meters">
      {(Object.keys(meterLabels) as (keyof Meters)[]).map((key) => {
        const value = meters[key];
        const danger = key === "burnRate" ? value > 60 : value < 45;
        return (
          <div className="meter" key={key}>
            <div className="meter__label">
              <span>{meterLabels[key]}</span>
              <strong>{value}</strong>
            </div>
            <div className="meter__track" aria-hidden="true">
              <span
                className={danger ? "meter__fill meter__fill--danger" : "meter__fill"}
                style={{ width: `${value}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
