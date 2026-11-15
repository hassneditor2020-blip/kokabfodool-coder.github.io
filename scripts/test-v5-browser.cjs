const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const cp=require('node:child_process');
const server=cp.spawn('python3',['-m','http.server','8765','--bind','127.0.0.1'],{stdio:'ignore'});
const origin='http://127.0.0.1:8765';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 let browser;
 try {
  for(let i=0;i<20;i++){try{await fetch(origin);break}catch{await sleep(250)}}
  browser=await chromium.launch({headless:true});
  fs.mkdirSync('build/v5-screenshots',{recursive:true});
  for(const lang of ['ar','en']) for(const width of [320,390,768,1280]){
   const page=await browser.newPage({viewport:{width,height:844}});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(origin+(lang==='ar'?'/play-app/':'/en/play-app/'),{waitUntil:'networkidle'});
   const visible=async v=>{await page.locator('[data-v5-view="'+v+'"]').waitFor({state:'visible',timeout:8000});};
   const fit=async()=>assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'horizontal overflow '+lang+' '+width);
   await visible('home');await fit();
   await page.screenshot({path:'build/v5-screenshots/'+lang+'-'+width+'-home.png',fullPage:true});
   await page.locator('.v5-nav a[href="#v5-watch"]').click();await visible('learn');await fit();
   assert.equal(await page.locator('#v5-series .v5-series').count(),9);
   await page.screenshot({path:'build/v5-screenshots/'+lang+'-'+width+'-learn.png',fullPage:true});
   await page.locator('a[href="#v5-series-arabic-letters"]').last().click();
   await page.waitForSelector('#v5-series-detail .v5-detail-grid .v5-episode');
   assert.equal(await page.locator('#v5-series-detail .v5-detail-grid .v5-episode').count(),19);
   await page.locator('#v5-series-detail .v5-detail-grid .v5-episode').first().click();
   assert(await page.locator('#v5-gate').isVisible());
   await page.locator('#v5-gate [data-v5-key="0"]').click();
   await page.locator('#v5-gate [data-v5-confirm]').click();
   assert(await page.locator('#v5-gate [data-v5-status]').innerText());
   await page.locator('#v5-gate button[value=cancel]').click();
   await page.locator('.v5-nav a[href="#v5-games"]').click();await visible('games');await fit();
   assert.equal(await page.locator('[data-app-games] .app-game-card').count(),20);
   await page.screenshot({path:'build/v5-screenshots/'+lang+'-'+width+'-games.png',fullPage:true});
   await page.locator('.v5-nav a[href="#v5-achievements"]').click();await visible('achievements');await fit();
   await page.waitForSelector('.v5-badge');assert.equal(await page.locator('.v5-badge').count(),4);
   await page.locator('.v5-nav a[href="#v5-more"]').click();await visible('more');await fit();
   assert.equal(await page.locator('.v5-social').count(),3);
   await page.screenshot({path:'build/v5-screenshots/'+lang+'-'+width+'-more.png',fullPage:true});
   assert.deepEqual(errors,[],lang+' '+width+' JS errors');
   await page.close();
   console.log('PASS',lang,width,'five views / 20 games / catalogue / parent gate / no overflow');
  }
  // Verify all catalog covers load on the website and in the actual application grids.
  const catalog=JSON.parse(fs.readFileSync('assets/app-learning-v5.json','utf8'));
  for(const lang of ['ar','en']){
   const page=await browser.newPage({viewport:{width:390,height:844}});
   const prefix=lang==='ar'?'':'/en';
   await page.goto(origin+prefix+'/episodes/',{waitUntil:'networkidle'});
   const coverCheck=async selector=>await page.locator(selector).evaluateAll(async imgs=>Promise.all(imgs.map(async im=>{im.loading='eager';try{await im.decode()}catch{}return {src:im.getAttribute('src'),ok:im.naturalWidth>0&&im.naturalHeight>0,fit:getComputedStyle(im).objectFit}})));
   const webCovers=await coverCheck('.episode-card .episode-art img');
   assert(webCovers.length>=54);assert(webCovers.every(x=>x.ok),JSON.stringify(webCovers.filter(x=>!x.ok)));
   assert(await page.locator('#english-number-episodes').count());
   await page.goto(origin+prefix+'/play-app/',{waitUntil:'networkidle'});
   for(const group of catalog.series){
    await page.evaluate(id=>location.hash='v5-series-'+id,group.id);
    const cards=page.locator('#v5-series-detail .v5-detail-grid .v5-episode');
    await cards.first().waitFor();
    await page.waitForFunction(n=>document.querySelectorAll('#v5-series-detail .v5-detail-grid .v5-episode').length===n,group[lang].episodes.length);
    const covers=await coverCheck('#v5-series-detail .v5-detail-grid .v5-episode-art img');
    assert.equal(covers.length,group[lang].episodes.length);
    assert(covers.every(x=>x.ok&&x.fit==='contain'),JSON.stringify(covers.filter(x=>!x.ok||x.fit!=='contain')));
   }
   await page.evaluate(()=>location.hash='v5-series-english-numbers');
   await page.waitForFunction(()=>document.querySelector('#v5-series-detail h1')?.textContent.includes(document.documentElement.lang==='ar'?'الأرقام الإنجليزية':'English numbers'));
   await page.waitForSelector('#v5-series-detail .v5-detail-grid .v5-episode');
   assert.equal(await page.locator('#v5-series-detail .v5-detail-grid .v5-episode').count(),catalog.series.find(s=>s.id==='english-fun')[lang].episodes.filter(e=>e.category==='numbers').length);
   await page.screenshot({path:'build/v5-screenshots/'+lang+'-english-numbers.png',fullPage:true});
   await page.close();
   console.log('PASS website and app catalogue covers, English numbers',lang);
  }
  for(const lang of ['ar','en']) {
   const page=await browser.newPage({viewport:{width:390,height:844},userAgent:'Mozilla/5.0 FudoolAndroidOffline'});
   let opened=null;
   await page.route('**/play-app/external/?url=*',async route=>{opened=new URL(route.request().url()).searchParams.get('url');await route.fulfill({status:200,body:'native interception simulated'})});
   await page.goto(origin+(lang==='ar'?'/play-app/':'/en/play-app/'),{waitUntil:'networkidle'});
   await page.locator('.v5-nav a[href="#v5-watch"]').click();
   await page.locator('a[href="#v5-series-arabic-letters"]').last().click();
   await page.waitForSelector('#v5-series-detail .v5-detail-grid .v5-episode');
   const yt=page.locator('#v5-series-detail .v5-yt-button').first();
   await yt.click();
   const gate=page.locator('#v5-gate');
   assert(await gate.locator('[data-v5-answer]').isEnabled());
   assert(await gate.locator('[data-v5-confirm]').isEnabled());
   await gate.locator('[data-v5-key="0"]').click();
   await gate.locator('[data-v5-confirm]').click();
   assert(await gate.locator('[data-v5-status]').innerText());assert.equal(opened,null);
   await gate.locator('[data-v5-key="clear"]').click();
   const question=await gate.locator('label span').innerText();
   const nums=question.match(/\d+/g).map(Number);
   for(const digit of String(nums[0]+nums[1]))await gate.locator('[data-v5-key="'+digit+'"]').click();
   await gate.locator('[data-v5-confirm]').click();
   await page.waitForURL('**/play-app/external/?url=*');
   assert(opened&&new URL(opened).origin==='https://www.youtube.com');
   await page.close();
   console.log('PASS offline parent keypad and external navigation (simulated)',lang);
  }
 }finally{if(browser)await browser.close();server.kill()}
})().catch(e=>{console.error(e);process.exitCode=1});
