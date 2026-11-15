const bySelector = (selector, root = document) => root.querySelector(selector);
const menu = bySelector('.mobile-nav');
menu.addEventListener('click', (event) => {
  if (event.target.closest('nav a')) menu.open = false;
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menu.open) {
    menu.open = false;
    bySelector('summary', menu).focus();
  }
});
document.addEventListener('pointerdown', (event) => {
  if (menu.open && !menu.contains(event.target)) menu.open = false;
});

const filter = bySelector('[data-filter]');
if (filter) {
  const scope = filter.closest('[data-filter-scope]');
  const cards = [...scope.querySelectorAll('[data-category]')];
  const empty = bySelector('[data-empty]', scope);
  const practiceSections = [...document.querySelectorAll('[data-practice-kind]')];
  const buttons = [...filter.querySelectorAll('button')];
  filter.hidden = false;
  filter.addEventListener('click', (event) => {
    const button = event.target.closest('[data-kind]');
    if (!button) return;
    const kind = button.dataset.kind;
    buttons.forEach((entry) => entry.setAttribute('aria-pressed', String(entry === button)));
    cards.forEach((card) => { card.hidden = kind !== 'all' && kind !== card.dataset.category; });
    practiceSections.forEach((section) => { section.hidden = kind !== 'all' && kind !== section.dataset.practiceKind; });
    empty.hidden = cards.some((card) => !card.hidden);
  });
}

const loader = bySelector('[data-load-video]');
if (loader) {
  loader.hidden = false;
  loader.addEventListener('click', () => {
    const frame = document.createElement('iframe');
    frame.src = 'https://www.youtube-nocookie.com/embed/' + loader.dataset.loadVideo;
    frame.title = loader.dataset.videoTitle;
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.allow = 'encrypted-media; picture-in-picture; fullscreen';
    frame.allowFullscreen = true;
    bySelector('[data-player]').replaceChildren(frame);
    loader.hidden = true;
    frame.focus();
  }, { once:true });
}

const printButton = bySelector('[data-print]');
if (printButton) {
  printButton.hidden = false;
  printButton.addEventListener('click', () => window.print());
}

function showAnswer(options, button, feedback, correct, messages) {
  const state = correct ? 'correct' : 'wrong';
  options.querySelectorAll('button').forEach((option) => delete option.dataset.state);
  button.dataset.state = state;
  feedback.dataset.state = state;
  feedback.textContent = correct ? messages.correct : messages.retry;
}

const letterQuestion = bySelector('[data-letter-question]');
if (letterQuestion) {
  const options = bySelector('.game-options', letterQuestion);
  const feedback = bySelector('[data-letter-feedback]', letterQuestion);
  const buttons = options.querySelectorAll('button');
  options.addEventListener('click', (event) => {
    const button = event.target.closest('[data-letter-answer]');
    if (!button) return;
    buttons.forEach((option) => option.setAttribute('aria-pressed', String(option === button)));
    showAnswer(options, button, feedback, button.dataset.letterAnswer === 'correct', letterQuestion.dataset);
  });
  letterQuestion.hidden = false;
}

document.addEventListener('click', (event) => {
  const link = event.target.closest('a[data-youtube]');
  if (link) document.dispatchEvent(new CustomEvent('fudool:youtube-click', {
    detail: { destination:link.dataset.youtube },
  }));
});

/* Shared visual layer: no game logic or saved data changes. */
(()=>{const scenes={"vowel-drive":"car-scene","letter-match":"letters","letter-hunt":"hunt","counting":"count","english-abc":"abc","memory":"memory","trace":"trace","robo-lab":"lab-scene","puzzle":"puzzle","sound-quiz":"sound","fudool-shop":"shop","word-factory":"words","lumaa-clock":"clock","code-robo":"code","world-mishaal":"world","planet-engineer":"engineer","healthy-hero":"health","space-journey":"rocket-scene","spot-differences":"spot","grand-challenge":"challenge"},ns='http://www.w3.org/2000/svg',ar=document.documentElement.lang==='ar',pre=ar?'':'/en',native=/FudoolAndroid/.test(navigator.userAgent);
function art(id){const wrap=document.createElement('span'),svg=document.createElementNS(ns,'svg'),u=document.createElementNS(ns,'use');wrap.className='premium-game-cover';svg.setAttribute('viewBox','0 0 240 180');svg.setAttribute('aria-hidden','true');u.setAttribute('href','/assets/fudool-premium-art.svg#'+scenes[id]);svg.append(u);wrap.append(svg);return wrap}
const shell=document.querySelector('.game-shell'),id=location.pathname.match(/\/(?:en\/)?games\/([^/]+)\//)?.[1];
if(shell&&scenes[id]){document.body.classList.add('premium-game-page');shell.dataset.premiumGame=id;const intro=shell.querySelector('.simple-intro');if(intro){const banner=document.createElement('div');banner.className='premium-game-heading';intro.before(banner);banner.append(intro,art(id));}
const back=document.createElement('a');back.className='premium-game-back';back.href=native?pre+'/play-app/#v5-games':pre+'/games/';back.textContent=ar?'كل الألعاب':'All games';shell.prepend(back);
if(native)shell.addEventListener('click',e=>{const a=e.target.closest('a[href]');if(!a)return;let u;try{u=new URL(a.href)}catch{return}if(u.origin!==location.origin)return;if(/^\/(?:en\/)?(?:series|grown-ups|episodes)\//.test(u.pathname)){e.preventDefault();location.assign('/play-app/external/?url='+encodeURIComponent('https://kokabfodool.com'+u.pathname+u.search+u.hash))}});}
if(document.querySelector('.games-grid')){document.body.classList.add('premium-library-page');document.querySelectorAll('.activity-card[data-game-id]').forEach(c=>{const id=c.dataset.gameId;if(!scenes[id]||c.querySelector('.premium-game-cover'))return;c.classList.add('premium-library-card');c.prepend(art(id));});}
})();
