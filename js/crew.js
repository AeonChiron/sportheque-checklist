// L'équipe d'entretien, dessinée en SVG (aucune image à télécharger).
// Même style que les illustrations des tâches : un contour « encre », des
// aplats. Clin d'œil au logo Sporthèque 1981 : tout le monde porte le bandeau
// de sport, et les bas de sport ont leurs deux rayures.
// Trois personnes inventées (aucune ressemblance voulue), couleurs via --il-*.

const INK = 'var(--il-ink)';
const PLATE = { r: 'var(--plate-r, #d3242c)', b: 'var(--plate-b, #1f5cc4)', y: 'var(--plate-y, #f0b400)', g: 'var(--plate-g, #1d8a4a)', w: 'var(--plate-w, #e4e2dc)' };

// Les trois membres de l'équipe.
export const CREW = {
  mo: { skin: '#e9b98f', hair: '#3b2a20', style: 'short', band: PLATE.r, shirt: '#2b2d2a', pants: '#5d6168' },
  ana: { skin: '#8a5636', hair: '#1e1714', style: 'curly', band: PLATE.b, shirt: '#2b2d2a', pants: '#5d6168' },
  lea: { skin: '#f3cfb1', hair: '#7a4a24', style: 'bun', band: PLATE.y, shirt: '#2b2d2a', pants: '#5d6168' },
};

const pts = (p) => `M${p.map(([x, y]) => `${x} ${y}`).join('L')}`;
// Un membre : contour encre, puis la couleur par-dessus (traits arrondis).
const limb = (p, color, w = 7) => `<path d="${pts(p)}" fill="none" stroke="${INK}" stroke-width="${w + 3.4}" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="${pts(p)}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const dot = (x, y, r, fill) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${INK}" stroke-width="1.7"/>`;

function hair(c, x, y) {
  if (c.style === 'curly') {
    return [[-8, -5], [-4, -9], [1, -10], [6, -8], [9, -3], [-10, 0], [10, 1]]
      .map(([dx, dy]) => `<circle cx="${x + dx}" cy="${y + dy}" r="5.2" fill="${c.hair}" stroke="${INK}" stroke-width="1.7"/>`).join('');
  }
  const cap = `<path d="M${x - 10.6} ${y + 1}A10.6 10.6 0 0 1 ${x + 10.6} ${y + 1}C${x + 7} ${y - 3} ${x - 5} ${y - 5} ${x - 10.6} ${y + 1}z" fill="${c.hair}" stroke="${INK}" stroke-width="1.7" stroke-linejoin="round"/>`;
  if (c.style === 'bun') return `<circle cx="${x + 6}" cy="${y - 12}" r="4.6" fill="${c.hair}" stroke="${INK}" stroke-width="1.7"/>${cap}`;
  return cap;
}

// La tête : peau, cheveux, bandeau du logo, yeux, sourire.
function head(c, x, y, { look = 0, smile = 'soft' } = {}) {
  const mouth = smile === 'big'
    ? `<path d="M${x - 3.6 + look} ${y + 4}q3.6 4 7.2 0z" fill="${INK}"/>`
    : `<path d="M${x - 3 + look} ${y + 4.4}q3 2.6 6 0" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>`;
  return `${c.style === 'curly' ? hair(c, x, y) : ''}
    <circle cx="${x}" cy="${y}" r="10.6" fill="${c.skin}"/>
    ${c.style !== 'curly' ? hair(c, x, y) : ''}
    <path d="M${x - 10.4} ${y - 3.2}h20.8v4.6h-20.8z" fill="${c.band}"/>
    <path d="M${x - 10.4} ${y - 1.6}h20.8" stroke="rgba(255,255,255,.55)" stroke-width="1"/>
    <circle cx="${x}" cy="${y}" r="10.6" fill="none" stroke="${INK}" stroke-width="1.9"/>
    <circle cx="${x - 3.6 + look}" cy="${y + 0.8}" r="1.25" fill="${INK}"/><circle cx="${x + 3.6 + look}" cy="${y + 0.8}" r="1.25" fill="${INK}"/>
    ${mouth}`;
}

