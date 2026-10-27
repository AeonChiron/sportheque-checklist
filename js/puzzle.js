// Les étapes d'une tâche forment un casse-tête (propriétaire, 27 oct.) : UNE seule image
// (la scène de la tâche) découpée en autant de morceaux qu'il y a d'étapes. Chaque étape
// cochée pose son morceau; la dernière complète l'image (les joints disparaissent, un reflet passe).

const W = 300, H = 210;

// Un bord de pièce avec son tenon, du point a au point b (dir = +1 bosse d'un côté, -1 de l'autre).
function edge(a, b, dir) {
  const ux = b[0] - a[0], uy = b[1] - a[1], L = Math.hypot(ux, uy);
  const nx = (-uy / L) * dir, ny = (ux / L) * dir; // la normale (vers où sort la bosse)
  const s = Math.min(L, 70) * 1; // la bosse ne grossit pas trop sur un long bord
  const P = (t, h) => {
    const k = 0.5 + (t - 0.5) * (s / L); // la bosse reste centrée, de même taille
    return `${(a[0] + ux * k + nx * h * s).toFixed(2)} ${(a[1] + uy * k + ny * h * s).toFixed(2)}`;
  };
  return [
    `L ${P(0.34, 0)}`,
    `C ${P(0.42, 0)} ${P(0.44, 0.08)} ${P(0.39, 0.14)}`,
    `C ${P(0.31, 0.25)} ${P(0.4, 0.34)} ${P(0.5, 0.34)}`,
    `C ${P(0.6, 0.34)} ${P(0.69, 0.25)} ${P(0.61, 0.14)}`,
    `C ${P(0.56, 0.08)} ${P(0.58, 0)} ${P(0.66, 0)}`,
    `L ${b[0].toFixed(2)} ${b[1].toFixed(2)}`,
  ].join(' ');
}
const flipEdge = (a, b, dir) => edge(a, b, dir); // même tracé, parcouru dans l'autre sens par la pièce voisine

// Le découpage : une grille; s'il y a moins d'étapes que de cases, la dernière rangée a de plus larges pièces.
export function layout(n) {
  n = Math.max(1, n);
  const cols = Math.ceil(Math.sqrt(n * 1.4)), rows = Math.ceil(n / cols);
  const extra = cols * rows - n, lastCount = cols - extra;
  const pieces = [];
  for (let r = 0; r < rows; r++) {
    if (r < rows - 1 || !extra) { for (let c = 0; c < cols; c++) pieces.push({ r, c0: c, c1: c + 1 }); continue; }
    // Dernière rangée : lastCount pièces qui se partagent les cols cases.
    let c = 0;
    for (let k = 0; k < lastCount; k++) { const span = Math.round((cols - c) / (lastCount - k)); pieces.push({ r, c0: c, c1: c + span }); c += span; }
  }
  return { cols, rows, pieces };
}
// Sens des bosses : fixe pour chaque joint (pas de hasard d'une fois à l'autre).
const hDir = (r, c) => (((r * 7 + c * 3) % 2) ? 1 : -1); // joint horizontal sous la case (r, c)
const vDir = (r, c) => (((r * 5 + c * 11) % 2) ? 1 : -1); // joint vertical à droite de la case (r, c)

