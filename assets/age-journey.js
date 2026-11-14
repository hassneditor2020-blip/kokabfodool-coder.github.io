// Age-based recommendations. Existing scores remain the source of truth.
const root=document.querySelector('[data-age-journey]');
if(root){
 const ar=document.documentElement.lang==='ar', tr=(a,e)=>ar?a:e;
 const ids=['letter-match','letter-hunt','vowel-drive','trace','counting','english-abc','robo-lab','memory','puzzle','sound-quiz','fudool-shop','word-factory','lumaa-clock','code-robo','world-mishaal','planet-engineer','healthy-hero','space-journey','spot-differences','grand-challenge'];
 const ranges={
 '3-5':[[1,4],[1,4],[1,3],[1,2],[1,2],[1,4],[1,2],[1,3],[1,4],[1,3],[1,3],[1,5],[1,2],[1,4],[1,0],[1,5],[1,4],[1,0],[1,5],[1,0]],
 '6-7':[[5,9],[5,10],[4,10],[3,8],[3,10],[5,10],[3,6],[4,7],[5,7],[4,6],[4,9],[6,10],[3,6],[5,12],[1,7],[6,10],[5,8],[1,7],[6,10],[1,8]],
 '8-10':[[10,12],[11,15],[11,15],[9,10],[11,18],[11,15],[7,10],[8,10],[8,10],[7,10],[10,15],[11,15],[7,10],[13,20],[8,15],[11,15],[9,10],[8,15],[11,15],[9,20]]
 };
 const info={
 '3-5':['🌱','المستكشف الصغير','Little explorer','الصور والحروف الأولى والعدّ والألغاز البسيطة.','Pictures, first letters, counting and simple puzzles.'],
 '6-7':['🚀','المستكشف الذكي','Smart explorer','الحركات والقراءة والكتابة والحساب التدريجي.','Vowels, reading, writing and early arithmetic.'],
 '8-10':['🏆','بطل الكوكب','Planet champion','الكلمات والحساب والعلوم والذاكرة والتحديات المتقدمة.','Words, arithmetic, science, memory and advanced challenges.']
 };
 const preference='fudool-age-journey-v1';
 function read(k){try{return JSON.parse(localStorage.getItem(k))}catch{return null}}
 function saveAge(v){try{localStorage.setItem(preference,JSON.stringify(v))}catch{}}
 function scores(id){const current=read('fudool-games-v1:'+id)?.scores??[], legacy=read('kokab-games-v2')?.[id]??{};return Array.from({length:ranges['8-10'][ids.indexOf(id)][1]},(_,i)=>Math.max(...[current[i],legacy[i],0].filter(v=>Number.isInteger(v)&&v>=0&&v<=3)))}
 const all=[...document.querySelectorAll('.fudool-world')], cards=new Map([...document.querySelectorAll('.fudool-world [data-game-id]')].map(c=>[c.dataset.gameId,c]));
 const tabs=root.querySelector('[data-age-tabs]'), panel=root.querySelector('[data-age-panel]');
 let selected=new URLSearchParams(location.search).get('age')||read(preference)||'all';
 if(selected!=='all'&&!ranges[selected])selected='all';
 function node(tag,txt,cls){const el=document.createElement(tag);if(txt)el.textContent=txt;if(cls)el.className=cls;return el}
 function link(c,level,label){const a=node('a',label,'button age-journey-link');const url=new URL(c.href);url.searchParams.set('level',String(level));a.href=url.href;return a}
 function draw(){
  for(const b of tabs.querySelectorAll('button'))b.setAttribute('aria-pressed',String(b.dataset.age===selected));
  all.forEach(s=>{s.hidden=selected!=='all'});
  panel.replaceChildren();
  if(selected==='all'){panel.hidden=true;return}
  panel.hidden=false;
  const [icon,titleAr,titleEn,descAr,descEn]=info[selected];
  const h=node('h2',icon+' '+tr(titleAr,titleEn)+' · '+selected.replace('-','–')+' '+tr('سنوات','years'));
  const intro=node('p',tr(descAr,descEn)), rows=ids.map((id,i)=>{const [first,last]=ranges[selected][i];const sc=scores(id);const completed=sc.slice(first-1,last).filter(Boolean).length;return {id,first,last,sc,completed,total:last-first+1}}).filter(r=>r.total>0);
  const total=rows.reduce((n,r)=>n+r.total,0), done=rows.reduce((n,r)=>n+r.completed,0);
  const bar=node('progress');bar.max=total;bar.value=done;bar.setAttribute('aria-label',tr('إنجاز المسار','Journey progress'));
  const stat=node('p',tr('أكملت '+done+' من '+total+' مستوى · '+Math.round(done/total*100)+'%','Completed '+done+' of '+total+' levels · '+Math.round(done/total*100)+'%'),'age-stat');
  panel.append(h,intro,stat,bar,node('p',tr('هذه اقتراحات مرنة. إذا كان مستوى متقدم مغلقًا، نرشدك إلى المستوى السابق المطلوب.','These are flexible recommendations. If a later level is locked, we guide you to the required earlier level.')));
  const grid=node('div','','age-journey-grid');
  let suggested=false;
  for(const r of rows){
   const c=cards.get(r.id);if(!c)continue;
   const item=node('article','','age-journey-card'),name=c.querySelector('h3').textContent, sym=c.querySelector('.activity-symbol')?.textContent||'⭐';
   const cover=c.querySelector('.game-visual-cover');if(cover){item.dataset.gameTheme=r.id;item.append(cover.cloneNode(true))}else item.append(node('span',sym,'age-symbol'));item.append(node('h3',name),node('p',tr('المستويات '+r.first+'–'+r.last,'Levels '+r.first+'–'+r.last)),node('p',tr(r.completed+' من '+r.total+' مكتملة',r.completed+' of '+r.total+' complete'),'age-stat'));
   const target=r.sc.slice(r.first-1,r.last).findIndex(v=>!v)+r.first;
   const requested=r.completed===r.total?r.first:target;
   let actual=requested;
   if(actual>1&&!r.sc[actual-2]&&!r.sc[actual-1]){
    actual=r.sc.findIndex((v,i)=>!v&&(i===0||r.sc[i-1]))+1;
    if(actual<1)actual=1;
   }
   if(!suggested&&r.completed<r.total){item.classList.add('age-recommended');item.append(node('p',tr('مقترح لك الآن','Recommended next'),'age-next'));suggested=true}
   const label=actual<r.first?tr('ابدأ بالمستوى '+actual+' المطلوب','Start prerequisite level '+actual):r.completed===r.total?tr('راجع المستوى '+actual,'Review level '+actual):tr('العب المستوى '+actual,'Play level '+actual);
   item.append(link(c,actual,label));grid.append(item)
  }
  panel.append(grid);
  const resources=node('p','','age-resources');
  const a=node('a',tr('أوراق العمل والمواد التعليمية','Worksheets & learning materials'),'text-link');a.href=ar?'/grown-ups/':'/en/grown-ups/';
  const b=node('a',tr('شاهد الحلقات التعليمية','Watch learning episodes'),'text-link');b.href=ar?'/episodes/':'/en/episodes/';resources.append(a,b);panel.append(resources);
  if(done===total)panel.append(node('p',tr('أحسنت! أكملت رحلتك التعليمية. يمكنك طباعة شهادة الإنجاز من قسم المكافآت.','Well done! You completed your journey. Print your achievement certificate in the rewards section.'),'age-stat'));
 }
 for(const [age,label] of [['all',tr('جميع الألعاب','All games')],['3-5','3–5'],['6-7','6–7'],['8-10','8–10']]){
  const b=node('button',label,'age-tab');b.type='button';b.dataset.age=age;b.addEventListener('click',()=>{selected=age;saveAge(age);draw()});tabs.append(b)
 }
 draw();window.addEventListener('pageshow',draw);window.addEventListener('storage',draw)
}
