const {chromium}=require(process.cwd()+'/node_modules/playwright');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
const {setTimeout:wait}=require('node:timers/promises');
const server=spawn('python3',['-m','http.server','8714','--bind','127.0.0.1'],{stdio:'ignore'});
const root='http://127.0.0.1:8714';
(async()=>{
 for(let attempt=0;attempt<20;attempt++){
  if(await fetch(root+'/stories/').then(response=>response.ok).catch(()=>false))break;
  await wait(100);
 }
 const browser=await chromium.launch();
 try {
 const route='/stories/robo-little-seed/';
 for(const width of [320,390,800,1280]){
  const context=await browser.newContext({viewport:{width,height:900}});
  const page=await context.newPage();
  page.on('pageerror', error=>console.error(error));
  await page.goto(root+'/stories/');
  await page.getByRole('link',{name:'روبو والبذرة الصغيرة'}).waitFor();
  await page.getByRole('link',{name:'مشعال والبالون الأزرق'}).waitFor();
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.locator('[name="age"]').selectOption('3');
  await page.getByRole('link',{name:'مشعال والبالون الأزرق'}).waitFor();
  assert.equal(await page.getByRole('link',{name:'روبو والبذرة الصغيرة'}).count(),0);
  await page.locator('[name="age"]').selectOption('7');
  await page.getByRole('link',{name:'فضّول وسرّ الحديقة'}).waitFor();
  assert.equal(await page.locator('.pages-card').count(),1);
  await page.locator('[name="age"]').selectOption('5');
  await page.getByRole('button',{name:'المفضلة'}).click();
  await page.locator('[name="status"]').selectOption('favorite');
  await page.getByRole('link',{name:'روبو والبذرة الصغيرة'}).click();
  await page.getByText('1/7',{exact:true}).waitFor();
  assert.equal(await page.locator('[dir=rtl]').count(),1);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  const frame=page.locator('figure');
  await frame.dispatchEvent('pointerdown',{pointerType:'touch',clientX:30,clientY:60});
  await frame.dispatchEvent('pointerup',{pointerType:'touch',clientX:130,clientY:64});
  await page.getByText('2/7',{exact:true}).waitFor();
  await page.reload();
  await page.getByText('2/7',{exact:true}).waitFor();
  await page.getByRole('button',{name:'تكبير النص'}).click();
  assert.equal(await page.getByRole('button',{name:'تكبير النص'}).getAttribute('aria-pressed'),'true');
  for(let i=0;i<5;i++)await page.getByRole('button',{name:'التالي',exact:true}).click();
  await page.getByRole('button',{name:'إنهاء القصة'}).click();
  for(const value of ['0','1','2']) await page.locator(`input[name="${value}"][value="0"]`).check();
  await page.getByRole('button',{name:'تحقّق من إجاباتي'}).click();
  await page.getByText(/حصلت على نجمتين/).waitFor();
  await page.getByRole('button',{name:'تحقّق من إجاباتي'}).click();
  await page.getByText(/أجبت عن جميع الأسئلة/).waitFor();
  await page.getByRole('button',{name:'تنزيل القصة'}).click();
  await page.getByText('القصة جاهزة للقراءة دون إنترنت.').waitFor();
  await context.setOffline(true);
  await page.reload();
  await page.getByText('7/7',{exact:true}).waitFor();
  await page.locator('figure img').evaluate(image=>image.decode());
  await page.getByRole('link',{name:'كل القصص'}).click();
  await page.getByText(/نجوم القراءة: 3/).waitFor();
  await context.setOffline(false);
  await page.goto(root+route);
  await page.getByRole('button',{name:'حذف التنزيل'}).click();
  await page.getByText('حُذفت القصة المنزّلة.').waitFor();
  await page.goto(root);
  await page.locator('.fudool-pages-promo a').click();
  await page.getByRole('link',{name:'مشعال والبالون الأزرق'}).click();
  await page.getByText('1/6',{exact:true}).waitFor();
  const portrait = await page.locator('figure img').evaluate(async image=>{
    await image.decode();
    return image.naturalHeight / image.naturalWidth;
  });
  assert.equal(portrait,1.25);
  assert.equal(await page.locator('figcaption').evaluate(caption=>caption.offsetWidth),1);
  await page.getByRole('button',{name:'تكبير النص'}).click();
  assert(await page.locator('figcaption').evaluate(caption=>caption.offsetWidth)>1);
  for(let i=0;i<5;i++) await page.getByRole('button',{name:'التالي',exact:true}).click();
  await page.getByText('6/6',{exact:true}).waitFor();
  await page.getByRole('button',{name:'إنهاء القصة'}).click();
  for(const value of ['0','1','2']) await page.locator(`input[name="${value}"][value="${value}"]`).check();
  await page.getByRole('button',{name:'تحقّق من إجاباتي'}).click();
  await page.getByText(/حصلت على نجمتين/).waitFor();
  await page.getByRole('button',{name:'تنزيل القصة'}).click();
  await page.getByText('القصة جاهزة للقراءة دون إنترنت.').waitFor();
  await context.setOffline(true);
  await page.reload();
  await page.getByText('6/6',{exact:true}).waitFor();
  await page.locator('figure img').evaluate(image=>image.decode());
  await page.getByRole('link',{name:'كل القصص'}).click();
  await page.getByText(/نجوم القراءة: 6/).waitFor();
  await context.close();
  console.log('PASS reader, filters, progress, quiz, awards and offline width='+width);
 }
 for(const [id, title, age, total, answers] of [
  ['fudool-garden-mystery','فضّول وسرّ الحديقة','7',9,[0,1,2,0,1]],
  ['clean-energy-city','رحلة إلى مدينة الطاقة النظيفة','9',8,[0,1,2,0,1,2]],
 ]){
  const context=await browser.newContext({viewport:{width:390,height:844}});
  const page=await context.newPage();
  await page.goto(root+'/stories/');
  await page.locator('[name="age"]').selectOption(age);
  await page.getByRole('link',{name:title}).click();
  assert.equal(new URL(page.url()).pathname,'/stories/'+id+'/');
  for(let i=1;i<=total;i++){
   await page.getByText(i+'/'+total,{exact:true}).waitFor();
   await page.locator('figure img').evaluate(image=>image.decode());
   assert(await page.locator('figcaption').innerText());
   if(i<total) await page.getByRole('button',{name:'التالي',exact:true}).click();
  }
  await page.getByRole('button',{name:'إنهاء القصة'}).click();
  for(const [index,answer] of answers.entries()) await page.locator(`input[name="${index}"][value="${answer}"]`).check();
  await page.getByRole('button',{name:'تحقّق من إجاباتي'}).click();
  await page.getByText(/حصلت على نجمتين/).waitFor();
  await page.getByRole('button',{name:'تنزيل القصة'}).click();
  await page.getByText('القصة جاهزة للقراءة دون إنترنت.').waitFor();
  await context.setOffline(true);
  await page.reload();
  await page.getByText(total+'/'+total,{exact:true}).waitFor();
  await page.locator('figure img').evaluate(image=>image.decode());
  await context.close();
  console.log('PASS all pages, comprehension quiz and offline reread: '+id);
 }
 const zoomPage=await browser.newPage({viewport:{width:360,height:740},hasTouch:true});
 await zoomPage.addInitScript(()=>{
  window.turns=[];
  HTMLMediaElement.prototype.play=function(){
   window.turns.push({file:new URL(this.src).pathname,volume:this.volume});
   return Promise.resolve();
  };
  localStorage.setItem('fudool-audio-levels-v1',JSON.stringify({effects:35}));
 });
 await zoomPage.goto(root+'/play-app/');
 await zoomPage.locator('.v5-nav a[href="/stories/"]').click();
 await zoomPage.getByRole('link',{name:'فضّول وسرّ الحديقة'}).click();
 await zoomPage.getByRole('button',{name:'تكبير الصورة'}).click();
 const dialog=zoomPage.getByRole('dialog');
 await dialog.getByText('1/9',{exact:true}).waitFor();
 assert(await dialog.getByRole('button',{name:'السابق'}).isDisabled());
 await dialog.getByRole('button',{name:'التالي'}).click();
 await dialog.getByText('2/9',{exact:true}).waitFor();
 assert.deepEqual(await zoomPage.evaluate(()=>window.turns),[{file:'/assets/story-page-turn.wav',volume:.35}]);
 const zoomArt=dialog.locator('img');
 await zoomArt.dispatchEvent('pointerdown',{pointerType:'touch',clientX:25,clientY:60});
 await zoomArt.dispatchEvent('pointerup',{pointerType:'touch',clientX:125,clientY:62});
 await dialog.getByText('3/9',{exact:true}).waitFor();
 await zoomPage.evaluate(()=>localStorage.setItem('fudool-game-sound','off'));
 await dialog.press('ArrowRight');
 await dialog.getByText('2/9',{exact:true}).waitFor();
 assert.equal(await zoomPage.evaluate(()=>window.turns.length),2);
 await dialog.getByRole('button',{name:'إغلاق'}).click();
 await zoomPage.locator('.pages-book > .pages-actions .pages-counter').getByText('2/9',{exact:true}).waitFor();
 await zoomPage.close();
 console.log('PASS bottom Stories navigation, enlarged pagination, RTL swipe and muted effects');
 const native=await browser.newPage({userAgent:'Mozilla/5.0 FudoolAndroidUnified'});
 await native.goto(root+'/play-app/');
 await native.locator('.fudool-pages-promo a').click();
 await native.getByRole('link',{name:'مشعال والبالون الأزرق'}).waitFor();
 await native.goto(root+'/play-app/#v5-more');
 await native.locator('[data-v5-external*="tiktok"]').click();
 await native.waitForURL(/external.*tiktok/);
 await native.goto(root+'/app/family/');
 assert.match(await native.locator('[data-parent-social]').getAttribute('href'),/^\/play-app\/external/);
 console.log('PASS TikTok native gate handoff');
 } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>server.kill());
