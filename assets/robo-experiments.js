import {createIllustration} from './learning-art.js?v=2';

const lab = document.querySelector('[data-robo-experiments]');
const bench = lab.querySelector('[data-robo-bench]');
const choices = [...lab.querySelectorAll('[data-robo-experiment]')];
const tr = (ar, en) => document.documentElement.lang === 'ar' ? ar : en;
const colors = {
  blue: tr('الأزرق', 'blue'),
  yellow: tr('الأصفر', 'yellow'),
  green: tr('الأخضر', 'green'),
  orange: tr('البرتقالي', 'orange'),
  purple: tr('البنفسجي', 'purple'),
};
const materials = [
  {id: 'iron', name: tr('مسمار حديد', 'Iron nail'), attracted: true},
  {id: 'wood', name: tr('مكعب خشب', 'Wooden block'), attracted: false},
  {id: 'plastic', name: tr('كوب بلاستيك', 'Plastic cup'), attracted: false},
];

function element(tag, className = '', text = '') {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = text;
  return node;
}

function button(label, className, action) {
  const node = element('button', className, label);
  node.type = 'button';
  node.addEventListener('click', action);
  return node;
}

function specimen(id) {
  const shape = element('span', 'robo-specimen');
  shape.dataset.specimen = id;
  shape.setAttribute('aria-hidden', 'true');
  return shape;
}

function show(title, message, content, focus) {
  const heading = element('h3', 'robo-step-title', title);
  heading.tabIndex = -1;
  const prompt = element('p', 'robo-step-prompt', message);
  bench.replaceChildren(heading, prompt, ...content);
  if (focus) heading.focus();
}

function focusControl(control) {
  control.focus({preventScroll: true});
  const navigation = document.querySelector('.pwa-bottom-nav')?.getBoundingClientRect();
  const bottom = navigation?.height ? navigation.top : innerHeight;
  const bounds = control.getBoundingClientRect();
  if (bounds.top < 12 || bounds.bottom > bottom - 12) {
    control.scrollIntoView({block: 'center', behavior: 'instant'});
  }
}

function predict(kind, focus = true) {
  for (const choice of choices) {
    choice.setAttribute('aria-pressed', String(choice.dataset.roboExperiment === kind));
  }
  const mixing = kind === 'paint';
  const options = element('div', 'robo-predictions');
  const picks = mixing ? ['green', 'orange', 'purple'].map(id => ({id, name: colors[id]})) : materials;
  for (const pick of picks) {
    const choice = button('', 'robo-option', () => {
      if (mixing) mixPaint(pick);
      else testMagnet(pick);
    });
    choice.dataset.roboPrediction = pick.id;
    choice.append(specimen(pick.id), element('span', '', pick.name));
    options.append(choice);
  }

  const example = element('div', 'robo-example');
  example.setAttribute('aria-hidden', 'true');
  if (mixing) {
    example.append(specimen('blue'), element('span', '', '+'), specimen('yellow'), element('span', '', '= ?'));
  } else {
    example.classList.add('robo-example-magnet');
    example.append(createIllustration('magnet'));
  }
  show(tr('توقّع النتيجة', 'Make a prediction'),
    mixing ? tr('أي لون يظهر عند مزج الطلاء الأزرق والأصفر؟', 'What color will blue and yellow paint make?')
      : tr('أي قطعة سيجذبها المغناطيس؟', 'Which object will the magnet pull?'),
    [example, options], focus);
}

