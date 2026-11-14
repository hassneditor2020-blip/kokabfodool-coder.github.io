import {approvedClips} from './vowel-audio-review.js?v=1';
import {pronunciation} from './arabic-pronunciation.js?v=1';
import {bindJourney, shuffle,totalStars} from './game-progress.js?v=8';

const data = JSON.parse(document.querySelector('#drive-data').textContent);
const board = document.querySelector('[data-drive]');
const scene = board.querySelector('[data-drive-scene]');
const gates = board.querySelector('[data-drive-gates]');
const feedback = board.querySelector('[data-drive-feedback]');
const listen = board.querySelector('[data-drive-listen]');
const listenLabel = listen.querySelector('[data-drive-listen-label]');
const next = board.querySelector('[data-drive-next]');
const counter = board.querySelector('[data-drive-round]');
const adult = board.querySelector('[data-drive-adult]');
const adultCue = adult.querySelector('b');
const drivePrompt=board.querySelector("[data-drive-prompt]");
const ar = document.documentElement.lang === 'ar';
const tr = (arabic, english) => ar ? arabic : english;
const vowels = [
  ['َ', 'فتحة', 'Fatḥa'],
  ['ِ', 'كسرة', 'Kasra'],
  ['ُ', 'ضمة', 'Ḍamma'],
  ['ْ', 'سكون', 'Sukūn'],
];

let target;
let answered = false;
const audio = new Audio();
audio.preload = 'none';
let playback = 0;
let driveTimer;
const routeMeter=document.createElement('div');routeMeter.className='drive-route-meter';routeMeter.setAttribute('aria-label',tr('تقدم الرحلة','Journey progress'));scene.before(routeMeter);
function drawRoute(done=false){const nums=journey.roundLabel().match(/\d+/g)?.map(Number);if(!nums||nums.length<3)return;const current=nums[1],total=nums[2];const label=document.createElement('span');label.className='drive-route-label';label.textContent=tr('محطة ','Stop ')+current+' / '+total;const track=document.createElement('progress');track.max=total;track.value=current-1+Number(done);track.setAttribute('aria-label',tr('محطات مكتملة','Completed stops'));routeMeter.replaceChildren(label,track);}

function syllable(letter, vowel) {
  const base = letter === 'أ' && vowel === 1 ? 'إ' : letter;
  return base + vowels[vowel][0];
}

function stopAudio() {
  playback++;
  audio.pause();
  audio.currentTime=0;
}

function isApproved(round){return round.vowel!==3&&approvedClips.has(round.audio)}
function showVisual(round){
  const base=round.letter==='أ'&&round.vowel===1?'إ':round.letter;
  const parts=round.example.match(/[^\p{Mark}]\p{Mark}*|\p{Mark}+/gu)||[round.example];
  const position=parts.findIndex(part=>part.startsWith(base)&&part.includes(vowels[round.vowel][0]));
  drivePrompt.textContent=round.mode==='missing'?tr('اختر الحركة الناقصة: ','Choose the missing vowel: '):tr('اختر حركة الحرف المحدد: ','Choose the marked letter’s vowel: ');
  const word=document.createElement('span');word.lang='ar';word.dir='rtl';
  parts.forEach((part,i)=>{if(i!==position){word.append(document.createTextNode(part));return}const marked=document.createElement('mark');marked.textContent=round.mode==='missing'?part.replace(vowels[round.vowel][0],'◌'):part;word.append(marked)});
  drivePrompt.append(word);
}
async function hear(){
  if(!target||answered||board.hidden||!isApproved(target))return;
  const request=++playback;
  listenLabel.textContent=tr('جارٍ التحميل…','Loading…');
  const source='/assets/vowel-drive-audio-v3/'+target.audio+'.mp3';
  if(audio.getAttribute('src')!==source)audio.src=source;
  audio.currentTime=0;
  try{await audio.play();if(request!==playback)return;listenLabel.textContent=tr('أعد الاستماع','Listen again');adult.open=false;}
  catch{if(request!==playback)return;listen.disabled=true;listenLabel.textContent=tr('الصوت غير متاح — تدريب بصري','Audio unavailable — visual practice');showVisual(target);adult.open=true;}
}

