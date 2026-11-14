import {illustrate} from './learning-art.js?v=1';
import {shuffle} from './game-progress.js?v=8';
const ar=document.documentElement.lang==='ar';
const tr=(a,b)=>ar?a:b;
const el=(tag,text='',cls='')=>{const e=document.createElement(tag);e.textContent=text;if(cls)e.className=cls;return e;};
let voiceToken=0, toneContext, recording;
const activeTones=new Set();
export function stopSpeech(){voiceToken++;recording?.pause();for(const tone of activeTones){try{tone.stop();}catch{}}activeTones.clear();if('speechSynthesis' in window)window.speechSynthesis.cancel();}
export async function playRecording(src,fallback){stopSpeech();const token=voiceToken;recording??=new Audio();recording.src=src;try{await recording.play();return true;}catch{if(token===voiceToken)fallback?.();return false;}}
export function speak(text,lang='ar',fallback){
  stopSpeech();const token=voiceToken;
  if(!('speechSynthesis' in window)){fallback?.();return false;}
  const voices=speechSynthesis.getVoices(),language=lang.split('-')[0].toLowerCase(),voice=voices.find(v=>v.lang.toLowerCase()===lang.toLowerCase())||voices.find(v=>v.lang.toLowerCase().startsWith(language));
  if(!voice){fallback?.();return false;}
  const utterance=new SpeechSynthesisUtterance(text);utterance.lang=voice.lang||lang;utterance.rate=.76;if(voice)utterance.voice=voice;
  utterance.onerror=()=>{if(token===voiceToken)fallback?.();};speechSynthesis.speak(utterance);return true;
}
export async function tones(n){
  try{stopSpeech();const token=voiceToken;const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return false;toneContext??=new AC();await toneContext.resume();if(token!==voiceToken)return false;const start=toneContext.currentTime+.05;for(let i=0;i<n;i++){const o=toneContext.createOscillator(),g=toneContext.createGain();o.frequency.value=660;g.gain.value=.07;o.connect(g).connect(toneContext.destination);o.start(start+i*.36);o.stop(start+i*.36+.18);activeTones.add(o);o.onended=()=>{activeTones.delete(o);o.disconnect();g.disconnect();};}return true;}catch{return false;}
}
export function renderExtra(round,{cue,options,feedback,next,journey,makeOption}){
  const {kind}=round;let finished=false;
  const say=(text,state='')=>{feedback.textContent=text;feedback.dataset.state=state;};
  const done=()=>{if(finished)return;finished=true;journey.solve();say(tr('أحسنت! أكملت الجولة.','Well done! Round complete.'),'correct');next.hidden=false;};
  const wrong=()=>{journey.mistake();say(tr('حاول مرة أخرى.','Try again.'),'wrong');};
  const button=(label,handler,cls='game-option')=>{const b=el('button',label,cls);b.type='button';b.addEventListener('click',handler);return b;};
  if(kind==='quiz'){
    if(round.cue){const content=illustrate(el('span',round.cue,'extra-cue'),round.cue);if(round.ltr)content.dir='ltr';cue.append(content);}
    if(round.speech||round.tones||round.audio){
      const fallback=()=>{if(!cue.querySelector('.audio-fallback'))cue.append(el('small',tr('الصوت غير متاح. أعد المحاولة أو اطلب مساعدة الأهل.','Audio unavailable. Try again or ask a grown-up for help.'),'audio-fallback'));};
      const play=button(tr('🔊 استمع','🔊 Listen'),async()=>{cue.querySelector('.audio-fallback')?.remove();if(round.tones){if(!await tones(round.tones))say(tr('الصوت غير متاح على هذا الجهاز.','Sound is unavailable on this device.'));}else if(round.audio)playRecording(round.audio,()=>round.speech&&!round.audio.startsWith('/assets/game-sound-effects/')?speak(round.speech,round.speechLang||'ar-SA',fallback):fallback());else speak(round.speech,round.speechLang,()=>round.audioFallback?playRecording(round.audioFallback,fallback):fallback());},'button button-white');cue.append(play);
    }
    const buttons=round.choices.map((v,i)=>makeOption(v,i===round.answer));options.dataset.columns=Math.min(4,round.choices.length);options.replaceChildren(...shuffle(buttons));const hint=button(tr('💡 تلميح','💡 Hint'),()=>{if(next.hidden){buttons[round.answer].dataset.hint='true';say(tr('جرّب الاختيار المضيء.','Try the highlighted choice.'));}},'button button-white');cue.append(hint);return;
  }
  options.dataset.columns='1';
  if(kind==='order'){
    const target=round.target;let pos=0;const seq=el('div','','extra-sequence');seq.dir=typeof target[0]==='number'||/^[A-Z]$/.test(target[0])?'ltr':'rtl';cue.append(illustrate(el('span',round.cue,'extra-cue'),round.cue),seq);
    const group=el('div','','extra-order');group.dir=seq.dir;options.append(group);
    const cells=target.map(()=>el('span','?','extra-slot'));seq.append(...cells);
    for(const value of shuffle(target.map((v,i)=>({v,i})))){const b=button(String(value.v),()=>{if(finished)return;if(value.v!==target[pos]){wrong();return;}cells[pos++].textContent=value.v;b.disabled=true;journey.correct();if(pos===target.length)done();});group.append(b);}return;
  }
  if(kind==='memory'){
    const deck=shuffle([...round.images,...round.images]),grid=el('div','','extra-memory discovery-memory');grid.style.setProperty('--cols',deck.length<=8?'4':'5');
    const summary=el('div','','discovery-summary'),matchedLabel=el('strong'),meter=el('progress','');meter.max=round.images.length;meter.value=0;meter.setAttribute('aria-label',tr('الأزواج المكتملة','Matched pairs'));summary.append(matchedLabel,meter);cue.append(summary);options.append(grid);
    let first=null,busy=false,matched=0,tries=0;
    const update=()=>{matchedLabel.textContent=tr('الأزواج: ','Pairs: ')+matched+' / '+round.images.length+' · '+tr('المحاولات: ','Attempts: ')+tries;meter.value=matched};
    const reveal=node=>{node.querySelector('img').hidden=false;node.querySelector('.memory-back').hidden=true;node.classList.add('revealed');node.setAttribute('aria-label',tr('بطاقة مكشوفة ','Revealed card ')+node.dataset.index)};
    const hide=node=>{node.querySelector('img').hidden=true;node.querySelector('.memory-back').hidden=false;node.classList.remove('revealed');node.setAttribute('aria-label',tr('بطاقة ','Card ')+node.dataset.index)};
    deck.forEach((src,i)=>{const b=button('',()=>{if(finished||busy||b.disabled||first===b)return;reveal(b);if(!first){first=b;return}const prev=first;first=null;tries++;
      if(prev.dataset.image===src){prev.disabled=b.disabled=true;prev.dataset.matched=b.dataset.matched='true';matched++;journey.correct();update();if(matched===round.images.length)done()}
      else{busy=true;wrong();update();setTimeout(()=>{hide(prev);hide(b);busy=false},650)}
    },'extra-memory-card');b.dataset.image=src;b.dataset.index=String(i+1);b.setAttribute('aria-label',tr('بطاقة ','Card ')+(i+1));const back=el('span','','memory-back');back.append(el('span','✦','memory-back-star'),el('small','?'));const img=el('img');img.src=src;img.alt='';img.hidden=true;img.draggable=false;b.replaceChildren(back,img);grid.append(b)});update();return;
  }
  if(kind==='puzzle'){
    const {cols,rows,image}=round,n=cols*rows;let arrangement=shuffle(Array.from({length:n},(_,i)=>i));if(arrangement.every((v,i)=>v===i))[arrangement[0],arrangement[1]]=[arrangement[1],arrangement[0]];let first=-1,moves=0;
    const preview=el('img');preview.src=image;preview.alt=tr('الصورة الأصلية','Original picture');preview.className='extra-puzzle-preview discovery-preview';
    const panel=el('div','','puzzle-reference'),title=el('strong',tr('الصورة المرجعية','Reference picture')),toggle=button(tr('إخفاء الصورة','Hide picture'),()=>{preview.hidden=!preview.hidden;toggle.textContent=preview.hidden?tr('عرض الصورة','Show picture'):tr('إخفاء الصورة','Hide picture');toggle.setAttribute('aria-expanded',String(!preview.hidden))},'button button-white');toggle.setAttribute('aria-expanded','true');panel.append(title,preview,toggle);cue.append(panel);
    const summary=el('div','','discovery-summary'),label=el('strong'),meter=el('progress');meter.max=n;meter.setAttribute('aria-label',tr('القطع في مكانها','Correctly placed pieces'));summary.append(label,meter);cue.append(summary);
    const grid=el('div','','extra-puzzle discovery-puzzle');const sizePuzzle=()=>{if(preview.naturalWidth&&preview.naturalHeight)grid.style.aspectRatio=preview.naturalWidth+'/'+preview.naturalHeight};preview.addEventListener('load',sizePuzzle);if(preview.complete)sizePuzzle();grid.style.setProperty('--cols',cols);grid.style.setProperty('--rows',rows);grid.dir='ltr';options.append(grid);
    function draw(focus=-1){const count=arrangement.filter((v,i)=>v===i).length;label.textContent=tr('القطع الصحيحة: ','Correct pieces: ')+count+' / '+n+' · '+tr('الحركات: ','Moves: ')+moves;meter.value=count;grid.replaceChildren(...arrangement.map((piece,index)=>{const b=button('',()=>{if(finished)return;if(first<0){first=index;draw(index);return}if(first===index){first=-1;draw(index);return}[arrangement[first],arrangement[index]]=[arrangement[index],arrangement[first]];moves++;first=-1;draw(index);if(arrangement.every((v,i)=>v===i))done()},'extra-piece');b.dataset.piece=String(piece);b.dataset.slot=String(index);b.dataset.placed=String(piece===index);b.setAttribute('aria-label',tr('قطعة ','Piece ')+(piece+1));b.setAttribute('aria-pressed',String(first===index));b.style.backgroundImage='url("'+image+'")';b.style.backgroundSize=(cols*100)+'% '+(rows*100)+'%';b.style.backgroundPosition=((piece%cols)*100/(cols-1))+'% '+(Math.floor(piece/cols)*100/(rows-1))+'%';return b}));if(focus>=0)grid.children[focus]?.focus({preventScroll:true})}draw();return;
  }
  if(kind==='trace'){
    const studio=el('div','','trace-studio'),bar=el('div','','trace-studio-bar'),title=el('strong',tr('لوحة الكتابة','Writing board')),guide=el('img');guide.src='/assets/lumaa.webp';guide.alt='';guide.width=42;guide.height=42;bar.append(guide,title);studio.append(bar);
    const img=el('img');img.src=round.image;img.alt=tr('نموذج الكتابة المنقّط','Dotted writing guide');const wrap=el('div','','extra-trace');wrap.append(img);const canvas=el('canvas');canvas.width=600;canvas.height=320;canvas.setAttribute('aria-label',tr('مساحة الرسم','Drawing area'));wrap.append(canvas);studio.append(wrap);cue.append(studio);
    const ctx=canvas.getContext('2d');let down=false,pointer=null,active=null,strokes=[],ink='#6b4bc3',length=0;
    const point=e=>{const r=canvas.getBoundingClientRect();return [(e.clientX-r.left)*canvas.width/r.width,(e.clientY-r.top)*canvas.height/r.height]};
    function paint(){ctx.clearRect(0,0,600,320);length=0;for(const stroke of strokes){ctx.lineWidth=9;ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle=stroke.ink;ctx.fillStyle=stroke.ink;const p=stroke.points;ctx.beginPath();ctx.arc(p[0][0],p[0][1],4.5,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(...p[0]);for(let i=1;i<p.length;i++){length+=Math.hypot(p[i][0]-p[i-1][0],p[i][1]-p[i-1][1]);ctx.lineTo(...p[i])}ctx.stroke()}undo.disabled=finished||!strokes.length;clear.disabled=finished||!strokes.length;complete.disabled=finished||length<15}
    canvas.addEventListener('pointerdown',e=>{if(finished||down)return;down=true;pointer=e.pointerId;canvas.setPointerCapture(e.pointerId);active={ink,points:[point(e)]};strokes.push(active);paint()});
    canvas.addEventListener('pointermove',e=>{if(!down||e.pointerId!==pointer)return;active.points.push(point(e));paint()});
    for(const name of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(name,e=>{if(e.pointerId===pointer){down=false;pointer=null;active=null}});
    const palette=el('div','','trace-palette'),colors=[['#6b4bc3',tr('بنفسجي','Purple')],['#267bb1',tr('أزرق','Blue')],['#23835d',tr('أخضر','Green')],['#bd4d70',tr('وردي','Pink')]];
    for(const [color,name] of colors){const b=button('',()=>{if(finished)return;ink=color;for(const c of palette.children)c.setAttribute('aria-pressed',String(c===b))},'trace-color');b.style.backgroundColor=color;b.setAttribute('aria-label',name);b.setAttribute('aria-pressed',String(color===ink));palette.append(b)}
    const actions=el('div','','game-actions trace-actions'),undo=button(tr('تراجع','Undo'),()=>{if(!finished&&!down){strokes.pop();paint()}},'button button-white'),clear=button(tr('امسح','Clear'),()=>{if(!finished&&!down){strokes=[];paint()}},'button button-white'),complete=button(tr('أنهيت التدريب','I finished practicing'),()=>{if(finished||down||length<15)return;done();paint();for(const b of palette.children)b.disabled=true},'button button-primary');
    actions.append(undo,clear,complete);options.append(palette,actions);cue.append(el('small',tr('تدريب حر: اطلب من شخص بالغ مراجعة الكتابة.','Free practice: ask an adult to check your writing.')));paint();return;
  }

}
