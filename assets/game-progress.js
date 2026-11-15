import {activeProfile,prefix} from './profile-state.js?v=1';
import {setupWorld,updateMap,decorateLevel,renderTrailStage,celebrate,enhanceRewards} from './reward-worlds.js?v=2';
import {createIllustration} from './learning-art.js?v=2';
import { bindGameAudio } from './game-audio.js?v=5';

const language = document.documentElement.lang;
const tr = (ar, en) => language === 'ar' ? ar : en;
const profile=activeProfile();
const storageKey = prefix(profile.id);
function profileChanged(){if(activeProfile().id!==profile.id)location.reload()}
window.addEventListener('storage',profileChanged);window.addEventListener('pageshow',profileChanged);
const memory = new Map();
const starBadges = [
  [5, 'seedling', tr('بداية مشرقة', 'Bright start')],
  [20, 'rocket', tr('مستكشف الكوكب', 'Planet explorer')],
  [40, 'award', tr('صديق لُمعة', 'Lumaa’s friend')],
  [60, 'trophy', tr('بطل كوكب فضول', 'Kawkab Fudool champion')],
  [78, 'crown', tr('وسام التحدّي الكبير', 'Grand challenge badge')],
  [150,'rocket',tr('رائد الكوكب','Planet pioneer')],
  [225,'star',tr('نجم الكوكب','Planet star')],
  [300,'award',tr('مستكشف العوالم','World explorer')],
  [375,'crown',tr('ملك الكوكب','Planet champion')],
  [450,'rocket',tr('رائد النجوم','Star voyager')],
  [555,'trophy',tr('بطل جميع العوالم','All-world champion')],
  [675,'galaxy',tr('نجم المجرة','Galaxy star')],
  [825,'crown',tr('أسطورة كوكب فضول','Fudool legend')],
];

function read(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}

const legacy = profile.id==='default'?read('kokab-games-v2'):null;

function progress(id, levelCount) {
  const saved = memory.get(id) ?? read(storageKey + id);
  const scores = Array.from({length: levelCount}, (_, i) => {
    const valid = [saved?.scores?.[i], legacy?.[id]?.[i]]
      .filter((score) => Number.isInteger(score) && score >= 1 && score <= 3);
    return Math.max(0, ...valid);
  });
  return {scores, checkpoints: {...saved?.checkpoints}, lastPlayed: saved?.lastPlayed, lastLevel: saved?.lastLevel, orders: {...saved?.orders}};
}

function save(id, levelCount, update) {
  const old=memory.get(id)??read(storageKey+id);
  const effectiveCount=Math.max(levelCount,Array.isArray(old?.scores)?old.scores.length:0);
  const state = progress(id, effectiveCount);
  update(state);
  try {
    localStorage.setItem(storageKey + id, JSON.stringify(state));
    memory.delete(id);
  } catch {
    memory.set(id, state);
  }
}

const gameCounts = new Map(Object.entries({"vowel-drive":15,"letter-match":12,"letter-hunt":15,"counting":18,"english-abc":15,"memory":10,"trace":10,"robo-lab":10,"puzzle":10,"sound-quiz":10,"fudool-shop":15,"word-factory":15,"lumaa-clock":10,"code-robo":20,"world-mishaal":15,"planet-engineer":15,"healthy-hero":10,"space-journey":15,"spot-differences":15,"grand-challenge":20}));
const starCount = (scores) => scores.reduce((total, score) => total + score, 0);
export const totalStars = () => [...gameCounts].reduce((total, [id, count]) => total + starCount(progress(id, count).scores), 0);
const starText = (score) => tr(`${score} من 3 نجوم`, `${score} of 3 stars`);

