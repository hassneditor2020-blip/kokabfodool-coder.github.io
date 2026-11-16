import {audioPreferences, listenToAudioPreferences, setAudioPreference} from './audio-settings.js?v=1';

const sounds = {
  correct: [[523, 0, .12], [784, .09, .18]],
  wrong: [[392, 0, .14], [330, .11, .18]],
  win: [[523, 0, .12], [659, .09, .14], [784, .18, .18], [1047, .29, .25]],
  flip: [[280, 0, .09]],
  pair: [[587, 0, .10], [880, .08, .17]],
  coin: [[1175, 0, .09], [1568, .025, .10]],
  add: [[440, 0, .10]],
  ice: [[784, 0, .14], [1175, .04, .12]],
  drive: [[185, 0, .17], [277, .10, .19]],
  launch: [[220, 0, .20], [330, .12, .20], [440, .25, .22]],
  arrive: [[523, 0, .13], [659, .10, .14], [880, .19, .23]],
};
const instructionSources = new Set();
const observedPlayers = new WeakSet();
const instructionListeners = new Set();

export function setInstructionPlaying(source, playing) {
  if (playing ? instructionSources.has(source) : !instructionSources.has(source)) return;
  if (playing) instructionSources.add(source);
  else instructionSources.delete(source);
  for (const listener of instructionListeners) listener();
}

export function watchInstructionAudio(player, strength = 1) {
  if (observedPlayers.has(player)) return;
  observedPlayers.add(player);
  const applyVolume = () => { player.volume = strength * audioPreferences().voice / 100; };
  applyVolume();
  listenToAudioPreferences(applyVolume);
  player.addEventListener('playing', () => setInstructionPlaying(player, true));
  for (const event of ['pause', 'ended', 'error', 'emptied']) {
    player.addEventListener(event, () => setInstructionPlaying(player, false));
  }
}

export function bindGameAudio(button) {
  const Audio = window.AudioContext ?? window.webkitAudioContext;
  if (!Audio) return () => {};
  let context;
  let output;
  let request = 0;

  function mix() {
    const gain = audioPreferences().effects / 100 * (instructionSources.size ? .19 : 1);
    output?.gain.setTargetAtTime(gain, context.currentTime, .028);
  }

  function updateButton() {
    if (button) {
      const enabled = audioPreferences().effects > 0;
      button.setAttribute('aria-pressed', String(enabled));
      button.querySelector('[data-sound-icon]').textContent = enabled ? '🔊' : '🔇';
    }
    mix();
  }

  function schedule(notes, start, strength) {
    for (const [frequency, offset, duration] of notes) {
      const time = start + offset;
      const tone = context.createOscillator();
      const envelope = context.createGain();
      tone.type = 'sine';
      tone.frequency.value = frequency;
      envelope.gain.setValueAtTime(.001, time);
      envelope.gain.linearRampToValueAtTime(strength, time + .02);
      envelope.gain.exponentialRampToValueAtTime(.001, time + duration);
      tone.connect(envelope).connect(output);
      tone.start(time);
      tone.stop(time + duration);
      tone.onended = () => { tone.disconnect(); envelope.disconnect(); };
    }
  }

  async function play(sound, won = false) {
    const notes = sounds[sound];
    if (!audioPreferences().effects || !notes) return;
    const id = ++request;
    try {
      if (!context) {
        context = new Audio();
        output = context.createGain();
        output.gain.value = audioPreferences().effects / 100 * (instructionSources.size ? .19 : 1);
        output.connect(context.destination);
        instructionListeners.add(mix);
      }
      if (context.state !== 'running') await context.resume();
      if (!audioPreferences().effects || id !== request || context.state !== 'running') return;
      const start = context.currentTime + .015;
      schedule(notes, start, sound === 'correct' || sound === 'wrong' ? .07 : .048);
      if (won) schedule(sounds.win, start + .27, .065);
    } catch {
      // A device may block audio while the game remains playable.
    }
  }

  if (button) {
    button.addEventListener('click', () => {
      const {effects, lastEffects} = audioPreferences();
      request++;
      setAudioPreference('effects', effects ? 0 : lastEffects);
      if (!effects) play('correct');
    });
    button.hidden = false;
  }
  listenToAudioPreferences(updateButton);
  updateButton();
  return play;
}
