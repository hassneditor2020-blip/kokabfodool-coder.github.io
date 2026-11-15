const assert = require('node:assert/strict');
const {spawn} = require('node:child_process');
const fs = require('node:fs');
const {chromium} = require('playwright');

const origin = 'http://127.0.0.1:8766';
const server = spawn('python3', ['-m', 'http.server', '8766', '--bind', '127.0.0.1'], {stdio: 'ignore'});
const games = Object.fromEntries(fs.readdirSync('games', {withFileTypes: true})
  .filter(file => file.isDirectory()).map(file => {
    const html = fs.readFileSync(`games/${file.name}/index.html`, 'utf8');
    const data = html.match(/<script id="(?:game|drive|match)-data" type="application\/json">([\s\S]+?)<\/script>/);
    return [file.name, JSON.parse(data[1]).levels.length];
  }));

async function validateHomeCovers(browser, language, width) {
  const page = await browser.newPage({viewport: {width, height: 900}});
  const prefix = language === 'ar' ? '' : '/en';
  try {
    await page.goto(origin + prefix + '/', {waitUntil: 'domcontentloaded'});
    const covers = page.locator('#play .activity-card .fudool-world-cover');
    await covers.first().waitFor({state: 'visible'});
    assert.equal(await covers.count(), 20);
    const cards = await covers.evaluateAll(async thumbnails => {
      return Promise.all(thumbnails.map(async cover => {
        const scene = cover.querySelector('.world-cover-scene');
        const guide = cover.querySelector('.world-cover-guide');
        for (const image of [scene, guide]) image.loading = 'eager';
        await Promise.all([scene.decode(), guide.decode()]);
        const bounds = cover.getBoundingClientRect();
        const badge = guide.getBoundingClientRect();
        const card = cover.closest('.activity-card');
        const style = getComputedStyle(card);
        const innerWidth = card.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
        const fitted = Math.abs(bounds.width - innerWidth) < 2 &&
          Math.abs(bounds.width - bounds.height * 1.5) < 2 &&
          getComputedStyle(scene).objectFit === 'cover';
        const placed = getComputedStyle(guide).position === 'absolute' &&
          badge.left >= bounds.left && badge.right <= bounds.right &&
          badge.top >= bounds.top && badge.bottom <= bounds.bottom &&
          badge.width <= bounds.width * .25;
        return {id: card.dataset.gameId, fitted, placed};
      }));
    });
    assert.deepEqual(cards.filter(card => !card.fitted || !card.placed), [], 'Home covers ' + language + ' ' + width);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2));
    console.log('PASS home thumbnails', language, width, '20 full-width covers with inset character badges');
  } finally {
    await page.close();
  }
}

async function validateMaps(browser, language, width) {
  const page = await browser.newPage({viewport: {width, height: 844}});
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (response.url().startsWith(origin + '/assets/') && !response.ok()) {
      errors.push(response.status() + ' ' + response.url());
    }
  });
  await page.addInitScript(counts => {
    for (const [id, count] of Object.entries(counts)) {
      // The current app must open maps and rounds from existing V5 progress.
      localStorage.setItem('fudool-games-v1:' + id, JSON.stringify({scores: Array(count).fill(2)}));
    }
  }, games);
  const prefix = language === 'ar' ? '' : '/en';
  for (const [id, count] of Object.entries(games)) {
    await page.goto(origin + prefix + '/games/' + id + '/', {waitUntil: 'domcontentloaded'});
    await page.locator('[data-level-map]').waitFor({state: 'visible'});
    const cover = page.locator('.premium-game-heading .world-cover-scene');
    await cover.waitFor();
    await cover.evaluate(image => image.decode());
    assert.equal(await page.locator('.world-trail .game-level[data-reward-state=complete]').count(), count);
    await page.evaluate(({id, count}) => {
      const map = document.querySelector('[data-level-map]');
      const game = document.querySelector('.game-board:not(.game-levels):not(.game-result)');
      const fit = () => {
        if (document.documentElement.scrollWidth > window.innerWidth + 2) throw Error(id + ': overflow');
      };
      fit();
      for (let i = 0; i < count; i++) {
        map.querySelectorAll('.world-trail .game-level')[i].click();
        const label = game.querySelector('.game-progress').textContent;
        if (game.hidden || !label.includes(String(i + 1)) || /[\u0660-\u0669\u06f0-\u06f9]/.test(label)) {
          throw Error(id + ': level ' + (i + 1) + ' unavailable or numerals changed');
        }
        fit();
        game.querySelector('[data-level-menu]').click();
        if (map.hidden) throw Error(id + ': map unavailable');
      }
    }, {id, count});
    if (language === 'ar' && width === 390 && ['vowel-drive', 'robo-lab', 'fudool-shop'].includes(id)) {
      await page.screenshot({path: 'build/v6-screenshots/' + id + '-map.png'});
      await page.locator('.world-trail .game-level').first().click();
      await page.screenshot({path: 'build/v6-screenshots/' + id + '-play.png'});
    }
  }
  assert.deepEqual(errors, [], language + ' ' + width);
  await page.close();
  console.log('PASS', language, width, '20 games and 275 saved levels opened');
}