function mixPaint(prediction) {
  const station = element('div', 'robo-paint-station');
  const cup = element('div', 'robo-beaker');
  cup.dataset.fill = 'empty';
  cup.setAttribute('aria-hidden', 'true');
  cup.append(element('span', 'robo-liquid'));
  const supplies = element('div', 'robo-paint-supplies');
  const added = new Set();
  const status = element('p', 'robo-observation');
  status.setAttribute('role', 'status');
  const retry = button(tr('أعد التجربة', 'Try again'), 'button button-white', () => predict('paint'));
  retry.hidden = true;
  const blend = button(tr('اخلط', 'Mix'), 'button button-primary', () => {
    cup.dataset.fill = 'green';
    status.textContent = tr(
      'ظهر اللون الأخضر! توقّعت ' + prediction.name + '.',
      'The paint turned green! You predicted ' + prediction.name + '.'
    );
    blend.disabled = true;
    retry.hidden = false;
    focusControl(retry);
  });
  blend.dataset.roboMix = '';
  blend.disabled = true;
  for (const color of ['blue', 'yellow']) {
    const add = button('', 'robo-option robo-add-paint', () => {
      added.add(color);
      cup.dataset.fill = added.size === 2 ? 'both' : color;
      add.disabled = true;
      blend.disabled = added.size !== 2;
      status.textContent = added.size === 2
        ? tr('أضفت اللونين. اضغط اخلط لتعرف النتيجة.', 'Both colors are in. Press Mix to see the result.')
        : tr('أضفت ' + colors[color] + '. جرّب إضافة اللون الآخر.', 'You added ' + colors[color] + '. Add the other color.');
      const next = added.size === 2 ? blend : supplies.querySelector('button:not(:disabled)');
      focusControl(next);
    });
    add.dataset.roboAdd = color;
    add.append(specimen(color), element('span', '', tr('أضف ' + colors[color], 'Add ' + colors[color])));
    supplies.append(add);
  }
  const actions = element('div', 'robo-actions');
  actions.append(blend, retry);
  station.append(cup, supplies);
  show(tr('جرّب خلط الطلاء', 'Mix the paint'), tr('أضف اللونين إلى الكأس ثم اخلطهما.', 'Add both colors to the beaker, then mix them.'), [station, status, actions], true);
}

function testMagnet(prediction) {
  const field = element('div', 'robo-magnet-station');
  const magnet = element('span', 'robo-moving-magnet');
  magnet.append(createIllustration('magnet'));
  const status = element('p', 'robo-observation');
  status.setAttribute('role', 'status');
  const recap = element('p', 'robo-recap');
  recap.hidden = true;
  const retry = button(tr('أعد التجربة', 'Try again'), 'button button-white', () => predict('magnet'));
  retry.hidden = true;
  const tested = new Set();

  field.append(magnet);
  materials.forEach((material, index) => {
    const result = element('small', 'robo-magnet-outcome');
    const choice = button('', 'robo-option robo-magnet-piece', () => {
      tested.add(material.id);
      field.dataset.magnetTrack = String(index);
      for (const piece of field.querySelectorAll('button')) {
        piece.toggleAttribute('data-active', piece === choice);
      }
      choice.dataset.attracted = String(material.attracted);
      result.textContent = material.attracted ? tr('انجذب', 'Pulled') : tr('بقي مكانه', 'Stayed put');
      status.textContent = tr(
        material.attracted ? 'انجذب مسمار الحديد إلى المغناطيس.' : material.name + ' بقي مكانه.',
        material.attracted ? 'The iron nail moved toward the magnet.' : material.name + ' stayed put.'
      );
      if (tested.size === materials.length) {
        recap.hidden = false;
        recap.textContent = tr(
          'توقّعت «' + prediction.name + '». من بين القطع الثلاث جذب المغناطيس مسمار الحديد.',
          'You predicted “' + prediction.name + '”. Of these three objects, the magnet pulled the iron nail.'
        );
        retry.hidden = false;
      }
    });
    choice.dataset.roboMaterial = material.id;
    choice.append(specimen(material.id), element('span', '', material.name), result);
    field.append(choice);
  });
  show(tr('اختبر القطع الثلاث', 'Test the three objects'),
    tr('اضغط على كل قطعة لتقرّب منها المغناطيس.', 'Tap each object to move the magnet toward it.'),
    [field, status, recap, retry], true);
}

for (const choice of choices) {
  choice.addEventListener('click', () => predict(choice.dataset.roboExperiment));
}
predict('paint', false);