function piecePath(p, g) {
  const cw = W / g.cols, rh = H / g.rows;
  const x0 = p.c0 * cw, x1 = p.c1 * cw, y0 = p.r * rh, y1 = (p.r + 1) * rh;
  let d = `M ${x0} ${y0}`;
  // Haut : droit au bord, sinon les tenons des cases du dessus (une bosse par case).
  for (let c = p.c0; c < p.c1; c++) d += p.r === 0 ? ` L ${(c + 1) * cw} ${y0}` : ` ${flipEdge([c * cw, y0], [(c + 1) * cw, y0], hDir(p.r - 1, c))}`;
  // Droite.
  d += p.c1 === g.cols ? ` L ${x1} ${y1}` : ` ${edge([x1, y0], [x1, y1], vDir(p.r, p.c1 - 1))}`;
  // Bas (de droite à gauche).
  for (let c = p.c1 - 1; c >= p.c0; c--) d += p.r === g.rows - 1 ? ` L ${c * cw} ${y1}` : ` ${edge([(c + 1) * cw, y1], [c * cw, y1], -hDir(p.r, c))}`;
  // Gauche (de bas en haut).
  d += p.c0 === 0 ? ` L ${x0} ${y0}` : ` ${edge([x0, y1], [x0, y0], -vDir(p.r, p.c0 - 1))}`;
  return { d: `${d} Z`, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}

// art : le dessin de la tâche (un <svg> carré). tint : la couleur de la tâche. land : la pièce qui vient d'arriver.
export function puzzleHTML({ uid, art, n, done, land = -1, tint = '#1f5cc4', label = '' }) {
  const g = layout(n), id = `pz-${String(uid).replace(/[^a-z0-9_-]/gi, '')}`;
  const full = done >= n;
  const scene = `<g id="${id}-art">
      <rect width="${W}" height="${H}" fill="url(#${id}-sky)"/>
      <circle cx="${W * 0.82}" cy="${H * 0.2}" r="46" fill="${tint}" opacity=".16"/>
      <circle cx="${W * 0.14}" cy="${H * 0.78}" r="64" fill="${tint}" opacity=".12"/>
      <path d="M0 ${H * 0.78} Q ${W * 0.5} ${H * 0.7} ${W} ${H * 0.8} V ${H} H 0 Z" fill="${tint}" opacity=".18"/>
      <path d="M0 ${H * 0.86} Q ${W * 0.5} ${H * 0.8} ${W} ${H * 0.9} V ${H} H 0 Z" fill="${tint}" opacity=".22"/>
      <g fill="#fff" opacity=".8"><circle cx="${W * 0.28}" cy="${H * 0.2}" r="3"/><circle cx="${W * 0.66}" cy="${H * 0.13}" r="2"/><circle cx="${W * 0.9}" cy="${H * 0.55}" r="2.5"/><circle cx="${W * 0.08}" cy="${H * 0.36}" r="2"/></g>
      <svg x="${W / 2 - 78}" y="${H / 2 - 86}" width="156" height="156">${art}</svg>
    </g>`;
  const paths = g.pieces.map((p) => piecePath(p, g));
  const pieces = paths.map((pp, i) => {
    if (i >= done) return '';
    const dx = (i % 2 ? 1 : -1) * (40 + (i * 23) % 50), dy = -60 - (i * 17) % 40, rot = (i % 2 ? 1 : -1) * (10 + (i * 7) % 14);
    return `<g class="pz-piece${i === land ? ' land' : ''}" style="--dx:${dx}px;--dy:${dy}px;--r:${rot}deg;transform-origin:${pp.cx}px ${pp.cy}px">
      <clipPath id="${id}-c${i}"><path d="${pp.d}"/></clipPath>
      <use href="#${id}-art" clip-path="url(#${id}-c${i})"/>
      <path class="pz-seam" d="${pp.d}"/></g>`;
  }).join('');
  const holes = paths.map((pp, i) => (i >= done ? `<path class="pz-hole${i === done ? ' next' : ''}" d="${pp.d}"/>` : '')).join('');
  return `<div class="pz${full ? ' full' : ''}${full && land >= 0 ? ' just' : ''}" role="img" aria-label="${label}">
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
      <defs><linearGradient id="${id}-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f7f4ea"/><stop offset="1" stop-color="#e9f2f7"/></linearGradient>
        <linearGradient id="${id}-sheen" x1="0" y1="0" x2="1" y2="0"><stop offset=".35" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".7"/><stop offset=".65" stop-color="#fff" stop-opacity="0"/></linearGradient>
        <clipPath id="${id}-board"><rect width="${W}" height="${H}" rx="12"/></clipPath></defs>
      <g clip-path="url(#${id}-board)">
        <rect class="pz-board" width="${W}" height="${H}"/>
        <g class="pz-ghost"><use href="#${id}-art"/></g>
        ${holes}
        ${pieces}
        <rect class="pz-sheen" x="-${W}" y="0" width="${W}" height="${H}" fill="url(#${id}-sheen)"/>
      </g>
      <defs>${scene}</defs>
    </svg></div>`;
}
