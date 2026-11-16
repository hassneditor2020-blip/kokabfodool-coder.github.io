const assert = require('node:assert/strict');
const {spawn} = require('node:child_process');
const fs = require('node:fs');
const {chromium} = require('playwright');

const origin = 'http://127.0.0.1:8778';
const root = process.env.FUDOOL_TEST_ROOT ?? '.';
const server = spawn('python3', ['-m', 'http.server', '8778', '--bind', '127.0.0.1', '--directory', root], {stdio: 'ignore'});
const videoRoute = '/series/arabic-letters/alif-lion/';
const guides = ['/learn/', '/learn/arabic-letters/', '/learn/arabic-vowels/', '/learn/early-math/',
  '/learn/english-for-kids/', '/learn/simple-science/', '/terms/', '/content-policy/', '/contact/', '/faq/'];

async function ready() {
  for (let i = 0; i < 30; i++) {
    try {
      if ((await fetch(origin)).ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw Error('Could not start the learning test server');
}

async function fits(page) {
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), page.url());
}

async function observe(browser, prefix) {
  const page = await browser.newPage({viewport: {width: 320, height: 844}, serviceWorkers: 'block'});
  const mediaHosts = [];
  const errors = [];
  page.on('request', r => { if (/youtube(?:-nocookie)?\.com|ytimg\.com/.test(new URL(r.url()).hostname)) mediaHosts.push(r.url()); });
  page.on('pageerror', error => errors.push(error.message));

  await page.goto(origin + prefix + '/');
  assert.equal(await page.locator('#latest-episodes .episode-card').count(), 4);
  assert.equal(await page.locator('#popular-episodes .episode-card').count(), 4);
  const bubble = page.locator('.download-app-bubble');
  assert.equal(await bubble.getAttribute('href'), '/downloads/apps/kawkab-fudool.apk');
  assert.equal(await bubble.evaluate(node => getComputedStyle(node).position), 'fixed');
  await page.locator('#popular-episodes').scrollIntoViewIfNeeded();
  assert(await bubble.isVisible());
  await fits(page);
  await page.goto(origin + prefix + videoRoute);
  assert(await page.locator('.episode-objectives').isVisible());
  assert(await page.locator('.video-cover').getAttribute('href').then(value => value.includes('youtube.com/')));
  assert.equal(mediaHosts.length, 0);
  const video = page.locator('[data-load-video]');
  if (await video.count()) {
    await page.route('https://www.youtube-nocookie.com/**', route => route.fulfill({status: 200, body: 'Player test'}));
    await video.click();
    await page.locator('[data-player] iframe').waitFor();
    assert.match(await page.locator('[data-player] iframe').getAttribute('src'), /^https:\/\/www\.youtube-nocookie\.com\/embed\//);
    await page.unrouteAll({behavior: 'wait'});
  }
  await fits(page);

  const guidePage = await browser.newPage({viewport: {width: 320, height: 844}});
  for (const route of guides) {
    const response = await guidePage.goto(origin + prefix + route);
    assert(response.ok(), route);
    assert.match(response.headers()['content-type'] ?? '', /text\/html/, route + ' did not return a page');
    const heading = guidePage.locator('main h1');
    await heading.waitFor({state: 'visible', timeout: 6000}).catch(async () => {
      throw Error(route + ' missing heading at ' + guidePage.url() + ': ' +
        (await response.body()).length + ' bytes, DOM ' + (await guidePage.content()).slice(0, 200));
    });
    await fits(guidePage);
  }
  await guidePage.close();

  await page.goto(origin + prefix + '/app/');
  assert.equal(await page.locator('.app-device-gallery img').count(), 3);
  for (const img of await page.locator('.app-device-gallery img').all()) {
    await img.scrollIntoViewIfNeeded();
    await img.evaluate(node => node.decode());
  }
  await fits(page);
  await page.setViewportSize({width: 1280, height: 900});
  await fits(page);

  await page.goto(origin + prefix + '/play-app/#v5-watch');
  for (const id of ['v5-latest', 'v5-popular']) {
    assert(await page.locator('#' + id).isVisible());
    assert.equal(await page.locator('#' + id + ' .v5-episode').count(), 4);
  }
  assert.deepEqual(errors, []);
  await page.close();

  const staticPage = await browser.newPage({javaScriptEnabled: false, viewport: {width: 390, height: 844}});
  await staticPage.goto(origin + prefix + '/games/robo-lab/');
  assert(await staticPage.locator('.play-guide').isVisible());
  assert.equal(await staticPage.locator('#game-levels').count(), 1);
  assert.equal(await staticPage.locator('.play-guide a[href="#game-levels"]').count(), 1);
  await fits(staticPage);
  await staticPage.close();
}

(async () => {
  let browser;
  try {
    await ready();
    assert(fs.existsSync(root + '/assets/learning-presence.css'));
    browser = await chromium.launch({headless: true, executablePath: process.env.FUDOOL_CHROMIUM});
    for (const prefix of ['', '/en']) {
      await observe(browser, prefix);
      console.log('PASS', prefix || '/ar', 'discovery pages, media privacy, app gallery, and static game guides');
    }
  } finally {
    await browser?.close();
    server.kill();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
