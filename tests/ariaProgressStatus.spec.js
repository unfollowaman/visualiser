import { test, expect } from "@playwright/test";

test.describe("ARIA Progress and Live Region Semantics", () => {
  test("progress containers have progressbar role, ARIA attributes, and dynamic valuenow support", async ({ page }) => {
    await page.goto("http://localhost:3000/index.html");

    const progressAttrs = await page.evaluate(() => {
      const pc = document.getElementById("progressContainer");
      const fpc = document.getElementById("flowerProgressContainer");

      return {
        pcRole: pc.getAttribute("role"),
        pcMin: pc.getAttribute("aria-valuemin"),
        pcMax: pc.getAttribute("aria-valuemax"),
        pcNow: pc.getAttribute("aria-valuenow"),
        pcLabel: pc.getAttribute("aria-label"),

        fpcRole: fpc.getAttribute("role"),
        fpcMin: fpc.getAttribute("aria-valuemin"),
        fpcMax: fpc.getAttribute("aria-valuemax"),
        fpcNow: fpc.getAttribute("aria-valuenow"),
        fpcLabel: fpc.getAttribute("aria-label"),
      };
    });

    expect(progressAttrs.pcRole).toBe("progressbar");
    expect(progressAttrs.pcMin).toBe("0");
    expect(progressAttrs.pcMax).toBe("100");
    expect(progressAttrs.pcNow).toBe("0");
    expect(progressAttrs.pcLabel).toBeTruthy();

    expect(progressAttrs.fpcRole).toBe("progressbar");
    expect(progressAttrs.fpcMin).toBe("0");
    expect(progressAttrs.fpcMax).toBe("100");
    expect(progressAttrs.fpcNow).toBe("0");
    expect(progressAttrs.fpcLabel).toBeTruthy();
  });

  test("status and error lines have live region semantics", async ({ page }) => {
    await page.goto("http://localhost:3000/index.html");

    const liveRegionAttrs = await page.evaluate(() => {
      const sl = document.getElementById("statusLine");
      const fsl = document.getElementById("flowerStatusLine");
      const de = document.getElementById("decodeError");

      return {
        slRole: sl.getAttribute("role"),
        slLive: sl.getAttribute("aria-live"),

        fslRole: fsl.getAttribute("role"),
        fslLive: fsl.getAttribute("aria-live"),

        deRole: de.getAttribute("role"),
        deLive: de.getAttribute("aria-live"),
      };
    });

    expect(liveRegionAttrs.slRole).toBe("status");
    expect(liveRegionAttrs.slLive).toBe("polite");

    expect(liveRegionAttrs.fslRole).toBe("status");
    expect(liveRegionAttrs.fslLive).toBe("polite");

    expect(liveRegionAttrs.deRole).toBe("alert");
    expect(liveRegionAttrs.deLive).toBe("assertive");
  });

  test("overview and preview canvas elements have img role and descriptive aria-label", async ({ page }) => {
    await page.goto("http://localhost:3000/index.html");

    const canvasAttrs = await page.evaluate(() => {
      const overview = document.getElementById("overviewCanvas");
      const preview = document.getElementById("previewCanvas");

      return {
        overviewRole: overview.getAttribute("role"),
        overviewLabel: overview.getAttribute("aria-label"),

        previewRole: preview.getAttribute("role"),
        previewLabel: preview.getAttribute("aria-label"),
      };
    });

    expect(canvasAttrs.overviewRole).toBe("img");
    expect(canvasAttrs.overviewLabel).toBe("Audio waveform timeline overview");

    expect(canvasAttrs.previewRole).toBe("img");
    expect(canvasAttrs.previewLabel).toBe("Audio visualizer preview canvas");
  });
});