function choose(button, lane, vowel) {
  if (answered) return;
  scene.dataset.lane = lane;
  gates.querySelectorAll('[data-result]').forEach((gate) => delete gate.dataset.result);

  if (vowel !== target.vowel) {
    button.dataset.result = 'wrong';
    feedback.textContent = isApproved(target)?tr('جرّب بابًا آخر. يمكنك سماع الحرف مرة ثانية.', 'Try another gate. You can listen again.'):tr('جرّب بابًا آخر. انظر إلى حركة الحرف الملوّن.', 'Try another gate. Look at the highlighted letter.');
    feedback.dataset.state='wrong';
    journey.mistake();
    return;
  }

  answered = true;
  feedback.dataset.state='correct';
  stopAudio();
  button.dataset.result = 'correct';
  for (const gate of gates.children) gate.setAttribute('aria-disabled', 'true');
  listen.disabled = true;
  adult.open = false;
  adult.hidden = true;
  const word = document.createElement('b');
  word.className = 'drive-example';
  word.lang = 'ar';
  word.dir = 'rtl';
  word.textContent = target.example;
  const sound = document.createElement('b');
  sound.lang = 'ar';
  sound.dir = 'rtl';
  sound.textContent = syllable(target.letter, target.vowel);
  feedback.replaceChildren(tr('أحسنت! ', 'Well done! '), sound, tr(' مثل ', ' as in '), word);
  next.textContent = journey.nextLabel();
  next.hidden = false;
  driveTimer = window.setTimeout(() => {
    scene.dataset.driveState = 'pass';
  }, 240);
  drawRoute(true);
  journey.solve();
}

function renderRound(round) {
  stopAudio();
  window.clearTimeout(driveTimer);
  target = round;
  answered = false;
  delete scene.dataset.lane;
  delete scene.dataset.driveState;
  counter.textContent = journey.roundLabel();
  drawRoute();
  delete feedback.dataset.state;
  listen.disabled = !isApproved(round);
  listenLabel.textContent=isApproved(round)?tr('اسمع الحرف وحركته','Listen to the letter and vowel'):round.vowel===3?tr('تحدٍّ بصري: السكون','Visual challenge: sukūn'):tr('تدريب بصري — التسجيلات قيد المراجعة','Visual practice — recordings under review');
  adult.open = false;
  adult.hidden = false;
  adultCue.textContent=pronunciation(round.letter,round.vowel,round.example);
  next.hidden = true;
  feedback.textContent = '';
  drivePrompt.textContent=tr('اسمع واختر الباب','Listen and choose the gate');
  if(!isApproved(round)||(round.mode&&round.mode!=='audio'))showVisual(round);
  gates.replaceChildren(...shuffle(round.vowel===3?[0,1,3]:[0, 1, 2]).map((vowel, lane) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'drive-gate';
    button.dataset.vowel = vowel;
    const letter = document.createElement('span');
    letter.className = 'drive-gate-letter';
    letter.lang = 'ar';
    letter.dir = 'rtl';
    letter.textContent = syllable(round.letter, vowel);
    const label = document.createElement('span');
    label.className = 'drive-gate-label';
    label.textContent = vowels[vowel][ar ? 1 : 2];
    button.append(letter, label);
    button.addEventListener('click', () => choose(button, lane, vowel));
    return button;
  }));
}

const journey = bindJourney(data, board, renderRound);
listen.addEventListener('click', hear);
next.addEventListener('click', () => journey.advance());
board.querySelector('[data-level-menu]').addEventListener('click', stopAudio);
window.addEventListener('pagehide', stopAudio);

const garage=document.querySelector('[data-drive-garage]');
const styles=[['classic',0,'السيارة الحمراء','Red car'],['blue',20,'السيارة الزرقاء','Blue car'],['mint',40,'السيارة الخضراء','Green car'],['gold',75,'السيارة الذهبية','Gold car'],['space',150,'سيارة الفضاء','Space car']];
function stars(){return totalStars();}
function garageRender(){if(!garage)return;let skin='classic';try{skin=localStorage.getItem('fudool-drive-skin')??'classic';}catch{}const total=stars();if(!styles.some(([id,n])=>id===skin&&total>=n))skin='classic';scene.dataset.skin=skin;garage.replaceChildren(...styles.map(([id,n,a,e])=>{const b=document.createElement('button');b.type='button';b.className='button button-white';b.textContent=(total>=n?'🚗 ':'🔒 ')+tr(a,e)+(n?' · '+n+' ⭐':'');b.disabled=total<n;b.setAttribute('aria-pressed',String(id===skin));b.addEventListener('click',()=>{try{localStorage.setItem('fudool-drive-skin',id);}catch{}scene.dataset.skin=id;garageRender();});return b;}));}
garageRender();window.addEventListener('pageshow',garageRender);document.querySelectorAll('[data-level-menu]').forEach(b=>b.addEventListener('click',garageRender));
