import {speak,stopSpeech,playRecording} from './game-extra.js?v=7';
import { bindJourney, shuffle } from './game-progress.js?v=6';

const game = document.querySelector('[data-letter-match]');
const data = JSON.parse(document.getElementById('match-data').textContent);
const { lang, messages } = data;
const puzzle = game.querySelector('[data-match-puzzle]');
const letters = game.querySelector('[data-match-letters]');
const pictures = game.querySelector('[data-match-pictures]');
const lines = game.querySelector('[data-match-lines]');
const roundLabel = game.querySelector('[data-match-round]');
const countLabel = game.querySelector('[data-match-count]');
const feedback = game.querySelector('[data-match-feedback]');
const next = game.querySelector('[data-match-next]');
const review = game.querySelector('[data-match-review]');
const reviewCards = review.querySelector('.match-review-grid');
const rtl = document.documentElement.dir === 'rtl';
const connections = [];
let round;
let selected = null;
let mode = null;

function makeCard(item, side) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'game-option match-card match-' + side;
  button.dataset.side = side;
  button.dataset.matchKey = item.id;
  if (side === 'letter') {
    button.lang = 'ar';
    button.textContent = mode === "word-picture" ? item.example : item.cue;
    button.setAttribute('aria-label', item.name + '، ' + item.cue);
    button.setAttribute('aria-pressed', 'false');
  } else {
    const picture = document.createElement('span');
    picture.className = 'game-picture';
    picture.setAttribute('aria-hidden', 'true');
    picture.textContent = mode === "word" ? item.example : mode === "position" ? item.positionCue : mode === "audio" ? "🔊" : item.picture;
    if(item.image && (mode === null || mode === "word-picture")){const img=document.createElement("img");img.src=item.image;img.alt="";img.className="match-art";picture.replaceChildren(img);}
    if(mode === "word" || mode === "position")picture.classList.add("match-word");
    button.append(picture);
    button.setAttribute('aria-label', item.pictureLabel);
  }
  return button;
}

function drawConnections() {
  const field = puzzle.getBoundingClientRect();
  lines.replaceChildren(...connections.map(({letter, picture}, index) => {
    const start = letter.getBoundingClientRect();
    const end = picture.getBoundingClientRect();
    const startX = rtl ? start.left : start.right;
    const endX = rtl ? end.right : end.left;
    const startY = start.top + start.height / 2;
    const endY = end.top + end.height / 2;
    const dx = endX - startX;
    const dy = endY - startY;
    const line = document.createElement('span');
    line.className = 'match-line';
    line.dataset.connection = index;
    line.style.left = startX - field.left + 'px';
    line.style.top = startY - field.top - 2 + 'px';
    line.style.width = Math.hypot(dx, dy) + 'px';
    line.style.transform = 'rotate(' + Math.atan2(dy, dx) + 'rad)';
    return line;
  }));
}

function updateCount() {
  countLabel.textContent = `${messages.pairs} ${connections.length} / ${round.length}`;
}

function showFeedback(text, state = '') {
  feedback.textContent = text;
  feedback.dataset.state = state;
}

function reviewCard(item) {
  const card = document.createElement('article');
  card.className = 'match-review-card';
  const heading = document.createElement('h3');
  const word = document.createElement('bdi');
  word.lang = 'ar';
  word.textContent = item.example;
  heading.append(item.picture + ' ', word);
  const links = document.createElement('div');
  links.className = 'button-row';
  for (const [url, label] of [[item.lesson, messages.watch], [item.worksheet, messages.print]]) {
    if (!url) continue;
    const link = document.createElement('a');
    link.href = url;
    link.className = 'text-link';
    link.textContent = label;
    link.setAttribute('aria-label', `${label} · ${lang === 'ar' ? item.name : item.cue}`);
    links.append(link);
  }
  card.append(heading, links);
  return card;
}