function renderRewards(rewards) {
  const total = totalStars();
  const max = [...gameCounts.values()].reduce((sum, count) => sum + count, 0) * 3;
  rewards.querySelector('[data-total-stars]').textContent = tr(`${total} من ${max} نجمة`, `${total} of ${max} stars`);
  const badges = starBadges.map(([threshold, icon, title]) => {
    const item = document.createElement('li');
    item.dataset.earned = String(total >= threshold);
    const earned = total >= threshold;
    const badgeArt = createIllustration(earned ? icon : 'lock');
    badgeArt.classList.add('world-icon');
    const label = earned ? title + ' ✓' : title + ' · ' + tr(threshold + ' نجمة', threshold + ' stars');
    item.append(badgeArt, document.createTextNode(label));
    return item;
  });
  rewards.querySelector('[data-game-badges]').replaceChildren(...badges);
  document.querySelectorAll('[data-game-summary]').forEach((summary) => {
    const count = gameCounts.get(summary.dataset.gameSummary);
    const completed = progress(summary.dataset.gameSummary, count).scores.filter(Boolean).length;
    summary.textContent = tr(`${completed} من ${count} مستويات مكتملة`, `${completed} of ${count} levels complete`);
  });
  const album=rewards.querySelector('[data-character-album]');
  if(album){const heading=document.createElement('h3');heading.textContent=tr('ألبوم الشخصيات','Character album');const grid=document.createElement('div');grid.className='fudool-album-grid';for(const [threshold,image,a,e] of [[0,'brand.webp','كوكب فضول','Kawkab Fudool'],[20,'lumaa.webp','لُمعة','Lumaa'],[40,'robo.webp','روبو','Robo'],[75,'mishal.webp','مشعال','Mishal']]){const item=document.createElement('div');const img=document.createElement('img');img.src='/assets/'+image;img.alt='';img.className=total>=threshold?'':'album-locked';const label=document.createElement('span');label.textContent=total>=threshold?tr(a,e):tr(threshold+' نجمة',threshold+' stars');item.append(img,label);grid.append(item);}album.replaceChildren(heading,grid);}
  enhanceRewards(rewards,total,starBadges,max);
  rewards.hidden = false;
}

const rewards = document.querySelector('[data-game-rewards]');
const cert=document.querySelector('[data-certificate]');
if(cert)cert.addEventListener('click',()=>{const total=totalStars();const section=document.createElement('section');section.className='fudool-certificate';const h=document.createElement('h1');h.textContent=tr('شهادة إنجاز من كوكب فضول','Kawkab Fudool Achievement Certificate');const p=document.createElement('p');p.textContent=tr(`أحسنت يا مستكشفنا الصغير! جمعت ${total} نجمة.`,`Well done, little explorer! You earned ${total} stars.`);const img=document.createElement('img');img.src='/assets/lumaa.webp';img.alt='';section.append(img,h,p);document.body.append(section);const clean=()=>section.remove();window.addEventListener('afterprint',clean,{once:true});window.print();});
if (rewards) {
  renderRewards(rewards);
  window.addEventListener('pageshow', () => renderRewards(rewards));
  window.addEventListener('storage', () => renderRewards(rewards));
}

const resume = document.querySelector('[data-home-resume]');
if (resume) {
  const link = resume.querySelector('[data-resume-link]');
  const title = resume.querySelector('[data-resume-title]');
  const cards = [...document.querySelectorAll('#play .activity-card')];

  function renderResume() {
    const active = cards.map((card) => {
      const state = progress(card.dataset.gameId, Number(card.dataset.levelCount));
      const checkpoint = Object.values(state.checkpoints).some((entry) => Number.isInteger(entry?.round) && entry.round >= 0);
      const stars = starCount(state.scores);
      return {card, checkpoint, stars, lastPlayed: Number(state.lastPlayed) || 0};
    }).filter(({checkpoint, stars, lastPlayed}) => checkpoint || stars || lastPlayed)
      .sort((a, b) => b.lastPlayed - a.lastPlayed || Number(b.checkpoint) - Number(a.checkpoint) || b.stars - a.stars)[0];
    resume.hidden = !active;
    if (!active) return;
    const url = new URL(active.card.href);
    url.searchParams.set('continue', '1');
    link.href = url.href;
    title.textContent = active.card.querySelector('h3').textContent;
    link.setAttribute('aria-label', `${link.textContent.trim()} ${title.textContent}`);
  }

  renderResume();
  window.addEventListener('pageshow', renderResume);
  window.addEventListener('storage', renderResume);
}

