const artwork = {
  "🦁": "lion", "🦊": "fox", "🦆": "duck", "👑": "crown", "🐪": "camel",
  "🕊": "dove", "🐑": "sheep", "🐔": "chicken", "🐓": "chicken", "🦒": "giraffe",
  "🐟": "fish", "🐶": "dog", "🐕": "dog", "🐱": "cat", "🦋": "butterfly",
  "🐝": "bee", "🐇": "rabbit", "🐢": "turtle", "🐦": "bird", "🐴": "horse",
  "🦌": "deer", "🍎": "apple", "🍌": "banana", "🍞": "bread", "🍯": "honey",
  "☀": "sun", "🌙": "moon", "⭐": "star", "🌟": "star", "🌹": "rose",
  "🌷": "tulip", "🌼": "flower", "💡": "light", "🚀": "rocket", "💧": "water",
  "✋": "hand", "🎧": "headphones", "⚽": "ball", "📚": "book", "📕": "book",
  "✏": "pencil", "🏠": "house", "🌳": "tree", "🚗": "car", "🚪": "door",
  "🥇": "medal", "🥁": "drum", "☁": "cloud", "🔴": "pomegranate", "🍇": "grapes",
  "🥛": "milk", "🥕": "carrot", "🍊": "orange", "🍓": "strawberry", "🪙": "coin",
  "🤖": "robot", "🌍": "globe", "🎈": "balloon", "🌈": "rainbow", "🔺": "shapes-red",
  "🟦": "shapes-square", "🟨": "shapes-yellow", "🟢": "shapes-green", "🔵": "shapes-blue", "🟣": "shapes-purple",
  "🔶": "shapes-diamond", "🔷": "shapes-diamond-blue", "⬛": "shapes-black", "🦚": "peacock", "🐘": "elephant",
  "🐅": "tiger", "⛰": "mountain", "🌊": "waves", "🔑": "key", "☂": "umbrella",
  "✈": "plane", "🚢": "ship", "🚌": "bus", "📱": "phone", "💻": "computer",
  "🧸": "toy", "🧩": "puzzle", "🕒": "clock", "🔊": "speaker", "art:pomegranate": "pomegranate-fruit",
  "art:gold": "gold", "★": "star", "🥚": "egg", "🐐": "goat", "🎩": "hat",
  "🧊": "ice", "🪁": "kite", "🪺": "nest", "🐙": "octopus", "🐷": "pig",
  "🛏": "bed", "🚐": "van", "🕸": "web", "🩻": "xray", "🪀": "yoyo",
  "🦓": "zebra", "🐰": "rabbit", "🐋": "whale", "🎵": "notes", "🟡": "disc-yellow",
  "🟠": "disc-orange", "⛹": "basketball", "📦": "box", "👁": "eye", "🐸": "frog",
  "✉": "envelope", "🍋": "lemon", "🌱": "seedling", "🪨": "rock", "🧪": "test-tube",
  "🐧": "penguin", "🐒": "monkey", "🐬": "dolphin", "🔔": "bell", "🔥": "fire",
  "🧲": "magnet", "📄": "paper", "👂": "ear", "👃": "nose", "💨": "air",
  "❄": "snowflake", "🐠": "tropical-fish", "👅": "tongue", "🌞": "sun", "🌧": "rain",
  "🧤": "mittens", "🕶": "sunglasses", "🔋": "battery", "🌬": "wind", "🕯": "candle",
  "🌴": "palm", "🚲": "bike", "⬆": "up-arrow", "🔒": "lock", "🏆": "trophy",
  "🏅": "medal", "🔎": "magnifier", "🛒": "basket",
};

