import {createIllustration} from './learning-art.js?v=2';

const ar=document.documentElement.lang==='ar',tr=(a,e)=>ar?a:e;
const worlds={
 'letter-match':['lilac','lumaa.webp','الحروف','Letters'],'letter-hunt':['lilac','lumaa.webp','الحروف','Letters'],'vowel-drive':['sky','mishal.webp','الحركات','Vowels'],'trace':['lilac','lumaa.webp','الكتابة','Writing'],'counting':['sun','lumaa.webp','الأعداد','Numbers'],'english-abc':['sky','lumaa.webp','الإنجليزية','English'],'robo-lab':['mint','robot.webp','العلوم','Science'],'memory':['mint','lumaa.webp','الذاكرة','Memory'],'puzzle':['sun','lumaa.webp','الألغاز','Puzzles'],'sound-quiz':['lilac','lumaa.webp','الأصوات','Sounds'],'fudool-shop':['sun','lumaa.webp','الحساب','Maths'],'word-factory':['lilac','lumaa.webp','الكلمات','Words'],'lumaa-clock':['sky','lumaa.webp','الوقت','Time'],'code-robo':['mint','robot.webp','البرمجة','Coding'],'world-mishaal':['sky','mishal.webp','الجغرافيا','Geography'],'planet-engineer':['lilac','robot.webp','الهندسة','Geometry'],'healthy-hero':['mint','mishal.webp','الصحة','Health'],'space-journey':['space','robot.webp','الفضاء','Space'],'spot-differences':['sun','lumaa.webp','الملاحظة','Observation'],'grand-challenge':['rose','mishal.webp','التحدي','Challenge']};
const el=(tag,cls='',text='')=>{const n=document.createElement(tag);n.className=cls;n.textContent=text;return n};
function star(filled){const ns='http://www.w3.org/2000/svg',s=document.createElementNS(ns,'svg'),p=document.createElementNS(ns,'path');s.setAttribute('viewBox','0 0 64 64');s.setAttribute('aria-hidden','true');s.setAttribute('class',filled?'reward-star earned':'reward-star empty');p.setAttribute('d','M32 4 40.5 21.5 60 24 46 38 49.5 58 32 48.5 14.5 58 18 38 4 24 23.5 21.5Z');s.append(p);return s}
function meter(value,max,label){const p=el('progress','reward-meter');p.max=Math.max(1,max);p.value=Math.min(value,max);p.setAttribute('aria-label',label);return p}
function stat(value,label){const n=el('div','reward-stat');n.append(el('strong','',String(value)),el('span','',label));return n}
function milestone(total,badges){const next=badges.find(([n])=>n>total),box=el('div','reward-milestone');if(next){box.append(el('strong','',tr('الوسام التالي: ','Next badge: ')+next[2]),meter(total,next[0],tr('التقدم نحو الوسام التالي','Progress toward next badge')),el('small','',tr('بقيت '+(next[0]-total)+' نجمة',' '+(next[0]-total)+' stars to go')))}else box.append(el('strong','',tr('جمعت جميع الأوسمة!','All badges earned!')));return box}
function scenery(id, className) {
  const picture = el('img', className);
  picture.src = '/assets/worlds/' + id + '.webp';
  picture.alt = '';
  picture.loading = 'lazy';
  picture.decoding = 'async';
  picture.setAttribute('aria-hidden', 'true');
  return picture;
}

export function setupWorld(id, board, map, result) {
  const theme = worlds[id] || worlds['letter-match'];
  for (const panel of [board, map, result]) panel.dataset.rewardWorld = theme[0];
  const guide = result.querySelector('img');
  if (guide) {
    guide.src = '/assets/' + theme[1];
    guide.classList.add('reward-mascot');
  }
  result.classList.add('reward-celebration');

  const banner = el('div', 'reward-world-banner');
  const mascot = el('img', 'reward-guide');
  mascot.src = '/assets/' + theme[1];
  mascot.alt = '';
  mascot.width = 56;
  mascot.height = 56;
  banner.append(mascot, el('span', '', tr('عالم ' + theme[2], theme[3] + ' world')));
  board.prepend(scenery(id, 'world-play-scenery'), banner);
}

export function renderTrailStage(id, number, levels) {
  const stage = el('section', 'fudool-level-world');
  const trail = el('div', 'world-trail');
  const heading = el('h3', '', tr('رحلة ' + number, 'Journey ' + number));
  trail.append(...levels);
  stage.append(scenery(id, 'world-trail-scenery'), heading, trail);
  return stage;
}

export function updateMap(map,scores){let summary=map.querySelector('.reward-map-summary');if(!summary){summary=el('div','reward-map-summary');map.querySelector('[data-level-list]').before(summary)}const complete=scores.filter(Boolean).length,total=scores.reduce((a,b)=>a+b,0);summary.replaceChildren(stat(complete+' / '+scores.length,tr('مستويات مكتملة','Levels complete')),stat(total+' / '+scores.length*3,tr('نجوم اللعبة','Game stars')),meter(complete,scores.length,tr('تقدم اللعبة','Game progress')))}
export function decorateLevel(button,index,score,locked){button.dataset.rewardState=locked?'locked':score?'complete':'available';const orb=el('span','reward-level-orb',String(index+1));orb.setAttribute('aria-hidden','true');button.prepend(orb);if(score){const row=el('span','reward-level-stars');row.setAttribute('aria-hidden','true');for(let i=0;i<3;i++)row.append(star(i<score));button.append(row)}}
export function celebrate(result,{score,best,total,scores,badges,level,rounds,last,previousTotal}){let panel=result.querySelector('.reward-detail');if(!panel){panel=el('div','reward-detail');result.querySelector('[data-result-message]').after(panel)}const earned=el('div','reward-earned-stars');earned.setAttribute('aria-hidden','true');for(let i=0;i<3;i++)earned.append(star(i<score));const stats=el('div','reward-stats');stats.append(stat(rounds,tr('جولات مكتملة','Rounds complete')),stat(best+' / 3',tr('أفضل نتيجة','Best score')),stat(total,tr('إجمالي النجوم','Total stars')));const crossed=badges.filter(([n])=>n>previousTotal&&n<=total).at(-1);const note=el('p','reward-unlock',crossed?tr('وسام جديد! ','New badge! ')+crossed[2]:last?tr('أكملت جميع مستويات هذه اللعبة!','All levels in this game completed!'):tr('المستوى التالي جاهز للاستكشاف!','Your next level is ready!'));panel.replaceChildren(earned,stats,note,milestone(total,badges));if(crossed||last){const trophy=el('div','world-reward-trophy');trophy.append(createIllustration(last?'trophy':crossed[1]));panel.prepend(trophy)}const burst=el('div','reward-burst');burst.setAttribute('aria-hidden','true');for(let i=0;i<12;i++){const p=el('i','reward-spark');p.dataset.spark=String(i);burst.append(p)}panel.append(burst);result.dataset.rewardScore=String(score);result.classList.remove('reward-animate');void result.offsetWidth;result.classList.add('reward-animate')}
export function enhanceRewards(rewards,total,badges,max){let panel=rewards.querySelector('.reward-hub-summary');if(!panel){panel=el('div','reward-hub-summary');rewards.querySelector('[data-total-stars]').after(panel)}panel.replaceChildren(meter(total,max,tr('تقدم جميع الألعاب','All games progress')),milestone(total,badges))}
