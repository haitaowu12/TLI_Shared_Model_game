import { expect, test } from "@playwright/test";

test("self-guided training flow reaches debrief", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto("/");
  await page.getByRole("button", { name: "Start guided scenario" }).click();
  await page.getByRole("button", { name: "Start response" }).click();

  await page.getByLabel("Purpose Anchor").fill("The vision remains faster rural emergency response without giving up safety, trust, or regulatory confidence.");
  await page.locator("article").filter({ hasText: "Purpose Anchor" }).getByRole("button", { name: "Vision" }).click();
  await page.locator("article").filter({ hasText: "Purpose Anchor" }).getByRole("button", { name: "Rationale" }).click();

  await page.getByLabel("Immediate 48h Action").fill("Morgan owns a 48-hour containment path that protects the core workflow and reports progress daily.");
  await page.locator("article").filter({ hasText: "Immediate 48h Action" }).getByRole("button", { name: "Strategy" }).click();
  await page.locator("article").filter({ hasText: "Immediate 48h Action" }).getByRole("button", { name: "Responsible" }).click();

  await page.getByLabel("Boundary Statement").fill("Containment is in scope, but permanent redesign waits for evidence, budget review, and regulatory alignment.");
  await page.locator("article").filter({ hasText: "Boundary Statement" }).getByRole("button", { name: "Scope" }).click();
  await page.locator("article").filter({ hasText: "Boundary Statement" }).getByRole("button", { name: "Logistical Constraints" }).click();

  await page.getByLabel("Lifecycle Impact").fill("The team protects median response time, demo uptime, training load, and current integration stability.");
  await page.locator("article").filter({ hasText: "Lifecycle Impact" }).getByRole("button", { name: "Key Performance Indicators" }).click();

  await page.getByLabel("Stakeholder Message").fill("Operations, public trust, and finance get one message and one escalation path for model alignment.");
  await page.locator("article").filter({ hasText: "Stakeholder Message" }).getByRole("button", { name: "Team Governance" }).click();
  await page.locator("article").filter({ hasText: "Stakeholder Message" }).getByRole("button", { name: "External Stakeholder Context" }).click();

  await page.getByRole("button", { name: "Add anchors" }).first().click();
  await page.getByRole("button", { name: "Add anchors" }).nth(1).click();
  await page.getByRole("button", { name: "Add anchors" }).nth(2).click();
  await page.getByRole("button", { name: "Generate debrief" }).click();

  await expect(page.getByRole("heading", { name: /Model discipline held|Model gaps visible/ })).toBeVisible();
  await expect(page.getByLabel("What will you apply to a real project this week?")).toBeVisible();
  expect(consoleErrors).toEqual([]);
});
