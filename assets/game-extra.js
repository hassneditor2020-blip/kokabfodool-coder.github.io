import {shuffle} from './game-progress.js?v=6';
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
  const voices=speechSynthesis.getVoices(),voice=voices.find(v=>v.lang.toLowerCase().startsWith(lang.split('-')[0]));
  if(!voice){fallback?.();return false;}
  const utterance=new SpeechSynthesisUtterance(text);utterance.lang=lang;utterance.rate=.78;if(voice)utterance.voice=voice;
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
    if(round.cue){const content=el('span',round.cue,'extra-cue');if(round.ltr)content.dir='ltr';cue.append(content);}
    if(round.speech||round.tones||round.audio){
      const fallback=()=>{if(!cue.querySelector('.audio-fallback'))cue.append(el('small',tr('الصوت غير متاح. أعد المحاولة أو اطلب مساعدة الأهل.','Audio unavailable. Try again or ask a grown-up for help.'),'audio-fallback'));};
      const play=button(tr('🔊 استمع','🔊 Listen'),async()=>{cue.querySelector('.audio-fallback')?.remove();if(round.tones){if(!await tones(round.tones))say(tr('الصوت غير متاح على هذا الجهاز.','Sound is unavailable on this device.'));}else if(round.audio)playRecording(round.audio,fallback);else speak(round.speech,round.speechLang,()=>round.audioFallback?playRecording(round.audioFallback,fallback):fallback());},'button button-white');cue.append(play);
    }
    const buttons=round.choices.map((v,i)=>makeOption(v,i===round.answer));options.dataset.columns=Math.min(4,round.choices.length);options.replaceChildren(...shuffle(buttons));const hint=button(tr('💡 تلميح','💡 Hint'),()=>{if(next.hidden){buttons[round.answer].dataset.hint='true';say(tr('جرّب الاختيار المضيء.','Try the highlighted choice.'));}},'button button-white');cue.append(hint);return;
  }
  options.dataset.columns='1';
  if(kind==='order'){
    const target=round.target;let pos=0;const seq=el('div','','extra-sequence');seq.dir=typeof target[0]==='number'||/^[A-Z]$/.test(target[0])?'ltr':'rtl';cue.append(el('span',round.cue,'extra-cue'),seq);
    const group=el('div','','extra-order');group.dir=seq.dir;options.append(group);
    const cells=target.map(()=>el('span','?','extra-slot'));seq.append(...cells);
    for(const value of shuffle(target.map((v,i)=>({v,i})))){const b=button(String(value.v),()=>{if(finished)return;if(value.v!==target[pos]){wrong();return;}cells[pos++].textContent=value.v;b.disabled=true;journey.correct();if(pos===target.length)done();});group.append(b);}return;
  }
  if(kind==='memory'){
    const deck=shuffle([...round.images,...round.images]);const grid=el('div','','extra-memory');grid.style.setProperty('--cols',deck.length<=8?'4':'5');options.append(grid);let first=null,busy=false,matched=0;
    deck.forEach((src,i)=>{const b=button('?',()=>{if(finished||busy||b.disabled||first===b)return;const reveal=(node)=>{node.querySelector('img').hidden=false;node.querySelector('span').hidden=true;node.classList.add('revealed');};const hide=(node)=>{node.querySelector('img').hidden=true;node.querySelector('span').hidden=false;node.classList.remove('revealed');};reveal(b);if(!first){first=b;return;}const prev=first;first=null;if(prev.dataset.image===src){prev.disabled=b.disabled=true;matched++;journey.correct();if(matched===round.images.length)done();}else{busy=true;wrong();setTimeout(()=>{hide(prev);hide(b);busy=false;},650);}},'extra-memory-card');b.dataset.image=src;b.setAttribute('aria-label',tr('بطاقة ','Card ')+(i+1));b.replaceChildren(el('span','?'));const img=el('img');img.src=src;img.alt='';img.hidden=true;img.draggable=false;b.append(img);grid.append(b);});return;
  }
  if(kind==='puzzle'){
    const {cols,rows,image}=round,n=cols*rows;let arrangement=shuffle(Array.from({length:n},(_,i)=>i));if(arrangement.every((v,i)=>v===i))[arrangement[0],arrangement[1]]=[arrangement[1],arrangement[0]];let first=-1;
    const preview=el('img');preview.src=image;preview.alt=tr('الصورة الأصلية','Original picture');preview.className='extra-puzzle-preview';cue.append(preview);
    const grid=el('div','','extra-puzzle');const sizePuzzle=()=>{if(preview.naturalWidth&&preview.naturalHeight)grid.style.aspectRatio=preview.naturalWidth+'/'+preview.naturalHeight;};preview.addEventListener('load',sizePuzzle);if(preview.complete)sizePuzzle();grid.style.setProperty('--cols',cols);grid.style.setProperty('--rows',rows);grid.dir='ltr';options.append(grid);
    function draw(){grid.replaceChildren(...arrangement.map((piece,index)=>{const b=button('',()=>{if(finished)return;if(first<0){first=index;draw();return;}if(first===index){first=-1;draw();return;}[arrangement[first],arrangement[index]]=[arrangement[index],arrangement[first]];first=-1;draw();if(arrangement.every((v,i)=>v===i))done();},'extra-piece');b.setAttribute('aria-label',tr('قطعة ','Piece ')+(piece+1));b.setAttribute('aria-pressed',String(first===index));b.style.backgroundImage=`url("${image}")`;b.style.backgroundSize=`${cols*100}% ${rows*100}%`;b.style.backgroundPosition=`${(piece%cols)*100/(cols-1)}% ${Math.floor(piece/cols)*100/(rows-1)}%`;return b;}));}draw();return;
  }
  if(kind==='trace'){
    const img=el('img');img.src=round.image;img.alt=tr('نموذج الكتابة المنقّط','Dotted writing guide');const wrap=el('div','','extra-trace');wrap.append(img);const canvas=el('canvas');canvas.width=600;canvas.height=320;canvas.setAttribute('aria-label',tr('مساحة الرسم','Drawing area'));wrap.append(canvas);cue.append(wrap);
    const ctx=canvas.getContext('2d');ctx.lineWidth=9;ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#6b4bc3';let down=false,length=0,last;
    const point=e=>{const r=canvas.getBoundingClientRect();return [(e.clientX-r.left)*canvas.width/r.width,(e.clientY-r.top)*canvas.height/r.height];};
    canvas.addEventListener('pointerdown',e=>{if(finished)return;down=true;canvas.setPointerCapture(e.pointerId);last=point(e);ctx.beginPath();ctx.moveTo(...last);});canvas.addEventListener('pointermove',e=>{if(!down)return;const p=point(e);length+=Math.hypot(p[0]-last[0],p[1]-last[1]);last=p;ctx.lineTo(...p);ctx.stroke();});for(const name of ['pointerup','pointercancel'])canvas.addEventListener(name,()=>down=false);
    const actions=el('div','','game-actions');actions.append(button(tr('امسح','Clear'),()=>{ctx.clearRect(0,0,600,320);length=0;},'button button-white'),button(tr('أنهيت التدريب','I finished practicing'),()=>{if(length<15){say(tr('ارسم على النموذج أولًا.','Draw on the guide first.'));return;}done();},'button button-primary'));options.append(actions);cue.append(el('small',tr('تدريب حر: اطلب من شخص بالغ مراجعة الكتابة.','Free practice: ask an adult to check your writing.')));return;
  }
}