export function shuffle(values) {
  const items = [...values];
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

export function bindJourney({id, levels}, board, renderRound) {
  const playSound = bindGameAudio(document.querySelector('[data-game-sound]'));
  const map = document.querySelector('[data-level-map]');
  const list = map.querySelector('[data-level-list]');
  const result = document.querySelector('[data-level-result]');
  const nextLevel = result.querySelector('[data-level-next]');
  let level = 0;
  let round = 0;
  let mistakes = 0;
  let solved = false;
  let roundOrder = null;
  let previousTotal = totalStars();
  setupWorld(id,board,map,result);

  function show(panel, focus = true) {
    for (const section of [map, board, result]) section.hidden = section !== panel;
    if (focus) panel.querySelector('h2').focus();
  }

  function showMap(focus = true) {
    const {scores, checkpoints} = progress(id, levels.length);
    updateMap(map,scores);
    const buttons=levels.map(({title}, index) => {
      const locked = index > 0 && !scores[index - 1] && !scores[index];
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'game-level';
      button.disabled = locked;
      const number = document.createElement('strong');
      number.className = 'sr-only';
      number.textContent = tr(`المستوى ${index + 1}`, `Level ${index + 1}`);
      const label = document.createElement('span');
      label.className = 'reward-level-title';
      label.textContent = title;
      const status = document.createElement('small');
      status.textContent = locked ? tr('مغلق', 'Locked') :
        Number.isInteger(checkpoints[index]?.round) ? tr('تابع اللعب', 'Continue playing') :
        scores[index] ? tr('مكتمل', 'Completed') : tr('ابدأ اللعب', 'Start playing');
      button.append(number, label, status);
      decorateLevel(button,index,scores[index],locked);
      button.addEventListener('click', () => start(index));
      return button;
    });
    const stages = [];
    for (let i = 0; i < buttons.length; i += 5) {
      stages.push(renderTrailStage(id, Math.floor(i / 5) + 1, buttons.slice(i, i + 5)));
    }
    list.replaceChildren(...stages);
    show(map, focus);
  }

  function playRound() {
    solved = false;
    show(board, false);
    renderRound(levels[level].rounds[roundOrder?.[round] ?? round]);
    board.querySelector('h2').focus();
  }

  function start(index, replay = false) {
    level = index;
    previousTotal = totalStars();
    const length=levels[level].rounds.length;
    const previous=progress(id, levels.length);
    const existing=previous.orders[level];
    const validOrder=Array.isArray(existing)&&existing.length===length&&new Set(existing).size===length&&existing.every(x=>Number.isInteger(x)&&x>=0&&x<length);
    const unfinished=previous.checkpoints[level];
    roundOrder=replay||(!unfinished&&previous.scores[level])?shuffle(Array.from({length},(_,i)=>i)):validOrder?existing:null;
    save(id, levels.length, (state) => {
      state.lastPlayed = Date.now();
      state.lastLevel = level;
      if(roundOrder)state.orders[level]=roundOrder;else delete state.orders[level];
      if(replay)delete state.checkpoints[level];
    });
    const checkpoint = replay ? null : progress(id, levels.length).checkpoints[level];
    const valid = Number.isInteger(checkpoint?.round) && checkpoint.round >= 0 &&
      checkpoint.round < levels[level].rounds.length && Number.isInteger(checkpoint.mistakes) && checkpoint.mistakes >= 0;
    round = valid ? checkpoint.round : 0;
    mistakes = valid ? checkpoint.mistakes : 0;
    playRound();
  }

  function score() {
    return mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
  }

  function showResult() {
    const last = level === levels.length - 1;
    const total = totalStars();
    result.querySelector('h2').textContent = last
      ? tr('أكملت مستويات اللعبة!', `You finished all ${levels.length} levels!`)
      : tr(`أكملت المستوى ${level + 1}!`, `Level ${level + 1} complete!`);
    result.querySelector('[data-result-stars]').textContent = starText(score());
    const best = progress(id, levels.length).scores[level];
    result.querySelector('[data-result-message]').textContent = best > score()
      ? tr(`أفضل نتيجة لك: ${starText(best)}`, `Your best: ${starText(best)}`)
      : tr('أحسنت! كل جولة تجعلك أفضل.', 'Well done! Keep exploring.');
    const badges = result.querySelector('[data-result-badges]');
    const unlocked = starBadges.filter(([threshold]) => total >= threshold).at(-1);
    badges.hidden = !unlocked;
    badges.replaceChildren();
    if (unlocked) {
      const badgeArt = createIllustration(unlocked[1]);
      badgeArt.classList.add('world-icon');
      badges.append(badgeArt, document.createTextNode(unlocked[2]));
    }
    nextLevel.hidden = last;
    show(result);
    celebrate(result,{score:score(),best,total,scores:progress(id,levels.length).scores,badges:starBadges,level,rounds:levels[level].rounds.length,last,previousTotal});
  }

  document.querySelectorAll('[data-level-menu]').forEach((button) => button.addEventListener('click', () => showMap()));
  nextLevel.addEventListener('click', () => start(level + 1));
  result.querySelector('[data-level-replay]').addEventListener('click', () => start(level, true));
  window.addEventListener('pageshow', (event) => { if (event.persisted && !map.hidden) showMap(false); });
  window.addEventListener('storage', () => { if (!map.hidden) showMap(false); });
  const requested = Number(new URLSearchParams(location.search).get('level')) - 1;
  const requestedScores = progress(id, levels.length).scores;
  if (Number.isInteger(requested) && requested >= 0 && requested < levels.length && (requested === 0 || requestedScores[requested-1] || requestedScores[requested])) {
    queueMicrotask(() => start(requested));
  } else if (new URLSearchParams(location.search).get('continue') === '1') {
    const {scores, checkpoints, lastLevel} = progress(id, levels.length);
    const unlocked = levels.map((_, index) => index).filter((index) => index === 0 || scores[index - 1] || scores[index]);
    const checkpoint = unlocked.findLast((index) => Number.isInteger(checkpoints[index]?.round));
    const next = unlocked.find((index) => !scores[index]);
    const recent = unlocked.includes(lastLevel) && (!scores[lastLevel] || checkpoints[lastLevel]) ? lastLevel : undefined;
    queueMicrotask(() => start(recent ?? checkpoint ?? next ?? unlocked.at(-1)));
  } else {
    showMap(false);
  }

  return {
    roundLabel: () => tr(`المستوى ${level + 1} · الجولة ${round + 1} من ${levels[level].rounds.length}`,
      `Level ${level + 1} · Round ${round + 1} of ${levels[level].rounds.length}`),
    nextLabel: () => round + 1 === levels[level].rounds.length
      ? tr('شاهد النتيجة', 'See result') : tr('الجولة التالية', 'Next round'),
    mistake() {
      mistakes++;
      save(id, levels.length, (state) => {
        state.checkpoints[level] = {round, mistakes};
        state.lastPlayed = Date.now();
        state.lastLevel = level;
      });
      playSound('wrong');
    },
    correct: () => playSound('correct'),
    solve() {
      if (solved) return;
      solved = true;
      playSound('correct', round + 1 === levels[level].rounds.length);
      save(id, levels.length, (state) => {
        const {scores, checkpoints} = state;
        state.lastPlayed = Date.now();
        state.lastLevel = level;
        if (round + 1 < levels[level].rounds.length) {
          checkpoints[level] = {round: round + 1, mistakes};
        } else {
          scores[level] = Math.max(scores[level], score());
          delete checkpoints[level];
        }
      });
    },
    advance() {
      if (!solved) return;
      if (round + 1 === levels[level].rounds.length) showResult();
      else {
        round++;
        playRound();
      }
    },
  };
}
