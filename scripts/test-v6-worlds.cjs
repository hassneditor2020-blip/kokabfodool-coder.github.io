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
        const ordered = ['h3', '.round-arrow'].every(selector =>
          card.querySelector(selector).getBoundingClientRect().top >= bounds.bottom - 1);
        return {id: card.dataset.gameId, fitted, placed, ordered};
      }));
    });
    assert.deepEqual(cards.filter(card => !card.fitted || !card.placed || !card.ordered), [], 'Home covers ' + language + ' ' + width);
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

async function validateDriving(browser, language) {
  const mobile = language === 'ar';
  const page = await browser.newPage({viewport: {width: mobile ? 390 : 1280, height: 844}, hasTouch: mobile});
  const prefix = mobile ? '' : '/en';
  try {
    await page.goto(origin + prefix + '/games/vowel-drive/');
    await page.locator('.world-trail .game-level').first().click();
    const road = page.locator('.drive-road');
    const scene = page.locator('[data-drive-scene]');
    const launch = page.locator('[data-drive-launch]');
    const feedback = page.locator('[data-drive-feedback]');
    const correct = await page.locator('.drive-gate[data-vowel="0"]').evaluate(gate =>
      Array.from(gate.parentElement.children).indexOf(gate));
    const wrong = correct === 0 ? 2 : 0;
    const session = mobile ? await page.context().newCDPSession(page) : null;

    async function drag(from, to) {
      await road.scrollIntoViewIfNeeded();
      const box = await road.boundingBox();
      const x = lane => box.x + box.width * [.21, .5, .79][lane];
      const y = box.y + box.height * .72;
      if (session) {
        await session.send('Input.dispatchTouchEvent', {type: 'touchStart', touchPoints: [{x: x(from), y, id: 1}]});
        await session.send('Input.dispatchTouchEvent', {type: 'touchMove', touchPoints: [{x: x(to), y, id: 1}]});
        await session.send('Input.dispatchTouchEvent', {type: 'touchEnd', touchPoints: []});
      } else {
        await page.mouse.move(x(from), y);
        await page.mouse.down();
        await page.mouse.move(x(to), y, {steps: 6});
        await page.mouse.up();
      }
      await page.waitForFunction(lane => document.querySelector('[data-drive-scene]').dataset.lane === String(lane), to);
      assert.equal(await scene.getAttribute('data-steering'), null);
    }

    await drag(1, wrong);
    assert.equal(await feedback.getAttribute('data-state'), null);
    await launch.click();
    await page.locator('[data-drive-feedback][data-state="wrong"]').waitFor();
    await drag(wrong, correct);
    if (!mobile) {
      await launch.focus();
      const step = correct === 2 ? 'ArrowLeft' : 'ArrowRight';
      await page.keyboard.press(step);
      assert.notEqual(await scene.getAttribute('data-lane'), String(correct));
      await page.keyboard.press(step === 'ArrowLeft' ? 'ArrowRight' : 'ArrowLeft');
      assert.equal(await scene.getAttribute('data-lane'), String(correct));
    }
    await launch.click();
    await page.locator('[data-drive-feedback][data-state="correct"]').waitFor();
    assert(await launch.isDisabled());
    await page.locator('[data-drive-next]').click();
    assert.equal(await scene.getAttribute('data-lane'), '1');
    assert(await launch.isEnabled());
    console.log('PASS V6.1 driving', language, mobile ? 'touch' : 'mouse and keyboard');
  } finally {
    await page.close();
  }
}

