import {illustrate} from './learning-art.js?v=1';
import {bindJourney,shuffle} from './game-progress.js?v=8';
const game=JSON.parse(document.getElementById('game-data').textContent), ar=game.lang==='ar', tr=(a,e)=>ar?a:e;
const board=document.querySelector('[data-game]'), cue=board.querySelector('[data-cue]'), options=board.querySelector('[data-options]'), feedback=board.querySelector('[data-feedback]'), next=board.querySelector('[data-next]');
const el=(tag,txt='',cls='')=>{const n=document.createElement(tag);n.textContent=txt;if(cls)n.className=cls;return illustrate(n,txt)};
const btn=(txt,cb,cls='game-option')=>{const b=el('button',txt,cls);b.type='button';b.addEventListener('click',cb);return b};
const spaceTopics=['sun','earth','moon','mercury','venus','mars','jupiter','saturn','uranus','neptune','daynight','astronaut','galaxy','rocket','rocket'];
function spaceArt(id,cls='space-art'){const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg'),use=document.createElementNS(ns,'use');svg.setAttribute('class',cls);svg.setAttribute('viewBox','0 0 180 140');svg.setAttribute('aria-hidden','true');use.setAttribute('href','/assets/space-art.svg#'+id);svg.append(use);return svg}
function spaceScene(topic){const panel=el('div','','space-window'),sky=el('div','','space-sky');sky.setAttribute('aria-hidden','true');for(let i=0;i<12;i++){const st=el('i','','space-dot');st.dataset.dot=String(i);sky.append(st)}const badge=el('span',tr('نافذة المستكشف','Explorer window'),'space-window-label');panel.append(sky,spaceArt(topic),badge);return panel}
function render(round){
 const label=journey.roundLabel();board.querySelector('[data-progress]').textContent=label;const meter=board.querySelector('[data-visual-round-meter]');const numbers=label.match(/\d+/g)?.map(Number);if(meter&&numbers?.length>=3){meter.max=numbers[2];meter.value=Math.max(0,numbers[1]-1)}board.querySelector('[data-prompt]').textContent=round.prompt;
 cue.replaceChildren();options.replaceChildren();options.dataset.columns='1';feedback.textContent='';delete feedback.dataset.state;next.hidden=true;next.textContent=journey.nextLabel();let solved=false;
 const say=(t,state)=>{feedback.textContent=t;feedback.dataset.state=state||''};
 const wrong=()=>{if(!solved){journey.mistake();say(tr('جرّب مرة أخرى.','Try again.'),'wrong')}};
 const done=()=>{if(solved)return;solved=true;journey.solve();const meter=board.querySelector('[data-visual-round-meter]');if(meter)meter.value=Math.min(meter.max,meter.value+1);say(tr('أحسنت! أكملت الجولة.','Well done! Round complete.'),'correct');next.hidden=false};
 const group=el('div','','new-controls');options.append(group);if(game.id==='space-journey'){board.dataset.discovery='space';const index=(numbers?.[0]||1)-1;cue.append(spaceScene(spaceTopics[index]||'rocket'));}
 if(round.kind==='quiz'||round.kind==='pattern'){
  if(round.kind==='pattern'){
    const seq=el('div','','planet-pattern');seq.dir='ltr';
    seq.append(...round.sequence.map(x=>el('span',x,'planet-pattern-item')),el('span','?','planet-pattern-item planet-blank'));cue.append(seq);
  }else if(round.cue&&game.id!=='space-journey')cue.append(el('span',round.cue,'new-picture'));
  for(const value of shuffle(round.choices)){const b=btn(value,()=>{if(solved||b.disabled)return;if(value===round.answer){b.dataset.state='correct';done()}else{b.dataset.state='wrong';b.disabled=true;wrong()}});group.append(b)}
  return;
 }
 if(round.kind==='order'){
   let pos=0;const seq=el('div','','planet-pattern'),slots=round.target.map(()=>el('span','?','planet-pattern-item planet-blank'));seq.dir=/[\u0600-\u06FF]/.test(round.target[0])?'rtl':'ltr';seq.append(...slots);cue.append(seq);
   for(const value of shuffle(round.target)){const b=btn(value,()=>{if(solved||b.disabled)return;if(value!==round.target[pos]){wrong();return}slots[pos].textContent=value;slots[pos].classList.remove('planet-blank');pos++;b.disabled=true;journey.correct();if(pos===round.target.length)done()});group.append(b)}
   return;
 }
 if(round.kind==='spot'){
   const found=new Set(), wrap=el('div','','planet-spot-wrap'), n=round.cols;
   const stat=el('p','','new-total');
   function drawStat(){stat.textContent=tr('وجدت ','Found ')+found.size+' / '+round.differences.length}
   function grid(values,interactive){const g=el('div','','planet-spot-grid');g.dir='ltr';g.dataset.cols=String(n);
     values.forEach((v,i)=>{const label=tr('المربع ','Cell ')+(i+1)+': '+v;const cell=interactive?btn(v,()=>{if(solved||found.has(i))return;if(round.differences.includes(i)){found.add(i);cell.dataset.found='true';cell.disabled=true;drawStat();journey.correct();if(found.size===round.differences.length)done()}else wrong()},'planet-spot-cell'):el('span',v,'planet-spot-cell');cell.setAttribute('aria-label',label);g.append(cell)});return g}
   const left=el('section'),right=el('section');left.append(el('h3',tr('الصورة الأولى','First picture')),grid(round.before,false));right.append(el('h3',tr('الصورة الثانية: اضغط الاختلافات','Second picture: tap the differences')),grid(round.after,true));wrap.append(left,right);cue.append(stat,wrap);drawStat();return;
 }
}
const journey=bindJourney(game,board,render);next.addEventListener('click',journey.advance);
