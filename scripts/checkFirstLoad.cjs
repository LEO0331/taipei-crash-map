// Optional production-browser verification; reuse an existing Playwright install.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.FIRST_LOAD_BASE_URL || 'http://127.0.0.1:5176/taipei-crash-map/';
const output = process.env.FIRST_LOAD_OUTPUT || '.omx/first-load-browser';
const chartCode = url => /\/(?:Dashboard|BarChart)-[^/]+\.js/.test(url);
const secondaryData = url => /\/data\/(?:traffic-violation-report|traffic-accident-appraisal)/.test(url);
fs.mkdirSync(output, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const report = [];
  try {
    for (const width of [1440, 375]) {
      const context = await browser.newContext({ viewport: { width, height: 800 }, serviceWorkers: 'block' });
      const page = await context.newPage();
      const requests = [], errors = [];
      page.on('request', request => requests.push(request.url()));
      page.on('pageerror', error => errors.push(error.message));
      let release;
      const held = new Promise(resolve => { release = resolve; });
      await context.route('**/data/accident-*.json', async route => { await held; await route.continue(); });
      await page.goto(base, { waitUntil: 'domcontentloaded' });
      await page.locator('.leaflet-container').waitFor();
      assert.ok(requests.some(url => url.includes('tile.openstreetmap.org')));
      assert.equal(await page.locator('.record-badge').count(), 0);
      await page.locator('.leaflet-container').evaluate(node => { node.dataset.identity = 'retained'; });
      release();
      await page.locator('.record-badge').waitFor();
      await page.waitForTimeout(250); // Allow the viewport observer to run.
      assert.equal(await page.locator('.leaflet-container').getAttribute('data-identity'), 'retained');
      assert.deepEqual(requests.filter(chartCode), []);
      assert.deepEqual(requests.filter(secondaryData), []);
      await page.screenshot({ path: `${output}/deferred-${width}.png`, fullPage: true });
      await page.locator('.dashboard-slot').scrollIntoViewIfNeeded();
      await page.locator('.dashboard-slot .dashboard:not(.dashboard-placeholder)').waitFor();
      assert.ok(requests.some(chartCode));
      await page.getByRole('button', { name: 'EN', exact: true }).click();
      for (const [tab, pattern, workspace] of [
        [4, /\/data\/traffic-violation-report/, '.workspace-reportedViolations'],
        [5, /\/data\/traffic-accident-appraisal/, '.workspace-appraisalReconsiderations'],
      ]) {
        await page.locator('.app-tabs button[aria-pressed]').nth(tab - 1).click();
        await page.locator(`${workspace} table tbody tr`).first().waitFor();
        const count = requests.filter(url => pattern.test(url)).length;
        assert.equal(count, 2);
        await page.locator('.app-tabs button[aria-pressed]').last().click();
        await page.locator('.app-tabs button[aria-pressed]').nth(tab - 1).click();
        await page.locator(`${workspace} table tbody tr`).first().waitFor();
        assert.equal(requests.filter(url => pattern.test(url)).length, count);
        const sizes = await page.evaluate(() => [innerWidth, document.documentElement.scrollWidth]);
        assert.equal(sizes[0], sizes[1]);
      }
      await page.getByRole('button', { name: 'Hotspot Analysis', exact: true }).click();
      await page.locator('.dashboard-slot .dashboard:not(.dashboard-placeholder)').waitFor();
      const sizes = await page.evaluate(() => [innerWidth, document.documentElement.scrollWidth]);
      assert.equal(sizes[0], sizes[1]);
      await page.screenshot({ path: `${output}/analysis-${width}.png`, fullPage: true });
      assert.deepEqual(errors, []);
      report.push({ width, earlyTiles: true, deferredCharts: true, secondaryTabFetches: '2 each, no repeat', sizes, errors });
      await context.close();
    }
    const context = await browser.newContext({ viewport: { width: 1440, height: 800 } });
    const page = await context.newPage();
    const requests = [];
    context.on('request', request => requests.push(request.url()));
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.locator('.record-badge').waitFor();
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller) await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
    });
    assert.deepEqual(requests.filter(secondaryData), []);
    assert.deepEqual(requests.filter(chartCode), []);
    assert.ok(!requests.some(url => /crash-detail|\/accidents\.json/.test(url)));
    // A completed controlled visit populates app assets for offline reload.
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('.record-badge').waitFor();
    await page.evaluate(async () => { await (await fetch('data/crash-detail-summary.json')).json(); });
    await context.setOffline(true);
    assert.equal(await page.evaluate(async () => (await fetch('data/crash-detail-summary.json')).ok), true);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('.record-badge').waitFor();
    report.push({ worker: 'v4', noSecondaryOrChartStartupRequests: true, offlineDemandCache: true, offlineVisitedMap: true });
    await context.close();
    fs.writeFileSync(`${output}/report.json`, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
