import { fieldLabel, sharedModelFields } from "../content/sharedModel";
import type { BoardAssignment, FieldId, ModelContentCard } from "../types";
import { fieldAreas, modelFieldTone } from "./modelLayout";
import type { DragEvent } from "react";

interface SharedModelPlayfieldProps {
  assignments: BoardAssignment[];
  cards: ModelContentCard[];
  focusFields: FieldId[];
  selectedCardId?: string;
  missedFields?: FieldId[];
  readOnly?: boolean;
  onSelectCard?: (cardId?: string) => void;
  onAssignCard?: (cardId: string, fieldId: FieldId) => void;
  onUnassignCard?: (cardId: string) => void;
}

function cardById(cards: ModelContentCard[], cardId: string): ModelContentCard | undefined {
  return cards.find((card) => card.id === cardId);
}

export function SharedModelPlayfield({
  assignments,
  cards,
  focusFields,
  selectedCardId,
  missedFields = [],
  readOnly = false,
  onAssignCard,
  onUnassignCard,
}: SharedModelPlayfieldProps) {
  const focusSet = new Set(focusFields);
  const missedSet = new Set(missedFields);

  function assignFromDrop(event: DragEvent<HTMLElement>, fieldId: FieldId) {
    if (readOnly) return;
    event.preventDefault();
    const cardId = event.dataTransfer.getData("text/plain");
    if (cardId) onAssignCard?.(cardId, fieldId);
  }

  function assignSelected(fieldId: FieldId) {
    if (!readOnly && selectedCardId) onAssignCard?.(selectedCardId, fieldId);
  }

  return (
    <section className="model-board model-board--playfield" aria-label="Shared Model playfield">
      <div className="model-board__header">
        <span>Shared Model Canvas</span>
        <strong>{assignments.length} evidence cards placed</strong>
      </div>
      <div className="model-board__canvas model-board__canvas--play">
        {sharedModelFields.map((field) => {
          const placed = assignments
            .filter((assignment) => assignment.fieldId === field.id)
            .map((assignment) => cardById(cards, assignment.cardId))
            .filter((card): card is ModelContentCard => Boolean(card));
          const className = [
            "model-field",
            "model-field--drop",
            `model-field--${field.group}`,
            ...modelFieldTone(field.id),
            focusSet.has(field.id) ? "model-field--focus" : "",
            missedSet.has(field.id) ? "model-field--missed" : "",
            selectedCardId && !readOnly ? "model-field--drop-target" : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <article
              className={className}
              key={field.id}
              style={{ gridArea: fieldAreas[field.id] }}
              tabIndex={readOnly ? undefined : 0}
              onClick={() => assignSelected(field.id)}
              onDragOver={(event) => {
                if (!readOnly) event.preventDefault();
              }}
              onDrop={(event) => assignFromDrop(event, field.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  assignSelected(field.id);
                }
              }}
              aria-label={`${field.label}: ${field.prompt}`}
            >
              <span className="model-field__group">{field.group}</span>
              <h3>{fieldLabel(field.id)}</h3>
              <p>{field.prompt}</p>
              <div className="field-card-list">
                {placed.map((card) => (
                  <button
                    className="field-card"
                    disabled={readOnly}
                    key={card.id}
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onUnassignCard?.(card.id);
                    }}
                  >
                    <strong>{card.title}</strong>
                    <span>{card.source}</span>
                  </button>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
