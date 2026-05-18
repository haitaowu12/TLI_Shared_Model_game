import { describe, expect, it } from "vitest";
import { scheduleInterrupts } from "../src/domain/interruptSchedule";
import type { Interrupt } from "../src/types";

describe("interrupt schedule", () => {
  it("orders pressure events by scenario step", () => {
    const interrupts: Interrupt[] = [
      { id: "b", atStep: 2, from: "ops_d", line: "Second", requiredTags: ["vision"] },
      { id: "a", atStep: 1, from: "ops_d", line: "First", requiredTags: ["strategy"] },
    ];

    const schedule = scheduleInterrupts(interrupts);

    expect(schedule.map((item) => item.id)).toEqual(["a", "b"]);
    expect(schedule.map((item) => item.stepOrder)).toEqual([1, 2]);
  });
});