// Bas de sport 1981 : deux rayures juste au-dessus du soulier.
function sock(c, [kx, ky], [fx, fy]) {
  const t = (k) => [fx + (kx - fx) * k, fy + (ky - fy) * k];
  const [a1, b1] = t(0.2); const [a2, b2] = t(0.32);
  const nx = -(ky - fy), ny = kx - fx, n = Math.hypot(nx, ny) || 1, ux = (nx / n) * 4.2, uy = (ny / n) * 4.2;
  return `<path d="M${a1 - ux} ${b1 - uy}L${a1 + ux} ${b1 + uy}M${a2 - ux} ${b2 - uy}L${a2 + ux} ${b2 + uy}" stroke="${c.band}" stroke-width="2.2" stroke-linecap="round"/>`;
}
const shoe = (x, y, dir = 1) => `<g transform="translate(${x} ${y}) scale(${dir} 1)"><path d="M-5-3q0 5 4 5h9q2 0 2-2.5q-1-3-6-3.5z" fill="#ffffff" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/></g>`;

// Un corps complet à partir de ses articulations (pose).
function body(c, p) {
  const legs = p.legs.map(([hip, knee, foot], i) => `${limb([hip, knee, foot], c.pants, 8.5)}${sock(c, knee, foot)}${shoe(foot[0], foot[1], p.feet?.[i] ?? 1)}`).join('');
  const arms = (list) => list.map(([sh, el, hand]) => `${limb([sh, el, hand], c.shirt, 7.5)}${limb([el, hand], c.skin, 6)}${dot(hand[0], hand[1], 3.6, c.skin)}`).join('');
  const [nx, ny] = p.neck, [hx, hy] = p.hip;
  return `${p.back || ''}${legs}${arms(p.armsBack || [])}
    ${limb([[nx, ny + 4], [hx, hy]], c.shirt, 19)}
    <path d="M${nx - 6} ${ny + 2}l${6} ${5}l${6}-${5}" fill="none" stroke="${c.band}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    ${head(c, p.head[0], p.head[1], p.face)}${arms(p.arms)}${p.front || ''}`;
}

// Accessoires.
const spray = (x, y) => `<g transform="translate(${x} ${y})"><path d="M-4-14h8l4 3h-3v3h-7z" fill="var(--il-fill2)" stroke="${INK}" stroke-width="1.7" stroke-linejoin="round"/>
  <path d="M-6-8h10l2 4v14a3 3 0 0 1-3 3h-8a3 3 0 0 1-3-3v-14z" fill="var(--il-fill)" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>
  <rect x="-5" y="-1" width="8" height="7" rx="1.5" fill="var(--il-accent)"/></g>`;
const rag = (x, y, color = PLATE.b) => `<path d="M${x - 7} ${y - 3}q7-4 14 0l-2 9q-5 2-10 0z" fill="${color}" stroke="${INK}" stroke-width="1.7" stroke-linejoin="round"/>`;
const mist = (x, y) => [[0, 0, 1.6], [5, -3, 1.2], [4, 4, 1.1], [9, 1, 0.9]].map(([dx, dy, r], i) => `<circle class="a a-mist" style="--d:${i * 0.15}s" cx="${x + dx}" cy="${y + dy}" r="${r}" fill="var(--il-accent)"/>`).join('');
const plateRect = (x, h, color) => `<rect x="${x}" y="${-h / 2}" width="6" height="${h}" rx="2" fill="${color}" stroke="${INK}" stroke-width="1.6"/>`;
const barbell = (y) => `<g transform="translate(0 ${y})"><path d="M6 0h108" stroke="#8f9297" stroke-width="3.4" stroke-linecap="round"/>
  ${plateRect(14, 30, PLATE.r)}${plateRect(21, 26, PLATE.b)}${plateRect(93, 26, PLATE.b)}${plateRect(100, 30, PLATE.r)}
  <rect x="28" y="-4" width="3" height="8" rx="1" fill="#6c6f74"/><rect x="89" y="-4" width="3" height="8" rx="1" fill="#6c6f74"/></g>`;
