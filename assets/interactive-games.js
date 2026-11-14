import {bindJourney,shuffle} from './game-progress.js?v=6';
const game=JSON.parse(document.getElementById('game-data').textContent), ar=game.lang==='ar', tr=(a,e)=>ar?a:e;
const board=document.querySelector('[data-game]'), cue=board.querySelector('[data-cue]'), options=board.querySelector('[data-options]'), feedback=board.querySelector('[data-feedback]'), next=board.querySelector('[data-next]');
const el=(tag,txt='',cls='')=>{const n=document.createElement(tag);n.textContent=txt;if(cls)n.className=cls;return n};
const btn=(txt,cb,cls='game-option')=>{const b=el('button',txt,cls);b.type='button';b.addEventListener('click',cb);return b};
function render(round){
 board.querySelector('[data-progress]').textContent=journey.roundLabel();board.querySelector('[data-prompt]').textContent=round.prompt;
 cue.replaceChildren();options.replaceChildren();options.dataset.columns='1';feedback.textContent='';delete feedback.dataset.state;next.hidden=true;next.textContent=journey.nextLabel();let solved=false;
 const say=(t,state)=>{feedback.textContent=t;feedback.dataset.state=state||''};
 const wrong=()=>{if(!solved){journey.mistake();say(tr('جرّب مرة أخرى.','Try again.'),'wrong')}};
 const done=()=>{if(solved)return;solved=true;journey.solve();say(tr('رائع! أحسنت!','Great job!'),'correct');next.hidden=false};
 const group=el('div','','new-controls');options.append(group);
 if(round.kind==='shop'){
  let paid=0,payments=[];const items=el('div','','shop-items');for(const item of round.items){const tile=el('div','','shop-item');tile.append(el('span',item.icon,'new-picture'),el('span',item.name),el('strong',item.price+' '+tr('عملة','coins')));items.append(tile)}
  const total=round.items.reduce((s,i)=>s+i.price,0), price=el('p',round.showTotal?tr('المبلغ المطلوب: ','Total to pay: ')+total:tr('اجمع أسعار المشتريات','Add up the prices'),'new-total'), counter=el('p','','new-total'), coins=el('div','','new-controls');cue.append(items,price,counter);group.append(coins);
  function draw(){counter.textContent=tr('دفعت: ','Paid: ')+paid}
  for(const v of round.coins)coins.append(btn('🪙 '+v,()=>{if(!solved){payments.push(v);paid+=v;draw()}}));
  group.append(btn(tr('تراجع عن آخر دفعة','Undo last payment'),()=>{if(!solved){paid-=payments.pop()||0;draw()}},'button button-white'),btn(tr('ادفع','Pay'),()=>{if(solved)return;if(paid===total)done();else{wrong();paid=0;payments=[];draw()}},'button button-primary'));draw();return;
 }
 if(round.kind==='word'){
  let pos=0;const target=Array.from(round.word), slots=el('div','','word-slots');slots.dir='rtl';
  const cells=target.map(()=>el('span','؟','word-slot'));slots.append(...cells);cue.append(el('span',round.icon,'new-picture'),el('p',round.clue),slots);
  const distractors=round.distractors.filter(x=>!target.includes(x));const tiles=shuffle([...target,...distractors]);
  for(const letter of tiles){const b=btn(letter,()=>{if(solved||b.disabled)return;if(letter!==target[pos]){wrong();return}cells[pos++].textContent=letter;b.disabled=true;journey.correct();if(pos===target.length)done()});group.append(b)}return;
 }
 if(round.kind==='clock'){
  const ns='http://www.w3.org/2000/svg', svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 220 220');svg.setAttribute('class','lesson-clock');svg.setAttribute('role','img');svg.setAttribute('aria-label',tr('ساعة بعقارب','Analog clock'));
  const shape=(tag,attrs,txt)=>{const e=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,String(v));if(txt)e.textContent=txt;svg.append(e);return e};
  shape('circle',{cx:110,cy:110,r:103,fill:'#fff',stroke:'#6b4bc3','stroke-width':6});
  for(let i=1;i<=12;i++){const a=i*Math.PI/6;shape('text',{x:110+81*Math.sin(a),y:116-81*Math.cos(a),'text-anchor':'middle','font-size':18,'font-weight':800,fill:'#38236b'},i)}
  for(let i=0;i<60;i++){const a=i*Math.PI/30,r=i%5===0?91:97;shape('line',{x1:110+r*Math.sin(a),y1:110-r*Math.cos(a),x2:110+100*Math.sin(a),y2:110-100*Math.cos(a),stroke:'#b1a5cf','stroke-width':i%5===0?2:1})}
  const hand=(angle,len,color,w)=>{const a=angle*Math.PI/180;shape('line',{x1:110,y1:110,x2:110+len*Math.sin(a),y2:110-len*Math.cos(a),stroke:color,'stroke-width':w,'stroke-linecap':'round'})};
  hand((round.hour%12)*30+round.minute*.5,49,'#5032a1',8);hand(round.minute*6,71,'#d97918',5);shape('circle',{cx:110,cy:110,r:5,fill:'#5032a1'});cue.append(svg);
  for(const v of shuffle(round.choices))group.append(btn(v,()=>{if(solved)return;if(v===round.answer)done();else wrong()}));return;
 }
 if(round.kind==='maze'){
  const n=round.size, open=new Set(round.path.map(p=>p.join(','))), target=round.path.at(-1), start=round.path[0], grid=el('div','','robo-maze');grid.style.gridTemplateColumns='repeat('+n+',minmax(0,1fr))';grid.dir='ltr';
  let commands=[],running=false,pos=start.slice();const sequence=el('p','','maze-sequence');sequence.dir='ltr';cue.append(grid,sequence);
  const arrows={U:'↑',D:'↓',L:'←',R:'→'}, moves={U:[0,-1],D:[0,1],L:[-1,0],R:[1,0]};
  function draw(){grid.replaceChildren();for(let y=0;y<n;y++)for(let x=0;x<n;x++){const k=x+','+y;const isR=pos[0]===x&&pos[1]===y;const goal=target[0]===x&&target[1]===y;const cell=el('span',isR?'🤖':goal?'⭐':open.has(k)?'·':'','maze-cell '+(open.has(k)?'maze-open':'maze-wall'));grid.append(cell)}sequence.textContent=commands.map(c=>arrows[c]).join(' ')||tr('اختر الأوامر','Choose commands')}
  for(const c of ['U','L','D','R'])group.append(btn(arrows[c],()=>{if(!solved&&!running&&commands.length<round.path.length+3){commands.push(c);draw()}}));
  group.append(btn(tr('احذف آخر أمر','Undo last command'),()=>{if(!running&&!solved){commands.pop();draw()}},'button button-white'),btn(tr('شغّل روبو','Run Robo'),()=>{if(running||solved||!commands.length)return;running=true;pos=start.slice();let valid=true;for(const c of commands){const d=moves[c],p=[pos[0]+d[0],pos[1]+d[1]];if(!open.has(p.join(','))){valid=false;break}pos=p}running=false;draw();if(valid&&pos[0]===target[0]&&pos[1]===target[1])done();else{wrong();pos=start.slice();commands=[];draw()}},'button button-primary'));draw();return;
 }
}
const journey=bindJourney(game,board,render);next.addEventListener('click',journey.advance);
