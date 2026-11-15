const guides = {
  'letter-match': 'lumaa',
  'letter-hunt': 'mishal',
  'vowel-drive': 'mishal',
  trace: 'lumaa',
  counting: 'lumaa',
  'english-abc': 'lumaa',
  'robo-lab': 'robot',
  memory: 'lumaa',
  puzzle: 'hero',
  'sound-quiz': 'lumaa',
  'fudool-shop': 'hero',
  'word-factory': 'mishal',
  'lumaa-clock': 'lumaa',
  'code-robo': 'robot',
  'world-mishaal': 'mishal',
  'planet-engineer': 'robot',
  'healthy-hero': 'mishal',
  'space-journey': 'robot',
  'spot-differences': 'hero',
  'grand-challenge': 'mishal',
};

export function worldCover(id, eager = false) {
  const cover = document.createElement('span');
  cover.className = 'fudool-world-cover';
  cover.setAttribute('aria-hidden', 'true');

  const scene = document.createElement('img');
  scene.className = 'world-cover-scene';
  scene.src = '/assets/worlds/' + id + '.webp';
  scene.alt = '';
  scene.width = 720;
  scene.height = 480;
  scene.loading = eager ? 'eager' : 'lazy';
  scene.decoding = 'async';

  const guide = document.createElement('img');
  guide.className = 'world-cover-guide';
  guide.src = '/assets/' + guides[id] + '.webp';
  guide.alt = '';
  guide.width = 96;
  guide.height = 96;
  guide.loading = scene.loading;
  guide.decoding = 'async';
  cover.append(scene, guide);
  return cover;
}

function mountGameHeading(shell, id, prefix, native) {
  document.body.classList.add('premium-game-page');
  shell.dataset.premiumGame = id;
  const intro = shell.querySelector('.simple-intro');
  if (intro) {
    const heading = document.createElement('div');
    heading.className = 'premium-game-heading';
    intro.before(heading);
    heading.append(intro, worldCover(id, true));
  }

  const back = document.createElement('a');
  back.className = 'premium-game-back';
  back.href = native ? prefix + '/play-app/#v5-games' : prefix + '/games/';
  back.textContent = prefix ? 'All games' : 'كل الألعاب';
  shell.prepend(back);
  if (native) {
    shell.addEventListener('click', (event) => {
      const anchor = event.target.closest('a[href]');
      if (!anchor) return;
      const url = new URL(anchor.href);
      if (url.origin !== location.origin || !/^\/(?:en\/)?(?:series|grown-ups|episodes)\//.test(url.pathname)) return;
      event.preventDefault();
      const destination = 'https://kokabfodool.com' + url.pathname + url.search + url.hash;
      location.assign('/play-app/external/?url=' + encodeURIComponent(destination));
    });
  }
}

export function mountWorlds() {
  const prefix = document.documentElement.lang === 'ar' ? '' : '/en';
  const native = /FudoolAndroid/.test(navigator.userAgent);
  const shell = document.querySelector('.game-shell');
  const id = location.pathname.match(/^\/(?:en\/)?games\/([^/]+)\//)?.[1];
  if (shell && Object.hasOwn(guides, id)) mountGameHeading(shell, id, prefix, native);

  const cards = document.querySelectorAll('.games-grid .activity-card[data-game-id]');
  if (!cards.length) return;
  document.body.classList.add('premium-library-page');
  for (const card of cards) {
    const game = card.dataset.gameId;
    if (!Object.hasOwn(guides, game)) continue;
    card.classList.add('premium-library-card');
    card.prepend(worldCover(game));
  }
}
