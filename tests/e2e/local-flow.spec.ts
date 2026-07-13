import { expect, test } from "@playwright/test";

test("signup through replayed generation, refine, and dry-run publish", async ({ page, request }) => {
  await expect.poll(async () => (await request.get("http://127.0.0.1:4001/health")).ok()).toBe(true);

  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await page.goto("/local");
  await page.getByTestId("signup-submit").click();
  await page.getByTestId("continue-questions").click();
  await expect(page.getByTestId("question-cards")).toBeVisible();
  await page.getByTestId("generate-submit").click();

  const iframe = page.getByTestId("game-iframe");
  await expect(iframe).toBeVisible();
  await expect(page.locator(".local-status")).toContainText(/Playtest passed|verification notes/);

  const gameFrame = page.frames().find((frame) => frame.url().includes("/play/"));
  expect(gameFrame).toBeTruthy();
  await gameFrame!.waitForFunction(() => Boolean(window.__gameTestApi));
  expect(await gameFrame!.evaluate(() => window.__gameTestApi?.getState().phase)).toBe("playing");

  await page.getByTestId("refine-submit").click();
  await expect(page.locator(".local-status")).toContainText(/Refinement passed|Refinement saved/);
  await page.getByTestId("publish-submit").click();
  await expect(page.getByTestId("publish-url")).toContainText(".dry-run.local");
  expect(consoleErrors).toEqual([]);
});