async function validateRobo(page, language) {
  const prefix = language === 'ar' ? '' : '/en';
  await page.goto(origin + prefix + '/games/robo-lab/');
  const map = page.locator('[data-level-map]');
  await map.waitFor({state: 'visible'});
  await map.locator('.robo-experiments summary').click();
  await page.locator('[data-robo-prediction="purple"]').click();
  const mix = page.locator('[data-robo-mix]');
  assert(await mix.isDisabled());
  await page.locator('[data-robo-add="yellow"]').click();
  assert(await mix.isDisabled());
  await page.locator('[data-robo-add="blue"]').click();
  await page.locator('.robo-beaker[data-fill="both"]').waitFor();
  const nav = page.locator('.pwa-bottom-nav');
  if (await nav.isVisible()) {
    const [control, footer] = await Promise.all([mix.boundingBox(), nav.boundingBox()]);
    assert(control.y + control.height <= footer.y, 'The Android navigation must not cover Mix');
  }
  await mix.click();
  await page.locator('.robo-beaker[data-fill="green"]').waitFor();
  assert.match(await page.locator('.robo-observation').textContent(), language === 'ar' ? /الأخضر/ : /green/);
  const retry = page.locator('[data-robo-bench] .button-white');
  await retry.click();
  await page.locator('[data-robo-prediction="green"]').waitFor();

  await page.locator('[data-robo-experiment="magnet"]').click();
  await page.locator('[data-robo-prediction="wood"]').click();
  for (const [id, attracted] of [['plastic', false], ['iron', true], ['wood', false]]) {
    const piece = page.locator('[data-robo-material="' + id + '"]');
    await piece.click();
    assert.equal(await piece.getAttribute('data-attracted'), String(attracted));
  }
  await page.locator('.robo-recap').waitFor({state: 'visible'});
  assert(await map.locator('.game-level').nth(1).isDisabled());
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2));
}

