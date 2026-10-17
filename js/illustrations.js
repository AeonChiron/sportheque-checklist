// Illustrations des tâches, dessinées en SVG (aucune image à télécharger).
// Couleurs via variables CSS (--il-*) : elles suivent le thème clair/sombre.
// viewBox 120 × 90. Contour « encre » commun, aplats de couleur.

const S = 'stroke="var(--il-ink)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"';
const T = 'stroke="var(--il-ink)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
const wrap = (body, label = '') =>
  `<svg viewBox="0 0 96 96" role="img" aria-label="${label}" class="illus obj">${body}</svg>`;
// Style unique : un seul objet centré, contour encre, deux gris, un détail aqua,
// ombre douce au sol.
const shadow = (rx = 26) => `<ellipse cx="48" cy="87" rx="${rx}" ry="3.6" fill="var(--il-shadow)"/>`;

const ART = {
  // Plaque d'interrupteurs : ventilation à ouvrir.
  ouverture: () => `${shadow(22)}
    <rect x="24" y="10" width="48" height="74" rx="10" fill="var(--il-fill)" ${S}/>
    <circle cx="48" cy="16.5" r="1.6" fill="var(--il-mid)"/><circle cx="48" cy="77.5" r="1.6" fill="var(--il-mid)"/>
    ${[22, 40, 58].map((y) => `
      <rect x="32" y="${y}" width="32" height="14" rx="4" fill="var(--il-fill2)" ${S}/>
      <rect x="34.5" y="${y + 2.5}" width="14" height="9" rx="2.5" fill="var(--il-accent)"/>
      <path d="M41.5 ${y + 4.5}v5" stroke="var(--il-fill)" stroke-width="1.8" stroke-linecap="round"/>`).join('')}`,

  // Laveuse à chargement frontal.
  guenilles: () => `${shadow(28)}
    <rect x="20" y="10" width="56" height="72" rx="8" fill="var(--il-fill)" ${S}/>
    <path d="M20 25h56" ${T}/>
    <rect x="26" y="15" width="18" height="6" rx="2" fill="var(--il-accent-soft)" ${T}/>
    <circle cx="68" cy="18" r="3.6" fill="var(--il-fill2)" ${T}/>
    <circle cx="48" cy="53" r="20" fill="var(--il-fill2)" ${S}/>
    <circle cx="48" cy="53" r="14" fill="var(--il-accent-soft)" ${T}/>
    <path d="M35 56c4.5-3.6 8.5-3.6 13 0s8.5 3.6 13 0" fill="none" stroke="var(--il-accent)" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M40 46.5a10 10 0 0 1 7-3" fill="none" stroke="var(--il-fill)" stroke-width="2" stroke-linecap="round"/>
    <rect x="25" y="82" width="7" height="3" rx="1" fill="var(--il-ink)"/><rect x="64" y="82" width="7" height="3" rx="1" fill="var(--il-ink)"/>`,

  // Vaporisateur de désinfectant.
  desinfection: () => `${shadow(18)}
    <path d="M37 24V16h20l9 6h-7v4" fill="var(--il-fill2)" ${S}/>
    <rect x="66" y="19.5" width="5" height="5" rx="1.5" fill="var(--il-ink)"/>
    <path d="M45 26c-1.5 3-0.5 6 2 8" fill="none" ${S}/>
    <rect x="39" y="24" width="15" height="9" rx="2" fill="var(--il-fill2)" ${S}/>
    <path d="M36 33h21l4 8v37a6 6 0 0 1-6 6H38a6 6 0 0 1-6-6V41z" fill="var(--il-fill)" ${S}/>
    <rect x="36" y="50" width="21" height="20" rx="3" fill="var(--il-accent-soft)" ${T}/>
    <path d="M46.5 54.5c3 3.6 4.5 6 4.5 8a4.5 4.5 0 0 1-9 0c0-2 1.5-4.4 4.5-8z" fill="var(--il-accent)"/>
    <circle cx="77" cy="18" r="1.8" fill="var(--il-accent)"/><circle cx="81" cy="23" r="1.4" fill="var(--il-accent)"/><circle cx="80" cy="13.5" r="1.2" fill="var(--il-accent)"/>`,

  // Guenille en microfibre pliée : les points de contact.
  'points-contact': () => `${shadow(28)}
    <g transform="rotate(-8 48 50)">
      <rect x="18" y="26" width="60" height="46" rx="7" fill="var(--il-accent-soft)" ${S}/>
      <path d="M24 34h48M24 41h48M24 48h48" stroke="var(--il-accent)" stroke-width="1.6" stroke-dasharray="2 3.5" stroke-linecap="round" opacity=".7"/>
      <path d="M18 54h60v12a6 6 0 0 1-6 6H24a6 6 0 0 1-6-6z" fill="var(--il-accent)" ${S}/>
      <path d="M24 61h48" stroke="var(--il-fill)" stroke-width="1.6" stroke-dasharray="2 3.5" stroke-linecap="round" opacity=".8"/>
    </g>`,

  // Poubelle à couvercle basculant.
  poubelles: () => `${shadow(20)}
    <path d="M29 36h38l-4 44a4 4 0 0 1-4 4H37a4 4 0 0 1-4-4z" fill="var(--il-fill)" ${S}/>
    <path d="M40 44v32M48 44v32M56 44v32" stroke="var(--il-mid)" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M26 36c0-11 9.8-18 22-18s22 7 22 18z" fill="var(--il-fill2)" ${S}/>
    <rect x="39" y="24" width="18" height="7" rx="2.5" fill="var(--il-accent)" ${T}/>`,

  // Aspirateur vertical commercial.
  aspirateur: () => `${shadow(28)}
    <rect x="52" y="6" width="16" height="7" rx="3.5" fill="var(--il-fill2)" ${S}/>
    <path d="M59 13l-6 26" ${S} stroke-width="3.2"/>
    <rect x="39" y="34" width="24" height="34" rx="8" fill="var(--il-accent)" ${S}/>
    <rect x="43" y="40" width="16" height="5" rx="2.5" fill="var(--il-accent-soft)"/>
    <path d="M63 46c9 3 12 10 9 22" fill="none" ${T}/>
    <rect x="44" y="67" width="14" height="7" rx="2" fill="var(--il-fill2)" ${S}/>
    <path d="M24 78a4 4 0 0 1 4-4h40a4 4 0 0 1 4 4v3H24z" fill="var(--il-fill)" ${S}/>
    <circle cx="31" cy="84" r="3" fill="var(--il-ink)"/><circle cx="65" cy="84" r="3" fill="var(--il-ink)"/>`,

  // Le tour complet du plancher : une boucle avec flèche.
  'tour-general': () => `${shadow(28)}
    <rect x="16" y="16" width="64" height="64" rx="12" fill="var(--il-fill2)" ${S}/>
    <path d="M30 34h36M30 48h36M30 62h36" stroke="var(--il-mid)" stroke-width="1.6" stroke-dasharray="2 4" stroke-linecap="round"/>
    <path d="M62 26A24 24 0 1 1 35 27" fill="none" stroke="var(--il-accent)" stroke-width="4.5" stroke-linecap="round"/>
    <path d="M27 20l9 6.5-8.5 7" fill="none" stroke="var(--il-accent)" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="48" cy="48" r="5" fill="var(--il-ink)"/>`,

  // Haltère hexagonal.
  rangement: () => {
    const hex = (cx, cy, r) => Array.from({ length: 6 }, (_, i) => {
      const a = Math.PI / 6 + (i * Math.PI) / 3;
      return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
    }).join(' ');
    return `${shadow(30)}
      <rect x="28" y="44" width="40" height="8" rx="3" fill="var(--il-fill2)" ${S}/>
      <path d="M40 45v6M44 45v6M48 45v6M52 45v6M56 45v6" stroke="var(--il-mid)" stroke-width="1.4"/>
      <rect x="31" y="40" width="5" height="16" rx="1.5" fill="var(--il-accent)" ${T}/>
      <rect x="60" y="40" width="5" height="16" rx="1.5" fill="var(--il-accent)" ${T}/>
      <polygon points="${hex(21, 48, 16)}" fill="var(--il-fill)" ${S}/><polygon points="${hex(21, 48, 8)}" fill="var(--il-fill2)" ${T}/>
      <polygon points="${hex(75, 48, 16)}" fill="var(--il-fill)" ${S}/><polygon points="${hex(75, 48, 8)}" fill="var(--il-fill2)" ${T}/>`;
  },

  // Planchette d'inspection.
  inspection: () => `${shadow(22)}
    <rect x="22" y="12" width="52" height="72" rx="7" fill="var(--il-fill2)" ${S}/>
    <rect x="29" y="20" width="38" height="58" rx="3" fill="var(--il-fill)" ${T}/>
    <rect x="37" y="7" width="22" height="11" rx="3.5" fill="var(--il-mid)" ${S}/>
    ${[30, 44, 58].map((y, i) => `
      <rect x="34" y="${y}" width="8" height="8" rx="2" fill="${i < 2 ? 'var(--il-accent)' : 'var(--il-fill)'}" ${T}/>
      ${i < 2 ? `<path d="M35.8 ${y + 4.2}l1.8 1.8 3-3.4" fill="none" stroke="var(--il-fill)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>` : ''}
      <path d="M46 ${y + 4}h15" stroke="var(--il-mid)" stroke-width="2.4" stroke-linecap="round"/>`).join('')}`,

  // Seau et moppe.
  tuiles: () => `${shadow(26)}
    <path d="M62 6L50 54" ${S} stroke-width="3.2"/>
    <path d="M26 46h44l-5 34a4 4 0 0 1-4 4H35a4 4 0 0 1-4-4z" fill="var(--il-fill)" ${S}/>
    <ellipse cx="48" cy="46" rx="22" ry="5" fill="var(--il-accent-soft)" ${S}/>
    <path d="M40 46c2-6 14-6 18 0" fill="var(--il-mid)" ${T}/>
    <path d="M27 58h42" ${T} opacity=".5"/>
    <rect x="22" y="56" width="5" height="12" rx="2" fill="var(--il-accent)" ${T}/><rect x="69" y="56" width="5" height="12" rx="2" fill="var(--il-accent)" ${T}/>`,

  // Raclette à miroirs.
  miroirs: () => `${shadow(22)}
    <g transform="rotate(-28 48 48)">
      <rect x="44" y="34" width="8" height="46" rx="4" fill="var(--il-fill2)" ${S}/>
      <path d="M44 70h8" ${T}/>
      <rect x="22" y="24" width="52" height="11" rx="3" fill="var(--il-fill)" ${S}/>
      <rect x="20" y="19" width="56" height="6" rx="2" fill="var(--il-accent)" ${S}/>
    </g>
    <path d="M70 66c1.5 2.2 2.4 3.6 2.4 4.8a2.4 2.4 0 0 1-4.8 0c0-1.2.9-2.6 2.4-4.8z" fill="var(--il-accent)"/>
    <path d="M78 56c1.2 1.8 2 3 2 4a2 2 0 0 1-4 0c0-1 .8-2.2 2-4z" fill="var(--il-accent)"/>`,

  // Vélo de spinning, vu de côté.
  spinning: () => `${shadow(30)}
    <path d="M20 84h56" ${S} stroke-width="4"/>
    <path d="M30 84l8-30M38 54l-2-12" ${S} stroke-width="3.5"/>
    <path d="M26 39h18a3 3 0 0 1-3 4H29a3 3 0 0 1-3-4z" fill="var(--il-ink)"/>
    <path d="M38 58l26 8M60 84l2-56" ${S} stroke-width="3.5"/>
    <path d="M56 26h12a4 4 0 0 1 4 4v3" fill="none" ${S} stroke-width="3.2"/>
    <circle cx="66" cy="66" r="14" fill="var(--il-fill2)" ${S}/>
    <circle cx="66" cy="66" r="9" fill="none" stroke="var(--il-mid)" stroke-width="1.8"/>
    <circle cx="66" cy="66" r="4.5" fill="var(--il-accent)" ${T}/>
    <circle cx="46" cy="64" r="4" fill="var(--il-fill)" ${S}/>
    <path d="M46 64l5 9M48.5 75h6" ${S}/>`,

  // Calendrier de la semaine.
  hebdo: () => `${shadow(26)}
    <rect x="18" y="16" width="60" height="66" rx="8" fill="var(--il-fill)" ${S}/>
    <path d="M18 32V24a8 8 0 0 1 8-8h44a8 8 0 0 1 8 8v8z" fill="var(--il-accent)" ${S}/>
    <rect x="31" y="10" width="5" height="12" rx="2.5" fill="var(--il-fill2)" ${S}/><rect x="60" y="10" width="5" height="12" rx="2.5" fill="var(--il-fill2)" ${S}/>
    ${[0, 1, 2].map((r) => [0, 1, 2, 3].map((c) => {
      const on = r === 1 && c === 2;
      return `<rect x="${25 + c * 12}" y="${40 + r * 12}" width="9" height="9" rx="2.5" fill="${on ? 'var(--il-accent)' : 'var(--il-fill2)'}" ${on ? T : ''}/>`;
    }).join('')).join('')}
    <path d="M51.5 56.5l1.8 1.8 3-3.4" fill="none" stroke="var(--il-fill)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`,

  // Porte de bureau.
  bureaux: () => `${shadow(22)}
    <rect x="26" y="8" width="44" height="78" rx="3" fill="var(--il-fill2)" ${S}/>
    <rect x="31" y="13" width="34" height="73" rx="2" fill="var(--il-fill)" ${S}/>
    <rect x="36" y="22" width="24" height="8" rx="2" fill="var(--il-accent-soft)" ${T}/>
    <path d="M40 26h16" stroke="var(--il-accent)" stroke-width="1.8" stroke-linecap="round"/>
    <rect x="36" y="40" width="24" height="16" rx="2" fill="none" stroke="var(--il-mid)" stroke-width="1.8"/>
    <rect x="36" y="62" width="24" height="16" rx="2" fill="none" stroke="var(--il-mid)" stroke-width="1.8"/>
    <circle cx="58" cy="52" r="3" fill="var(--il-accent)" ${T}/>`,

  // Grille de ventilation.
  ventilation: () => `${shadow(26)}
    <rect x="16" y="12" width="64" height="64" rx="10" fill="var(--il-fill)" ${S}/>
    <rect x="24" y="20" width="48" height="48" rx="5" fill="var(--il-fill2)" ${T}/>
    ${[29, 37, 45, 53, 61].map((y) => `<path d="M29 ${y}h38" ${S} stroke-width="3"/>`).join('')}
    ${[[20, 16], [76, 16], [20, 72], [76, 72]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.6" fill="var(--il-mid)"/>`).join('')}
    <path d="M30 83c4-3 8 3 12 0s8 3 12 0 8 3 12 0" fill="none" stroke="var(--il-accent)" stroke-width="2.2" stroke-linecap="round"/>`,

  // Clé 124.
  'fin-quart': () => `${shadow(26)}
    <circle cx="28" cy="34" r="12" fill="var(--il-fill)" ${S}/>
    <circle cx="28" cy="34" r="4.5" fill="var(--il-fill2)" ${T}/>
    <path d="M38 40l22 13M52 48l-3 6M58 52l-3 6" ${S} stroke-width="4"/>
    <path d="M24 46l-2 10" ${T}/>
    <g transform="rotate(12 30 66)">
      <rect x="14" y="56" width="34" height="20" rx="6" fill="var(--il-accent)" ${S}/>
      <circle cx="20" cy="66" r="2" fill="var(--il-fill)"/>
      <text x="35" y="70.5" text-anchor="middle" class="il-num">124</text>
    </g>`,

  // Cadenas : fermeture du gym.
  fermeture: () => `${shadow(22)}
    <path d="M34 42V31a14 14 0 0 1 28 0v11" fill="none" ${S} stroke-width="4"/>
    <rect x="24" y="40" width="48" height="42" rx="8" fill="var(--il-fill)" ${S}/>
    <path d="M24 52h48" stroke="var(--il-accent)" stroke-width="5"/>
    <circle cx="48" cy="64" r="5" fill="var(--il-ink)"/>
    <path d="M48 66v8" stroke="var(--il-ink)" stroke-width="4" stroke-linecap="round"/>`,
};
ART['aspirateur-muscu'] = ART.aspirateur;
ART['aspirateur-cardio'] = ART.aspirateur;
ART['aspirateur-gym'] = ART.aspirateur;
ART['bureaux-patrons'] = ART.bureaux;
ART['bureaux-entraineurs'] = ART.bureaux;

// Petite carte des zones, la zone du jour en aqua (icône du nettoyage en profondeur).
const miniZone = (z) => () => `${shadow(30)}
    <rect x="14" y="14" width="68" height="22" rx="5" fill="var(${z === 'A' ? '--il-accent' : '--il-fill2'})" ${S}/>
    <rect x="14" y="42" width="32" height="38" rx="5" fill="var(${z === 'C' ? '--il-accent' : '--il-fill2'})" ${S}/>
    <rect x="50" y="42" width="32" height="38" rx="5" fill="var(${z === 'B' ? '--il-accent' : '--il-fill2'})" ${S}/>
    <text x="${z === 'A' ? 48 : z === 'B' ? 66 : 30}" y="${z === 'A' ? 31 : 67}" text-anchor="middle" class="zm-id ${'on'}">${z}</text>`;
ART['zone-a'] = miniZone('A');
ART['zone-b'] = miniZone('B');
ART['zone-c'] = miniZone('C');

// Plan schématique du 2e étage : où est chaque zone de la rotation.
// highlight : zone en profondeur; mirrors : zone des miroirs du soir.
// states : { A: 'done' | 'notdone' | 'unchecked' | 'planned' } pour l'Aperçu.
const STATE_FILL = { done: '--il-ok', notdone: '--il-bad', unchecked: '--il-sun', planned: '--il-aqua' };
export function zoneMap(highlight, { mirrors = null, labels, states = {} } = {}) {
  const zone = (id, x, y, w, h) => {
    const on = id === highlight || Boolean(states[id]);
    const mir = id === mirrors;
    const fill = states[id] ? STATE_FILL[states[id]] : on ? '--il-aqua' : '--il-tile';
    return `<g class="zm ${on ? 'on' : ''} ${states[id] || ''}">
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="var(${fill})" ${S} stroke-width="${on ? 2.6 : 1.6}"/>
      <text x="${x + 10}" y="${y + 24}" class="zm-id">${id}</text>
      ${[].concat(labels[id]).map((l, i) => `<text x="${x + 10}" y="${y + 40 + i * 13}" class="zm-label">${l}</text>`).join('')}
      ${mir ? `<rect x="${x + w - 10}" y="${y + 8}" width="4" height="${h - 16}" rx="2" fill="var(--il-glass)" ${S} stroke-width="1.4"/>` : ''}
    </g>`;
  };
  return `<svg viewBox="0 0 300 170" role="img" aria-label="Zones A B C" class="illus map">
    ${zone('A', 6, 6, 288, 56)}
    ${zone('C', 6, 70, 140, 94)}
    ${zone('B', 154, 70, 140, 94)}
  </svg>`;
}

// Le mur des 4 télés, avec leurs postes exacts.
export function tvDiagram(channels) {
  const pos = { 'Haut gauche': [10, 8], 'Haut droite': [104, 8], 'Bas gauche': [10, 62], 'Bas droite': [104, 62] };
  return `<svg viewBox="0 0 200 116" role="img" aria-label="Postes des télés" class="illus map">
    ${channels.map((c) => {
      const [x, y] = pos[c.key];
      return `<g><rect x="${x}" y="${y}" width="86" height="46" rx="6" fill="var(--il-screen)" ${S}/>
        <text x="${x + 43}" y="${y + 30}" text-anchor="middle" class="tv-ch">${c.ch}</text></g>`;
    }).join('')}
  </svg>`;
}

export function illustration(key, label = '') {
  const fn = ART[key];
  return fn ? wrap(fn(), label) : '';
}

export const hasIllustration = (key) => Boolean(ART[key]);
