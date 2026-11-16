const assert = require('node:assert/strict');
const fs = require('node:fs');
const {spawn} = require('node:child_process');
const {chromium} = require('playwright');

const root = process.env.FUDOOL_TEST_ROOT ?? '.';
const origin = 'http://127.0.0.1:8766';
const server = spawn('python3', ['-m', 'http.server', '8766', '--bind', '127.0.0.1', '--directory', root], {stdio: 'ignore'});

async function open(page, prefix, id, age, level, round = 0) {
  await page.evaluate(({id, level, round}) => {
    const scores = Array.from({length: level}, (_, index) => index === level - 1 ? 0 : 3);
    const checkpoints = {[level - 1]: {round, mistakes: 0}};
    localStorage.setItem('fudool-games-v1:' + id, JSON.stringify({scores, checkpoints}));
  }, {id, level, round});
  await page.goto(origin + prefix + '/games/' + id + '/?path=' + age + '&level=' + level);
  const progress = page.locator('[data-game]:not([hidden]) .game-progress, [data-drive]:not([hidden]) .game-progress');
  assert.match(await progress.textContent(), new RegExp(' ' + level + ' ·'));
}

async function audio(page, trigger, file, rate = 1) {
  await trigger.click();
  await page.waitForFunction(({file, rate}) =>
    window.gameAudio.some(track => track.src.endsWith(file) && track.rate === rate), {file, rate});
}

async function capture(page, prefix, slug, selector) {
  await page.locator(selector).scrollIntoViewIfNeeded();
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), slug + ' mobile overflow');
  await page.screenshot({path: 'build/v6-screenshots/v65-' + slug + (prefix ? '-en' : '-ar') + '.png'});
}

async function verifyIce(page, prefix, fair) {
  const lab = page.locator('.ice-bench');
  const start = lab.locator('[data-ice-start]');
  const next = page.locator('[data-next]');
  assert(await start.isDisabled());
  assert.equal(await lab.locator('.ice-cup').count(), 2);
  if (fair) {
    const effects = page.locator('[data-game-sound]');
    if (await effects.getAttribute('aria-pressed') === 'true') await effects.click();
    await audio(page, lab.locator('.game-instruction'), 'ice-' + (prefix ? 'en' : 'ar') + '.mp3');
    assert.equal(await effects.getAttribute('aria-pressed'), 'false');
    await effects.click();
  }
  for (let i = 0; i < 2; i++) await lab.locator('[data-ice-add="' + i + '"]').click();
  await lab.locator('[data-ice-prediction="0"]').click();
  if (fair) {
    await start.click();
    assert(await lab.locator('.ice-values').isHidden());
    assert.match(await lab.locator('.ice-status').textContent(), /ساوِ|equal amounts/);
    await lab.locator('.ice-cup[data-temperature="warm"] .ice-control').first().click();
  }
  await start.click();
  const answers = page.locator('.ice-conclusion button');
  await answers.first().waitFor();
  assert.equal(await lab.locator('[data-melted=true]').count(), 2);
  assert.deepEqual((await lab.locator('.ice-values strong').allTextContents()).map(value => parseInt(value, 10)), [6, 3]);
  if (fair) await capture(page, prefix, 'ice', '.ice-bench');
  await answers.nth(1).click();
  assert(await next.isVisible());
  await next.click();
}

async function verifyDrive(page, prefix) {
  await open(page, prefix, 'vowel-drive', '6-7', 4, 2);
  const scene = page.locator('[data-drive-scene]');
  assert(await page.locator('#drive-prompt mark').isVisible());
  assert.match(await page.locator('[data-drive-prompt]').textContent(), /الناقصة|missing/);
  const round = await page.locator('#drive-data').evaluate(data => JSON.parse(data.textContent).levels[3].rounds[2]);
  const gate = scene.locator('.drive-gate[data-vowel="' + round.vowel + '"]');
  await gate.click();
  await page.waitForFunction(() => {
    const gate = document.querySelector('.drive-gate[data-result=correct]');
    const car = document.querySelector('.drive-car');
    if (!gate) return false;
    const a = gate.getBoundingClientRect();
    const b = car.getBoundingClientRect();
    return b.left >= a.left && b.right <= a.right && b.top >= a.top && b.bottom <= a.bottom;
  });
  assert(await page.locator('[data-drive-next]').isVisible());
  await capture(page, prefix, 'drive', '.drive-scene');
}

async function verifyWriting(page, prefix) {
  await open(page, prefix, 'trace', '3-5', 1);
  assert(await page.locator('.trace-start-marker').isVisible());
  await open(page, prefix, 'trace', '8-10', 11);
  const review = page.locator('.trace-review');
  assert(await review.isHidden());
  assert.equal(await page.locator('.trace-model').count(), 0);
  await audio(page, page.locator('.trace-slow'), '/arabic-words/jamal.mp3', .72);
  const ink = page.locator('.trace-ink');
  await ink.click({position: {x: 20, y: 20}});
  await page.locator('.trace-actions .button-primary').click();
  assert(await review.isVisible());
  assert.equal(await page.locator('.trace-assessment').getAttribute('data-result'), 'retry');
  const annotated = await review.evaluate(canvas => {
    const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
    return pixels.some((value, i) => i % 4 === 0 && value === 188 && pixels[i + 1] === 68);
  });
  assert(annotated);
  await capture(page, prefix, 'writing', '.trace-studio');
  await page.locator('.trace-actions .button-white').last().click();
  assert(await review.isHidden());
}

