import type { Browser, Page } from "playwright";
import { chromium } from "playwright";

import { assertionPasses } from "./assertions.js";
import type { VerifyFailure, VerifyRequest, VerifyResult } from "./types.js";
import { assertSafeTarget, type TargetPolicy } from "./security.js";

declare global {
  interface Window {
    __gameTestApi?: {
      getFps: () => number;
      getState: () => unknown;
    };
  }
}

let browserPromise: Promise<Browser> | undefined;

async function getBrowser(): Promise<Browser> {
  browserPromise ??= chromium.launch({ headless: true });
  return browserPromise;
}

async function readGameState(page: Page): Promise<unknown> {
  return page.evaluate(() => window.__gameTestApi?.getState());
}

export async function closeBrowser(): Promise<void> {
  if (!browserPromise) return;
  const browser = await browserPromise;
  browserPromise = undefined;
  await browser.close();
}

export async function verifyGame(request: VerifyRequest, targetPolicy?: TargetPolicy): Promise<VerifyResult> {
  const startedAt = Date.now();
  const failures: VerifyFailure[] = [];
  const browser = await getBrowser();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

  if (targetPolicy) {
    await page.route("**/*", async (route) => {
      const browserRequest = route.request();
      if (!browserRequest.isNavigationRequest() || browserRequest.frame() !== page.mainFrame()) {
        await route.continue();
        return;
      }
      try {
        await assertSafeTarget(browserRequest.url(), targetPolicy);
        await route.continue();
      } catch {
        await route.abort("blockedbyclient");
      }
    });
  }

  page.on("console", (message) => {
    if (message.type() === "error") failures.push({ type: "console", message: message.text() });
  });
  page.on("pageerror", (error) => failures.push({ type: "console", message: error.message }));

  let fps = 0;
  try {
    await page.goto(request.bundleUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForFunction(() => Boolean(window.__gameTestApi), undefined, { timeout: 20_000 });
    await page.waitForTimeout(1_200);

    const canvasReady = await page.locator("canvas").first().evaluate((canvas) => {
      const rect = canvas.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }).catch(() => false);
    if (!canvasReady) failures.push({ type: "canvas", message: "No visible canvas rendered" });

    fps = await page.evaluate(() => window.__gameTestApi?.getFps() ?? 0);
    if (fps < request.expectations.fpsFloor) {
      failures.push({
        type: "fps",
        message: `FPS ${fps.toFixed(1)} is below floor ${request.expectations.fpsFloor}`,
      });
    }

    for (const assertion of request.expectations.assertions) {
      const before = await readGameState(page);
      if (assertion.input) {
        await page.keyboard.down(assertion.input.key);
        await page.waitForTimeout(assertion.input.durationMs);
        await page.keyboard.up(assertion.input.key);
        await page.waitForTimeout(100);
      }
      const after = await readGameState(page);
      if (!assertionPasses(assertion, before, after)) {
        failures.push({
          type: "expectation",
          expectationId: assertion.id,
          message: `${assertion.description} failed at ${assertion.path}`,
        });
      }
    }
  } catch (error) {
    failures.push({ type: "browser", message: error instanceof Error ? error.message : "Browser verification failed" });
  } finally {
    await page.close();
  }

  return {
    pass: failures.length === 0,
    failures,
    metrics: { fps, durationMs: Date.now() - startedAt },
  };
}
