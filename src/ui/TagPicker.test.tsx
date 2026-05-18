import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TagPicker } from "./TagPicker";

describe("TagPicker", () => {
  it("toggles a Shared Model tag", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();

    render(<TagPicker selected={[]} requiredTags={["vision"]} onToggle={onToggle} />);
    await user.click(screen.getByRole("button", { name: "Vision" }));

    expect(onToggle).toHaveBeenCalledWith("vision");
  });
});
