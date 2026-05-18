import { fieldIds } from "./sharedModel";
import { projectRounds } from "./projectRun";
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

  const cardIds = new Set<string>();
  for (const round of projectRounds) {
    if (!stakeholderSet.has(round.stakeholderId)) {
      errors.push(`${round.id} references unknown round stakeholder ${round.stakeholderId}`);
    }
    for (const field of round.focusFields) {
      if (!fieldSet.has(field)) errors.push(`${round.id} references unknown focus field ${field}`);
    }
    for (const card of round.cards) {
      if (cardIds.has(card.id)) errors.push(`Duplicate project card id ${card.id}`);
      cardIds.add(card.id);
      if (card.roundId !== round.id) errors.push(`${round.id}/${card.id} has mismatched roundId ${card.roundId}`);
      if (card.stakeholderId && !stakeholderSet.has(card.stakeholderId)) {
        errors.push(`${round.id}/${card.id} references unknown stakeholder ${card.stakeholderId}`);
      }
      for (const field of card.idealFields) {
        if (!fieldSet.has(field)) errors.push(`${round.id}/${card.id} references unknown ideal field ${field}`);
      }
    }
    for (const action of round.actions) {
      for (const field of [...action.supports, ...action.risks]) {
        if (!fieldSet.has(field)) errors.push(`${round.id}/${action.id} references unknown action field ${field}`);
      }
    }
  }

  return errors;
}
