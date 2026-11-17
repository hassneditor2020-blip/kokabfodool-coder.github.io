export const profilesKey = 'fudool-profiles-v1';
export const activeKey = 'fudool-active-profile-v1';
export const avatars = ['lumaa', 'robot', 'mishal', 'brand'];
const defaultNameKey = 'fudool-default-name-v1';

export function read(key) {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
}

function cleanName(name) {
  return [...String(name ?? '').normalize('NFC').replace(/\p{C}/gu, '').trim().replace(/\s+/gu, ' ')]
    .slice(0, 20).join('');
}

export function profiles() {
  const rows = read(profilesKey);
  const primary = {id: 'default', name: cleanName(read(defaultNameKey)), avatar: 'brand', age: 'all'};
  return [primary, ...(Array.isArray(rows) ? rows.filter(p =>
    p && typeof p.id === 'string' && /^p-[a-z0-9-]+$/.test(p.id) &&
    typeof p.name === 'string' && avatars.includes(p.avatar)
  ) : [])];
}

export function activeProfile() {
  let id;
  try { id = localStorage.getItem(activeKey); } catch {}
  const all = profiles();
  return all.find(p => p.id === id) ?? all[0];
}

export function prefix(id = activeProfile().id) {
  return id === 'default' ? 'fudool-games-v1:' : 'fudool-profile-v1:' + id + ':game:';
}

export function switchProfile(id) {
  if (!profiles().some(p => p.id === id)) throw Error('unknown profile');
  localStorage.setItem(activeKey, id);
}

export function renameProfile(id, name) {
  const all = profiles();
  const profile = all.find(p => p.id === id);
  if (!profile) throw Error('unknown profile');
  const next = {...profile, name: cleanName(name)};
  if (id === 'default') localStorage.setItem(defaultNameKey, JSON.stringify(next.name));
  else localStorage.setItem(profilesKey, JSON.stringify(all.slice(1).map(p => p.id === id ? next : p)));
  return next;
}

export function addProfile(name, avatar, age) {
  const all = profiles().slice(1);
  if (all.length >= 5) throw Error('limit');
  name = cleanName(name);
  if (!name || !avatars.includes(avatar) || !['all', '3-5', '6-7', '8-10'].includes(age)) {
    throw Error('invalid');
  }
  const id = 'p-' + (crypto.randomUUID ? crypto.randomUUID() :
    Date.now().toString(36) + '-' + Math.random().toString(36).slice(2));
  const profile = {id, name, avatar, age};
  localStorage.setItem(profilesKey, JSON.stringify([...all, profile]));
  switchProfile(id);
  return profile;
}

export function scoresFor(id, count, profile = activeProfile().id) {
  const state = read(prefix(profile) + id) || {};
  const legacy = profile === 'default' ? read('kokab-games-v2')?.[id] : null;
  const scores = Array.from({length: count}, (_, i) => Math.max(0,
    ...[state.scores?.[i], legacy?.[i]].filter(x => Number.isInteger(x) && x >= 1 && x <= 3)));
  return {scores, lastPlayed: Number(state.lastPlayed) || 0, lastLevel: state.lastLevel,
    checkpoints: state.checkpoints || {}};
}
