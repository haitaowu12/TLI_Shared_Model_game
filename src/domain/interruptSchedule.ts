import type { Interrupt } from "../types";

export interface ScheduledInterrupt extends Interrupt {
  stepOrder: number;
}

export function scheduleInterrupts(interrupts: Interrupt[]): ScheduledInterrupt[] {
  return [...interrupts]
    .sort((a, b) => a.atStep - b.atStep)
    .map((interrupt, index) => ({ ...interrupt, stepOrder: index + 1 }));
}
