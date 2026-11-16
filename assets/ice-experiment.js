import {instructionButton, readInstruction, stopSpeech} from './game-voice.js?v=2';

const ar = document.documentElement.lang === 'ar';
const tr = (arabic, english) => ar ? arabic : english;
const duration = [6, 3];

function element(tag, label, cls) {
  const node = document.createElement(tag);
  if (label) node.textContent = label;
  if (cls) node.className = cls;
  return node;
}

export function renderIceExperiment(round, {cue, options, journey, button, done, wrong, say}) {
  const bench = element('section', '', 'ice-bench');
  const heading = element('div', '', 'lab-heading');
  const robo = element('img');
  robo.src = '/assets/robo.webp';
  robo.alt = '';
  robo.width = robo.height = 44;
  heading.append(robo, element('strong', tr('تجربة ذوبان الثلج', 'Melting ice')));
  const note = round.fair
    ? tr('استخدم الكوبين نفسيهما وساوِ كمية الماء. في كل كوب قطعة ثلج بالحجم نفسه.',
      'Use the same cups and equal amounts of water. Put one ice cube of the same size in each cup.')
    : tr('الكوبان فيهما كمية الماء نفسها. ضع قطعة ثلج في كل كوب.',
      'Both cups contain the same amount of water. Put an ice cube in each cup.');
  const listen = instructionButton(() => readInstruction('ice', tr(
    'ضع قطعة ثلج في كل كوب. توقع أي القطعتين تذوب أولاً، ثم شغّل المؤقت.',
    'Place one ice cube in each cup. Predict which cube will melt first, then start the timer.'),
    ar ? 'ar' : 'en', () => { status.textContent = note; }),
    tr('استمع إلى روبو', 'Listen to Robo'));
  bench.append(heading, element('p', note, 'ice-note'), listen);

  let prediction = -1;
  const status = element('p', '', 'ice-status');
  status.setAttribute('role', 'status');
  const cups = element('div', '', 'ice-cups');
  const volume = [100, round.fair ? 150 : 100];
  const added = [false, false];

  function update() {
    if (state !== 'setup') return;
    start.disabled = prediction < 0 || !added.every(Boolean);
    status.textContent = !added.every(Boolean)
      ? tr('أضف الثلج إلى الكوبين.', 'Add ice to both cups.')
      : prediction < 0
        ? tr('اختر توقّعك أولًا.', 'Choose your prediction.')
        : tr('شغّل المؤقّت لترى النتيجة.', 'Start the timer to see the result.');
  }

  const labels = [tr('ماء بارد', 'Cold water'), tr('ماء دافئ', 'Warm water')];
  const controls = labels.map((label, index) => {
    const card = element('div', '', 'ice-cup');
    card.dataset.temperature = index === 0 ? 'cold' : 'warm';
    const name = element('h3', label, 'ice-label');
    const glass = element('div', '', 'ice-glass');
    glass.setAttribute('aria-hidden', 'true');
    glass.append(element('div', '', 'ice-water'), element('div', '', 'ice-cube'));
    const volumeLabel = element('strong', '', 'ice-volume');
    function drawVolume() {
      card.style.setProperty('--water-height', (volume[index] === 100 ? 45 : 65) + '%');
      volumeLabel.textContent = volume[index] + tr(' مل', ' mL');
    }
    drawVolume();
    card.append(name, glass, volumeLabel);
    let change;
    if (round.fair) {
      change = button(tr('غيّر الكمية', 'Change amount'), () => {
        volume[index] = volume[index] === 100 ? 150 : 100;
        drawVolume();
        update();
      }, 'button button-white ice-control');
      change.setAttribute('aria-label', tr('غيّر كمية ', 'Change amount of ') + label);
      card.append(change);
    }
    const add = button(tr('أضف الثلج', 'Add ice'), () => {
      added[index] = true;
      add.disabled = true;
      add.textContent = tr('أُضيف الثلج ✓', 'Ice added ✓');
      card.dataset.iced = 'true';
      journey.effect('ice');
      update();
    }, 'button button-white ice-control');
    add.dataset.iceAdd = String(index);
    add.setAttribute('aria-label', tr('أضف الثلج إلى ', 'Add ice to ') + label);
    card.append(add);
    cups.append(card);
    return {card, change};
  });
  bench.append(cups);

  const predicted = element('div', '', 'ice-prediction');
  predicted.setAttribute('role', 'group');
  predicted.setAttribute('aria-label', tr('توقّع أي قطعة تذوب أولًا', 'Predict which cube melts first'));
  const picks = labels.map((label, index) => {
    const pick = button(label, () => {
      prediction = index;
      for (const [i, option] of picks.entries()) option.setAttribute('aria-pressed', String(i === index));
      update();
    }, 'button button-white');
    pick.setAttribute('aria-pressed', 'false');
    pick.dataset.icePrediction = String(index);
    return pick;
  });
  predicted.append(...picks);
  bench.append(element('p', tr('أيّ قطعة ثلج تذوب أولًا؟', 'Which ice cube will melt first?'), 'ice-note'), predicted);

  const timer = element('progress', '', 'ice-timer');
  timer.setAttribute('aria-label', tr('تقدّم المحاكاة', 'Simulation progress'));
  timer.max = duration[0];
  timer.value = 0;
  timer.hidden = true;
  let state = 'setup';
  let ticker;
  const start = button(tr('شغّل المؤقّت', 'Start the timer'), () => {
    if (state !== 'setup' || start.disabled) return;
    if (volume[0] !== volume[1]) {
      status.textContent = tr('ساوِ كمية الماء في الكوبين لتقارن أثر درجة الحرارة.', 'Use equal amounts of water to compare the effect of temperature.');
      return;
    }
    stopSpeech();
    state = 'running';
    start.disabled = true;
    listen.disabled = true;
    for (const pick of picks) pick.disabled = true;
    for (const {change} of controls) if (change) change.disabled = true;
    timer.hidden = false;
    status.textContent = tr('راقب حجم القطعتين أثناء الذوبان.', 'Watch the cubes shrink as they melt.');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const began = performance.now();
    function tick(time) {
      if (!bench.isConnected || bench.closest('[hidden]')) {
        cancelAnimationFrame(ticker);
        return;
      }
      const elapsed = reduced ? duration[0] : Math.min(duration[0], (time - began) / 650);
      timer.value = elapsed;
      controls.forEach(({card}, i) => {
        card.style.setProperty('--ice-scale', Math.max(0, 1 - elapsed / duration[i]));
        card.dataset.melted = String(elapsed >= duration[i]);
      });
      if (elapsed < duration[0]) ticker = requestAnimationFrame(tick);
      else showResults();
    }
    ticker = requestAnimationFrame(tick);
  }, 'button button-primary');
  start.dataset.iceStart = '';
  bench.append(start, timer, status);

  const observe = element('div', '', 'ice-values');
  observe.hidden = true;
  const conclusion = element('section', '', 'ice-conclusion');
  conclusion.hidden = true;
  const answers = labels.map((label, index) => button(label, () => {
    if (state !== 'observed') return;
    if (index !== 1) {
      answers[index].disabled = true;
      wrong();
      return;
    }
    for (const answer of answers) answer.disabled = true;
    answers[index].dataset.state = 'correct';
    state = 'finished';
    done();
    say(tr('ذابت القطعة في الماء الدافئ أولًا. في المحاكاة احتاجت 3 دقائق مقابل 6 في الماء البارد.',
      'The cube in warm water melted first. In this simulation it took 3 minutes, compared with 6 in cold water.'), 'correct');
  }));
  conclusion.append(element('h3', tr('بحسب النتائج، أين ذاب الثلج أسرع؟', 'Based on the results, where did the ice melt faster?')), ...answers);
  for (const [index, label] of labels.entries()) {
    const value = element('strong', duration[index] + tr(' دقائق', ' min'));
    const result = element('p');
    result.append(element('span', label), value);
    observe.append(result);
  }

  function showResults() {
    state = 'observed';
    listen.disabled = false;
    start.hidden = true;
    status.textContent = prediction === 1
      ? tr('طابق توقّعك نتيجة المحاكاة.', 'Your prediction matched the simulation.')
      : tr('قارن توقّعك بالقياسات أدناه.', 'Compare your prediction with the measurements below.');
    observe.hidden = false;
    conclusion.hidden = false;
    answers[0].focus({preventScroll: true});
  }

  bench.append(observe);
  cue.append(bench);
  options.append(conclusion);
  update();
}
