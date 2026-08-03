const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('http://localhost:3000/flower.html');

  // Wait for initial render
  await page.waitForTimeout(2000);

  // 1. Check all 5 options exist in the selector
  const options = await page.$$eval('#flowerSelector option', opts => opts.map(o => o.textContent.trim()));
  console.log('Flower options:', options);

  // 2. Select each flower and take a screenshot
  const flowerSelector = await page.$('#flowerSelector');
  const optionValues = await page.$$eval('#flowerSelector option', opts => opts.map(o => o.value));

  for (let i = 0; i < optionValues.length; i++) {
    const value = optionValues[i];
    const name = options[i].toLowerCase().replace(/\s+/g, '-');

    await flowerSelector.selectOption(value);

    // Wait for the new flower to load and animate for a bit
    await page.waitForTimeout(2000);

    await page.screenshot({ path: `flower-${name}.png`, fullPage: true });
    console.log(`Saved screenshot for ${name}`);
  }

  await browser.close();
})();
