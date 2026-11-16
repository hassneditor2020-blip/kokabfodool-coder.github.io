const assert = require('node:assert/strict');
const fs = require('node:fs');
const {spawn} = require('node:child_process');
const {chromium} = require('playwright');

const root = process.env.FUDOOL_TEST_ROOT ?? '.';
const origin = 'http://127.0.0.1:8767';
const server = spawn('python3', ['-m', 'http.server', '8767', '--bind', '127.0.0.1', '--directory', root], {stdio: 'ignore'});
const entries = {'robo-lab': 15, memory: 13, 'fudool-shop': 18, 'code-robo': 22, puzzle: 12};
const controls = {
  next: '[data-next]',
  completed: '[data-level-result]:not([hidden])',
  feedback: '[data-feedback]',
};

async function start(page, prefix, id) {
  const level = entries[id];
  await page.goto(origin + prefix + '/games/' + id + '/?path=8-10&level=' + level);
  assert.match(await page.locator('.game-progress').textContent(), new RegExp(' ' + level + ' ·'));
  return await page.locator('#game-data').evaluate((data, level) => JSON.parse(data.textContent).levels[level - 1].rounds, level);
}

async function advance(page) {
  const button = page.locator(controls.next);
  assert(await button.isVisible());
  assert(await button.isEnabled());
  await button.click();
}

async function verifyCompleted(page, prefix, id, level = entries[id]) {
  assert(await page.locator(controls.completed).isVisible());
  const scores = await page.evaluate(id => JSON.parse(localStorage.getItem('fudool-games-v1:' + id)).scores, id);
  assert(scores[level - 1] > 0, 'Completing the new level must save stars');
  assert(scores.slice(0, entries[id] - 1).every(score => score === 2), 'Keep all previously earned stars');
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2),
    prefix + '/' + id + ' has horizontal overflow');
}

async function screenshot(page, prefix, name, locator) {
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), name + ' has horizontal overflow');
  await page.locator(locator).scrollIntoViewIfNeeded();
  await page.screenshot({path: 'build/v6-screenshots/challenge-' + name + (prefix ? '-en' : '-ar') + '.png'});
}

async function verifyMagnet(page, prefix) {
  const rounds = await start(page, prefix, 'robo-lab');
  for (const [index, task] of rounds.entries()) {
    const record = page.locator('[data-record-distance]');
    const test = page.locator('[data-test-distance]');
    const conclusion = page.locator('.magnet-conclusion');
    assert(await record.isDisabled());
    assert(await conclusion.isHidden());
    for (const i of [2, 0, 1]) {
      await page.locator('[data-distance="' + task.distances[i] + '"]').click();
      assert(await record.isDisabled());
      await test.click();
      assert.equal(await page.locator('.distance-clip[data-pulled="true"]').count(), task.results[i]);
      await record.click();
      assert(await record.isDisabled());
    }
    assert.deepEqual(await page.locator('.magnet-bench tbody td').allTextContents(), task.results.map(String));
    assert(await conclusion.isVisible());
    assert(await page.locator(controls.next).isHidden());
    if (index === 0) await screenshot(page, prefix, 'magnet', '.magnet-bench');
    await conclusion.locator('button').nth((task.answer + 1) % task.choices.length).click();
    assert.equal(await page.locator(controls.feedback).getAttribute('data-state'), 'wrong');
    await conclusion.locator('button').nth(task.answer).click();
    assert.equal(await page.locator(controls.feedback).textContent(), task.explanation);
    await advance(page);
  }
  await verifyCompleted(page, prefix, 'robo-lab');
}