async function validateOffline(browser) {
  const context = await browser.newContext({viewport: {width: 390, height: 844}});
  const page = await context.newPage();
  await page.goto(origin + '/play-app/');
  const count = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    const channel = new MessageChannel();
    return await new Promise((resolve, reject) => {
      const deadline = setTimeout(() => reject(Error('Offline pack download timed out')), 90_000);
      channel.port1.onmessage = ({data}) => {
        if (data.type !== 'done' && data.type !== 'error') return;
        clearTimeout(deadline);
        channel.port1.close();
        if (data.type === 'done') resolve(data.info.files);
        else reject(Error(data.message));
      };
      registration.active.postMessage({type: 'download'}, [channel.port2]);
    });
  });
  assert.equal(count, JSON.parse(fs.readFileSync('offline-pack.json', 'utf8')).files.length);
  await context.setOffline(true);
  await page.reload();
  await page.locator('.v5-nav a[href="#v5-games"]').click();
  assert.equal(await page.locator('[data-app-games] .world-cover-scene').count(), 20);
  await page.locator('a.app-game-card[data-game-id="vowel-drive"]').click();
  await page.locator('.world-trail .game-level').first().click();
  const gate = page.locator('.drive-gate[data-vowel="0"]');
  const actualVowel = await page.evaluate(() => JSON.parse(document.querySelector('#drive-data').textContent).levels[0].rounds[0].vowel);
  assert.equal(actualVowel, 0);
  await gate.click();
  await page.locator('[data-drive-feedback][data-state="correct"]').waitFor();
  await page.locator('[data-drive-next]').click();
  assert(await page.locator('.game-progress').textContent().then(label => label.includes('الجولة 2')));
  await page.locator('.world-play-scenery').evaluate(image => image.decode());
  await page.screenshot({path: 'build/v6-screenshots/vowel-drive-offline.png'});
  await context.close();
  console.log('PASS offline play with packaged world artwork, sound dependencies and progress');
}

(async () => {
  let browser;
  try {
    assert.equal(Object.keys(games).length, 20);
    assert.equal(Object.values(games).reduce((total, count) => total + count, 0), 275);
    for (let i = 0; i < 30; i++) {
      try {
        if ((await fetch(origin)).ok) break;
      } catch {}
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    fs.mkdirSync('build/v6-screenshots', {recursive: true});
    browser = await chromium.launch({headless: true, executablePath: process.env.FUDOOL_CHROMIUM});
    for (const language of ['ar', 'en']) {
      await validateHomeCovers(browser, language, 390);
      await validateHomeCovers(browser, language, 1298);
      await validateMaps(browser, language, 390);
      await validateMaps(browser, language, 1280);
    }
    await validateOffline(browser);
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
