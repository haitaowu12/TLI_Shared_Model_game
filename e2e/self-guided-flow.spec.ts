import { expect, test } from "@playwright/test";

async function placeCard(page: import("@playwright/test").Page, cardName: RegExp, fieldName: RegExp) {
  await page.getByRole("button", { name: cardName }).click();
  await page.getByLabel(fieldName).click();
}

test("self-guided project run resolves through board assignments", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole("button", { name: "Start guided scenario" }).click();
  await page.getByRole("button", { name: "Start project run" }).click();

  await placeCard(page, /Current system fact/, /As-is State:/);
  await placeCard(page, /Owner needed/, /Responsible:/);
  await placeCard(page, /Containment path/, /Strategy:/);
  await placeCard(page, /Standup drift/, /Team Governance:/);
  await page.getByRole("button", { name: /Reframe standup around the model/ }).click();
  await page.getByRole("button", { name: "Advance project" }).click();

  await placeCard(page, /Public question/, /Vision:/);
  await placeCard(page, /Why now/, /Rationale:/);
  await placeCard(page, /Community impact/, /External Stakeholder Context:/);
  await placeCard(page, /Success signal/, /Success Criteria:/);
  await page.getByRole("button", { name: /Publish one model-based story/ }).click();
  await page.getByRole("button", { name: "Advance project" }).click();

  await placeCard(page, /Protected KPI/, /Key Performance Indicators:/);
  await placeCard(page, /Budget cap/, /Logistical Constraints:/);
  await placeCard(page, /Scope boundary/, /Scope:/);
  await placeCard(page, /Reusable learning/, /Resources\/Knowledge Management:/);
  await page.getByRole("button", { name: /Protect KPI and scope boundary/ }).click();

  await page.getByRole("button", { name: "Advance project" }).click();

  await placeCard(page, /Quiet discipline/, /Internal Stakeholder Context:/);
  await placeCard(page, /Style clash/, /Team Governance:/);
  await placeCard(page, /Decision rights unclear/, /Accountable:/);
  await placeCard(page, /Safety success signal/, /Success Criteria:/);
  await page.getByRole("button", { name: /Run style-aware safety reset/ }).click();
  await page.getByRole("button", { name: "Resolve project outcome" }).click();

  await expect(page.getByRole("heading", { name: /Aligned Recovery|Sustainable Delivery/ })).toBeVisible();
  await expect(page.getByText(/Round 1: Defect Drift/).first()).toBeVisible();
  await expect(page.getByText(/Round 4: Psychological Safety Fault Line/).first()).toBeVisible();
  await expect(page.getByText("Final evidence map")).toBeVisible();
  await expect(page.getByLabel("What will you apply to a real project this week?")).toBeVisible();
  const textState = await page.evaluate(() => {
    const gameWindow = window as typeof window & { render_game_to_text?: () => string };
    return JSON.parse(gameWindow.render_game_to_text?.() ?? "{}");
  });
  expect(textState).toMatchObject({
    phase: "debrief",
    round: { total: 4 },
  });
  expect(["Aligned Recovery", "Sustainable Delivery"]).toContain(textState.debrief.outcome);
  expect(consoleErrors).toEqual([]);
});