function renderRound(cues) {
  stopSpeech();
  mode = cues.mode ?? null;
  puzzle.dataset.mode=mode??"picture";
  round = [...(Array.isArray(cues) || typeof cues === "string" ? cues : cues.keys)].map((cue) => data.letters[cue]);
  const shuffled = shuffle(round);
  if (shuffled.every((item, index) => item === round[index])) shuffled.push(shuffled.shift());
  selected = null;
  connections.length = 0;
  roundLabel.textContent = journey.roundLabel();
  updateCount();
  letters.replaceChildren(...round.map((item) => makeCard(item, 'letter')));
  pictures.replaceChildren(...shuffled.map((item) => makeCard(item, 'picture')));
  lines.replaceChildren();
  review.hidden = true;
  review.open = false;
  reviewCards.replaceChildren();
  next.hidden = true;
  next.textContent = journey.nextLabel();
  showFeedback('');
}

puzzle.addEventListener('click', (event) => {
  const button = event.target.closest('.match-card');
  if (!button || button.disabled) return;

  const keyboard = event.detail === 0;
  const wrong = puzzle.querySelector('[data-state="wrong"]');
  if (wrong) delete wrong.dataset.state;
  if (button.dataset.side === 'letter') {
    selected?.setAttribute('aria-pressed', 'false');
    selected = button;
    selected.setAttribute('aria-pressed', 'true');
    showFeedback(mode === "position" ? (lang === "ar" ? "اختر الكلمة التي يظهر فيها الحرف في الموضع المطلوب." : "Choose the word with that letter in the requested position.") : mode === "word-picture" ? (lang === "ar" ? "اختر الصورة المطابقة للكلمة." : "Choose the picture for the word.") : messages.choosePicture);
    if (keyboard) pictures.querySelector('button:not(:disabled)').focus();
    return;
  }
  if (mode === "audio" && button.dataset.heard !== "yes") {
    const item=round.find(x=>x.id===button.dataset.matchKey);
    const fallback=()=>{button.querySelector("span").textContent=item.cue;};
    if(item.speech)speak(item.speech,"ar-SA",()=>item.audioFallback?playRecording(item.audioFallback,fallback):fallback());else if(item.audio)playRecording(item.audio,fallback);else speak(item.cue,"ar-SA",fallback);
    button.dataset.heard="yes";
    showFeedback(lang === "ar" ? "استمع ثم اضغط مرة أخرى للاختيار." : "Listen, then tap again to choose.");
    return;
  }
  if (!selected) {
    showFeedback(messages.chooseLetter);
    return;
  }
  if (selected.dataset.matchKey !== button.dataset.matchKey) {
    journey.mistake();
    button.dataset.state = 'wrong';
    showFeedback(messages.retry, 'wrong');
    return;
  }

  const item = round.find(({id}) => id === button.dataset.matchKey);
  selected.setAttribute('aria-pressed', 'false');
  for (const card of [selected, button]) {
    card.dataset.connection = connections.length;
    card.disabled = true;
  }
  connections.push({letter:selected, picture:button});
  selected = null;
  updateCount();
  drawConnections();

  if (connections.length === round.length) {
    journey.solve();
    showFeedback(messages.roundComplete, 'correct');
    next.hidden = false;
    reviewCards.replaceChildren(...round.map(reviewCard));
    review.hidden = false;
    if (keyboard) next.focus();
  } else {
    journey.correct();
    showFeedback(item.correct, 'correct');
    if (keyboard) letters.querySelector('button:not(:disabled)').focus();
  }
});

const journey = bindJourney(data, game, renderRound);
next.addEventListener('click', journey.advance);
new ResizeObserver(() => { if (!game.hidden && connections.length) drawConnections(); }).observe(puzzle);

let dragStart=null;
puzzle.addEventListener("pointerdown",e=>{const b=e.target.closest(".match-letter:not(:disabled)");if(b)dragStart={b,x:e.clientX,y:e.clientY};});
puzzle.addEventListener("pointerup",e=>{if(!dragStart)return;const {b,x,y}=dragStart;dragStart=null;if(Math.hypot(e.clientX-x,e.clientY-y)<12)return;const dest=document.elementFromPoint(e.clientX,e.clientY)?.closest(".match-picture:not(:disabled)");if(dest){b.click();dest.click();}});
puzzle.addEventListener("pointercancel",()=>dragStart=null);
game.querySelector("[data-level-menu]").addEventListener("click",stopSpeech);
window.addEventListener("pagehide",stopSpeech);
