import { test, expect } from "@playwright/test";

test.describe("Referrer Policy Meta Tag", () => {
  test("index.html contains referrer meta tag with no-referrer content", async ({ page }) => {
    await page.goto("http://localhost:3000/index.html");

    const metaContent = await page.evaluate(() => {
      const meta = document.querySelector('meta[name="referrer"]');
      return meta ? meta.getAttribute("content") : null;
    });

    expect(metaContent).toBe("no-referrer");
  });
});
