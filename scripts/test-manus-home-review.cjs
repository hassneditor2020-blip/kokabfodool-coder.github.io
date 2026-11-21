/* Homepage experiment regression checks. Run from the repository root with Playwright installed. */
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { setTimeout: wait } = require('node:timers/promises');
const { chromium } = require('playwright');

const port = 8793;
const root = `http://127.0.0.1:${port}`;
const server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { stdio: 'ignore' });
const games = [
  'vowel-drive', 'letter-match', 'letter-hunt', 'counting', 'english-abc',
  'memory', 'trace', 'robo-lab', 'puzzle', 'sound-quiz', 'fudool-shop',
  'word-factory', 'lumaa-clock', 'code-robo', 'world-mishaal',
  'planet-engineer', 'healthy-hero', 'space-journey', 'spot-differences', 'grand-challenge',
];

(async () => {
  let browser;
  try {
    for (let attempt = 0; attempt < 50; attempt++) {
      if (await fetch(root).then(response => response.ok).catch(() => false)) break;
      await wait(100);
    }
    const executablePath = process.env.CHROMIUM_PATH || undefined;
    browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
    for (const width of [320, 375, 768, 1024, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      const page = await context.newPage();
      const pageErrors = [];
      page.on('pageerror', error => pageErrors.push(error.message));
      await page.goto(root, { waitUntil: 'networkidle' });
      await page.locator('#play .premium-library-card').first().waitFor();
      assert.deepEqual(await page.locator('#play .activity-card').evaluateAll(cards => cards.map(card => card.dataset.gameId)), games);
      for (const game of games) {
        const card = page.locator(`#play .activity-card[data-game-id="${game}"]`);
        assert(await card.isVisible(), `${game} is visible at ${width}`);
        assert.equal(await card.getAttribute('href'), `/games/${game}/`);
      }
      assert.equal(await page.locator('.home-discover-link').count(), 4);
      assert.equal(await page.locator('.fudool-pages-promo a').getAttribute('href'), '/stories/');
      assert(await page.locator('.home-play-button').isVisible());
      assert(await page.locator('.hero-cutout img').evaluate(img => img.complete && img.naturalWidth > 0));
      assert.equal(await page.locator('.download-app-bubble').evaluate(el => getComputedStyle(el).position), 'static');
      const parentLink = page.locator('.home-discover-link[href="/grown-ups/"]');
      await parentLink.focus();
      assert(await parentLink.evaluate(el => {
        el.scrollIntoView({ block: 'center' });
        const rect = el.getBoundingClientRect();
        const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
        return hit === el || el.contains(hit);
      }), `parent shortcut is not covered at ${width}`);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `no horizontal page overflow at ${width}`);
      if (width < 800) {
        await page.locator('.mobile-nav summary').click();
        assert(await page.locator('.mobile-nav nav a[href="/stories/"]').isVisible());
        await page.locator('.mobile-nav summary').click();
      }
      assert.deepEqual(pageErrors, [], `no JavaScript errors at ${width}`);
      await context.close();
      console.log(`PASS homepage content, responsive layout and navigation: ${width}px`);
    }
    const gamesContext = await browser.newContext({ viewport: { width: 375, height: 812 } });
    const gamePage = await gamesContext.newPage();
    for (const game of games) {
      const errors = [];
      const onError = error => errors.push(error.message);
      gamePage.on('pageerror', onError);
      const response = await gamePage.goto(`${root}/games/${game}/`, { waitUntil: 'domcontentloaded' });
      assert.equal(response.status(), 200, `${game} loads`);
      await gamePage.locator('[data-level-map]').waitFor({ state: 'visible' });
      await gamePage.locator('[data-level-list] .game-level:not(:disabled)').first().click();
      assert.equal(await gamePage.locator('[data-level-map]').isVisible(), false, `${game} starts a level`);
      assert.deepEqual(errors, [], `no JavaScript errors while starting ${game}`);
      gamePage.off('pageerror', onError);
    }
    await gamesContext.close();
    console.log('PASS first level starts in all 20 games');
    const context = await browser.newContext({ viewport: { width: 375, height: 812 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.addInitScript(() => localStorage.setItem('fudool-games-v1:vowel-drive', JSON.stringify({ scores: [3], checkpoints: {}, lastPlayed: 12345, lastLevel: 0 })));
    await page.goto(root, { waitUntil: 'networkidle' });
    const resume = page.locator('[data-home-resume]');
    await resume.waitFor({ state: 'visible' });
    assert((await resume.innerText()).includes('سيارة الحركات'));
    assert((await resume.locator('[data-resume-link]').getAttribute('href')).includes('/games/vowel-drive/?continue=1'));
    await resume.locator('[data-resume-link]').click();
    await page.waitForURL('**/games/vowel-drive/?continue=1');
    assert(await page.locator('[data-drive]').isVisible());
    console.log('PASS saved game resume');
    await page.goto(root);
    await page.locator('.fudool-pages-promo a').click();
    await page.getByRole('link', { name: 'مشعال والبالون الأزرق', exact: true }).click();
    await page.getByText('1/6', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'التالي', exact: true }).click();
    await page.getByText('2/6', { exact: true }).waitFor();
    console.log('PASS story navigation and reader');
    await context.close();
    if (process.env.TEST_OFFLINE === '1') {
      const offlineContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const offlinePage = await offlineContext.newPage();
      await offlinePage.goto(root, { waitUntil: 'networkidle' });
      const pack = await offlinePage.evaluate(async () => {
        const registration = await navigator.serviceWorker.ready;
        return new Promise((resolve, reject) => {
          const channel = new MessageChannel();
          const timer = setTimeout(() => reject(new Error('offline pack download timed out')), 180000);
          channel.port1.onmessage = ({ data }) => {
            if (data.type === 'done') { clearTimeout(timer); resolve(data.info); }
            if (data.type === 'error') { clearTimeout(timer); reject(new Error(data.message)); }
          };
          registration.active.postMessage({ type: 'download' }, [channel.port2]);
        });
      });
      assert(pack.version.startsWith('manus-ui-'));
      await offlineContext.setOffline(true);
      await offlinePage.goto(root, { waitUntil: 'domcontentloaded' });
      await offlinePage.locator('#play .premium-library-card').first().waitFor();
      assert.equal(await offlinePage.locator('#play .activity-card').count(), 20);
      assert(await offlinePage.evaluate(() => [...document.styleSheets].some(sheet => sheet.href?.includes('home-manus-experiment'))));
      assert(await offlinePage.locator('.pwa-offline-notice').isVisible());
      await offlineContext.close();
      console.log('PASS offline homepage with experiment stylesheet and all game links');
    }
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