const shadow = (rx = 34) => `<ellipse cx="60" cy="131" rx="${rx}" ry="3.6" fill="var(--il-shadow)"/>`;
const spark = (x, y, d = 0) => `<g transform="translate(${x} ${y})"><path class="a a-spark" style="--d:${d}s" d="M0-5.5l1.4 4.1 4.1 1.4-4.1 1.4L0 5.5l-1.4-4.1-4.1-1.4 4.1-1.4z" fill="${PLATE.y}"/></g>`;

// Les poses (viewBox 120 × 140, sol à y≈128).
const POSES = {
  // Salut! Une main en l'air, le vaporisateur dans l'autre.
  wave: (c) => body(c, {
    head: [60, 26], neck: [60, 37], hip: [60, 80], face: { smile: 'big' },
    legs: [[[56, 80], [54, 103], [51, 126]], [[64, 80], [66, 103], [70, 126]]], feet: [-1, 1],
    arms: [[[52, 44], [40, 34], [34, 18]], [[68, 44], [76, 60], [80, 74]]],
    front: `${spray(84, 78)}<g class="a a-wave" style="transform-origin:34px 22px"><path d="M27 11l-3-4M33 7l0-5M39 10l3-4" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/></g>`,
  }) + shadow(26),

  // La barre au-dessus de la tête : quart fini!
  lift: (c) => body(c, {
    head: [60, 40], neck: [60, 51], hip: [60, 90], face: { smile: 'big' },
    legs: [[[55, 90], [44, 108], [38, 127]], [[65, 90], [76, 108], [82, 127]]], feet: [-1, 1],
    arms: [[[51, 57], [37, 44], [35, 22]], [[69, 57], [83, 44], [85, 22]]],
    back: `<g class="a a-lift">${barbell(22)}</g>`,
    front: `${spark(14, 46, 0)}${spark(106, 44, 0.5)}${spark(60, 9, 1)}`,
  }) + shadow(32),

  // La balayeuse, penché·e vers l'avant.
  vacuum: (c) => body(c, {
    head: [52, 32], neck: [54, 43], hip: [50, 84], face: { look: 1.5 },
    legs: [[[47, 84], [38, 105], [30, 127]], [[53, 84], [62, 105], [66, 127]]], feet: [-1, 1],
    arms: [[[58, 50], [72, 60], [86, 62]], [[62, 52], [76, 64], [90, 66]]],
    back: `<path d="M90 64L102 118" stroke="${INK}" stroke-width="5" stroke-linecap="round"/><path d="M90 64L102 118" stroke="#8f9297" stroke-width="2.6" stroke-linecap="round"/>
      <rect x="92" y="104" width="24" height="20" rx="5" fill="${PLATE.r}" stroke="${INK}" stroke-width="1.8"/><rect x="96" y="108" width="9" height="4" rx="2" fill="rgba(255,255,255,.6)"/>
      <rect x="88" y="122" width="30" height="5" rx="2.5" fill="var(--il-ink)"/>`,
    front: `<path class="a a-dust" d="M22 124q-4-3-1-6M16 126q-3-1-2-4" stroke="var(--il-mid)" stroke-width="1.6" fill="none" stroke-linecap="round"/>`,
  }) + shadow(40),

  // Un seul bac : on pousse vers le bas pour compacter.
  bin: (c) => `<rect x="70" y="72" width="40" height="54" rx="5" fill="var(--il-fill2)" stroke="${INK}" stroke-width="2"/>
    <path d="M70 80h40" stroke="${INK}" stroke-width="1.6"/><path d="M80 90v26M90 90v26M100 90v26" stroke="var(--il-mid)" stroke-width="2" stroke-linecap="round"/>
    <path d="M72 72q18-10 36 0" fill="var(--il-ink)" opacity=".85"/>` + body(c, {
    head: [52, 34], neck: [54, 45], hip: [50, 86], face: { look: 2 },
    legs: [[[46, 86], [42, 106], [38, 127]], [[54, 86], [58, 106], [60, 127]]], feet: [-1, 1],
    arms: [[[58, 52], [74, 54], [84, 70]], [[62, 54], [80, 58], [96, 70]]],
    front: `<g class="a a-press"><path d="M90 60v6M86 63l4 4 4-4" stroke="${PLATE.y}" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></g>`,
  }) + shadow(40),

  // Vaporiser sur la guenille, essuyer.
  wipe: (c) => `<rect x="80" y="48" width="30" height="40" rx="4" fill="var(--il-screen)" stroke="${INK}" stroke-width="2"/><path d="M95 88v38M86 126h18" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>` + body(c, {
    head: [50, 28], neck: [50, 39], hip: [48, 82], face: { look: 2 },
    legs: [[[44, 82], [42, 104], [38, 127]], [[52, 82], [56, 104], [60, 127]]], feet: [-1, 1],
    arms: [[[42, 46], [36, 62], [44, 70]], [[56, 46], [70, 54], [84, 60]]],
    front: `${spray(44, 76)}<g class="a a-rub">${rag(86, 60, PLATE.b)}</g>${spark(104, 54, 0.4)}`,
  }) + shadow(36),

  // Une pile de guenilles propres.
  rags: (c) => body(c, {
    head: [60, 26], neck: [60, 37], hip: [60, 80], face: { smile: 'big' },
    legs: [[[56, 80], [55, 103], [52, 126]], [[64, 80], [65, 103], [68, 126]]], feet: [-1, 1],
    arms: [[[52, 44], [44, 58], [50, 66]], [[68, 44], [76, 58], [70, 66]]],
    front: `${[PLATE.b, PLATE.g, PLATE.r, PLATE.y].map((col, i) => `<rect x="${46 + (i % 2)}" y="${62 - i * 6}" width="28" height="6.5" rx="2.5" fill="${col}" stroke="${INK}" stroke-width="1.6"/>`).join('')}`,
  }) + shadow(26),

  // Pause : assis·e sur un banc, la gourde.
  rest: (c) => `<rect x="14" y="96" width="92" height="8" rx="3" fill="var(--il-fill2)" stroke="${INK}" stroke-width="2"/><path d="M24 104v22M96 104v22" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>` + body(c, {
    head: [46, 44], neck: [46, 55], hip: [48, 94], face: { smile: 'big' },
    legs: [[[46, 94], [68, 94], [70, 124]], [[50, 96], [74, 98], [78, 126]]], feet: [1, 1],
    arms: [[[40, 62], [38, 78], [56, 86]], [[54, 62], [64, 54], [60, 42]]],
    front: `<rect x="57" y="30" width="8" height="15" rx="3" fill="${PLATE.g}" stroke="${INK}" stroke-width="1.7"/><rect x="58.5" y="27" width="5" height="4" rx="1" fill="var(--il-fill2)" stroke="${INK}" stroke-width="1.4"/>`,
  }) + shadow(44),
};

// Une scène : une pose + une personne. Classe « alive » sur un parent = ça bouge.
export function crew(pose, who = 'mo', label = '') {
  const c = CREW[who] || CREW.mo;
  return `<svg viewBox="0 0 120 140" class="illus crew" role="img" aria-label="${label}">${POSES[pose](c)}</svg>`;
}

// L'équipe au complet (connexion) : trois têtes à bandeau, comme le logo.
export function crewHeads(label = '') {
  // Côte à côte et un peu superposées, la personne du milieu devant.
  const at = { ana: [18, 24], lea: [66, 24], mo: [42, 21] };
  return `<svg viewBox="0 0 84 40" class="illus crew" role="img" aria-label="${label}">
    ${['ana', 'lea', 'mo'].map((k) => `<g transform="translate(${at[k][0] - 40} ${at[k][1] - 26})">${head(CREW[k], 40, 26, { smile: 'big' })}</g>`).join('')}</svg>`;
}

export const POSE_NAMES = Object.keys(POSES);
