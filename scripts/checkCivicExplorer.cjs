// Optional browser acceptance: supply an existing Playwright installation via
// PLAYWRIGHT_MODULE. This project adds no browser-testing dependency.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.EXPLORER_BASE_URL || 'http://127.0.0.1:5174/';
const output = process.env.EXPLORER_OUTPUT || '.omx/explorer-browser';
fs.mkdirSync(output, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true });
  const report = [];
  try {
    for (const width of [1440, 375]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
      const page = await context.newPage();
      const requests = [], errors = [];
      page.on('request', request => requests.push(request.url()));
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(base, { waitUntil: 'domcontentloaded' });
      await page.locator('.leaflet-container').waitFor();
      await page.getByRole('button', { name: 'EN', exact: true }).click();
      assert.equal(await page.locator('.app-tabs button[aria-pressed=true]').innerText(), 'Crash Map');
      assert.equal(await page.locator('.app-tabs button[aria-pressed]').count(), 8);
      const originalUrl = page.url();
      await page.getByRole('button', { name: 'Civic Explorer', exact: true }).click();
      await page.locator('.data-explorer').waitFor();
      assert.equal(await page.locator('.explore-result-group li').count(), 8);
      assert.equal(await page.locator('.leaflet-container').count(), 1);
      assert.equal(await page.locator('.leaflet-container').isVisible(), false);
      const researchBefore = requests.filter(url => /data\/(bus-service|neihu)|(?:BusServiceDecision|NeihuCongestion)Dashboard/.test(url));
      assert.deepEqual(researchBefore, []);
      if (width === 375) assert.equal(await page.locator('.explore-hub').count(), 0);
      if (width === 375) await page.locator('.data-explorer').screenshot({ path: `${output}/explorer-375-list-en.png` });
      await page.getByRole('button', { name: 'Hubs', exact: true }).click();
      assert.equal(await page.locator('.explore-hub').count(), 5);
      const hub = page.locator('[data-explore-group=research]');
      await hub.focus(); await page.keyboard.press('Enter');
      assert.equal(await hub.getAttribute('aria-pressed'), 'true');
      assert.equal(await page.locator('.explore-result-group li').count(), 2);
      await page.keyboard.press('Escape');
      assert.equal(await hub.evaluate(node => node === document.activeElement), true);
      assert.ok(await hub.evaluate(node => parseFloat(getComputedStyle(node.querySelector('.explore-lift')).transitionDuration) <= .001));
      assert.equal(await hub.evaluate(node => getComputedStyle(node.querySelector('.explore-lift')).transform), 'none');
      await page.getByRole('searchbox', { name: 'Search destinations' }).fill('bus');
      assert.equal(await page.locator('.explore-result-group li').count(), 1);
      await page.getByRole('button', { name: 'Reset navigation', exact: true }).click();
      assert.equal(await page.locator('.explore-result-group li').count(), 8);
      const overflow = await page.evaluate(() => [innerWidth, document.documentElement.scrollWidth]);
      assert.equal(overflow[0], overflow[1]);
      await page.locator('.data-explorer').screenshot({ path: `${output}/explorer-${width}-en.png` });
      await page.getByRole('button', { name: '中文', exact: true }).click();
      assert.equal(await page.locator('.explore-hub').allTextContents().then(items => items.join('|')), '事故探索|事故因素|交通紀錄|運輸研究|資料與方法');
      await page.locator('.data-explorer').screenshot({ path: `${output}/explorer-${width}-zh.png` });
      await page.getByRole('button', { name: /返回目前頁面$/ }).click();
      assert.equal(await page.locator('.leaflet-container').isVisible(), true);
      assert.equal(await page.locator('.explorer-entry').evaluate(node => document.activeElement === node), true);
      await page.getByRole('button', { name: 'EN', exact: true }).click();
      // A changed map mode, filter and Leaflet DOM identity survive opening/back.
      await page.getByRole('button', { name: 'Clustered points', exact: true }).click();
      const search = page.getByPlaceholder('Search road, intersection, or place');
      await search.fill('中山');
      const district = page.locator('.filter-panel select').nth(1);
      const time = page.locator('.filter-panel select').nth(2);
      await district.selectOption('中山區');
      await time.selectOption('morning');
      await page.locator('.year-pills').getByRole('button', { name: '2019', exact: true }).click();
      await page.locator('.leaflet-container').evaluate(node => node.dataset.explorerIdentity = 'retained');
      await page.getByRole('button', { name: 'Civic Explorer', exact: true }).click();
      await page.setViewportSize({ width: width === 1440 ? 1200 : 390, height: 900 });
      await page.getByRole('button', { name: /Back to current view$/ }).click();
      await page.setViewportSize({ width, height: 1000 });
      await page.locator('.leaflet-control-zoom-in').click();
      assert.equal(await search.inputValue(), '中山');
      assert.equal(await district.inputValue(), '中山區');
      assert.equal(await time.inputValue(), 'morning');
      assert.equal(await page.locator('.year-pills').getByRole('button', { name: '2019', exact: true }).getAttribute('aria-pressed'), 'false');
      assert.equal(await page.getByRole('button', { name: 'Clustered points', exact: true }).getAttribute('aria-pressed'), 'true');
      assert.equal(await page.locator('.leaflet-container').getAttribute('data-explorer-identity'), 'retained');
      await page.getByRole('button', { name: 'Data Notes', exact: true }).first().click();
      await page.getByRole('button', { name: 'Civic Explorer', exact: true }).click();
      await page.getByRole('button', { name: 'Return to crash map', exact: true }).click();
      assert.equal(await search.inputValue(), '中山');
      assert.equal(page.url(), originalUrl);
      assert.equal(await page.evaluate(() => localStorage.getItem('language')), 'en');
      await page.locator('main.workspace').screenshot({ path: `${output}/map-${width}.png` });
      if (width === 1440) {
        await page.getByRole('button', { name: 'Civic Explorer', exact: true }).click();
        const busResponse = page.waitForResponse(response => response.url().includes('/data/bus-service/manifest.json') && response.ok());
        await page.locator('.explore-results').getByRole('button', { name: /Bus Network & Service/ }).click();
        await busResponse;
        await page.getByRole('button', { name: 'Civic Explorer', exact: true }).click();
        const neihuResponse = page.waitForResponse(response => response.url().includes('/data/neihu-congestion/snapshot.json') && response.ok());
        await page.locator('.explore-results').getByRole('button', { name: /Neihu Congestion Decision Support/ }).click();
        await neihuResponse;
      }
      assert.deepEqual(errors, []);
      report.push({ width, overflow, noResearchOnOpen: true, filterAndMapPreserved: true, errors });
      await context.close();
    }
    // A failed optional download must leave both a return path and direct tabs.
    const failed = await browser.newContext({ serviceWorkers: 'block' });
    const failedPage = await failed.newPage();
    await failedPage.route('**/assets/CivicExplorer-*.js', route => route.abort());
    await failedPage.goto(base);
    await failedPage.getByRole('button', { name: 'EN', exact: true }).click();
    await failedPage.getByRole('button', { name: 'Civic Explorer', exact: true }).click();
    await failedPage.getByRole('alert').filter({ hasText: 'Explorer could not load' }).waitFor();
    await failedPage.getByRole('button', { name: 'Back to current view', exact: true }).click();
    assert.equal(await failedPage.locator('.leaflet-container').isVisible(), true);
    await failedPage.locator('.app-tabs').getByRole('button', { name: 'Data Notes', exact: true }).click();
    assert.equal(await failedPage.locator('.workspace-dataNotes').isVisible(), true);
    await failed.close();

    // Existing service worker caches visited hashed chunks; no new precache rule.
    const offline = await browser.newContext();
    const offlinePage = await offline.newPage();
    await offlinePage.goto(base);
    const registration = await offlinePage.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;
      return { scope: registration.scope, script: registration.active.scriptURL };
    });
    assert.equal(registration.script, new URL('sw.js', base).href);
    await offlinePage.reload();
    await offlinePage.getByRole('button', { name: 'EN', exact: true }).click();
    await offlinePage.getByRole('button', { name: 'Civic Explorer', exact: true }).click();
    await offlinePage.locator('.data-explorer').waitFor();
    await offlinePage.waitForFunction(async () => {
      const keys = await caches.keys();
      const cache = await caches.open(keys.find(key => key === 'taipei-crash-map-v3'));
      return (await cache.keys()).some(request => /CivicExplorer-.*\.js$/.test(request.url));
    });
    await offline.setOffline(true);
    await offlinePage.reload();
    await offlinePage.getByRole('button', { name: 'Civic Explorer', exact: true }).click();
    await offlinePage.locator('.data-explorer').waitFor();
    assert.equal(await offlinePage.locator('.explore-result-group li').count(), 8);
    await offline.close();
    report.push({ chunkFailureRecovery: true, registration, visitedExplorerOfflineReload: true });
    fs.writeFileSync(`${output}/report.json`, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