const sheets = {
  animals: 'lion fox duck crown camel dove sheep chicken giraffe fish dog cat butterfly bee rabbit turtle',
  nature: 'bird horse deer apple banana bread honey sun moon star rose flower light rocket water hand',
  everyday: 'headphones ball book pencil house tree car door medal drum cloud pomegranate grapes milk carrot orange',
  explorer: 'strawberry coin globe balloon rainbow peacock pomegranate-fruit tulip elephant tiger mountain waves key umbrella plane ship',
  classroom: 'bus phone computer toy puzzle clock speaker gold basket trophy flask command magnifier conveyor water-bottle award',
  alpha: 'egg goat hat ice kite nest octopus pig bed van web xray yoyo zebra whale notes',
  school: 'basketball box eye frog envelope lemon seedling rock test-tube penguin monkey dolphin bell fire magnet paper',
  science: 'ear nose air snowflake tropical-fish tongue rain mittens sunglasses battery wind candle palm bike lens lock',
  space: 'cow rooster storm tap train mercury venus mars jupiter saturn uranus neptune earth full-moon astronaut galaxy',
  flags: 'ae sy eg sa jp ma fr it ca br au ke in ar de',
};
const sprites = new Map();
for (const [sheet, entries] of Object.entries(sheets)) {
  entries.split(' ').forEach((id, index) => {
    sprites.set(sheet === 'flags' ? 'flag-' + id : id, [sheet, index]);
  });
}

function spriteArt(sheet, index) {
  const node = document.createElement('span');
  node.className = 'fudool-art';
  node.dataset.atlas = sheet;
  node.style.setProperty('--atlas-image', 'url(/assets/worlds/icons-' + sheet + '.webp)');
  node.style.setProperty('--atlas-x', (index % 4) * 100 / 3 + '%');
  node.style.setProperty('--atlas-y', Math.floor(index / 4) * 100 / 3 + '%');
  return node;
}

function vectorArt(id, source) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  const use = document.createElementNS(ns, 'use');
  svg.setAttribute('class', 'fudool-art');
  svg.setAttribute('viewBox', '0 0 120 120');
  svg.setAttribute('focusable', 'false');
  use.setAttribute('href', source + '#' + id);
  svg.append(use);
  return svg;
}

export function createIllustration(id, source = '/assets/learning-art.svg') {
  let node;
  const sprite = sprites.get(id);
  if (sprite) {
    node = spriteArt(...sprite);
  } else if (id === 'robot') {
    node = document.createElement('img');
    node.className = 'fudool-art';
    node.alt = '';
    node.src = '/assets/robot.webp';
  } else if (id.startsWith('disc-') || id === 'up-arrow') {
    node = document.createElement('span');
    node.className = 'fudool-art';
    node.dataset.artShape = id;
  } else {
    node = vectorArt(id, source);
  }
  node.setAttribute('aria-hidden', 'true');
  return node;
}

function flagId(text) {
  const letters = [...text].map(letter => letter.codePointAt(0));
  if (letters.length !== 2 || letters.some(code => code < 0x1f1e6 || code > 0x1f1ff)) return '';
  return 'flag-' + String.fromCharCode(...letters.map(code => code - 0x1f1e6 + 97));
}

export function illustrate(node, value) {
  if (typeof value !== 'string') return node;
  const text = value.trim().replace(/\uFE0F/g, '');
  const flag = flagId(text);
  const id = artwork[text] ?? (sprites.has(flag) ? flag : null);
  if (!id) return node;
  const child = createIllustration(id);
  const arabic = document.documentElement.lang === 'ar';
  const label = id === 'pomegranate-fruit' ? (arabic ? 'رمان' : 'Pomegranate')
    : id === 'gold' ? (arabic ? 'ذهب' : 'Gold') : value;
  node.replaceChildren(child);
  node.classList.add('has-fudool-art');
  if (node.tagName === 'BUTTON') {
    if (!node.hasAttribute('aria-label')) node.setAttribute('aria-label', label);
  } else if (!node.getAttribute('aria-hidden')) {
    child.removeAttribute('aria-hidden');
    child.setAttribute('role', 'img');
    child.setAttribute('aria-label', label);
  }
  return node;
}
