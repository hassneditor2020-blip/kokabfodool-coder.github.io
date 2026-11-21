const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {spawn} = require('node:child_process');
const {once} = require('node:events');
const ORIGIN = 'http://127.0.0.1:18766';
const ROOT = process.cwd();
const SHOT = process.env.TEST_SCREENSHOTS || path.join(os.tmpdir(), 'fudool-dashboard-test');
fs.mkdirSync(SHOT, {recursive:true});
const pack = JSON.parse(fs.readFileSync(path.join(ROOT, 'offline-pack.json')));
const gameKey = 'fudool-games-v1:memory';
const gameValue = JSON.stringify({scores:[3,2,1], lastPlayed:123456, lastLevel:2, checkpoints:{}});
const profileKey = 'fudool-default-name-v1';
const profileValue = JSON.stringify('مستكشف الاختبار');
const storiesKey = 'fudool-pages-v1:default';
const storySentinel = {page:3, favorite:true, completed:true};

async function checkState(page) {
  const state = await page.evaluate(keys => Object.fromEntries(keys.map(k => [k, localStorage.getItem(k)])), [gameKey,profileKey,storiesKey]);
  assert.equal(state[gameKey], gameValue, 'game progress changed');
  assert.equal(state[profileKey], profileValue, 'profile changed');
  assert.deepEqual(JSON.parse(state[storiesKey])['sentinel-unvisited'], storySentinel, 'other story progress changed');
}
async function checkRoute(page, view, hash) {
  await page.waitForFunction(([view,hash]) => location.hash === hash && !document.querySelector(`[data-v5-view="${view}"]`).hidden && [...document.querySelectorAll('[data-v5-view]')].filter(e => !e.hidden).length === 1, [view,hash]);
  assert.equal(await page.locator(`.v5-nav a[href="${hash}"]`).getAttribute('aria-current'), 'page');
}
(async () => {
  const server = spawn('python3',['-u','-m','http.server','18766','--bind','127.0.0.1'],{cwd:ROOT,stdio:'ignore'});
  const browser = await chromium.launch({...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH} : {}), headless:true, args:['--no-sandbox']});
  try {
    let ready = false;
    for (let i=0; i<50 && !ready; i++) {
      try { ready=(await fetch(ORIGIN+'/offline-pack.json')).ok; } catch { await new Promise(r=>setTimeout(r,100)); }
    }
    assert(ready, 'test server did not start');
    for (const width of [320,375,768,1440]) {
      const context = await browser.newContext({viewport:{width,height:width===1440?900:812},deviceScaleFactor:1});
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(`${ORIGIN}/play-app/`,{waitUntil:'networkidle'});
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(async () => {
        for (let y=0; y<document.documentElement.scrollHeight; y+=window.innerHeight/2) { window.scrollTo(0,y); await new Promise(r=>setTimeout(r,40)); }
        window.scrollTo(0,0);
        await Promise.all([...document.querySelectorAll('[data-v5-view="home"] img')].map(i => i.decode().catch(()=>{})));
      });
      const box = await page.evaluate(() => {
        const hero = document.querySelector('[data-v5-view="home"] .v5-hero').getBoundingClientRect();
        const buttons = [...document.querySelectorAll('[data-v5-view="home"] .v5-hero a')].map(e=>{const r=e.getBoundingClientRect(); return {left:r.left,right:r.right,height:r.height,width:r.width};});
        return {width:innerWidth, scroll:document.documentElement.scrollWidth, dir:document.documentElement.dir, hero:{left:hero.left,right:hero.right}, buttons};
      });
      assert.equal(box.scroll,width); assert.equal(box.dir,'rtl');
      assert(box.hero.left>=0 && box.hero.right<=width);
      for (const r of box.buttons) { assert(r.left>=0 && r.right<=width && r.height>=44 && r.width>=44); }
      assert.deepEqual(errors,[]);
      await page.screenshot({path:`${SHOT}/app-after-${width}.png`,fullPage:true});
      console.log(`PASS layout ${width}px: no horizontal overflow; RTL; hero actions >=44px`);
      await context.close();
    }
    const nativeContext = await browser.newContext({viewport:{width:375,height:812},userAgent:'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36 FudoolAndroidUnified'});
    const nativePage = await nativeContext.newPage();
    await nativePage.goto(`${ORIGIN}/play-app/`,{waitUntil:'networkidle'});
    assert(await nativePage.evaluate(()=>document.documentElement.classList.contains('fudool-android-shell')));
    assert.equal(await nativePage.locator('.download-app-bubble').isVisible(),false);
    await nativePage.locator('.v5-hero .v5-play').click(); await checkRoute(nativePage,'games','#v5-games');
    await nativePage.locator('.v5-nav a[href="#top"]').click(); await checkRoute(nativePage,'home','#top');
    console.log('PASS Android user-agent simulation: app shell class, hidden APK bubble and home ↔ games');
    await nativeContext.close();
    const context = await browser.newContext({viewport:{width:375,height:812}});
    const page = await context.newPage();
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`${ORIGIN}/play-app/`,{waitUntil:'networkidle'});
    await page.evaluate(({gameKey,gameValue,profileKey,profileValue,storiesKey,storySentinel}) => {
      localStorage.setItem(gameKey,gameValue); localStorage.setItem(profileKey,profileValue);
      localStorage.setItem(storiesKey,JSON.stringify({'sentinel-unvisited':storySentinel}));
    },{gameKey,gameValue,profileKey,profileValue,storiesKey,storySentinel});
    await page.reload({waitUntil:'networkidle'});
    await page.locator('.v5-hero .v5-play').click();
    await checkRoute(page,'games','#v5-games');
    await page.locator('[data-app-games] .app-game-card').first().waitFor();
    const card = page.locator('[data-app-games] .app-game-card').first();
    const gameHref=await card.getAttribute('href'); assert.match(new URL(gameHref,ORIGIN).pathname,/^\/games\//);
    await card.click(); await page.waitForURL(/\/games\/[^/]+\//); assert(await page.locator('body').isVisible());
    await page.goBack({waitUntil:'domcontentloaded'}); await checkRoute(page,'games','#v5-games');
    await page.locator('.v5-nav a[href="#top"]').click(); await checkRoute(page,'home','#top');
    console.log('PASS navigation home → games → '+gameHref+' → browser back → home');
    await page.locator('[data-v5-view="home"] .fudool-pages-promo a').click();
    await checkRoute(page,'stories','#v5-pages');
    await page.locator('[data-library] .pages-card a.pages-cover').first().waitFor();
    const storyHref=await page.locator('[data-library] .pages-card a.pages-cover').first().getAttribute('href');
    await page.locator('[data-library] .pages-card a.pages-cover').first().click();
    await page.waitForURL(/\/stories\/[^/]+\//);
    const counter=page.locator('.pages-book > .pages-actions .pages-counter');
    await counter.waitFor(); const before=await counter.innerText();
    await page.locator('.pages-book > .pages-actions').getByRole('button',{name:'التالي',exact:true}).click();
    const after=await counter.innerText(); assert.notEqual(before,after);
    const topLink=page.locator('.pages-layout > nav a').first(); assert.equal(await topLink.getAttribute('href'),'/play-app/#v5-pages');
    await topLink.click(); await checkRoute(page,'stories','#v5-pages');
    await page.locator('.v5-nav a[href="#top"]').click(); await checkRoute(page,'home','#top');
    await checkState(page); assert.deepEqual(errors,[]);
    console.log(`PASS navigation home → library → ${storyHref} (${before} to ${after}) → library → home; existing progress preserved`);
    for (const [view,hash,selector] of [['games','#v5-games','.v5-learning-hero'],['stories','#v5-pages','.pages-hero'],['learn','#v5-watch','.v5-learning-hero']]) {
      await page.locator(`.v5-nav a[href="${hash}"]`).click(); await checkRoute(page,view,hash);
      const unchanged=await page.evaluate(selector=>{
        const el=document.querySelector(`[data-v5-view]:not([hidden]) ${selector}`);
        const css=[...document.styleSheets].find(s=>s.href&&s.href.endsWith('/assets/app-dashboard-review.css'));
        const snapshot=()=>{const s=getComputedStyle(el);return [s.backgroundImage,s.color,s.display,s.padding,s.borderRadius,s.fontSize]};
        const on=snapshot();css.disabled=true;const off=snapshot();css.disabled=false;return JSON.stringify(on)===JSON.stringify(off);
      },selector);
      assert(unchanged,view+' was affected by dashboard CSS');
    }
    console.log('PASS isolated CSS: sampled games, stories and learning styles unchanged when dashboard sheet disabled');
    await page.locator('.v5-nav a[href="#top"]').click(); await checkRoute(page,'home','#top');
    const shellContext = await browser.newContext({viewport:{width:375,height:812}});
    const shellPage = await shellContext.newPage();
    await shellPage.goto(`${ORIGIN}/play-app/`,{waitUntil:'networkidle'});
    await shellPage.evaluate(()=>navigator.serviceWorker.ready);
    await shellPage.waitForFunction(()=>!!navigator.serviceWorker.controller);
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
      const old='fudool-offline-old-test';
      const c=await caches.open(old); await c.put('/__old_sentinel__',new Response('old'));
      await (await caches.open('fudool-offline-meta-v1')).put('/__fudool_pack__',new Response(JSON.stringify({cache:old,version:'old-test',files:1,bytes:3}),{headers:{'Content-Type':'application/json'}}));
    });
    const info=await page.evaluate(async () => {
      const reg=await navigator.serviceWorker.ready;
      return await new Promise((resolve,reject)=>{const channel=new MessageChannel();const timer=setTimeout(()=>reject(Error('offline download timeout')),180000);
        channel.port1.onmessage=e=>{if(e.data.type==='error'){clearTimeout(timer);reject(Error(e.data.message));} if(e.data.type==='done'){clearTimeout(timer);resolve(e.data.info);}};
        reg.active.postMessage({type:'download'},[channel.port2]);
      });
    });
    assert.equal(info.version,pack.version); assert.equal(info.files,pack.files.length); assert.equal(info.bytes,pack.bytes);
    const cacheInfo=await page.evaluate(async ()=>({names:await caches.keys(), css:!!await (await caches.open('fudool-offline-'+(await (await (await caches.open('fudool-offline-meta-v1')).match('/__fudool_pack__')).json()).version)).match('/assets/app-dashboard-review.css')}));
    assert(cacheInfo.css); assert(!cacheInfo.names.includes('fudool-offline-old-test'));
    await checkState(page);
    await (await context.newCDPSession(page)).send('Network.clearBrowserCache');
    await (await shellContext.newCDPSession(shellPage)).send('Network.clearBrowserCache');
    const exited=once(server,'exit'); server.kill('SIGTERM'); await exited;
    await context.setOffline(true);
    await page.goto(`${ORIGIN}/play-app/`,{waitUntil:'domcontentloaded'});
    await page.locator('[data-v5-view="home"] .v5-hero').waitFor();
    const offline=await page.evaluate(async()=>({styleLoaded:!![...document.styleSheets].find(s=>s.href&&s.href.endsWith('/assets/app-dashboard-review.css')), status:(await fetch('/assets/app-dashboard-review.css')).status, bg:getComputedStyle(document.querySelector('.v5-hero')).backgroundImage}));
    assert(offline.styleLoaded && offline.status===200 && offline.bg.includes('radial-gradient'));
    await page.locator('.v5-hero .v5-play').click();await checkRoute(page,'games','#v5-games');
    assert(await page.locator('[data-app-games] .app-game-card').count()>0);
    await page.locator('[data-app-games] .app-game-card').first().click();
    await page.waitForURL(/\/games\/[^/]+\//); assert(await page.locator('body').isVisible());
    await page.goBack({waitUntil:'domcontentloaded'}); await checkRoute(page,'games','#v5-games');
    await page.locator('.v5-nav a[href="#v5-pages"]').click();await checkRoute(page,'stories','#v5-pages');
    await page.locator('[data-library] .pages-card a.pages-cover').first().waitFor();
    await page.locator('[data-library] .pages-card a.pages-cover').first().click();
    await page.waitForURL(/\/stories\/[^/]+\//);
    const offlineCounter=page.locator('.pages-book > .pages-actions .pages-counter');
    await offlineCounter.waitFor(); const offlineBefore=await offlineCounter.innerText();
    await page.locator('.pages-book > .pages-actions').getByRole('button',{name:'التالي',exact:true}).click();
    assert.notEqual(await offlineCounter.innerText(),offlineBefore);
    await page.locator('.pages-layout > nav a').first().click(); await checkRoute(page,'stories','#v5-pages');
    await page.locator('.v5-nav a[href="#top"]').click();await checkRoute(page,'home','#top');
    await checkState(page);
    console.log(`PASS pack upgrade ${info.version}, ${info.files} files, ${info.bytes} bytes; offline home CSS, game, story reader and progress`);
    await context.close();
    await shellContext.setOffline(true);
    await shellPage.goto(`${ORIGIN}/play-app/`,{waitUntil:'domcontentloaded'});
    const shellStatus=await shellPage.evaluate(async()=>(await fetch('/assets/app-dashboard-review.css',{cache:'no-store'})).status);
    assert.equal(shellStatus,503);
    console.log('LIMIT: shell-only offline without downloaded pack returns 503 for new stylesheet; existing styles are fallback');
    await shellContext.close();
  } finally { if (server.exitCode===null && server.signalCode===null) server.kill('SIGTERM'); await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1});
