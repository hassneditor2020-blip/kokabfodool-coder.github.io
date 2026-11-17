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
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.locator('[name="age"]').selectOption('3');
  await page.getByText('قصص جديدة في الطريق!').waitFor();
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
  await context.close();
  console.log('PASS reader, filters, progress, quiz, awards and offline width='+width);
 }
 const native=await browser.newPage({userAgent:'Mozilla/5.0 FudoolAndroidUnified'});
 await native.goto(root+'/play-app/#v5-more');
 await native.locator('[data-v5-external*="tiktok"]').click();
 await native.waitForURL(/external.*tiktok/);
 await native.goto(root+'/app/family/');
 assert.match(await native.locator('[data-parent-social]').getAttribute('href'),/^\/play-app\/external/);
 console.log('PASS TikTok native gate handoff');
 } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1}).finally(()=>server.kill());