async function verifyMemory(page, prefix) {
  await open(page, prefix, 'memory', '8-10', 13, 2);
  const grid = page.locator('.discovery-memory');
  assert.equal(await grid.locator('.memory-relation').count(), 4);
  assert.equal(await grid.locator('.memory-face:not([hidden])').count(), 8);
  await page.locator('.memory-timed').click();
  assert(await page.locator('.memory-countdown').isVisible());
  assert(await page.locator('.memory-countdown progress').evaluate(meter => meter.value > 0));
  await capture(page, prefix, 'memory', '.discovery-memory');
  await page.locator('.memory-start').click();
  assert.equal(await grid.locator('.memory-face:not([hidden])').count(), 0);
  const pairs = await grid.locator('[data-face=picture]').evaluateAll(cards => cards.map(card => card.dataset.pair));
  for (const pair of pairs) {
    for (const face of ['picture', 'relation']) {
      await grid.locator('[data-pair="' + pair + '"][data-face="' + face + '"]').click();
    }
  }
  assert(await page.locator('[data-next]').isEnabled());
  assert.equal(await grid.locator('[data-matched=true]').count(), 8);
}

async function verifyShop(page, prefix) {
  await open(page, prefix, 'fudool-shop', '6-7', 1);
  await audio(page, page.locator('.market-voice-controls button').first(), 'shop-' + (prefix ? 'en' : 'ar') + '.mp3');
  await page.locator('.market-voice-controls button').last().click();
  await page.waitForFunction(() => window.orderParts >= 2);
  const unit = page.locator('.market-coin[data-coin="1"]');
  assert(await unit.isDisabled());
  await page.locator('[data-basket-item="0"]').click();
  for (let i = 0; i < 3; i++) await unit.click();
  await page.locator('.market-actions .button-primary').click();
  assert(await page.locator('[data-next]').isVisible());
  await open(page, prefix, 'fudool-shop', '8-10', 17, 3);
  const price = page.locator('[data-receipt-item="2"] strong');
  assert.equal(await price.textContent(), '9');
  await page.locator('[data-receipt-item="0"]').click();
  assert(await page.locator('[data-next]').isHidden());
  await page.locator('[data-receipt-item="2"]').click();
  assert.equal(await price.textContent(), '7');
  assert(await page.locator('[data-next]').isVisible());
  await capture(page, prefix, 'receipt', '.audit-rows');
}

async function verifySpace(page, prefix) {
  await open(page, prefix, 'space-journey', '8-10', 16, 2);
  const board = page.locator('.mission-board');
  await audio(page, board.locator('.game-instruction'), 'space-' + (prefix ? 'en' : 'ar') + '.mp3');
  const launch = page.locator('.mission-launch');
  assert(await launch.isDisabled());
  assert(await board.locator('.mission-probe [data-atlas]').evaluate(sprite => sprite.getBoundingClientRect().height >= 20));
  for (const wrong of [1, 2]) {
    await page.locator('[data-mission-route="' + wrong + '"]').click();
    await launch.click();
    assert(await launch.isEnabled());
    assert(await page.locator('[data-next]').isHidden());
  }
  await page.locator('[data-mission-route="0"]').click();
  await launch.click();
  await page.locator('.mission-map[data-arrived=true]').waitFor();
  assert(await page.locator('[data-next]').isVisible());
  await capture(page, prefix, 'mission', '.mission-board');
}

async function ready() {
  for (let i = 0; i < 30; i++) {
    try {
      if ((await fetch(origin)).ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw Error('Could not start the game test server');
}

(async () => {
  let browser;
  try {
    await ready();
    fs.mkdirSync('build/v6-screenshots', {recursive: true});
    browser = await chromium.launch({headless: true, executablePath: process.env.FUDOOL_CHROMIUM});
    for (const prefix of ['', '/en']) {
      const page = await browser.newPage({viewport: {width: prefix ? 1280 : 320, height: 844}, reducedMotion: 'reduce'});
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.addInitScript(() => {
        window.gameAudio = [];
        window.orderParts = 0;
        const start = AudioBufferSourceNode.prototype.start;
        AudioBufferSourceNode.prototype.start = function (when, offset, duration) {
          if (Number.isFinite(duration) && duration > 0) window.orderParts++;
          return start.call(this, when, offset, duration);
        };
        const play = HTMLMediaElement.prototype.play;
        HTMLMediaElement.prototype.play = function () {
          return play.call(this).then(() => window.gameAudio.push({src: this.src, rate: this.playbackRate}));
        };
      });
      await page.goto(origin + prefix + '/');
      await open(page, prefix, 'robo-lab', '6-7', 4, 3);
      await verifyIce(page, prefix, false);
      await open(page, prefix, 'robo-lab', '8-10', 11, 1);
      await verifyIce(page, prefix, true);
      await verifyDrive(page, prefix);
      await verifyWriting(page, prefix);
      await verifyMemory(page, prefix);
      await verifyShop(page, prefix);
      await verifySpace(page, prefix);
      assert.deepEqual(errors, []);
      console.log('PASS', prefix || '/ar', 'ice, steering, dictation review, timed and related memory, shop, and space missions');
      await page.close();
    }
  } finally {
    await browser?.close();
    server.kill();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
