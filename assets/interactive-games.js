import {illustrate} from './learning-art.js?v=2';
import {bindJourney,shuffle} from './game-progress.js?v=13';
const game=JSON.parse(document.getElementById('game-data').textContent), ar=game.lang==='ar', tr=(a,e)=>ar?a:e;
const board=document.querySelector('[data-game]'), cue=board.querySelector('[data-cue]'), options=board.querySelector('[data-options]'), feedback=board.querySelector('[data-feedback]'), next=board.querySelector('[data-next]');
const el=(tag,txt='',cls='')=>{const n=document.createElement(tag);n.textContent=txt;if(cls)n.className=cls;return illustrate(n,txt)};
const btn=(txt,cb,cls='game-option')=>{const b=el('button',txt,cls);b.type='button';b.addEventListener('click',cb);return b};
let generation=0;
function render(round){
 const ticket=++generation;
 const active=()=>ticket===generation&&!board.hidden;
 board.dataset.immersive=round.kind;
 const label=journey.roundLabel();board.querySelector('[data-progress]').textContent=label;const meter=board.querySelector('[data-visual-round-meter]');const numbers=label.match(/\d+/g)?.map(Number);if(meter&&numbers?.length>=3){meter.max=numbers[2];meter.value=Math.max(0,numbers[1]-1)}board.querySelector('[data-prompt]').textContent=round.prompt;
 cue.replaceChildren();options.replaceChildren();options.dataset.columns='1';feedback.textContent='';delete feedback.dataset.state;next.hidden=true;next.textContent=journey.nextLabel();let solved=false;
 const say=(t,state)=>{feedback.textContent=t;feedback.dataset.state=state||''};
 const wrong=()=>{if(!solved){journey.mistake();say(tr('جرّب مرة أخرى.','Try again.'),'wrong')}};
 const done=()=>{if(solved)return;solved=true;journey.solve();const meter=board.querySelector('[data-visual-round-meter]');if(meter)meter.value=Math.min(meter.max,meter.value+1);say(round.explanation??tr('رائع! أحسنت!','Great job!'),'correct');next.hidden=false};
 const group=el('div','','new-controls');options.append(group);
 if(round.kind==='quiz'){
  for(const choice of shuffle(round.choices)){
   const answer=btn(choice,()=>{
    if(solved||answer.disabled)return;
    if(choice===round.answer){answer.dataset.state='correct';done();}
    else{answer.dataset.state='wrong';answer.disabled=true;wrong();}
   });
   group.append(answer);
  }
  return;
 }
 if(round.kind==='shop'){
  let paid=0,payments=[];
  const total=round.items.reduce((sum,item)=>sum+item.price,0);
  const change=Number.isInteger(round.changeFrom);
  const target=change?round.changeFrom-total:total;
  const market=el('section','','market-scene'),awning=el('div',tr('متجر فضول','Fudool Market'),'market-awning');
  const shelf=el('div','','market-shelf');shelf.setAttribute('aria-label',tr('المنتجات المطلوبة','Shopping items'));
  for(const item of round.items){
    const tile=el('div','','shop-item market-product'),picture=el('span',item.icon,'new-picture');
    picture.setAttribute('aria-hidden','true');
    const tag=el('strong',String(item.price),'market-price');
    tag.setAttribute('aria-label',item.price+' '+tr('عملة','coins'));
    tile.append(picture,el('span',item.name,'market-item-name'),tag);shelf.append(tile);
  }
  market.append(awning,shelf);
  const checkout=el('div','','market-checkout'),receipt=el('div','','market-receipt');
  receipt.append(el('h3',tr('فاتورة المشتريات','Shopping receipt'),'market-heading'));
  for(const item of round.items){const line=el('div','','market-line');line.append(el('span',item.name),el('strong',String(item.price)));receipt.append(line)}
  const line=el('div','','market-line market-total');line.append(el('span',tr('المجموع','Total')),el('strong',round.showTotal?String(total):'؟'));receipt.append(line);
  if(change){
    const tender=el('div','','market-line');
    tender.append(el('span',tr('دفع الزبون','Customer paid')),el('strong',String(round.changeFrom)));
    receipt.append(tender);
  }
  const register=el('div','','market-register'),display=el('strong','0','market-display');display.dir='ltr';display.setAttribute('aria-live','polite');
  const registerLabel=change?tr('الباقي للزبون','Customer change'):tr('المبلغ المدفوع','Amount paid');
  display.setAttribute('aria-label',registerLabel);
  const tray=el('div','','market-tray');
  register.append(el('span',registerLabel,'market-heading'),display,tray);
  checkout.append(receipt,register);cue.append(market,checkout);
  const wallet=el('div','','market-wallet'),coinControls=el('div','','market-coins'),actions=el('div','','market-actions');
  wallet.append(el('h3',tr('محفظتي — اختر العملات','My wallet — choose coins'),'market-heading'),coinControls,actions);group.append(wallet);
  const coinFace=(v)=>{const face=el('span',String(v),'market-coin-face');face.setAttribute('aria-hidden','true');return face};
  const undo=btn(tr('تراجع','Undo'),()=>{if(solved||!payments.length)return;paid-=payments.pop();draw()},'button button-white');
  const clear=btn(tr('مسح المبلغ','Clear'),()=>{if(solved)return;paid=0;payments=[];draw()},'button button-white');
  const pay=btn(change?tr('أعد الباقي','Give change'):tr('ادفع','Pay'),()=>{if(solved)return;if(paid===target){market.dataset.paid='true';draw();done();for(const b of coinControls.children)b.disabled=true;undo.disabled=clear.disabled=pay.disabled=true}else{wrong();paid=0;payments=[];draw()}},'button button-primary');
  actions.append(undo,clear,pay);
  function draw(){display.textContent=String(paid);const visible=payments.slice(-12);tray.replaceChildren(...visible.map(coinFace));if(payments.length>12)tray.prepend(el('small','+'+(payments.length-12),'market-more'));undo.disabled=clear.disabled=!payments.length;pay.disabled=!payments.length&&target!==0}
  for(const v of round.coins){const b=btn('',()=>{if(!solved&&paid<999){payments.push(v);paid+=v;draw()}},'market-coin');b.dataset.coin=String(v);b.setAttribute('aria-label',tr('أضف '+v+' عملة','Add '+v+' coins'));b.append(coinFace(v));coinControls.append(b)}
  draw();return;
 }
 if(round.kind==='word'){
  let pos=0;const target=Array.from(round.word),slots=el('div','','word-slots factory-slots');slots.dir='rtl';
  const scene=el('div','','factory-scene'),header=el('div',tr('مصنع الكلمات','Word factory'),'factory-header'),image=el('span',round.icon,'new-picture factory-picture');
  const hint=el('p',round.clue,'factory-hint');const count=el('p','','factory-count');count.setAttribute('aria-live','polite');
  const cells=target.map(()=>el('span','؟','word-slot'));slots.append(...cells);
  const joined=el('p','','factory-joined');joined.dir='rtl';joined.lang='ar';joined.hidden=true;
  scene.append(header,image,hint,count,slots,joined);cue.append(scene);
  const tray=el('div','','factory-tray');tray.dir='rtl';const controls=el('div','','market-actions');group.append(tray,controls);
  const distractors=round.distractors.filter(x=>!target.includes(x)),tiles=shuffle([...target,...distractors]),picked=[];
  function draw(){count.textContent=tr('الحروف المكتملة: ','Letters placed: ')+pos+' / '+target.length;undo.disabled=!pos||solved;clear.disabled=!pos||solved;cells.forEach((c,i)=>{c.dataset.filled=String(i<pos);c.dataset.current=String(i===pos&&!solved)})}
  const undo=btn(tr('تراجع','Undo'),()=>{if(solved||!pos)return;const b=picked.pop();b.disabled=false;cells[--pos].textContent='؟';draw()},'button button-white');
  const clear=btn(tr('امسح الحروف','Clear letters'),()=>{if(solved)return;for(const b of picked)b.disabled=false;picked.length=0;pos=0;for(const c of cells)c.textContent='؟';draw()},'button button-white');
  controls.append(undo,clear);
  for(const letter of tiles){const b=btn(letter,()=>{if(solved||b.disabled)return;if(letter!==target[pos]){wrong();return}cells[pos++].textContent=letter;b.disabled=true;picked.push(b);journey.correct();if(pos===target.length){joined.textContent=round.word;joined.hidden=false;scene.dataset.complete='true';done()}draw()},'game-option factory-letter');b.lang='ar';b.dir='rtl';tray.append(b)}draw();return;
 }
 if(round.kind==='clock'){
  const ns='http://www.w3.org/2000/svg', svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 220 220');svg.setAttribute('class','lesson-clock');svg.setAttribute('role','img');svg.setAttribute('aria-label',tr('ساعة بعقارب','Analog clock'));
  const shape=(tag,attrs,txt)=>{const e=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,String(v));if(txt)e.textContent=txt;svg.append(e);return e};
  shape('circle',{cx:110,cy:110,r:105,fill:'#d9eaff',stroke:'#5777ba','stroke-width':4});
  shape('circle',{cx:110,cy:110,r:98,fill:'#fffdf7',stroke:'#b3c9e8','stroke-width':2});
  for(let i=1;i<=12;i++){const a=i*Math.PI/6;shape('text',{x:110+75*Math.sin(a),y:116-75*Math.cos(a),'text-anchor':'middle','font-size':18,'font-weight':800,fill:'#38236b'},i)}
  for(let i=0;i<60;i++){const a=i*Math.PI/30,r=i%5===0?89:94;shape('line',{x1:110+r*Math.sin(a),y1:110-r*Math.cos(a),x2:110+97*Math.sin(a),y2:110-97*Math.cos(a),stroke:'#b1a5cf','stroke-width':i%5===0?2:1})}
  const hand=(angle,len,color,w)=>{const a=angle*Math.PI/180;shape('line',{x1:110,y1:110,x2:110+len*Math.sin(a),y2:110-len*Math.cos(a),stroke:color,'stroke-width':w,'stroke-linecap':'round'})};
  hand((round.hour%12)*30+round.minute*.5,49,'#5032a1',8);hand(round.minute*6,71,'#b46318',5);shape('circle',{cx:110,cy:110,r:5,fill:'#5032a1'});
  const studio=el('div','','clock-studio'),head=el('div',tr('مختبر الوقت مع لُمعة','Lumaa time lab'),'clock-lab-title'),legend=el('div','','clock-legend');
  legend.append(el('span',tr('العقرب القصير: الساعات','Short hand: hours'),'clock-hour-key'),el('span',tr('العقرب الطويل: الدقائق','Long hand: minutes'),'clock-minute-key'));
  const digital=el('div','--:--','clock-digital');digital.dir='ltr';digital.setAttribute('aria-live','polite');studio.append(head,svg,legend,digital);cue.append(studio);
  for(const v of shuffle(round.choices)){const b=btn(v,()=>{if(solved||b.disabled)return;if(v===round.answer){b.dataset.state='correct';digital.textContent=round.answer;studio.dataset.complete='true';done()}else{b.dataset.state='wrong';b.disabled=true;wrong()}},'game-option clock-answer');b.dir='ltr';group.append(b)}return;
 }
 if(round.kind==='maze'){
  const n=round.size,open=new Set(round.path.map(p=>p.join(','))),target=round.path.at(-1),start=round.path[0];
  const walls=round.walls&&new Set(round.walls.map(p=>p.join(',')));
  const limit=round.limit??round.path.length+3;
  const canEnter=(x,y)=>x>=0&&x<n&&y>=0&&y<n&&
    (walls?!walls.has(x+','+y):open.has(x+','+y));
  const lab=el('div','','code-lab'),head=el('div','','code-lab-head');
  const guide=el('img','','code-guide');guide.src='/assets/robot.webp';guide.alt='';guide.width=48;guide.height=48;
  const stage=el('span',tr('مهمة روبو: اجمع النجمة','Robo mission: collect the star'),'code-title');head.append(guide,stage);
  const grid=el('div','','robo-maze code-grid');grid.style.gridTemplateColumns='repeat('+n+',minmax(0,1fr))';grid.dir='ltr';
  const rover=el('div','','code-rover');rover.setAttribute('aria-hidden','true');const robot=el('img','','code-rover-image');robot.src='/assets/robot.webp';robot.alt='';rover.append(robot);grid.append(rover);
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
    const passable=canEnter(x,y),goal=target[0]===x&&target[1]===y;
    const cell=el('span',goal?'⭐':passable?'·':'','maze-cell '+(passable?'maze-open':'maze-wall'));
    cell.dataset.cell=x+','+y;
    grid.append(cell);
  }
  let commands=[],running=false,pos=start.slice();
  const program=el('div','','code-program'),sequence=el('div','','maze-sequence code-sequence');sequence.dir='ltr';
  const status=el('p','','code-status');status.setAttribute('aria-live','polite');
  program.append(el('h3',tr('برنامج الأوامر','Command program'),'market-heading'),sequence,status);lab.append(head,grid,program);cue.append(lab);
  const arrows={U:'↑',D:'↓',L:'←',R:'→'},moves={U:[0,-1],D:[0,1],L:[-1,0],R:[1,0]},labels={U:tr('أعلى','Up'),D:tr('أسفل','Down'),L:tr('يسار','Left'),R:tr('يمين','Right')};
  const keypad=el('div','','code-keypad'),actions=el('div','','market-actions'),keys=[];
  function moveTo(p){pos=p;rover.style.left=((p[0]+.5)/n*100)+'%';rover.style.top=((p[1]+.5)/n*100)+'%';rover.style.width=(88/n)+'%'}
  function draw(step=-1){sequence.replaceChildren();if(!commands.length)sequence.append(el('span',tr('أضف أوامر الاتجاه','Add direction commands'),'code-placeholder'));commands.forEach((c,i)=>{const chip=el('span',arrows[c],'code-chip');chip.dataset.step=String(i);chip.dataset.active=String(i===step);chip.setAttribute('aria-label',labels[c]);sequence.append(chip)});status.textContent=running?tr('روبو ينفّذ الأوامر…','Robo is running…'):tr('عدد الأوامر: ','Commands: ')+commands.length+(round.limit?' / '+limit:'');for(const b of keys)b.disabled=running||solved||commands.length>=limit;undo.disabled=clear.disabled=run.disabled=running||solved||!commands.length}
  for(const c of ['U','L','D','R']){const b=btn('',()=>{if(!solved&&!running&&commands.length<limit){commands.push(c);draw()}},'game-option code-arrow');b.dataset.command=c;b.setAttribute('aria-label',labels[c]);b.append(el('strong',arrows[c]),el('small',labels[c]));keys.push(b);keypad.append(b)}
  const undo=btn(tr('احذف آخر أمر','Undo last command'),()=>{if(!running&&!solved){commands.pop();draw()}},'button button-white');
  const clear=btn(tr('امسح','Clear'),()=>{if(!running&&!solved){commands=[];moveTo(start.slice());draw()}},'button button-white');
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const run=btn(tr('شغّل روبو','Run Robo'),async()=>{
    if(running||solved||!commands.length)return;running=true;moveTo(start.slice());draw();
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let valid=true;
    for(let i=0;i<commands.length;i++){if(!active())return;const d=moves[commands[i]],p=[pos[0]+d[0],pos[1]+d[1]];draw(i);if(!canEnter(...p)){valid=false;break}moveTo(p);await sleep(reduced?0:270);}
    if(!active())return;running=false;
    if(valid&&pos[0]===target[0]&&pos[1]===target[1]){lab.dataset.complete='true';done();draw();}
    else{wrong();moveTo(start.slice());commands=[];draw()}
  },'button button-primary');actions.append(undo,clear,run);group.append(keypad,actions);moveTo(start.slice());draw();return;
 }

}
const journey=bindJourney(game,board,render);next.addEventListener('click',journey.advance);
