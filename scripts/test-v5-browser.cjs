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
   const visible=async v=>assert(await page.locator('[data-v5-view="'+v+'"]').isVisible(),lang+' '+width+' '+v);
   const fit=async()=>assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'horizontal overflow '+lang+' '+width);
   await visible('home');await fit();
   await page.screenshot({path:'build/v5-screenshots/'+lang+'-'+width+'-home.png',fullPage:true});
   await page.locator('.v5-nav a[href="#v5-watch"]').click();await visible('learn');await fit();
   assert.equal(await page.locator('#v5-series .v5-series').count(),8);
   await page.screenshot({path:'build/v5-screenshots/'+lang+'-'+width+'-learn.png',fullPage:true});
   await page.locator('a[href="#v5-series-arabic-letters"]').last().click();
   await page.waitForSelector('#v5-series-detail .v5-detail-grid .v5-episode');
   assert.equal(await page.locator('#v5-series-detail .v5-detail-grid .v5-episode').count(),19);
   await page.locator('#v5-series-detail .v5-detail-grid .v5-episode').first().click();
   assert(await page.locator('#v5-gate').isVisible());
   await page.locator('#v5-gate [data-v5-answer]').fill('0');
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
 }finally{if(browser)await browser.close();server.kill()}
})().catch(e=>{console.error(e);process.exitCode=1});
