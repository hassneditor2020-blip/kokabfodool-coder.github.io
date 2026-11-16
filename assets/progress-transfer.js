import {gameCounts} from './game-age-paths.js?v=6';
import {activeProfile, prefix, read, scoresFor} from './profile-state.js?v=2';

export const backupVersion = 1;
export const maxBackupBytes = 4096;

export function unpackLevels(levels) {
  if (typeof levels !== 'string' || levels.length > maxBackupBytes) throw Error('invalid backup');
  const games = new Map();
  if (!levels) return games;
  for (const part of levels.split(';')) {
    const match = /^([a-z-]+):([0-3]{1,128})$/.exec(part);
    if (!match || !gameCounts.has(match[1]) || games.has(match[1])) throw Error('invalid backup');
    games.set(match[1], Array.from(match[2], Number));
  }
  return games;
}

function packLevels(games) {
  return [...games].filter(([, scores]) => scores.some(Boolean))
    .sort(([a], [b]) => a.localeCompare(b, 'en'))
    .map(([id, scores]) => id + ':' + scores.join('')).join(';');
}

function bestScores(first, second) {
  return Array.from({length: Math.max(first.length, second.length)}, (_, i) =>
    Math.max(first[i] ?? 0, second[i] ?? 0));
}

export function snapshotLevels(profileId = activeProfile().id) {
  const games = new Map();
  for (const [id, count] of gameCounts) games.set(id, scoresFor(id, count, profileId).scores);
  return packLevels(games);
}

export function mergeLevels(first, second) {
  const games = unpackLevels(first);
  for (const [id, scores] of unpackLevels(second)) {
    games.set(id, bestScores(games.get(id) ?? [], scores));
  }
  return packLevels(games);
}

export function restoreLevels(levels, profileId = activeProfile().id) {
  const changes = [];
  let restored = 0;
  for (const [id, scores] of unpackLevels(levels)) {
    const key = prefix(profileId) + id;
    const raw = localStorage.getItem(key);
    const saved = read(key) ?? {};
    const length = Math.max(gameCounts.get(id), scores.length);
    const previous = scoresFor(id, length, profileId).scores;
    const combined = bestScores(previous, scores);
    const added = combined.filter((score, i) => score > previous[i]).length;
    if (!added) continue;
    restored += added;
    const existing = Array.isArray(saved.scores) ? saved.scores : [];
    const tail = existing.slice(combined.length);
    changes.push({key, raw, data: JSON.stringify({...saved, scores: [...combined, ...tail]})});
  }
  let applied = 0;
  try {
    for (const {key, data} of changes) {
      localStorage.setItem(key, data);
      applied++;
    }
  } catch (error) {
    for (const {key, raw} of changes.slice(0, applied)) {
      if (raw === null) localStorage.removeItem(key);
      else localStorage.setItem(key, raw);
    }
    throw error;
  }
  return restored;
}
