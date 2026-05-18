import { describe, expect, it } from "vitest";
import { validateContent } from "../src/content/validateContent";

describe("content validation", () => {
  it("has internally valid v1 content", () => {
    expect(validateContent()).toEqual([]);
  });
});
