import { modeLabels } from "../domain/scoring";
import type { ResponseMode } from "../types";

const modes: { mode: ResponseMode; detail: string }[] = [
  { mode: "tactical_patch", detail: "Fast containment. Higher drift risk." },
  { mode: "strategic_pause", detail: "Slow the room. Preserve options." },
  { mode: "model_reframe", detail: "Rebuild the shared mental model." },
];

export function ModeSelector({ value, onChange }: { value: ResponseMode; onChange: (mode: ResponseMode) => void }) {
  return (
    <fieldset className="mode-selector">
      <legend>Response posture</legend>
      {modes.map((item) => (
        <button
          className={value === item.mode ? "mode-card mode-card--active" : "mode-card"}
          key={item.mode}
          type="button"
          onClick={() => onChange(item.mode)}
        >
          <strong>{modeLabels[item.mode]}</strong>
          <span>{item.detail}</span>
        </button>
      ))}
    </fieldset>
  );
}
