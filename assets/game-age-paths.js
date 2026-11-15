import {read} from './profile-state.js?v=1';

const ages = ['3-5', '6-7', '8-10'];
const titles = [
  {ar: 'مسار التأسيس', en: 'Foundation path'},
  {ar: 'مسار التدريب', en: 'Practice path'},
  {ar: 'مسار التحدّي', en: 'Challenge path'},
];
const ranges = {
  'vowel-drive': [[1, 3], [4, 10], [11, 15]],
  'robo-lab': [[1, 2], [3, 6], [7, 10]],
};

export function pathsForGame(id) {
  return (ranges[id] ?? []).map(([first, last], index) => ({
    age: ages[index],
    title: titles[index],
    first,
    last,
  }));
}

export const agePreferenceKey = id => id === 'default'
  ? 'fudool-age-journey-v1'
  : 'fudool-profile-v1:' + id + ':age';

export function recommendedAge(profile) {
  const preference = read(agePreferenceKey(profile.id));
  return ages.includes(preference) ? preference : profile.age;
}

export function includesLevel(path, index) {
  return index >= path.first - 1 && index < path.last;
}

export function nextPathLevel(path, scores) {
  for (let index = path.first - 1; index < path.last; index++) {
    if (!scores[index]) return index;
  }
  return path.first - 1;
}
