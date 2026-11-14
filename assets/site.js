const bySelector = (selector, root = document) => root.querySelector(selector);
const menu = bySelector('.mobile-nav');
menu.addEventListener('click', (event) => {
  if (event.target.closest('nav a')) menu.open = false;
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menu.open) {
    menu.open = false;
    bySelector('summary', menu).focus();
  }
});
document.addEventListener('pointerdown', (event) => {
  if (menu.open && !menu.contains(event.target)) menu.open = false;
});

const filter = bySelector('[data-filter]');
if (filter) {
  const scope = filter.closest('[data-filter-scope]');
  const cards = [...scope.querySelectorAll('[data-category]')];
  const empty = bySelector('[data-empty]', scope);
  const practiceSections = [...document.querySelectorAll('[data-practice-kind]')];
  const buttons = [...filter.querySelectorAll('button')];
  filter.hidden = false;
  filter.addEventListener('click', (event) => {
    const button = event.target.closest('[data-kind]');
    if (!button) return;
    const kind = button.dataset.kind;
    buttons.forEach((entry) => entry.setAttribute('aria-pressed', String(entry === button)));
    cards.forEach((card) => { card.hidden = kind !== 'all' && kind !== card.dataset.category; });
    practiceSections.forEach((section) => { section.hidden = kind !== 'all' && kind !== section.dataset.practiceKind; });
    empty.hidden = cards.some((card) => !card.hidden);
  });
}

const loader = bySelector('[data-load-video]');
if (loader) {
  loader.hidden = false;
  loader.addEventListener('click', () => {
    const frame = document.createElement('iframe');
    frame.src = 'https://www.youtube-nocookie.com/embed/' + loader.dataset.loadVideo;
    frame.title = loader.dataset.videoTitle;
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.allow = 'encrypted-media; picture-in-picture; fullscreen';
    frame.allowFullscreen = true;
    bySelector('[data-player]').replaceChildren(frame);
    loader.hidden = true;
    frame.focus();
  }, { once:true });
}

const printButton = bySelector('[data-print]');
if (printButton) {
  printButton.hidden = false;
  printButton.addEventListener('click', () => window.print());
}

function showAnswer(options, button, feedback, correct, messages) {
  const state = correct ? 'correct' : 'wrong';
  options.querySelectorAll('button').forEach((option) => delete option.dataset.state);
  button.dataset.state = state;
  feedback.dataset.state = state;
  feedback.textContent = correct ? messages.correct : messages.retry;
}

const letterQuestion = bySelector('[data-letter-question]');
if (letterQuestion) {
  const options = bySelector('.game-options', letterQuestion);
  const feedback = bySelector('[data-letter-feedback]', letterQuestion);
  const buttons = options.querySelectorAll('button');
  options.addEventListener('click', (event) => {
    const button = event.target.closest('[data-letter-answer]');
    if (!button) return;
    buttons.forEach((option) => option.setAttribute('aria-pressed', String(option === button)));
    showAnswer(options, button, feedback, button.dataset.letterAnswer === 'correct', letterQuestion.dataset);
  });
  letterQuestion.hidden = false;
}

document.addEventListener('click', (event) => {
  const link = event.target.closest('a[data-youtube]');
  if (link) document.dispatchEvent(new CustomEvent('fudool:youtube-click', {
    detail: { destination:link.dataset.youtube },
  }));
});
