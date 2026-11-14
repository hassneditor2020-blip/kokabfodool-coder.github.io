const sounds = {
  correct: [[660, 0, .09], [880, .08, .13]],
  wrong: [[392, 0, .11], [294, .10, .15]],
  win: [[523, 0, .10], [659, .10, .10], [784, .20, .10], [1047, .30, .25]],
};
const preferenceKey = 'fudool-game-sound';

export function bindGameAudio(button) {
  const Audio = window.AudioContext ?? window.webkitAudioContext;
  if (!Audio) return () => {};
  let context;
  let output;
  let enabled = true;
  let request = 0;
  try { enabled = localStorage.getItem(preferenceKey) !== 'off'; } catch {}

  function updateButton() {
    button.setAttribute('aria-pressed', String(enabled));
    button.querySelector('[data-sound-icon]').textContent = enabled ? '🔊' : '🔇';
    if (output) output.gain.setTargetAtTime(enabled ? 1 : 0, context.currentTime, .01);
  }

  function schedule(notes, start) {
    for (const [frequency, offset, duration] of notes) {
      const time = start + offset;
      const tone = context.createOscillator();
      const envelope = context.createGain();
      tone.frequency.value = frequency;
      envelope.gain.setValueAtTime(0, time);
      envelope.gain.linearRampToValueAtTime(.085, time + .015);
      envelope.gain.exponentialRampToValueAtTime(.001, time + duration);
      tone.connect(envelope).connect(output);
      tone.start(time);
      tone.stop(time + duration);
      tone.onended = () => { tone.disconnect(); envelope.disconnect(); };
    }
  }

  async function play(sound, won = false) {
    if (!enabled) return;
    const id = ++request;
    try {
      if (!context) {
        context = new Audio();
        output = context.createGain();
        output.connect(context.destination);
        updateButton();
      }
      // Resume from the answer button's activation so sound also works on phones.
      if (context.state !== 'running') await context.resume();
      if (!enabled || id !== request || context.state !== 'running') return;
      const start = context.currentTime + .015;
      schedule(sounds[sound], start);
      if (won) schedule(sounds.win, start + .24);
    } catch {
      // Audio can be unavailable while the game remains playable.
    }
  }

  button.addEventListener('click', () => {
    enabled = !enabled;
    request++;
    try { localStorage.setItem(preferenceKey, enabled ? 'on' : 'off'); } catch {}
    updateButton();
    if (enabled) play('correct');
  });
  updateButton();
  button.hidden = false;
  return play;
}
