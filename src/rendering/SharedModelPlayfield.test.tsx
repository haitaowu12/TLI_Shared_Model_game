import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { projectRounds } from "../content/projectRun";
import { SharedModelPlayfield } from "./SharedModelPlayfield";

describe("SharedModelPlayfield", () => {
  it("shows assigned evidence under the target field", () => {
    const round = projectRounds[0];

    render(
      <SharedModelPlayfield
        assignments={[{ roundId: round.id, cardId: "card-owner-needed", fieldId: "responsible" }]}
        cards={round.cards}
        focusFields={round.focusFields}
        readOnly
      />,
    );

    expect(screen.getByRole("button", { name: /Owner needed/ })).toBeVisible();
    expect(screen.getByLabelText(/Responsible:/)).toBeVisible();
  });

  it("assigns the selected card when a field is clicked", async () => {
    const user = userEvent.setup();
    const round = projectRounds[0];
    const onAssign = vi.fn();

    render(
      <SharedModelPlayfield
        assignments={[]}
        cards={round.cards}
        focusFields={round.focusFields}
        selectedCardId="card-owner-needed"
        onAssignCard={onAssign}
      />,
    );

    await user.click(screen.getByLabelText(/Responsible:/));

    expect(onAssign).toHaveBeenCalledWith("card-owner-needed", "responsible");
  });
});