async function verifyMemory(page, prefix) {
  const words = await start(page, prefix, 'memory');
  const cards = page.locator('.extra-memory-card');
  const grid = page.locator('.discovery-memory');
  const next = page.locator(controls.next);
  const enterMatch = () => page.locator('.memory-start').click();
  const find = (id, face) => cards.locator('xpath=self::*[@data-pair="' + id + '" and @data-face="' + face + '"]');
  async function matchRound(pairs, type) {
    const started = await grid.locator('[data-matched="true"]').count() / 2;
    for (const [index, pair] of pairs.entries()) {
      await find(pair.id, 'picture').click();
      assert(await next.isDisabled());
      await find(pair.id, type).click();
      assert.equal(await grid.locator('[data-matched="true"]').count(), (index + 1 + started) * 2);
    }
    assert.equal(await grid.getAttribute('data-memory-phase'), 'complete');
    await advance(page);
  }
  for (const [index, task] of words.entries()) {
    assert.equal(await grid.getAttribute('data-memory-phase'), 'preview');
    const face = task.match === 'relation' ? 'relation' : 'word';
    assert.equal(await grid.locator('[data-face="' + face + '"] .memory-face:not([hidden])').count(), task.pairs.length);
    assert.equal(await grid.locator('[data-face="picture"] .memory-illustration:not([hidden])').count(), task.pairs.length);
    if (!index) await screenshot(page, prefix, 'memory-words', '.discovery-memory');
    await enterMatch();
    assert.equal(await grid.locator('.memory-face:not([hidden])').count(), 0);
    if (!index) {
      await find(task.pairs[0].id, 'picture').click();
      await find(task.pairs[1].id, 'word').click();
      assert.equal(await page.locator(controls.feedback).getAttribute('data-state'), 'wrong');
      assert(await next.isDisabled());
      await grid.locator('.extra-memory-card.revealed').first().waitFor({state: 'hidden'});
    }
    await matchRound(task.pairs, face);
  }
  await verifyCompleted(page, prefix, 'memory');
  await page.locator('[data-level-next]').click();
  assert.match(await page.locator('.game-progress').textContent(), / 14 ·/);
  const sounds = await page.locator('#game-data').evaluate(data => JSON.parse(data.textContent).levels[13].rounds);
  for (const [index, task] of sounds.entries()) {
    const pair = task.pairs[0];
    const audioStarted = page.waitForResponse(response => response.url().endsWith(pair.audio) && response.ok());
    await find(pair.id, 'sound').click();
    await audioStarted;
    await page.waitForFunction(src => window.lastMemorySound?.endsWith(src), pair.audio);
    if (!index) await screenshot(page, prefix, 'memory-sounds', '.discovery-memory');
    await enterMatch();
    assert.equal(await grid.locator('.memory-face:not([hidden])').count(), 0);
    if (!index) {
      await find(pair.id, 'sound').click();
      assert(await next.isDisabled());
      await find(pair.id, 'picture').click();
      assert.equal(await grid.locator('[data-matched="true"]').count(), 2);
      await matchRound(task.pairs.slice(1), 'sound');
    } else {
      await matchRound(task.pairs, 'sound');
    }
  }
  await verifyCompleted(page, prefix, 'memory', 14);
}

async function verifyShop(page, prefix) {
  const rounds = await start(page, prefix, 'fudool-shop');
  for (const [index, task] of rounds.entries()) {
    const total = task.items.reduce((sum, {price, quantity}) => sum + price * quantity, 0);
    const prices = task.offers.map(offer => total - (offer.amount ?? total * offer.percent / 100));
    const best = prices.indexOf(Math.min(...prices));
    const change = task.budget - prices[best];
    const receipt = page.locator('.purchase-receipt');
    const deals = page.locator('[data-purchase-offer]');
    await deals.nth(1 - best).click();
    assert.equal(await page.locator(controls.feedback).getAttribute('data-state'), 'wrong');
    assert.equal(await receipt.count(), 0);
    await deals.nth(best).click();
    assert(await receipt.isVisible());
    assert.equal(await receipt.locator('.market-line').count(), task.items.length + 4);
    assert.equal(Number.parseInt((await receipt.locator('.market-line strong').allTextContents()).at(-2)), prices[best]);
    assert(await page.locator(controls.next).isHidden());
    if (!index) await screenshot(page, prefix, 'shop', '.purchase-receipt');
    await page.locator('[data-purchase-change]:not([data-purchase-change="' + change + '"])').first().click();
    assert.equal(await page.locator(controls.feedback).getAttribute('data-state'), 'wrong');
    await page.locator('[data-purchase-change="' + change + '"]').click();
    assert.equal(Number.parseInt(await receipt.locator('.market-total strong').last().textContent()), change);
    await advance(page);
  }
  await verifyCompleted(page, prefix, 'fudool-shop');
}

