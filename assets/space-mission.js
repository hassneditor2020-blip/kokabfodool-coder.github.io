import {createIllustration} from './learning-art.js?v=2';
import {instructionButton, readInstruction, stopSpeech} from './game-voice.js?v=1';

export function renderSpaceMission(round, {cue, options, journey, el, btn, tr, wrong, done}) {
  const panel = el('section', '', 'mission-board');
  const heading = el('div', '', 'lab-heading');
  const guide = el('img');
  guide.src = '/assets/robo.webp';
  guide.alt = '';
  guide.width = guide.height = 44;
  heading.append(guide, el('strong', tr('اختر مسار المسبار', 'Choose a probe route')));
  panel.append(heading);
  const listen = instructionButton(() => readInstruction('space', tr(
    'اختر المسار الذي يصل إلى المحطة في الوقت المحدّد وضمن الوقود المتاح.',
    'Choose a route that reaches the station within the time limit and the fuel you have.'),
    tr('ar', 'en')), tr('استمع إلى روبو', 'Listen to Robo'));
  const specs = el('div', '', 'mission-specs');
  const requirements = [
    [tr('الوقود المتاح', 'Available fuel'), round.fuel + tr(' وحدة', ' units')],
    [tr('وقت المهمة', 'Mission time'), round.time + tr(' د', ' min')],
    [tr('وقت العمل المطلوب', 'Work time needed'), round.work + tr(' د', ' min')],
  ];
  for (const [label, value] of requirements) {
    const cell = el('span');
    cell.append(el('span', label), el('strong', value));
    specs.append(cell);
  }

  const map = el('div', '', 'mission-map');
  map.setAttribute('aria-hidden', 'true');
  map.dir = 'ltr';
  for (let i = 0; i < round.routes.length; i++) {
    const rail = el('div', '', 'mission-rail');
    rail.dataset.route = String(i);
    map.append(rail);
  }
  const startPoint = el('span', '', 'mission-point mission-earth');
  startPoint.append(createIllustration('earth'));
  const endPoint = el('span', '', 'mission-point mission-station');
  endPoint.append(createIllustration('moon'));
  const probe = el('span', '', 'mission-probe');
  probe.append(createIllustration('rocket'));
  map.append(startPoint, endPoint, probe);
  const status = el('p', tr('حدد مسارًا ثم أطلق المسبار.', 'Pick a route, then launch the probe.'), 'mission-status');
  status.setAttribute('role', 'status');
  panel.append(listen, specs, map, status);
  cue.append(panel);

  let route = -1;
  let phase = 'select';
  const controls = el('div', '', 'mission-actions');
  const choiceList = el('div', '', 'mission-routes');
  choiceList.setAttribute('role', 'group');
  choiceList.setAttribute('aria-label', tr('مسارات المحاكاة', 'Simulation routes'));
  const choices = round.routes.map(({name, fuel, travel}, index) => {
    const pick = btn('', () => {
      if (phase !== 'select') return;
      route = index;
      map.dataset.selection = String(index);
      choices.forEach((control, i) => control.setAttribute('aria-pressed', String(i === index)));
      launch.disabled = false;
    }, 'button button-white mission-route');
    pick.dataset.missionRoute = String(index);
    pick.setAttribute('aria-pressed', 'false');
    pick.append(el('strong', name), el('small', fuel + tr(' وحدة وقود · ', ' fuel units · ') + travel + tr(' د سفر', ' min travel')));
    return pick;
  });
  choiceList.append(...choices);
  const launch = btn(tr('أطلق المسبار', 'Launch probe'), () => {
    if (route < 0 || phase !== 'select') return;
    const selected = round.routes[route];
    const available = round.time - selected.travel;
    if (selected.fuel > round.fuel || available < round.work) {
      wrong();
      status.textContent = selected.fuel > round.fuel
        ? tr('وقود هذا المسار أكثر من الوقود المتاح.', 'This route needs more fuel than you have.')
        : tr('يتبقى ' + Math.max(0, available) + ' دقائق للعمل. جرّب مسارًا يتيح وقتًا أطول.',
          'There are ' + Math.max(0, available) + ' minutes left for work. Choose a route with more work time.');
      choices[route].dataset.state = 'wrong';
      return;
    }
    phase = 'flight';
    launch.disabled = listen.disabled = true;
    choices.forEach(control => { control.disabled = true; });
    stopSpeech();
    journey.effect('launch');
    map.dataset.flight = 'true';
    status.textContent = tr('المسبار في طريقه إلى المحطة…', 'The probe is on its way to the station…');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.setTimeout(() => {
      if (!panel.isConnected || panel.closest('[hidden]')) return;
      phase = 'arrived';
      map.dataset.arrived = 'true';
      launch.hidden = true;
      choices[route].dataset.state = 'correct';
      status.textContent = tr('وصل المسبار. بقي ', 'Probe arrived. ') + available +
        tr(' دقيقة للعمل و', ' min for work and ') + (round.fuel - selected.fuel) + tr(' وحدة وقود.', ' fuel units left.');
      done();
      journey.effect('arrive');
    }, reduced ? 0 : 940);
  }, 'button button-primary mission-launch');
  launch.disabled = true;
  controls.append(choiceList, launch);
  options.append(controls);
}
