const assert = require('node:assert/strict');
const {spawn} = require('node:child_process');
const {readFile} = require('node:fs/promises');
const {chromium} = require('playwright');

const port = 8773;
const origin = 'http://127.0.0.1:' + port;

async function adjust(page, channel, value) {
  await page.locator('[data-volume="' + channel + '"]').evaluate((slider, number) => {
    slider.value = number;
    slider.dispatchEvent(new Event('input', {bubbles: true}));
    slider.dispatchEvent(new Event('change', {bubbles: true}));
  }, value);
}

async function attachFile(page, object) {
  const pending = page.waitForEvent('filechooser');
  await page.locator('[data-import-progress]').click();
  const picker = await pending;
  await picker.setFiles({name: 'kokab-fodool-progress.json', mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(object))});
}

async function testLocal(browser) {
  const device = await browser.newContext({viewport: {width: 320, height: 844}, serviceWorkers: 'block'});
  await device.addInitScript(() => {
    window.sayings = [];
    window.FudoolDevice = {
      say: (...words) => window.sayings.push(words),
      stopVoice() {},
      emailBackupAvailable: () => false,
    };
    if (!localStorage.getItem('fudool-seeded')) {
      localStorage.setItem('fudool-seeded', 'yes');
      localStorage.setItem('fudool-game-sound', 'off');
      localStorage.setItem('kokab-games-v2', JSON.stringify({memory: [3]}));
    }
  });
  const page = await device.newPage();
  const failures = [];
  page.on('pageerror', error => failures.push(error.message));
  await page.goto(origin + '/play-app/');
  await page.locator('.app-top a[href="/app/settings/"]').click();
  await page.locator('[data-player-label]').waitFor();
  assert.equal(await page.locator('[data-volume="effects"]').inputValue(), '0');
  assert(await page.locator('[data-parent-backup]').isHidden());
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2));
  await page.locator('input[name="nickname"]').fill('نجمة');
  await page.locator('[data-player-form] button').click();
  assert.equal(await page.locator('[data-player-label]').textContent(), 'نجمة');
  await adjust(page, 'effects', 25);
  await adjust(page, 'voice', 35);
  await page.locator('[data-preview-voice]').click();
  assert.deepEqual(await page.evaluate(() => window.sayings.at(-1)), ['أهلًا يا نجمة، مستعدّ للعب؟', 'ar', .35]);
  await page.reload();
  assert.equal(await page.locator('input[name="nickname"]').inputValue(), 'نجمة');
  assert.equal(await page.locator('[data-volume="effects"]').inputValue(), '25');
  assert.equal(await page.locator('[data-volume="voice"]').inputValue(), '35');
  await page.locator('.app-top a[href="/play-app/"]').first().click();
  assert.match(await page.locator('[data-app-greeting]').textContent(), /نجمة/);
  await page.goto(origin + '/games/counting/?level=1');
  const board = page.locator('[data-game]');
  await board.waitFor();
  await page.locator('[data-game-sound]').click();
  await page.locator('[data-game-sound]').click();
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('fudool-audio-levels-v1')).effects), 25);
  const rounds = await page.locator('#game-data').evaluate(script => JSON.parse(script.textContent).levels[0].rounds);
  for (const [index, round] of rounds.entries()) {
    const options = board.locator('[data-options] .game-option');
    if (index === 0) {
      await options.filter({hasText: new RegExp('^' + round[2].find((_, i) => i !== round[3]) + '$')}).click();
      assert.match(await board.locator('.player-encouragement').innerText(), /نجمة/);
    }
    await options.filter({hasText: new RegExp('^' + round[2][round[3]] + '$')}).click();
    await board.locator('[data-next]').click();
  }
  assert.match(await page.locator('[data-result-message]').innerText(), /أحسنت يا نجمة/);
  assert.deepEqual(await page.evaluate(() => window.sayings.at(-1)), ['أحسنت يا نجمة!', 'ar', .35]);
  assert.deepEqual(failures, []);
  await page.goto(origin + '/app/settings/');
  const pending = page.waitForEvent('download');
  await page.locator('[data-export-progress]').click();
  const download = await pending;
  const contents = await readFile(await download.path(), 'utf8');
  assert(!contents.includes('نجمة'));
  assert.match(contents, /counting:2/);
  assert.match(contents, /memory:3/);
  await device.close();

  const otherDevice = await browser.newContext({viewport: {width: 1280, height: 800}, serviceWorkers: 'block'});
  await otherDevice.addInitScript(() => {
    if (!localStorage.getItem('fudool-seeded')) {
      localStorage.setItem('fudool-seeded', 'yes');
      localStorage.setItem('fudool-games-v1:counting', JSON.stringify(
        {scores: [3], lastPlayed: 123, checkpoints: {1: {round: 2, mistakes: 1}}}));
    }
  });
  const web = await otherDevice.newPage();
  await web.goto(origin + '/en/games/');
  await web.getByRole('link', {name: 'Edit player name'}).click();
  await web.locator('input[name="nickname"]').fill('Little Star');
  await web.locator('[data-player-form] button').click();
  assert.equal(await web.locator('[data-player-label]').textContent(), 'Little Star');
  await attachFile(web, {version: 1, levels: 'memory:<bad>'});
  await web.getByText('Restore failed. Choose a Kokab Fodool progress file.').waitFor();
  await attachFile(web, JSON.parse(contents));
  await web.getByText('Progress restored for 1 level.').waitFor();
  const saved = await web.evaluate(() => ({
    name: JSON.parse(localStorage.getItem('fudool-default-name-v1')),
    counting: JSON.parse(localStorage.getItem('fudool-games-v1:counting')),
    memory: JSON.parse(localStorage.getItem('fudool-games-v1:memory')),
  }));
  assert.equal(saved.name, 'Little Star');
  assert.equal(saved.counting.scores[0], 3);
  assert.equal(saved.counting.checkpoints[1].round, 2);
  assert.equal(saved.memory.scores[0], 3);
  await otherDevice.close();
}

