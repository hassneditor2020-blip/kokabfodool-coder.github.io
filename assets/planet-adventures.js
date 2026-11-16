import {createIllustration, illustrate} from './learning-art.js?v=2';
import {bindJourney,shuffle} from './game-progress.js?v=14';
const game=JSON.parse(document.getElementById('game-data').textContent), ar=game.lang==='ar', tr=(a,e)=>ar?a:e;
const board=document.querySelector('[data-game]'), cue=board.querySelector('[data-cue]'), options=board.querySelector('[data-options]'), feedback=board.querySelector('[data-feedback]'), next=board.querySelector('[data-next]');
const el=(tag,txt='',cls='')=>{const n=document.createElement(tag);n.textContent=txt;if(cls)n.className=cls;return illustrate(n,txt)};
const btn=(txt,cb,cls='game-option')=>{const b=el('button',txt,cls);b.type='button';b.addEventListener('click',cb);return b};
const spaceTopics=['sun','earth','moon','mercury','venus','mars','jupiter','saturn','uranus','neptune','daynight','astronaut','galaxy','rocket','rocket'];
function spaceArt(id) {
  if (id !== 'daynight') {
    const picture = createIllustration(id === 'moon' ? 'full-moon' : id);
    picture.classList.add('space-art');
    return picture;
  }
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  const use = document.createElementNS(ns, 'use');
  svg.setAttribute('class', 'space-art');
  svg.setAttribute('viewBox', '0 0 180 140');
  svg.setAttribute('aria-hidden', 'true');
  use.setAttribute('href', '/assets/space-art.svg#daynight');
  svg.append(use);
  return svg;
}
function spaceScene(topic){const panel=el('div','','space-window'),sky=el('div','','space-sky');sky.setAttribute('aria-hidden','true');for(let i=0;i<12;i++){const st=el('i','','space-dot');st.dataset.dot=String(i);sky.append(st)}const badge=el('span',tr('نافذة المستكشف','Explorer window'),'space-window-label');panel.append(sky,spaceArt(topic),badge);return panel}
const geoShapes={'🔺':['polygon','60,13 108,102 12,102','#f18a9e'],'🟦':['rect',[19,19,82,82],'#78b8ed'],'🔴':['circle',[60,60,43],'#ee7b91'],'🔶':['polygon','60,7 105,60 60,113 15,60','#f4b866'],'▭':['rect',[9,31,102,58],'#91d4b9'],'🟢':['circle',[60,60,43],'#78c99e'],'🟣':['circle',[60,60,43],'#b69bea'],'🟨':['rect',[19,19,82,82],'#f4cf70'],'🔷':['polygon','60,7 105,60 60,113 15,60','#80bfee'],'⬛':['rect',[19,19,82,82],'#4b4660'],'⭐':['polygon','60,7 75,43 114,47 85,74 94,112 60,92 26,112 35,74 6,47 45,43','#ffd269']};
function engineeringShape(value){const data=geoShapes[value];if(!data)return null;const [kind,coords,color]=data,ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg'),shape=document.createElementNS(ns,kind);svg.setAttribute('viewBox','0 0 120 120');svg.setAttribute('class','geo-art');svg.setAttribute('aria-hidden','true');const attrs=kind==='polygon'?{points:coords}:kind==='rect'?{x:coords[0],y:coords[1],width:coords[2],height:coords[3]}:{cx:coords[0],cy:coords[1],r:coords[2]};for(const [k,v] of Object.entries({...attrs,fill:color,stroke:'#51416e','stroke-width':3,'stroke-linejoin':'round'}))shape.setAttribute(k,v);svg.append(shape);return svg}
function geoTile(node,value){const art=engineeringShape(value);if(art){node.replaceChildren(art);node.classList.add('geo-tile');node.setAttribute('aria-label',value)}return node}
function render(round){
 const label=journey.roundLabel();board.querySelector('[data-progress]').textContent=label;const meter=board.querySelector('[data-visual-round-meter]');const numbers=label.match(/\d+/g)?.map(Number);if(meter&&numbers?.length>=3){meter.max=numbers[2];meter.value=Math.max(0,numbers[1]-1)}board.querySelector('[data-prompt]').textContent=round.prompt;
 cue.replaceChildren();options.replaceChildren();options.dataset.columns='1';feedback.textContent='';delete feedback.dataset.state;next.hidden=true;next.textContent=journey.nextLabel();let solved=false;
 const say=(t,state)=>{feedback.textContent=t;feedback.dataset.state=state||''};
 const wrong=()=>{if(!solved){journey.mistake();say(tr('جرّب مرة أخرى.','Try again.'),'wrong')}};
 const done=()=>{if(solved)return;solved=true;journey.solve();const meter=board.querySelector('[data-visual-round-meter]');if(meter)meter.value=Math.min(meter.max,meter.value+1);say(round.explanation??tr('أحسنت! أكملت الجولة.','Well done! Round complete.'),'correct');next.hidden=false};
 const group=el('div','','new-controls');options.append(group);if(game.id==='planet-engineer'){board.dataset.discovery='engineering';}if(game.id==='space-journey'){board.dataset.discovery='space';const index=(numbers?.[0]||1)-1;cue.append(spaceScene(spaceTopics[index]||'rocket'));}
 if(round.kind==='quiz'||round.kind==='pattern'){
  if(round.kind==='pattern'){
    const seq=el('div','','planet-pattern');seq.dir='ltr';
    seq.append(...round.sequence.map(x=>game.id==='planet-engineer'?geoTile(el('span','','planet-pattern-item'),x):el('span',x,'planet-pattern-item')),el('span','?','planet-pattern-item planet-blank'));if(game.id==='planet-engineer'){const lab=el('div','','engineering-lab'),heading=el('span',tr('مختبر الأنماط','Pattern laboratory'),'engineering-title');lab.append(heading,seq);cue.append(lab)}else cue.append(seq);
  }else if(round.cue&&game.id!=='space-journey'){if(game.id==='planet-engineer'){const lab=el('div','','engineering-lab');lab.append(el('span',tr('مختبر الأشكال','Shape laboratory'),'engineering-title'),geoTile(el('div','','engineering-feature'),round.cue));cue.append(lab)}else cue.append(el('span',round.cue,'new-picture'));}
  for(const value of shuffle(round.choices)){const b=btn(value,()=>{if(solved||b.disabled)return;if(value===round.answer){b.dataset.state='correct';if(game.id==='planet-engineer'&&round.kind==='pattern'){const blank=cue.querySelector('.planet-blank');geoTile(blank,value);blank.classList.remove('planet-blank');blank.dataset.completed='true'}done()}else{b.dataset.state='wrong';b.disabled=true;wrong()}});if(game.id==='planet-engineer')geoTile(b,value);group.append(b)}
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
