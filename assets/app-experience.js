import {worldCover} from './world-art.js?v=1';
import {profiles,activeProfile,switchProfile,addProfile,avatars,scoresFor,read} from './profile-state.js?v=1';
import {ageGroups,ageLabel,agePreferenceKey,gameCounts,pathsForGame} from './game-age-paths.js?v=3';

const games=[["vowel-drive","سيارة الحركات","Arabic Vowel Drive","letters","🚗","mint","car"],["letter-match","صِل الحرف بالصورة","Match Letters to Pictures","letters","بَ","lilac","book"],["letter-hunt","اكتشف الحرف","Arabic Letter Hunt","letters","بَ","lilac","pencil"],["counting","عدّ واختر","Count & Pick","math","123","sun","apple"],["english-abc","العب مع ABC","Play with ABC","letters","ABC","sky","book"],["memory","ذاكرة فضول","Fudool Memory","puzzles","⭐","sun","star"],["trace","اكتب مع لُمعة","Write with Lumaa","letters","✏","lilac","pencil"],["robo-lab","مختبر روبو","Robo Lab","puzzles","🤖","sky","robot"],["puzzle","بازل كوكب فضول","Fudool Puzzle","puzzles","🧩","mint","puzzle"],["sound-quiz","خمّن الصوت","Guess the Sound","puzzles","🎧","sky","headphones"],["fudool-shop","متجر فضول","Fudool Shop","math","🛒","mint","coin"],["word-factory","مصنع الكلمات","Word Factory","letters","ب","lilac","book"],["lumaa-clock","ساعة لُمعة","Lumaa’s Clock","math","🕒","sky","clock"],["code-robo","برمج روبو","Code Robo","puzzles","🤖","sky","robot"],["world-mishaal","حول العالم مع مشعال","Around the World","science","🌍","mint","globe"],["planet-engineer","مهندس الكوكب","Planet Engineer","math","🔶","sun","shapes-diamond"],["healthy-hero","بطل العادات الصحية","Healthy Habits Hero","science","🍎","mint","apple"],["space-journey","رحلة إلى الفضاء","Journey to Space","science","🚀","lilac","rocket"],["spot-differences","اكتشف الاختلافات","Spot the Differences","puzzles","🔍","sun","puzzle"],["grand-challenge","تحدي فضول الكبير","Fudool Grand Challenge","puzzles","🏆","sun","crown"]].map(([id,...info])=>[id,gameCounts.get(id),...info]);
const ar=document.documentElement.lang==='ar',tr=(a,e)=>ar?a:e,pre=ar?'':'/en',profile=activeProfile(),root=document.querySelector('[data-app-dashboard]'),family=document.querySelector('[data-family-dashboard]');
const el=(tag,txt='',cls='')=>{const n=document.createElement(tag);n.textContent=txt;if(cls)n.className=cls;return n};
const name=p=>p.name||tr('المستكشف الأول','First explorer');
const image=(id,cls='')=>{const n=el('img','',cls);n.src='/assets/'+id+'.webp';n.alt='';n.loading='lazy';return n};
function link(text,href,cls=''){const n=el('a',text,cls);n.href=href;return n}
const entries=games.map(g=>({g,...scoresFor(g[0],g[1],profile.id)}));
const sum=a=>a.reduce((n,x)=>n+x,0),stars=sum(entries.map(e=>sum(e.scores))),completed=sum(entries.map(e=>e.scores.filter(Boolean).length));
function stats(target){for(const [num,label] of [[stars,tr('نجمة','Stars')],[completed,tr('مستوى مكتمل','Levels done')],[entries.filter(e=>e.scores.some(Boolean)).length,tr('لعبة بدأت بها','Games explored')]]){const c=el('div','','app-stat');c.append(el('strong',String(num)),el('span',label));target.append(c)}}
function profileList(target){for(const p of profiles()){const b=el('button','','app-profile-choice');b.type='button';b.setAttribute('aria-pressed',String(p.id===profile.id));b.append(image(p.avatar),el('span',name(p)));b.addEventListener('click',()=>{try{switchProfile(p.id);location.reload()}catch{alert(tr('تعذر تبديل الملف.','Could not switch profile.'))}});target.append(b)}}
function card(entry) {
  const [id, count, arabic, english, category, , tone] = entry.g;
  const button = link('', pre + '/games/' + id + '/', 'app-game-card');
  button.dataset.category = category;
  button.dataset.tone = tone;
  button.dataset.gameId = id;
  const art = el('div', '', 'app-game-art');
  art.append(worldCover(id));

  const copy = el('div', '', 'app-game-copy');
  const done = entry.scores.filter(Boolean).length;
  copy.append(el('strong', tr(arabic, english)),
    el('small', tr(done + ' / ' + count + ' مستوى', done + ' / ' + count + ' levels')));
  const bar = el('progress');
  bar.max = count;
  bar.value = done;
  bar.setAttribute('aria-label', tr('تقدم اللعبة', 'Game progress'));
  copy.append(bar, el('span', tr('العب الآن', 'Play now'), 'app-game-cta'));
  button.append(art, copy);
  return button;
}

