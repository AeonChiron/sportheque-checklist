// Illustrations des tâches, dessinées en SVG (aucune image à télécharger).
// Couleurs via variables CSS (--il-*) : elles suivent le thème clair/sombre.
// viewBox 120 × 90. Contour « encre » commun, aplats de couleur.

const S = 'stroke="var(--il-ink)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"';
const wrap = (body, label = '') =>
  `<svg viewBox="0 0 120 90" role="img" aria-label="${label}" class="illus">${body}</svg>`;

// Petites étincelles « propre » réutilisées.
const sparkle = (x, y, s = 1) =>
  `<path d="M${x} ${y - 6 * s}v${12 * s}M${x - 6 * s} ${y}h${12 * s}" ${S} stroke-width="${2 * s}" fill="none" class="il-spark"/>`;
const floor = '<path d="M8 80h104" stroke="var(--il-floor)" stroke-width="3" stroke-linecap="round"/>';

const ART = {
  ouverture: () => `
    ${floor}
    <rect x="14" y="10" width="62" height="50" rx="5" fill="var(--il-wall)"/>
    ${[[18, 14], [46, 14], [18, 37], [46, 37]].map(([x, y]) => `<rect x="${x}" y="${y}" width="26" height="19" rx="3" fill="var(--il-screen)" ${S}/>`).join('')}
    <rect x="86" y="18" width="22" height="40" rx="4" fill="var(--il-paper)" ${S}/>
    ${[26, 37, 48].map((y) => `<rect x="91" y="${y - 3}" width="12" height="7" rx="2" fill="var(--il-aqua)" ${S} stroke-width="1.8"/>`).join('')}
    <g class="il-note"><path d="M42 74V64l12-3v10" ${S} fill="none"/><circle cx="39" cy="74" r="3.6" fill="var(--il-sun)" ${S} stroke-width="1.8"/><circle cx="51" cy="71" r="3.6" fill="var(--il-sun)" ${S} stroke-width="1.8"/></g>`,

  guenilles: () => `
    ${floor}
    <rect x="12" y="16" width="52" height="62" rx="7" fill="var(--il-paper)" ${S}/>
    <circle cx="38" cy="50" r="17" fill="var(--il-screen)" ${S}/>
    <path d="M27 54c6 5 16 5 22 0" stroke="var(--il-aqua)" stroke-width="5" stroke-linecap="round" fill="none" class="il-spin"/>
    <circle cx="22" cy="25" r="2.5" fill="var(--il-ink)"/><rect x="40" y="22" width="16" height="5" rx="2" fill="var(--il-aqua)"/>
    <rect x="72" y="62" width="38" height="9" rx="3" fill="var(--il-aqua)" ${S}/>
    <rect x="74" y="52" width="34" height="9" rx="3" fill="var(--il-coral)" ${S}/>
    <rect x="76" y="42" width="30" height="9" rx="3" fill="var(--il-sun)" ${S}/>
    ${sparkle(100, 30)}`,

  desinfection: () => `
    ${floor}
    <rect x="52" y="14" width="56" height="38" rx="5" fill="var(--il-screen)" ${S}/>
    <path d="M60 40l10-9 8 6 12-12 9 7" stroke="var(--il-aqua)" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M76 52v18M64 70h24" ${S} fill="none"/>
    <path d="M20 40h14l4 6v28a4 4 0 0 1-4 4H20a4 4 0 0 1-4-4V46z" fill="var(--il-aqua)" ${S}/>
    <path d="M22 40v-8h10l6-6h-14" fill="var(--il-paper)" ${S}/>
    <rect x="20" y="54" width="14" height="10" rx="2" fill="var(--il-paper)"/>
    <g class="il-mist" fill="var(--il-aqua)"><circle cx="44" cy="22" r="2"/><circle cx="49" cy="27" r="1.6"/><circle cx="46" cy="16" r="1.4"/></g>
    ${sparkle(102, 62, .8)}`,

  'points-contact': () => `
    ${floor}
    <rect x="16" y="30" width="20" height="40" rx="6" fill="var(--il-steel)" ${S}/>
    <rect x="84" y="30" width="20" height="40" rx="6" fill="var(--il-steel)" ${S}/>
    <rect x="34" y="44" width="52" height="12" rx="6" fill="var(--il-coral)" ${S}/>
    <path d="M44 44v12M54 44v12M64 44v12M74 44v12" stroke="var(--il-ink)" stroke-width="1.6" opacity=".45"/>
    ${sparkle(60, 24)}${sparkle(30, 18, .7)}${sparkle(92, 18, .7)}`,

  poubelles: () => `
    ${floor}
    <path d="M26 30h40l-5 48H31z" fill="var(--il-steel)" ${S}/>
    <rect x="22" y="22" width="48" height="9" rx="3" fill="var(--il-ink)"/>
    <path d="M40 18h12" ${S}/>
    <path d="M38 42v26M46 42v26M54 42v26" stroke="var(--il-ink)" stroke-width="1.8" opacity=".4"/>
    <path d="M84 44c-6 0-8 6-8 12v22h24V56c0-6-2-12-8-12" fill="var(--il-aqua)" ${S}/>
    <path d="M84 44l4-8 4 8" fill="var(--il-aqua)" ${S}/>
    <path d="M84 60l4 6 5-9" stroke="var(--il-paper)" stroke-width="2.6" fill="none" stroke-linecap="round"/>`,

  aspirateur: () => `
    <rect x="8" y="70" width="104" height="10" rx="3" fill="var(--il-mat)"/>
    <path d="M14 75h12M32 75h12M50 75h12" stroke="var(--il-paper)" stroke-width="2" opacity=".5" class="il-lanes"/>
    <path d="M78 10l-14 46" ${S} stroke-width="3.2"/>
    <rect x="70" y="6" width="16" height="8" rx="3" fill="var(--il-ink)"/>
    <rect x="58" y="34" width="20" height="26" rx="6" fill="var(--il-coral)" ${S}/>
    <path d="M44 66h40l4 6H40z" fill="var(--il-steel)" ${S}/>
    <circle cx="48" cy="72" r="3" fill="var(--il-ink)"/><circle cx="80" cy="72" r="3" fill="var(--il-ink)"/>
    ${sparkle(24, 52, .8)}`,

  'tour-general': () => `
    ${floor}
    <path d="M18 64c10-24 30-30 44-18s30 8 40-14" stroke="var(--il-aqua)" stroke-width="3" stroke-dasharray="2 8" stroke-linecap="round" fill="none" class="il-path"/>
    <rect x="12" y="66" width="22" height="8" rx="3" fill="var(--il-steel)" ${S}/>
    <circle cx="12" cy="70" r="7" fill="var(--il-coral)" ${S}/><circle cx="34" cy="70" r="7" fill="var(--il-coral)" ${S}/>
    <circle cx="102" cy="26" r="9" fill="var(--il-sun)" ${S}/>
    <path d="M98 26l3 3 6-6" stroke="var(--il-ink)" stroke-width="2.4" fill="none" stroke-linecap="round"/>`,

  rangement: () => `
    ${floor}
    <path d="M18 34h84M18 58h84M24 34v44M96 34v44" ${S} fill="none"/>
    ${[30, 48, 66, 84].map((x, i) => `<g><rect x="${x - 7}" y="26" width="14" height="8" rx="3" fill="var(--il-${['coral', 'aqua', 'sun', 'steel'][i]})" ${S} stroke-width="1.8"/></g>`).join('')}
    ${[36, 60, 84].map((x) => `<circle cx="${x}" cy="50" r="8" fill="var(--il-steel)" ${S}/>`).join('')}
    ${sparkle(60, 14, .8)}`,

  inspection: () => `
    ${floor}
    <rect x="34" y="12" width="46" height="62" rx="5" fill="var(--il-paper)" ${S}/>
    <rect x="48" y="8" width="18" height="9" rx="3" fill="var(--il-steel)" ${S}/>
    ${[30, 44, 58].map((y, i) => `<path d="M42 ${y}l3 3 6-6" stroke="var(--il-${i === 2 ? 'steel' : 'aqua'})" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M56 ${y}h16" stroke="var(--il-ink)" stroke-width="2" opacity=".35" stroke-linecap="round"/>`).join('')}
    <circle cx="94" cy="56" r="11" fill="none" ${S}/><path d="M102 64l8 8" ${S} stroke-width="3.2"/>`,

  tuiles: () => `
    <g opacity=".9">${[0, 1, 2, 3, 4].map((c) => [0, 1].map((r) => `<rect x="${10 + c * 20}" y="${58 + r * 12}" width="19" height="11" rx="1.5" fill="var(--il-tile)"/>`).join('')).join('')}</g>
    <path d="M20 66c18-6 40-6 64 0" stroke="var(--il-aqua)" stroke-width="5" stroke-linecap="round" fill="none" opacity=".55" class="il-wet"/>
    <path d="M86 8L66 60" ${S} stroke-width="3.2"/>
    <path d="M56 58h22l3 8H52z" fill="var(--il-sun)" ${S}/>
    <path d="M56 66v6M62 66v7M68 66v7M74 66v6" stroke="var(--il-ink)" stroke-width="2" stroke-linecap="round"/>
    <path d="M100 30l6 10H94z" fill="var(--il-sun)" ${S}/><path d="M100 34v2" stroke="var(--il-ink)" stroke-width="2"/>`,

  miroirs: () => `
    ${floor}
    <rect x="22" y="8" width="58" height="66" rx="4" fill="var(--il-glass)" ${S}/>
    <path d="M34 22l16-12M34 40l30-22M42 56l34-26" stroke="var(--il-paper)" stroke-width="3" stroke-linecap="round" opacity=".8" class="il-shine"/>
    <path d="M86 40h18v10H86z" fill="var(--il-aqua)" ${S}/>
    <path d="M95 50v20" ${S} stroke-width="3"/>
    ${sparkle(70, 66, .7)}`,

  spinning: () => `
    ${floor}
    <path d="M22 76h56" ${S} stroke-width="4"/>
    <circle cx="36" cy="56" r="15" fill="var(--il-coral)" ${S}/><circle cx="36" cy="56" r="5" fill="var(--il-paper)" ${S} stroke-width="1.8"/>
    <path d="M36 56L58 34M58 34l8 42M50 76l14-18" ${S} fill="none" stroke-width="3.2"/>
    <path d="M58 34l-12-14" ${S} stroke-width="3.2"/><path d="M40 18h12" ${S} stroke-width="4"/>
    <path d="M62 26h14" ${S} stroke-width="5"/><path d="M66 26l-4 8" ${S} stroke-width="3"/>
    ${sparkle(96, 26)}${sparkle(98, 56, .7)}`,
  hebdo: () => `
    ${floor}
    <rect x="62" y="12" width="46" height="40" rx="5" fill="var(--il-paper)" ${S}/>
    <rect x="62" y="12" width="46" height="11" rx="5" fill="var(--il-coral)" ${S}/>
    ${[0, 1, 2, 3].map((c) => [0, 1].map((r) => `<rect x="${68 + c * 10}" y="${28 + r * 10}" width="6" height="6" rx="1.5" fill="var(--il-${c === 2 && r === 0 ? 'aqua' : 'steel'})"/>`).join('')).join('')}
    <path d="M10 46h44M10 66h44" ${S} fill="none"/>
    <rect x="14" y="34" width="10" height="12" rx="2" fill="var(--il-aqua)" ${S} stroke-width="1.8"/>
    <rect x="28" y="38" width="16" height="8" rx="2" fill="var(--il-sun)" ${S} stroke-width="1.8"/>
    <rect x="18" y="56" width="22" height="10" rx="2" fill="var(--il-steel)" ${S} stroke-width="1.8"/>
    ${sparkle(48, 28, .7)}`,

  bureaux: () => `
    ${floor}
    <rect x="10" y="12" width="40" height="66" rx="3" fill="var(--il-wall)" ${S}/>
    <circle cx="42" cy="46" r="2.5" fill="var(--il-ink)"/>
    <path d="M60 50h48M66 50v28M102 50v28" ${S} fill="none"/>
    <rect x="72" y="34" width="22" height="16" rx="2" fill="var(--il-screen)" ${S}/>
    <path d="M70 76h30" stroke="var(--il-aqua)" stroke-width="5" stroke-linecap="round" opacity=".5" class="il-wet"/>`,

  ventilation: () => `
    <rect x="22" y="10" width="76" height="56" rx="6" fill="var(--il-paper)" ${S}/>
    ${[22, 32, 42, 52].map((y) => `<path d="M32 ${y}h56" ${S} stroke-width="3"/>`).join('')}
    <g class="il-breeze" stroke="var(--il-aqua)" stroke-width="2.6" fill="none" stroke-linecap="round">
      <path d="M40 74c6-4 10 4 16 0s10 4 16 0"/><path d="M50 82c6-4 10 4 16 0"/></g>`,

  'fin-quart': () => `
    ${floor}
    <path d="M24 34c-8 6-10 22-6 34 2 8 30 8 32 0 4-12 2-28-6-34" fill="var(--il-steel)" ${S}/>
    <path d="M26 32l8 4 8-4" ${S} fill="none"/>
    <path d="M70 24h24v40H70z" fill="var(--il-wall)" ${S}/>
    <circle cx="88" cy="45" r="2.5" fill="var(--il-ink)"/>
    <rect x="96" y="54" width="16" height="12" rx="3" fill="var(--il-sun)" ${S} stroke-width="1.8"/>
    <text x="104" y="63" text-anchor="middle" class="il-num">124</text>
    <path d="M94 46l4 8" ${S} stroke-width="1.8"/>`,

  fermeture: () => `
    ${floor}
    <rect x="12" y="14" width="44" height="30" rx="4" fill="var(--il-ink)" opacity=".85"/>
    <rect x="16" y="18" width="36" height="22" rx="2" fill="var(--il-night)"/>
    <circle cx="48" cy="48" r="3" fill="var(--il-aqua)" class="il-blink"/>
    <rect x="22" y="44" width="24" height="5" rx="2" fill="var(--il-steel)"/>
    <path d="M90 16a16 16 0 1 0 14 22 13 13 0 0 1-14-22z" fill="var(--il-sun)" ${S}/>
    <rect x="70" y="50" width="16" height="24" rx="3" fill="var(--il-paper)" ${S}/>
    <rect x="74" y="62" width="8" height="8" rx="2" fill="var(--il-steel)"/>`,
};
// Petite carte des zones, la zone du jour en couleur (icône de la tâche).
const miniZone = (z) => () => `
    <rect x="10" y="8" width="100" height="26" rx="5" fill="var(${z === 'A' ? '--il-aqua' : '--il-tile'})" ${S}/>
    <rect x="10" y="40" width="48" height="42" rx="5" fill="var(${z === 'C' ? '--il-aqua' : '--il-tile'})" ${S}/>
    <rect x="62" y="40" width="48" height="42" rx="5" fill="var(${z === 'B' ? '--il-aqua' : '--il-tile'})" ${S}/>
    <text x="${z === 'A' ? 60 : z === 'B' ? 86 : 34}" y="${z === 'A' ? 28 : 69}" text-anchor="middle" class="zm-id">${z}</text>`;
ART['zone-a'] = miniZone('A');
ART['zone-b'] = miniZone('B');
ART['zone-c'] = miniZone('C');
ART['aspirateur-muscu'] = ART.aspirateur;
ART['aspirateur-cardio'] = ART.aspirateur;
ART['aspirateur-gym'] = ART.aspirateur;
ART['bureaux-patrons'] = ART.bureaux;
ART['bureaux-entraineurs'] = ART.bureaux;

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
