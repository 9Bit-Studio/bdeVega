import { expect, test } from "@playwright/test";

const genres = ["platformer", "endless-runner", "top-down-collector"] as const;

for (const genre of genres) {
  for (const seed of [1, 7, 19]) {
    test(`boots ${genre} spec variation ${seed}`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });

      await page.goto(`/dev/spec?genre=${genre}&seed=${seed}`);
      await page.waitForFunction(() => Boolean(window.__gameTestApi));
      await expect(page.locator("canvas")).toBeVisible();
      await page.waitForTimeout(700);
      const result = await page.evaluate(() => ({
        fps: window.__gameTestApi?.getFps() ?? 0,
        phase: window.__gameTestApi?.getState().phase,
      }));

      expect(result.phase).toBe("playing");
      expect(result.fps).toBeGreaterThan(20);
      expect(consoleErrors).toEqual([]);
    });
  }
}
