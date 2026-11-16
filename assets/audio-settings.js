const levelsKey = 'fudool-audio-levels-v1';
const muteKey = 'fudool-game-sound';
const defaults = {effects: 100, voice: 100, lastEffects: 100};
let fallback;

function volume(value, otherwise) {
  return Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : otherwise;
}

export function audioPreferences() {
  if (fallback) return {...fallback};
  try {
    const saved = JSON.parse(localStorage.getItem(levelsKey));
    const effects = volume(saved?.effects, defaults.effects);
    return {
      effects: localStorage.getItem(muteKey) === 'off' ? 0 : effects,
      voice: volume(saved?.voice, defaults.voice),
      lastEffects: volume(saved?.lastEffects, effects || defaults.effects) || defaults.effects,
    };
  } catch { return {...defaults}; }
}

export function setAudioPreference(channel, value) {
  if (channel !== 'effects' && channel !== 'voice') throw Error('unknown audio channel');
  const settings = audioPreferences();
  settings[channel] = volume(value, settings[channel]);
  if (channel === 'effects' && settings.effects) settings.lastEffects = settings.effects;
  try {
    localStorage.setItem(levelsKey, JSON.stringify(settings));
    if (channel === 'effects') localStorage.setItem(muteKey, settings.effects ? 'on' : 'off');
    fallback = undefined;
  } catch { fallback = settings; }
  window.dispatchEvent(new Event('fudool:audio-preferences'));
  return settings;
}

export function listenToAudioPreferences(callback) {
  window.addEventListener('fudool:audio-preferences', callback);
  window.addEventListener('storage', event => {
    if (!event.key || event.key === levelsKey || event.key === muteKey) callback();
  });
  window.addEventListener('pageshow', callback);
}