async function validateAgePaths(browser, language) {
  const arabic = language === 'ar';
  const prefix = arabic ? '' : '/en';
  const page = await browser.newPage({viewport: {width: arabic ? 320 : 1280, height: 844}});
  const drive = origin + prefix + '/games/vowel-drive/';
  const lab = origin + prefix + '/games/robo-lab/';
  const stateKey = 'fudool-profile-v1:p-older:game:vowel-drive';
  const map = page.locator('[data-level-map]');
  const choice = map.locator('[data-game-paths]');
  const play = choice.locator('[data-path-play]');
  const label = page.locator('.game-progress');
  const levelButton = number => map.locator('[data-level-number="' + number + '"]');
  const gameLevel = number => arabic ? new RegExp('المستوى ' + number + ' ·') : new RegExp('Level ' + number + ' ·');
  const state = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), stateKey);
  async function expectPlay(number) {
    await play.waitFor({state: 'visible'});
    assert.match(await play.textContent(), new RegExp(' ' + number + '$'));
  }
  async function answerDrive(index) {
    const rounds = await page.locator('#drive-data').evaluate((source, level) =>
      JSON.parse(source.textContent).levels[level - 1].rounds, index);
    for (const {vowel} of rounds) {
      await page.locator('.drive-gate[data-vowel="' + vowel + '"]').click();
      await page.locator('[data-drive-next]').click();
    }
  }

  try {
    await page.goto(origin + prefix + '/play-app/');
    await page.evaluate(() => {
      localStorage.setItem('fudool-profiles-v1', JSON.stringify([
        {id: 'p-older', name: 'Older', avatar: 'robot', age: '8-10'},
        {id: 'p-younger', name: 'Younger', avatar: 'lumaa', age: '3-5'},
      ]));
      localStorage.setItem('fudool-active-profile-v1', 'p-older');
    });
    await page.goto(origin + prefix + '/games/?age=8-10');
    const ageLink = page.locator('.age-journey-card[data-game-id="vowel-drive"] .age-journey-link');
    const target = new URL(await ageLink.getAttribute('href'));
    assert.equal(target.searchParams.get('level'), '11');
    assert.equal(target.searchParams.get('path'), '8-10');
    await ageLink.click();
    await label.waitFor({state: 'visible'});
    assert.match(await label.textContent(), gameLevel(11));

    await page.locator('[data-drive] [data-level-menu]').click();
    await expectPlay(11);
    assert(await levelButton(11).isEnabled());
    assert(await levelButton(12).isDisabled());
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2));
    assert((await state()).scores.every(score => score === 0));
    await page.goto(drive + '?path=8-10&level=13');
    await expectPlay(11);
    await choice.locator('[data-path-action="easier"]').click();
    await expectPlay(4);
    assert.equal(await choice.getAttribute('data-game-paths'), '6-7');
    await page.reload();
    await expectPlay(4);
    await page.goto(lab);
    await expectPlay(7);
    await page.evaluate(() => {
      const levels = JSON.parse(document.querySelector('#game-data').textContent).levels;
      const round = levels[6].rounds.findIndex(question => question.explanation);
      localStorage.setItem('fudool-profile-v1:p-older:game:robo-lab',
        JSON.stringify({checkpoints: {6: {round, mistakes: 0}}}));
    });
    await play.click();
    assert.match(await page.locator('[data-prompt]').textContent(), arabic ? /تتوقّع/ : /predict/i);
    await page.locator('[data-options] button[aria-label="👃"]').click();
    assert.match(await page.locator('[data-feedback]').textContent(),
      arabic ? /يساعدك الأنف/ : /Your nose helps/i);
    await page.goto(drive);
    await expectPlay(4);
    await choice.locator('[data-path-action="age"]').click();
    await expectPlay(11);
    await play.click();
    assert.match(await label.textContent(), gameLevel(11));
    await answerDrive(11);
    assert(await page.locator('[data-level-next]').isVisible());
    let saved = await state();
    assert.equal(saved.scores[10], 3);
    assert.equal(saved.scores.filter(Boolean).length, 1);
    await map.waitFor({state: 'hidden'});
    await page.locator('[data-level-result] [data-level-menu]').click();
    await expectPlay(12);
    assert(await levelButton(12).isEnabled());
    assert(await levelButton(13).isDisabled());
    await play.click();
    const vowel = await page.locator('#drive-data').evaluate(source =>
      JSON.parse(source.textContent).levels[11].rounds[0].vowel);
    await page.locator('.drive-gate[data-vowel="' + vowel + '"]').click();
    await page.goto(drive + '?continue=1');
    await label.waitFor({state: 'visible'});
    assert.match(await label.textContent(), gameLevel(12));
    assert.match(await label.textContent(), arabic ? /الجولة 2 من/ : /Round 2 of/);
    await page.evaluate(key => {
      const saved = JSON.parse(localStorage.getItem(key));
      for (const index of [11, 12, 13]) saved.scores[index] = 3;
      localStorage.setItem(key, JSON.stringify(saved));
    }, stateKey);
    await page.goto(drive + '?level=15');
    await label.waitFor({state: 'visible'});
    await answerDrive(15);
    assert.match(await page.locator('[data-level-result] h2').textContent(),
      arabic ? /أكملت مسار التحدّي/ : /Challenge path complete/);
    assert(await page.locator('[data-level-next]').isHidden());
    saved = await state();
    assert(saved.scores.slice(0, 10).every(score => score === 0));
    assert.equal(saved.scores.slice(10).filter(Boolean).length, 5);

    await page.evaluate(() => localStorage.setItem('fudool-active-profile-v1', 'p-younger'));
    await page.goto(drive);
    await expectPlay(1);
    assert(await levelButton(11).isDisabled());
    await choice.locator('[data-path-action="harder"]').click();
    await expectPlay(4);
    await page.goto(lab);
    await expectPlay(1);
    await play.click();
    assert.match(await label.textContent(), gameLevel(1));
    console.log('PASS V6.2 age-based entry, game/profile isolation, sequential unlocks, stars and resume', language);
  } finally {
    await page.close();
  }
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
  await validateRobo(page, 'ar');
  await page.evaluate(() => localStorage.setItem('fudool-age-journey-v1', '"8-10"'));
  await page.goto(origin + '/games/robo-lab/');
  await page.locator('[data-path-play]').click();
  assert.match(await page.locator('[data-game] .game-progress').textContent(), /المستوى 7 ·/);
  await context.close();
  console.log('PASS offline game, Robo experiments and V6.2 age-based entry');
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
      await validateAgePaths(browser, language);
      await validateDriving(browser, language);
      const labPage = await browser.newPage({
        viewport: {width: language === 'ar' ? 390 : 1280, height: 844},
        userAgent: language === 'ar' ? 'Mozilla/5.0 Mobile FudoolAndroidUnified' : undefined,
      });
      try {
        await validateRobo(labPage, language);
        console.log('PASS V6.1 Robo experiments', language);
      } finally {
        await labPage.close();
      }
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
