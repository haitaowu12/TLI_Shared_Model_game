import { sharedModelFields } from "../content/sharedModel";
import type { FieldId } from "../types";

export function TagPicker({
  selected,
  onToggle,
  requiredTags = [],
}: {
  selected: FieldId[];
  requiredTags?: FieldId[];
  onToggle: (tag: FieldId) => void;
}) {
  const selectedSet = new Set(selected);
  const requiredSet = new Set(requiredTags);

  return (
    <div className="tag-picker" aria-label="Shared Model tags">
      {sharedModelFields.map((field) => (
        <button
          className={[
            "tag-chip",
            selectedSet.has(field.id) ? "tag-chip--selected" : "",
            requiredSet.has(field.id) ? "tag-chip--required" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          key={field.id}
          type="button"
          aria-pressed={selectedSet.has(field.id)}
          onClick={() => onToggle(field.id)}
        >
          {field.label}
        </button>
      ))}
    </div>
  );
}