async function verifyDebugging(page, prefix) {
  const rounds = await start(page, prefix, 'code-robo');
  const step = page.locator('[data-code-step]');
  const grid = page.locator('.code-grid');
  const reset = page.locator('[data-code-reset]');
  const directions = {'0,-1': 'U', '0,1': 'D', '-1,0': 'L', '1,0': 'R'};
  for (const [index, task] of rounds.entries()) {
    assert(await page.locator('.code-keypad [data-command]').first().isDisabled());
    assert.equal(await grid.getAttribute('data-robo-position'), task.path[0].join(','));
    for (let i = 0; i < task.program.length && await step.isEnabled(); i++) await step.click();
    assert(await step.isDisabled());
    assert(await page.locator(controls.next).isHidden());
    const expected = task.path.slice(1).map(([x, y], i) =>
      directions[[x - task.path[i][0], y - task.path[i][1]].join(',')]);
    const fault = expected.findIndex((command, i) => command !== task.program[i]);
    if (index !== 1) assert(await page.locator('[data-edit-command="' + fault + '"][data-fault="true"]').isVisible());
    if (!index) await screenshot(page, prefix, 'debugging', '.code-program');
    await page.locator('[data-edit-command="' + fault + '"]').click();
    await page.locator('.code-keypad [data-command="' + expected[fault] + '"]').click();
    assert.equal(await page.locator('[data-changed="true"]').count(), 1);
    await step.click();
    await reset.click();
    assert.equal(await grid.getAttribute('data-robo-position'), task.path[0].join(','));
    assert.equal(await page.locator('[data-changed="true"]').count(), 1);
    for (let i = 0; i < task.program.length; i++) await step.click();
    assert.equal(await grid.getAttribute('data-robo-position'), task.path.at(-1).join(','));
    assert(await step.isDisabled());
    await advance(page);
  }
  await verifyCompleted(page, prefix, 'code-robo');
}

async function verifyRotation(page, prefix) {
  const rounds = await start(page, prefix, 'puzzle');
  const rotate = page.locator('[data-rotate-piece]');
  const grid = page.locator('.discovery-puzzle');
  const tileAt = slot => grid.locator('[data-slot="' + slot + '"]');
  for (const [index, task] of rounds.entries()) {
    const count = task.cols * task.rows;
    assert(await rotate.isDisabled());
    assert.equal(await grid.locator('.puzzle-piece-art').count(), count);
    if (!index) await screenshot(page, prefix, 'puzzle', '.discovery-puzzle');
    for (let slot = 0; slot < count; slot++) {
      if (await tileAt(slot).getAttribute('data-piece') === String(slot)) continue;
      const destination = grid.locator('[data-piece="' + slot + '"]');
      const angle = await destination.getAttribute('data-rotation');
      await tileAt(slot).click();
      await destination.click();
      assert.equal(await tileAt(slot).getAttribute('data-piece'), String(slot));
      assert.equal(await tileAt(slot).getAttribute('data-rotation'), angle);
    }
    assert(await page.locator(controls.next).isHidden(), 'Positions alone cannot complete a rotating puzzle');
    for (let slot = 0; slot < count; slot++) {
      const tile = tileAt(slot);
      const angle = Number(await tile.getAttribute('data-rotation'));
      if (!angle) continue;
      await tile.click();
      for (let degrees = angle; degrees < 360; degrees += 90) await rotate.click();
      assert.equal(await tile.getAttribute('data-placed'), 'true');
      if (!await tile.isDisabled()) await tile.click();
    }
    assert.equal(await grid.locator('[data-placed="true"]').count(), count);
    await advance(page);
  }
  await verifyCompleted(page, prefix, 'puzzle');
}

(async () => {
  let browser;
  try {
    for (let attempt = 0; attempt < 30; attempt++) {
      try { if ((await fetch(origin)).ok) break; } catch {}
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    fs.mkdirSync('build/v6-screenshots', {recursive: true});
    browser = await chromium.launch({headless: true, executablePath: process.env.FUDOOL_CHROMIUM});
    for (const prefix of ['', '/en']) {
      const mobile = !prefix || root !== '.';
      const page = await browser.newPage({
        viewport: {width: mobile ? 360 : 1280, height: 850},
        hasTouch: mobile,
        userAgent: mobile ? 'Mozilla/5.0 Mobile FudoolAndroidUnified' : undefined,
        reducedMotion: 'reduce',
      });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('response', response => {
        if (response.url().startsWith(origin + '/assets/') && response.status() >= 400) errors.push(response.status() + ' ' + response.url());
      });
      await page.addInitScript(entries => {
        for (const [id, first] of Object.entries(entries)) {
          const key = 'fudool-games-v1:' + id;
          if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({scores: Array(first - 1).fill(2)}));
        }
        const play = HTMLMediaElement.prototype.play;
        HTMLMediaElement.prototype.play = function () {
          if (this.src.includes('/real-sounds/')) {
            this.addEventListener('playing', () => { window.lastMemorySound = this.currentSrc; }, {once: true});
          }
          return play.call(this);
        };
      }, entries);
      try {
        for (const test of [verifyMagnet, verifyMemory, verifyShop, verifyDebugging, verifyRotation]) await test(page, prefix);
        assert.deepEqual(errors, []);
        console.log('PASS', root === '.' ? 'website' : 'bundled Android assets', prefix || 'ar',
          'magnet, word and sound memory, receipt, debugging, rotation and saved progress');
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser?.close();
    server.kill();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