async function testCloudForm(browser) {
  const context = await browser.newContext({serviceWorkers: 'block'});
  await context.addInitScript(() => {
    window.FudoolDevice = {emailBackupAvailable: () => true};
    if (!localStorage.getItem('fudool-seeded')) {
      localStorage.setItem('fudool-seeded', 'yes');
      localStorage.setItem('fudool-default-name-v1', JSON.stringify('Only on device'));
      localStorage.setItem('fudool-games-v1:counting', JSON.stringify({scores: [2]}));
    }
  });
  const page = await context.newPage();
  await page.route('**/parent-backup-config.json', route => route.fulfill({
    json: {apiKey: 'AIza' + 'x'.repeat(35), projectId: 'demo-fudool-settings'}}));
  let verified = false;
  let verificationSent = false;
  let initialSignIns = 0;
  let refreshes = 0;
  let offline = false;
  const sessionKey = 'fudool-parent-session-v1:demo-fudool-settings';
  await page.route('https://securetoken.googleapis.com/**', route => {
    if (offline) return route.abort('internetdisconnected');
    const body = new URLSearchParams(route.request().postData());
    assert.equal(body.get('grant_type'), 'refresh_token');
    assert.match(body.get('refresh_token'), /^test-refresh/);
    refreshes++;
    return route.fulfill({json: {user_id: 'demo-parent', id_token: 'refreshed-token',
      refresh_token: 'test-refresh-' + refreshes, expires_in: '3600'}});
  });
  await page.route('https://identitytoolkit.googleapis.com/**', async route => {
    const rpc = new URL(route.request().url()).pathname.split(':').at(-1);
    assert.equal(route.request().method(), 'POST');
    const body = route.request().postDataJSON();
    if (rpc === 'lookup') return route.fulfill({json: {users: [{localId: 'demo-parent', email: 'tester@example.com', emailVerified: verified}]}});
    if (rpc === 'sendOobCode') {
      verificationSent = body.requestType === 'VERIFY_EMAIL';
      return route.fulfill({json: {}});
    }
    assert.equal(rpc, 'signUp');
    assert.equal(body.email, 'tester@example.com');
    initialSignIns++;
    return route.fulfill({json: {localId: 'demo-parent', idToken: 'test-token',
      refreshToken: 'test-refresh', expiresIn: '3600'}});
  });
  let progress = {version: {integerValue: '1'}, levels: {stringValue: 'counting:30;memory:3'}};
  let updateTime = '2026-11-16T17:00:00.000000Z';
  let writes = 0;
  await page.route('https://firestore.googleapis.com/**', async route => {
    const req = route.request();
    assert.equal(req.headers().authorization, 'Bearer refreshed-token');
    const endpoint = new URL(req.url());
    if (req.method() === 'GET') {
      assert(endpoint.pathname.endsWith('/documents/familyBackups/demo-parent/slots/1'));
      return route.fulfill({json: {fields: progress, updateTime}});
    }
    assert.equal(req.method(), 'POST');
    assert(endpoint.pathname.endsWith('/documents:commit'));
    const [{update: body, currentDocument}] = req.postDataJSON().writes;
    assert(body.name.endsWith('/documents/familyBackups/demo-parent/slots/1'));
    assert.equal(currentDocument.updateTime, updateTime);
    writes++;
    if (writes === 1) {
      progress = {version: {integerValue: '1'}, levels: {stringValue: 'counting:30;memory:3;trace:2'}};
      updateTime = '2026-11-16T17:01:00.000000Z';
      return route.fulfill({status: 412, json: {error: {status: 'FAILED_PRECONDITION'}}});
    }
    assert.deepEqual(Object.keys(body.fields).sort(), ['levels','version']);
    assert(!JSON.stringify(body).includes('Only on device'));
    progress = body.fields;
    return route.fulfill({json: {fields: progress, updateTime}});
  });
  await page.goto(origin + '/en/app/settings/');
  const form = page.locator('[data-parent-auth]');
  await form.waitFor();
  assert.deepEqual(await form.getByRole('button').allTextContents(), ['Sign in', 'Create account']);
  await form.locator('[name="email"]').fill('tester@example.com');
  await form.locator('[name="password"]').fill('TestPass123!');
  await form.getByRole('button', {name: 'Create account'}).click();
  await page.getByText(/Verification link sent/).waitFor();
  assert(verificationSent);
  assert(await page.locator('[data-parent-tools]').isHidden());
  assert.equal(await page.locator('[data-parent-pending-email]').textContent(), 'tester@example.com');
  await page.reload();
  await page.locator('[data-parent-pending]').waitFor();
  await page.waitForFunction(() => !document.querySelector('[data-parent-backup]').hasAttribute('aria-busy'));
  assert(await form.isHidden());
  verified = true;
  await page.locator('[data-parent-check]').click();
  await page.locator('[data-parent-tools]').waitFor();
  assert.equal(await page.locator('[data-parent-email]').textContent(), 'tester@example.com');
  assert.equal(initialSignIns, 1);
  assert(refreshes >= 1);
  await page.reload();
  await page.locator('[data-parent-tools]').waitFor();
  assert.equal(await page.locator('[data-parent-email]').textContent(), 'tester@example.com');
  await page.locator('[data-parent-restore]').click();
  await page.getByText('Progress restored for 2 levels.').waitFor();
  await page.evaluate(() => localStorage.setItem('fudool-games-v1:counting', JSON.stringify({scores: [3, 2]})));
  await page.locator('[data-parent-save]').click();
  await page.getByText(/Backup updated/).waitFor();
  assert.equal(writes, 2);
  assert.match(progress.levels.stringValue, /counting:32/);
  assert.match(progress.levels.stringValue, /trace:2/);
  offline = true;
  await page.reload();
  await page.locator('[data-parent-tools]').waitFor();
  await page.locator('[data-parent-restore]').click();
  await page.getByText(/Check your connection/).waitFor();
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), sessionKey);
  assert.deepEqual(Object.keys(saved).sort(), ['email', 'refreshToken', 'uid', 'verified']);
  assert.equal(saved.email, 'tester@example.com');
  await page.locator('[data-parent-tools] [data-parent-signout]').click();
  assert(await form.isVisible());
  await page.reload();
  await form.waitFor();
  assert.equal(await page.evaluate(key => localStorage.getItem(key), sessionKey), null);
  await context.close();
}

(async () => {
  const server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], {stdio: 'ignore'});
  let browser;
  try {
    for (let tries = 0; tries < 20; tries++) {
      try { await fetch(origin); break; } catch { await new Promise(resolve => setTimeout(resolve, 200)); }
    }
    browser = await chromium.launch({headless: true, executablePath: process.env.FUDOOL_CHROMIUM});
    await testLocal(browser);
    console.log('PASS settings, spoken name, volume, legacy migration and non-destructive transfer (ar/en)');
    await testCloudForm(browser);
    console.log('PASS staged parent email form, verification, save/restore conflict retry and sign-out with simulated Firebase');
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
