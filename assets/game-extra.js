import {vowelClipId} from './vowel-audio-review.js?v=2';
import {sharedAudioSource} from './vowel-audio-routing.js?v=2';
import {drawGuide,evaluateTrace} from './trace-assessment.js?v=2';
import {illustrate} from './learning-art.js?v=2';
import {shuffle} from './game-progress.js?v=13';
const ar=document.documentElement.lang==='ar';
const tr=(a,b)=>ar?a:b;
const el=(tag,text='',cls='')=>{const e=document.createElement(tag);e.textContent=text;if(cls)e.className=cls;return e;};
let voiceToken=0, toneContext, recording;
const activeTones=new Set();
export function stopSpeech(){voiceToken++;recording?.pause();for(const tone of activeTones){try{tone.stop();}catch{}}activeTones.clear();if('speechSynthesis' in window)window.speechSynthesis.cancel();}
export async function playRecording(src,fallback){stopSpeech();src=sharedAudioSource(src);if(!src){fallback?.();return false;}const token=voiceToken;recording??=new Audio();recording.src=src;try{await recording.play();return true;}catch{if(token===voiceToken)fallback?.();return false;}}
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
  const done=()=>{if(finished)return;finished=true;journey.solve();say(tr('أحسنت! أكملت الجولة.','Well done! Round complete.'),'correct');next.hidden=false;next.disabled=false;};
  const wrong=()=>{journey.mistake();say(tr('حاول مرة أخرى.','Try again.'),'wrong');};
  const button=(label,handler,cls='game-option')=>{const b=el('button',label,cls);b.type='button';b.addEventListener('click',handler);return b;};
  if(kind==='quiz'){
    if (round.table) {
      const table = el('table', '', 'science-observations');
      table.createCaption().textContent = round.table.caption;
      const header = table.createTHead().insertRow();
      for (const column of round.table.columns) {
        const label = el('th', column);
        label.scope = 'col';
        header.append(label);
      }
      const body = table.createTBody();
      for (const values of round.table.rows) {
        const row = body.insertRow();
        const label = el('th', String(values[0]));
        label.scope = 'row';
        row.append(label);
        for (const value of values.slice(1)) row.insertCell().textContent = value;
      }
      cue.append(table);
    }
    if(round.cue){const content=illustrate(el('span',round.cue,'extra-cue'),round.cue);if(round.ltr)content.dir='ltr';cue.append(content);}
    if(round.speech||round.tones||round.audio){
      const fallback=()=>{if(!cue.querySelector('.audio-fallback'))cue.append(el('small',tr('الصوت غير متاح. أعد المحاولة أو اطلب مساعدة الأهل.','Audio unavailable. Try again or ask a grown-up for help.'),'audio-fallback'));};
      const reviewedSource=[round.audio,round.audioFallback].find(src=>vowelClipId(src)!==null);
      const visualFallback=()=>{if(!cue.querySelector('.audio-fallback')){const parts=String(round.speech||'').split(/\s+\.\s+/);cue.append(el('strong',parts.at(-1)||'', 'audio-fallback'));say(tr('اقرأ المثال واختر الإجابة.','Read the example and choose the answer.'))}};
      const play=button(tr('🔊 استمع','🔊 Listen'),async()=>{cue.querySelector('.audio-fallback')?.remove();if(reviewedSource){await playRecording(reviewedSource,visualFallback);return}if(round.tones){if(!await tones(round.tones))say(tr('الصوت غير متاح على هذا الجهاز.','Sound is unavailable on this device.'));}else if(round.audio)playRecording(round.audio,()=>round.speech&&!round.audio.startsWith('/assets/game-sound-effects/')?speak(round.speech,round.speechLang||'ar-SA',fallback):fallback());else speak(round.speech,round.speechLang,()=>round.audioFallback?playRecording(round.audioFallback,fallback):fallback());},'button button-white');cue.append(play);
    }
    const buttons=round.choices.map((v,i)=>makeOption(v,i===round.answer,round.explanation));options.dataset.columns=Math.min(4,round.choices.length);options.replaceChildren(...shuffle(buttons));const hint=button(tr('💡 تلميح','💡 Hint'),()=>{if(next.hidden){buttons[round.answer].dataset.hint='true';say(tr('جرّب الاختيار المضيء.','Try the highlighted choice.'));}},'button button-white');cue.append(hint);return;
  }
  options.dataset.columns='1';
  if(kind==='order'){
    const target=round.target;let pos=0;const seq=el('div','','extra-sequence');seq.dir=typeof target[0]==='number'||/^[A-Z]$/.test(target[0])?'ltr':'rtl';cue.append(illustrate(el('span',round.cue,'extra-cue'),round.cue),seq);
    const group=el('div','','extra-order');group.dir=seq.dir;options.append(group);
    const cells=target.map(()=>el('span','?','extra-slot'));seq.append(...cells);
    for(const value of shuffle(target.map((v,i)=>({v,i})))){const b=button(String(value.v),()=>{if(finished)return;if(value.v!==target[pos]){wrong();return;}cells[pos++].textContent=value.v;b.disabled=true;journey.correct();if(pos===target.length)done();});group.append(b);}return;
  }
  if(kind==='memory'){
    const deck = shuffle([...round.images, ...round.images]);
    const grid = el('div', '', 'extra-memory discovery-memory');
    grid.dataset.memoryPhase = 'preview';
    grid.style.setProperty('--cols', deck.length === 4 ? '2' : deck.length === 6 ? '3' : deck.length <= 12 ? '4' : '5');
    const summary = el('div', '', 'discovery-summary');
    const matchedLabel = el('strong');
    const meter = el('progress');
    meter.max = round.images.length;
    meter.setAttribute('aria-label', tr('الأزواج المكتملة', 'Matched pairs'));
    const instructions = el('p', tr('احفظ أماكن الصور ثم ابدأ المطابقة.', 'Look at the pictures and remember their places.'), 'memory-instructions');
    let first = null, busy = false, matched = 0, tries = 0;
    next.hidden = false;
    next.disabled = true;

    function update() {
      matchedLabel.textContent = tr('الأزواج: ', 'Pairs: ') + matched + ' / ' + round.images.length +
        ' · ' + tr('المحاولات: ', 'Attempts: ') + tries;
      meter.value = matched;
    }
    function showFace(card, visible) {
      card.querySelector('img').hidden = !visible;
      card.querySelector('.memory-back').hidden = visible;
      card.classList.toggle('revealed', visible);
      const position = card.dataset.index;
      const picture = round.images.indexOf(card.dataset.image) + 1;
      card.setAttribute('aria-label', visible
        ? tr('البطاقة ' + position + '، الصورة ' + picture, 'Card ' + position + ', picture ' + picture)
        : tr('بطاقة مغلقة ' + position, 'Hidden card ' + position));
    }
    const ready = button(tr('ابدأ المطابقة', 'Start matching'), () => {
      grid.dataset.memoryPhase = 'match';
      for (const card of grid.children) {
        showFace(card, false);
        card.disabled = false;
      }
      ready.hidden = true;
      instructions.textContent = tr('اكشف بطاقتين متطابقتين.', 'Turn over two matching cards.');
      grid.firstElementChild.focus({preventScroll: true});
    }, 'button button-primary memory-start');

    deck.forEach((src, i) => {
      const card = button('', () => {
        if (finished || busy || card.disabled || first === card) return;
        showFace(card, true);
        if (!first) { first = card; return; }
        const previous = first;
        first = null;
        tries++;
        if (previous.dataset.image === src) {
          previous.disabled = card.disabled = true;
          previous.dataset.matched = card.dataset.matched = 'true';
          matched++;
          journey.correct();
          say(tr('وجدت زوجًا!', 'You found a pair!'), 'correct');
          update();
          if (matched === round.images.length) {
            grid.dataset.memoryPhase = 'complete';
            done();
            next.focus({preventScroll: true});
            next.scrollIntoView({block: 'center'});
          }
        } else {
          busy = true;
          wrong();
          update();
          setTimeout(() => {
            if (!grid.isConnected) return;
            showFace(previous, false);
            showFace(card, false);
            busy = false;
          }, 750);
        }
      }, 'extra-memory-card');
      card.dataset.image = src;
      card.dataset.index = String(i + 1);
      card.disabled = true;
      const back = el('span', '', 'memory-back');
      back.append(el('span', '✦', 'memory-back-star'), el('small', '?'));
      const image = el('img');
      image.src = src;
      image.alt = '';
      image.draggable = false;
      card.append(back, image);
      showFace(card, true);
      grid.append(card);
    });
    summary.append(matchedLabel, meter);
    cue.append(summary, instructions);
    options.append(grid, ready);
    update();
    return;
  }
  if(kind==='puzzle'){
    const {cols,rows,image}=round,n=cols*rows;let arrangement=shuffle(Array.from({length:n},(_,i)=>i));if(arrangement.every((v,i)=>v===i))[arrangement[0],arrangement[1]]=[arrangement[1],arrangement[0]];let first=-1,moves=0;
    const preview=el('img');preview.src=image;preview.alt=tr('الصورة الأصلية','Original picture');preview.className='extra-puzzle-preview discovery-preview';
    const panel=el('div','','puzzle-reference'),title=el('strong',tr('الصورة المرجعية','Reference picture')),toggle=button(tr('إخفاء الصورة','Hide picture'),()=>{preview.hidden=!preview.hidden;toggle.textContent=preview.hidden?tr('عرض الصورة','Show picture'):tr('إخفاء الصورة','Hide picture');toggle.setAttribute('aria-expanded',String(!preview.hidden))},'button button-white');toggle.setAttribute('aria-expanded','true');panel.append(title,preview,toggle);cue.append(panel);
    const summary=el('div','','discovery-summary'),label=el('strong'),meter=el('progress');meter.max=n;meter.setAttribute('aria-label',tr('القطع في مكانها','Correctly placed pieces'));summary.append(label,meter);cue.append(summary);
    const grid=el('div','','extra-puzzle discovery-puzzle');const sizePuzzle=()=>{if(preview.naturalWidth&&preview.naturalHeight)grid.style.aspectRatio=preview.naturalWidth+'/'+preview.naturalHeight};preview.addEventListener('load',sizePuzzle);if(preview.complete)sizePuzzle();grid.style.setProperty('--cols',cols);grid.style.setProperty('--rows',rows);grid.dir='ltr';options.append(grid);
    function draw(focus=-1){const count=arrangement.filter((v,i)=>v===i).length;label.textContent=tr('القطع الصحيحة: ','Correct pieces: ')+count+' / '+n+' · '+tr('الحركات: ','Moves: ')+moves;meter.value=count;grid.replaceChildren(...arrangement.map((piece,index)=>{const b=button('',()=>{if(finished)return;if(first<0){first=index;draw(index);return}if(first===index){first=-1;draw(index);return}[arrangement[first],arrangement[index]]=[arrangement[index],arrangement[first]];moves++;first=-1;draw(index);if(arrangement.every((v,i)=>v===i))done()},'extra-piece');b.dataset.piece=String(piece);b.dataset.slot=String(index);b.dataset.placed=String(piece===index);b.setAttribute('aria-label',tr('قطعة ','Piece ')+(piece+1));b.setAttribute('aria-pressed',String(first===index));b.style.backgroundImage='url("'+image+'")';b.style.backgroundSize=(cols*100)+'% '+(rows*100)+'%';b.style.backgroundPosition=((piece%cols)*100/(cols-1))+'% '+(Math.floor(piece/cols)*100/(rows-1))+'%';return b}));if(focus>=0)grid.children[focus]?.focus({preventScroll:true})}draw();return;
  }
  if (kind === 'trace') {
    const dictation = Boolean(round.audio);
    const studio = el('div', '', 'trace-studio');
    const bar = el('div', '', 'trace-studio-bar');
    const guide = el('img');
    guide.src = '/assets/lumaa.webp';
    guide.alt = '';
    guide.width = guide.height = 42;
    bar.append(guide, el('strong', tr('لوحة الكتابة', 'Writing board')));
    studio.append(bar);

    if (dictation) {
      const audioStatus = el('span', '', 'trace-audio-status');
      audioStatus.setAttribute('role', 'status');
      const listen = button(tr('اسمع الكلمة', 'Listen to the Arabic word'), () => {
        audioStatus.textContent = '';
        playRecording(round.audio, () => speak(round.word, 'ar', () => {
          audioStatus.textContent = tr('تعذّر تشغيل الكلمة. أعد المحاولة.', 'The word could not play. Please try again.');
        }));
      }, 'button button-primary trace-listen');
      studio.append(listen, audioStatus);
    }

    const wrap = el('div', '', 'extra-trace');
    const model = el('canvas', '', 'trace-model');
    const canvas = el('canvas', '', 'trace-ink');
    model.width = canvas.width = 600;
    model.height = canvas.height = 320;
    if (dictation) {
      wrap.classList.add('trace-word-board');
    } else {
      model.setAttribute('aria-label', tr('نموذج الكتابة المنقّط', 'Dotted writing guide'));
      wrap.append(model);
    }
    canvas.setAttribute('aria-label', tr('مساحة الكتابة بالإصبع', 'Finger writing area'));
    wrap.append(canvas);
    studio.append(wrap);

    const assessment = el('div', '', 'trace-assessment');
    const metrics = el('p', tr('جاري تجهيز لوحة الكتابة…', 'Preparing the writing board…'), 'trace-metrics');
    const tip = el('p', '', 'trace-tip');
    assessment.setAttribute('aria-live', 'polite');
    assessment.append(metrics, tip);
    studio.append(assessment);
    cue.append(studio);

    let target = null;
    let strokes = [], pointer = null, ink = '#6b4bc3';
    const ctx = canvas.getContext('2d');
    const instructions = tr('تُقبل الكتابة عند تجاوز 75%.', 'A score above 75% passes.');
    function resetResult() {
      if (!assessment.dataset.result) return;
      delete assessment.dataset.result;
      metrics.textContent = instructions;
      tip.textContent = '';
      say('');
    }
    function paint() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const stroke of strokes) {
        const {points} = stroke;
        const [x, y] = points[0];
        ctx.lineWidth = 9;
        ctx.lineCap = ctx.lineJoin = 'round';
        ctx.strokeStyle = ctx.fillStyle = stroke.ink;
        ctx.beginPath();
        ctx.arc(x, y, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (let i = 1; i < points.length; i++) ctx.lineTo(...points[i]);
        ctx.stroke();
      }
      undo.disabled = clear.disabled = finished || !strokes.length || pointer !== null;
      complete.disabled = undo.disabled || !target;
    }
    const point = event => {
      const rect = canvas.getBoundingClientRect();
      return [(event.clientX - rect.left) * canvas.width / rect.width,
        (event.clientY - rect.top) * canvas.height / rect.height];
    };
    canvas.addEventListener('pointerdown', event => {
      if (finished || pointer !== null || !target || event.button !== 0) return;
      resetResult();
      pointer = event.pointerId;
      canvas.setPointerCapture(pointer);
      strokes.push({ink, points: [point(event)]});
      paint();
    });
    canvas.addEventListener('pointermove', event => {
      if (event.pointerId !== pointer) return;
      const nextPoint = point(event);
      const points = strokes.at(-1).points;
      const previous = points.at(-1);
      if (Math.hypot(nextPoint[0] - previous[0], nextPoint[1] - previous[1]) < 1) return;
      points.push(nextPoint);
      paint();
    });
    for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      canvas.addEventListener(event, e => {
        if (e.pointerId !== pointer) return;
        pointer = null;
        paint();
      });
    }

    const palette = el('div', '', 'trace-palette');
    const colors = [['#6b4bc3', tr('بنفسجي', 'Purple')], ['#267bb1', tr('أزرق', 'Blue')],
      ['#23835d', tr('أخضر', 'Green')], ['#bd4d70', tr('وردي', 'Pink')]];
    for (const [color, name] of colors) {
      const swatch = button('', () => {
        ink = color;
        for (const other of palette.children) other.setAttribute('aria-pressed', String(other === swatch));
      }, 'trace-color');
      swatch.style.backgroundColor = color;
      swatch.setAttribute('aria-label', name);
      swatch.setAttribute('aria-pressed', String(color === ink));
      palette.append(swatch);
    }

    const actions = el('div', '', 'game-actions trace-actions');
    const undo = button(tr('تراجع', 'Undo'), () => {
      strokes.pop();
      resetResult();
      paint();
    }, 'button button-white');
    const clear = button(tr('امسح', 'Clear'), () => {
      strokes = [];
      resetResult();
      paint();
    }, 'button button-white');
    const complete = button(tr('تحقّق من كتابتي', 'Check my writing'), () => {
      const score = evaluateTrace(target, canvas);
      const percent = el('bdi', score.percent + '%');
      percent.dir = 'ltr';
      metrics.replaceChildren(tr('دقة الكتابة ', 'Writing score '), percent);
      assessment.dataset.result = score.pass ? 'pass' : 'retry';
      if (!score.pass) {
        journey.mistake();
        tip.textContent = dictation
          ? tr('أعد سماع الكلمة وراجع الحروف ونقاطها.', 'Listen again and check the letters and their dots.')
          : tr('تتبّع جميع أجزاء النموذج وحافظ على مساره.', 'Follow the guide and trace all its parts.');
        say(tr('حاول مرة أخرى.', 'Try again.'), 'wrong');
        return;
      }

      if (dictation) {
        const word = el('bdi', round.word);
        word.lang = 'ar';
        tip.replaceChildren(tr('أحسنت! كتبت ', 'Well done! You wrote '), word, '.');
      }
      done();
      paint();
      for (const swatch of palette.children) swatch.disabled = true;
    }, 'button button-primary');
    actions.append(undo, clear, complete);
    options.append(palette, actions);

    const image = new Image();
    const loadingFailed = () => {
      metrics.textContent = tr('تعذّر تجهيز لوحة الكتابة. أعد تحميل الصفحة.', 'The writing board could not load. Reload the page.');
    };
    image.onload = () => {
      try {
        target = drawGuide(image, model, dictation);
        metrics.textContent = instructions;
        paint();
      } catch {
        loadingFailed();
      }
    };
    image.onerror = loadingFailed;
    image.src = round.image;
    paint();
    return;
  }

}
