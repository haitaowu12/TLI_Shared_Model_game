import { describe, expect, it } from "vitest";
import { validateContent } from "./validateContent";

describe("content registry", () => {
  it("has no broken round, card, action, field, or stakeholder references", () => {
    expect(validateContent()).toEqual([]);
  });
});