for (const feature of document.querySelectorAll('[data-featured-world]')) {
  feature.replaceChildren(worldCover(feature.dataset.featuredWorld, true));
}
function mountGameFilters(grid, categories) {
  const cards = entries.map(card);
  grid.append(...cards);
  const key = agePreferenceKey(profile.id);
  const savedAge = read(key) ?? profile.age;
  let age = ageGroups.includes(savedAge) ? savedAge : 'all';
  let category = 'all';
  const filters = el('div', '', 'app-tabs app-age-tabs');
  filters.setAttribute('role', 'group');
  filters.setAttribute('aria-label', tr('الفئة العمرية', 'Age group'));
  categories.before(filters);

  function supports(item) {
    return age === 'all' || pathsForGame(item.dataset.gameId).some(path => path.age === age);
  }
  function render() {
    for (const button of filters.children) button.setAttribute('aria-pressed', String(button.dataset.appAge === age));
    for (const button of categories.children) {
      const type = button.dataset.category;
      button.disabled = type !== 'all' && !cards.some(item => supports(item) && item.dataset.category === type);
    }
    if (!cards.some(item => supports(item) && item.dataset.category === category)) category = 'all';
    for (const button of categories.children) button.setAttribute('aria-pressed', String(button.dataset.category === category));
    for (const item of cards) {
      const fits = supports(item);
      item.hidden = !fits || (category !== 'all' && item.dataset.category !== category);
      const url = new URL(item.href);
      if (age !== 'all' && fits) url.searchParams.set('path', age);
      else url.searchParams.delete('path');
      item.href = url.href;
    }
  }
  for (const group of ['all', ...ageGroups]) {
    const button = el('button', group === 'all' ? tr('كل الأعمار', 'All ages') : ageLabel(group, ar), 'app-tab');
    button.type = 'button';
    button.dataset.appAge = group;
    button.addEventListener('click', () => {
      age = group;
      try { localStorage.setItem(key, JSON.stringify(age)); } catch {}
      render();
    });
    filters.append(button);
  }
  for (const [id, label] of [
    ['all', tr('الكل', 'All')], ['letters', tr('الحروف', 'Letters')], ['math', tr('الأرقام', 'Math')],
    ['puzzles', tr('التحديات', 'Challenges')], ['science', tr('الاكتشاف', 'Discovery')],
  ]) {
    const button = el('button', label, 'app-tab');
    button.type = 'button';
    button.dataset.category = id;
    button.addEventListener('click', () => { category = id; render(); });
    categories.append(button);
  }
  render();
}

if (root) {
  const greeting = root.querySelector('[data-app-greeting]');
  greeting.textContent = tr('أهلًا، ' + name(profile) + '!', 'Hello, ' + name(profile) + '!');
  root.querySelector('[data-app-avatar]').replaceChildren(image(profile.avatar));
  stats(root.querySelector('[data-app-stats]'));
  const recent = [...entries].filter(entry =>
    entry.lastPlayed || entry.scores.some(Boolean) || Object.keys(entry.checkpoints).length
  ).sort((a,b) => b.lastPlayed - a.lastPlayed)[0] ?? entries.find(entry => entry.g[0] === 'sound-quiz');
  const resume = root.querySelector('[data-app-resume]');
  resume.href = pre + '/games/' + recent.g[0] + '/?continue=1';
  resume.querySelector('strong').textContent = tr(recent.g[2], recent.g[3]);
  resume.querySelector('[data-resume-caption]').textContent = recent.lastPlayed || recent.scores.some(Boolean)
    ? tr('تابع مغامرتك', 'Continue adventure') : tr('ابدأ مغامرتك', 'Start your adventure');
  resume.querySelector('[data-resume-art]').append(worldCover(recent.g[0]));
  mountGameFilters(root.querySelector('[data-app-games]'), root.querySelector('[data-app-tabs]'));
  profileList(root.querySelector('[data-profile-list]'));
}
if(family){family.querySelector('[data-family-name]').textContent=name(profile);profileList(family.querySelector('[data-profile-list]'));stats(family.querySelector('[data-app-stats]'));const rows=family.querySelector('[data-report-rows]');for(const e of entries){const row=el('div','','app-report-row'),bar=el('progress');bar.max=e.g[1];bar.value=e.scores.filter(Boolean).length;bar.setAttribute('aria-label',tr('المستويات المكتملة','Completed levels'));row.append(el('strong',tr(e.g[2],e.g[3])),el('span',bar.value+' / '+bar.max+' · '+sum(e.scores)+' ★'),bar);rows.append(row)}
const form=family.querySelector('form'),status=family.querySelector('[data-profile-message]');if(profiles().length>=6)form.hidden=true;form.addEventListener('submit',e=>{e.preventDefault();try{const fd=new FormData(form);addProfile(String(fd.get('nickname')),String(fd.get('avatar')),String(fd.get('age')));location.reload()}catch{status.textContent=tr('تعذر إنشاء الملف. استخدم اسمًا مستعارًا قصيرًا أو تحقق من مساحة التخزين.','Could not create profile. Use a short nickname or check storage.')}});}
