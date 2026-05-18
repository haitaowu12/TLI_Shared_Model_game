import { fieldIds } from "./sharedModel";
import { scenarios } from "./scenarios";
import { stakeholders } from "./stakeholders";

export function validateContent(): string[] {
  const errors: string[] = [];
  const fieldSet = new Set(fieldIds);
  const stakeholderSet = new Set(stakeholders.map((stakeholder) => stakeholder.id));

  for (const scenario of scenarios) {
    for (const stakeholderId of scenario.stakeholders) {
      if (!stakeholderSet.has(stakeholderId)) {
        errors.push(`${scenario.id} references unknown stakeholder ${stakeholderId}`);
      }
    }
    for (const interrupt of scenario.interrupts) {
      if (!stakeholderSet.has(interrupt.from)) {
        errors.push(`${scenario.id}/${interrupt.id} references unknown interrupt source ${interrupt.from}`);
      }
      for (const tag of interrupt.requiredTags) {
        if (!fieldSet.has(tag)) {
          errors.push(`${scenario.id}/${interrupt.id} references unknown field ${tag}`);
        }
      }
    }
  }

  return errors;
}
