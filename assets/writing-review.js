// Starting direction of the main stroke for the first two Arabic levels.
const starts = [
  [['alif'], .49, .06, '↓', 0, 19],
  [['baa'], .94, .17, '↙', -14, 14],
  [['taa', 'thaa'], .94, .51, '↙', -14, 14],
  [['jeem', 'haa', 'khaa'], .90, .25, '←', -20, 0],
  [['daal'], .72, .11, '↙', -16, 16],
  [['dhaal'], .72, .33, '↙', -16, 16],
  [['raa'], .86, .13, '↙', -15, 17],
  [['zay'], .86, .32, '↙', -15, 17],
  [['seen', 'saad'], .95, .12, '↙', -15, 13],
  [['sheen'], .95, .38, '↙', -15, 13],
];

export function startingMarker(imagePath, box, reference) {
  const name = imagePath.match(/\/arabic-letters\/([a-z]+)-dots\.png$/)?.[1];
  const instruction = starts.find(([letters]) => letters.includes(name));
  if (!instruction) return null;
  const [, x, y, arrow, dx, dy] = instruction;
  const marker = document.createElement('span');
  marker.className = 'trace-start-marker';
  marker.textContent = arrow;
  marker.setAttribute('aria-hidden', 'true');
  marker.style.left = (box.x + x * box.w) / (reference.width / 2) * 100 + '%';
  marker.style.top = (box.y + y * box.h) / (reference.height / 2) * 100 + '%';
  marker.style.setProperty('--trace-arrow-x', dx + 'px');
  marker.style.setProperty('--trace-arrow-y', dy + 'px');
  return marker;
}

export function drawWritingReview(canvas, model, missed) {
  canvas.width = model.width;
  canvas.height = model.height;
  const context = canvas.getContext('2d');
  context.drawImage(model, 0, 0);
  if (!missed) return;
  const width = canvas.width / 2;
  context.fillStyle = '#bc4429';
  for (const pixel of missed) {
    context.fillRect((pixel % width) * 2 - 1, Math.floor(pixel / width) * 2 - 1, 4, 4);
  }
}
