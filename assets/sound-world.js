import {createIllustration} from './learning-art.js?v=2';
import {bindJourney,shuffle} from './game-progress.js?v=10';
const game=JSON.parse(document.querySelector('#game-data').textContent),ar=game.lang==='ar',tr=(a,e)=>ar?a:e;
const board=document.querySelector('[data-game]'),cue=board.querySelector('[data-cue]'),options=board.querySelector('[data-options]'),prompt=board.querySelector('[data-prompt]'),feedback=board.querySelector('[data-feedback]'),next=board.querySelector('[data-next]'),progress=board.querySelector('[data-progress]');
const audio=new Audio();audio.preload='none';audio.volume=.7;
let serial=0;
function stop(){serial++;audio.pause();audio.currentTime=0;audio.onended=null;audio.onerror=null;audio.ontimeupdate=null;}
const el=(tag,txt='',cls='')=>{const n=document.createElement(tag);n.textContent=txt;if(cls)n.className=cls;return n};
const ns = 'http://www.w3.org/2000/svg';
function art(id) {
  const picture = createIllustration(id, '/assets/sound-world-art.svg');
  picture.classList.add('sound-picture');
  return picture;
}
function render(round){
 stop();let solved=false,heard=false,attempt=0;
 progress.textContent=journey.roundLabel();prompt.textContent=game.prompt;cue.replaceChildren();options.replaceChildren();feedback.textContent='';delete feedback.dataset.state;
 next.hidden=true;next.textContent=journey.nextLabel();cue.classList.add('sound-world-cue');options.classList.add('sound-world-options');options.dataset.columns=round.choices.length;
 const studio=el('div','','sound-studio');studio.dataset.playing='false';
 const badge=el('span',tr('مهمة استماع','Listening mission'),'sound-mission');
 const wave=el('div','','sound-wave');wave.setAttribute('aria-hidden','true');for(let i=0;i<13;i++)wave.append(el('i'));
 const player=el('button','','sound-play');player.type='button';player.setAttribute('aria-label',tr('شغّل التسجيل','Play recording'));
 const icon=document.createElementNS(ns,'svg');icon.setAttribute('viewBox','0 0 48 48');icon.setAttribute('aria-hidden','true');const path=document.createElementNS(ns,'path');path.setAttribute('d','M16 10L39 24 16 38Z');path.setAttribute('fill','currentColor');icon.append(path);player.append(icon);
 const status=el('strong',tr('اضغط لتسمع الصوت','Tap to hear the sound'),'sound-status');status.setAttribute('aria-live','polite');
 const meter=el('progress','','sound-meter');meter.max=1;meter.value=0;meter.setAttribute('aria-label',tr('تقدم التسجيل','Recording progress'));
 const tip=el('small',tr('استمع أولًا، ثم اختر الصورة. يمكنك إعادة الاستماع.','Listen first, then choose a picture. You can listen again.'),'sound-tip');
 studio.append(badge,wave,player,status,meter,tip);cue.append(studio);
 const buttons=shuffle(round.choices).map(choice=>{const b=el('button','','game-option sound-option');b.type='button';b.dataset.soundChoice=choice.id;b.disabled=true;b.setAttribute('aria-label',ar?choice.ar:choice.en);const tile=el('span','','sound-art-tile');tile.append(art(choice.art));b.append(tile,el('span',ar?choice.ar:choice.en,'sound-option-name'));b.addEventListener('click',()=>{if(solved||!heard||b.disabled)return;if(choice.id!==round.answer){b.dataset.state='wrong';b.disabled=true;journey.mistake();attempt++;feedback.dataset.state='wrong';feedback.textContent=tr('جرّب صورة أخرى. استمع مجددًا إذا أردت!','Try another picture. Listen again if you like!');return}
 solved=true;stop();studio.dataset.playing='false';b.dataset.state='correct';feedback.dataset.state='correct';feedback.textContent=tr('أحسنت! مصدر الصوت: ','Well done! The sound came from: ')+(ar?choice.ar:choice.en);status.textContent=tr('اكتشفت الصوت!','Sound discovered!');player.disabled=true;for(const item of buttons)item.disabled=true;journey.solve();next.hidden=false;});return b});
 options.append(...buttons);
 function failed(){studio.dataset.playing='false';player.disabled=false;heard=false;for(const b of buttons)b.disabled=true;status.textContent=tr('تعذر تشغيل الصوت — حاول مرة أخرى','Could not play the sound — try again');}
 player.addEventListener('click',async()=>{if(solved)return;const token=++serial;audio.pause();audio.src=round.audio;audio.currentTime=0;meter.value=0;player.disabled=true;status.textContent=tr('جارٍ تشغيل التسجيل…','Starting recording…');audio.onerror=()=>{if(token===serial)failed()};audio.ontimeupdate=()=>{if(token===serial&&Number.isFinite(audio.duration)&&audio.duration>0)meter.value=audio.currentTime/audio.duration};audio.onended=()=>{if(token!==serial||solved)return;studio.dataset.playing='false';player.disabled=false;meter.value=1;status.textContent=tr('اختر الصورة أو استمع مجددًا','Choose a picture or listen again');};
 try{await audio.play();if(token!==serial||solved)return;heard=true;studio.dataset.playing='true';status.textContent=tr('استمع جيدًا…','Listen carefully…');for(const b of buttons)if(b.dataset.state!=='wrong')b.disabled=false;}catch{if(token===serial)failed()}});
}
const journey=bindJourney(game,board,render);
next.addEventListener('click',journey.advance);board.querySelector('[data-level-menu]').addEventListener('click',stop);window.addEventListener('pagehide',stop);
