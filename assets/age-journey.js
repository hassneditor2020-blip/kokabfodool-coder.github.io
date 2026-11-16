import {activeProfile,read,scoresFor} from './profile-state.js?v=2';
import {ageGroups,ageLabel,agePreferenceKey,gameCounts,pathsForGame,nextPathLevel} from './game-age-paths.js?v=6';
import {worldCover} from './world-art.js?v=1';

const root = document.querySelector('[data-age-journey]');
if (root) {
  const ar = document.documentElement.lang === 'ar';
  const tr = (arabic, english) => ar ? arabic : english;
  const sections = [...document.querySelectorAll('.fudool-world')];
  const cards = [...document.querySelectorAll('.fudool-world [data-game-id]')];
  const tabs = root.querySelector('[data-age-tabs]');
  const panel = root.querySelector('[data-age-panel]');
  const groups = ['all', ...ageGroups];

  function element(tag, text = '', className = '') {
    const node = document.createElement(tag);
    node.textContent = text;
    node.className = className;
    return node;
  }

  function render() {
    const profile = activeProfile();
    const requested = new URLSearchParams(location.search).get('age') ??
      read(agePreferenceKey(profile.id)) ?? profile.age;
    const age = groups.includes(requested) ? requested : 'all';
    for (const button of tabs.children) button.setAttribute('aria-pressed', String(button.dataset.age === age));
    for (const section of sections) section.hidden = age !== 'all';
    panel.hidden = age === 'all';
    panel.replaceChildren();
    if (panel.hidden) return;

    const grid = element('div', '', 'age-journey-grid');
    let total = 0;
    let done = 0;
    for (const card of cards) {
      const id = card.dataset.gameId;
      const path = pathsForGame(id).find(candidate => candidate.age === age);
      if (!path) continue;
      const {scores} = scoresFor(id, gameCounts.get(id), profile.id);
      const count = path.last - path.first + 1;
      const completed = scores.slice(path.first - 1, path.last).filter(Boolean).length;
      total += count;
      done += completed;
      const item = element('article', '', 'age-journey-card');
      item.dataset.gameId = id;
      const level = nextPathLevel(path, scores) + 1;
      const label = completed === count
        ? tr('راجع المستوى ' + level, 'Review level ' + level)
        : tr('العب المستوى ' + level, 'Play level ' + level);
      const play = element('a', label, 'button age-journey-link');
      const url = new URL(card.href);
      url.searchParams.set('path', age);
      url.searchParams.set('level', level);
      play.href = url.href;
      item.append(worldCover(id), element('h3', card.querySelector('h3').textContent),
        element('p', tr(path.ar, path.en)),
        element('p', tr(completed + ' / ' + count + ' مستويات مكتملة', completed + ' / ' + count + ' levels completed'), 'age-stat'),
        play);
      grid.append(item);
    }
    const progress = element('progress');
    progress.max = total;
    progress.value = done;
    progress.setAttribute('aria-label', tr('إنجاز الفئة العمرية', 'Age group progress'));
    panel.append(element('h2', ageLabel(age, ar)),
      element('p', tr(done + ' من ' + total + ' مستوى مكتمل', done + ' of ' + total + ' levels complete'), 'age-stat'),
      progress, grid);
  }

  for (const age of groups) {
    const button = element('button', age === 'all' ? tr('جميع الألعاب', 'All games') : ageLabel(age, ar), 'age-tab');
    button.type = 'button';
    button.dataset.age = age;
    button.addEventListener('click', () => {
      try { localStorage.setItem(agePreferenceKey(activeProfile().id), JSON.stringify(age)); } catch {}
      const url = new URL(location.href);
      url.searchParams.set('age', age);
      history.replaceState(history.state, '', url);
      render();
    });
    tabs.append(button);
  }
  render();
  window.addEventListener('pageshow', render);
  window.addEventListener('storage', render);
}
