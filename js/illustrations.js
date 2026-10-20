// Illustrations des tâches, dessinées en SVG (aucune image à télécharger).
// Couleurs via variables CSS (--il-*) : elles suivent le thème clair/sombre.
import { ZONES, ROOMS, DOORS, GEAR, WALK, PARTITIONS } from './floor-layout.js';
// viewBox 96 × 96. Contour « encre » commun, aplats de couleur.
// Les éléments « a a-… » bougent en boucle, seulement dans un parent .alive
// (détail d'une tâche, carte « En cours ») et jamais si on réduit les animations.

const S = 'stroke="var(--il-ink)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"';
const T = 'stroke="var(--il-ink)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
const wrap = (body, label = '') =>
  `<svg viewBox="0 0 96 96" role="img" aria-label="${label}" class="illus obj">${body}</svg>`;
// Style unique : un seul objet centré, contour encre, deux gris, un détail aqua,
// ombre douce au sol.
const shadow = (rx = 26) => `<ellipse cx="48" cy="87" rx="${rx}" ry="3.6" fill="var(--il-shadow)"/>`;

// Petit éclat (propre, brillant).
const spark = (x, y, d) => `<g transform="translate(${x} ${y})"><path class="a a-spark" style="--d:${d}s" d="M0-5.5l1.4 4.1 4.1 1.4-4.1 1.4L0 5.5l-1.4-4.1-4.1-1.4 4.1-1.4z" fill="var(--il-accent)"/></g>`;

const ART = {
  // Plaque d'interrupteurs : les 3 ventilations s'allument l'une après l'autre.
  ouverture: () => `${shadow(22)}
    <rect x="24" y="10" width="48" height="74" rx="10" fill="var(--il-fill)" ${S}/>
    <circle cx="48" cy="16.5" r="1.6" fill="var(--il-mid)"/><circle cx="48" cy="77.5" r="1.6" fill="var(--il-mid)"/>
    ${[22, 40, 58].map((y, i) => `
      <rect x="32" y="${y}" width="32" height="14" rx="4" fill="var(--il-fill2)" ${S}/>
      <g class="a a-flip" style="--d:${i * 0.35}s">
        <rect x="34.5" y="${y + 2.5}" width="14" height="9" rx="2.5" fill="var(--il-accent)"/>
        <path d="M41.5 ${y + 4.5}v5" stroke="var(--il-fill)" stroke-width="1.8" stroke-linecap="round"/>
      </g>`).join('')}`,

  // Laveuse : le tambour tourne, des bulles montent.
  guenilles: () => `${shadow(28)}
    <rect x="20" y="10" width="56" height="72" rx="8" fill="var(--il-fill)" ${S}/>
    <path d="M20 25h56" ${T}/>
    <rect x="26" y="15" width="18" height="6" rx="2" fill="var(--il-accent-soft)" ${T}/>
    <circle cx="68" cy="18" r="3.6" fill="var(--il-fill2)" ${T}/>
    <circle cx="48" cy="53" r="20" fill="var(--il-fill2)" ${S}/>
    <circle cx="48" cy="53" r="14" fill="var(--il-accent-soft)" ${T}/>
    <g class="a a-drum">
      <circle cx="48" cy="53" r="14" fill="none"/>
      <path d="M35 56c4.5-3.6 8.5-3.6 13 0s8.5 3.6 13 0" fill="none" stroke="var(--il-accent)" stroke-width="2.5" stroke-linecap="round"/>
      <path d="M40 46.5a10 10 0 0 1 7-3" fill="none" stroke="var(--il-fill)" stroke-width="2" stroke-linecap="round"/>
    </g>
    <circle class="a a-bubble" cx="44" cy="60" r="1.8" fill="var(--il-fill)" style="--d:.3s"/>
    <circle class="a a-bubble" cx="53" cy="62" r="1.3" fill="var(--il-fill)" style="--d:1.2s"/>
    <rect x="25" y="82" width="7" height="3" rx="1" fill="var(--il-ink)"/><rect x="64" y="82" width="7" height="3" rx="1" fill="var(--il-ink)"/>`,

  // Vaporisateur : la gâchette, puis la bruine.
  desinfection: () => `${shadow(18)}
    <path d="M37 24V16h20l9 6h-7v4" fill="var(--il-fill2)" ${S}/>
    <rect x="66" y="19.5" width="5" height="5" rx="1.5" fill="var(--il-ink)"/>
    <path class="a a-trigger" d="M45 26c-1.5 3-0.5 6 2 8" fill="none" ${S}/>
    <rect x="39" y="24" width="15" height="9" rx="2" fill="var(--il-fill2)" ${S}/>
    <path d="M36 33h21l4 8v37a6 6 0 0 1-6 6H38a6 6 0 0 1-6-6V41z" fill="var(--il-fill)" ${S}/>
    <rect x="36" y="50" width="21" height="20" rx="3" fill="var(--il-accent-soft)" ${T}/>
    <path d="M46.5 54.5c3 3.6 4.5 6 4.5 8a4.5 4.5 0 0 1-9 0c0-2 1.5-4.4 4.5-8z" fill="var(--il-accent)"/>
    ${[[77, 18, 1.8, 0], [81, 23, 1.4, 0.15], [80, 13.5, 1.2, 0.3], [85, 17, 1.1, 0.45], [84, 26, 0.9, 0.6]].map(([x, y, r, d]) => `<circle class="a a-mist" cx="${x}" cy="${y}" r="${r}" fill="var(--il-accent)" style="--d:${d}s"/>`).join('')}`,

  // Guenille en microfibre : elle essuie, ça brille.
  'points-contact': () => `${shadow(28)}
    <g class="a a-wipe"><g transform="rotate(-8 48 50)">
      <rect x="18" y="26" width="60" height="46" rx="7" fill="var(--il-accent-soft)" ${S}/>
      <path d="M24 34h48M24 41h48M24 48h48" stroke="var(--il-accent)" stroke-width="1.6" stroke-dasharray="2 3.5" stroke-linecap="round" opacity=".7"/>
      <path d="M18 54h60v12a6 6 0 0 1-6 6H24a6 6 0 0 1-6-6z" fill="var(--il-accent)" ${S}/>
      <path d="M24 61h48" stroke="var(--il-fill)" stroke-width="1.6" stroke-dasharray="2 3.5" stroke-linecap="round" opacity=".8"/>
    </g></g>
    ${spark(80, 20, 0)}${spark(14, 76, 1.1)}`,

  // Poubelle : le couvercle bascule.
  poubelles: () => `${shadow(20)}
    <path d="M29 36h38l-4 44a4 4 0 0 1-4 4H37a4 4 0 0 1-4-4z" fill="var(--il-fill)" ${S}/>
    <path d="M40 44v32M48 44v32M56 44v32" stroke="var(--il-mid)" stroke-width="2.2" stroke-linecap="round"/>
    <g class="a a-lid">
      <path d="M26 36c0-11 9.8-18 22-18s22 7 22 18z" fill="var(--il-fill2)" ${S}/>
      <rect x="39" y="24" width="18" height="7" rx="2.5" fill="var(--il-accent)" ${T}/>
    </g>`,

  // Aspirateur : il avance et recule, la poussière disparaît.
  aspirateur: () => `${shadow(28)}
    ${[[82, 0], [86, 0.5], [79, 1]].map(([x, d]) => `<circle class="a a-dust" cx="${x}" cy="83" r="1.6" fill="var(--il-mid)" style="--d:${d}s"/>`).join('')}
    <g class="a a-glide">
      <rect x="52" y="6" width="16" height="7" rx="3.5" fill="var(--il-fill2)" ${S}/>
      <path d="M59 13l-6 26" ${S} stroke-width="3.2"/>
      <rect x="39" y="34" width="24" height="34" rx="8" fill="var(--il-accent)" ${S}/>
      <rect class="a a-led" x="43" y="40" width="16" height="5" rx="2.5" fill="var(--il-accent-soft)"/>
      <path d="M63 46c9 3 12 10 9 22" fill="none" ${T}/>
      <rect x="44" y="67" width="14" height="7" rx="2" fill="var(--il-fill2)" ${S}/>
      <path d="M24 78a4 4 0 0 1 4-4h40a4 4 0 0 1 4 4v3H24z" fill="var(--il-fill)" ${S}/>
      <circle cx="31" cy="84" r="3" fill="var(--il-ink)"/><circle cx="65" cy="84" r="3" fill="var(--il-ink)"/>
    </g>`,

  // Le tour complet du plancher : la flèche fait le tour.
  'tour-general': () => `${shadow(28)}
    <rect x="16" y="16" width="64" height="64" rx="12" fill="var(--il-fill2)" ${S}/>
    <path d="M30 34h36M30 48h36M30 62h36" stroke="var(--il-mid)" stroke-width="1.6" stroke-dasharray="2 4" stroke-linecap="round"/>
    <g class="a a-orbit">
      <circle cx="48" cy="48" r="36" fill="none"/>
      <path d="M62 26A24 24 0 1 1 35 27" fill="none" stroke="var(--il-accent)" stroke-width="4.5" stroke-linecap="round"/>
      <path d="M27 20l9 6.5-8.5 7" fill="none" stroke="var(--il-accent)" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
    <circle class="a a-beat" cx="48" cy="48" r="5" fill="var(--il-ink)"/>`,

  // Haltère hexagonal : on le soulève, on le repose à sa place.
  rangement: () => {
    const hex = (cx, cy, r) => Array.from({ length: 6 }, (_, i) => {
      const a = Math.PI / 6 + (i * Math.PI) / 3;
      return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
    }).join(' ');
    return `<ellipse class="a a-shadow" cx="48" cy="87" rx="30" ry="3.6" fill="var(--il-shadow)"/>
      <g class="a a-lift">
        <rect x="28" y="44" width="40" height="8" rx="3" fill="var(--il-fill2)" ${S}/>
        <path d="M40 45v6M44 45v6M48 45v6M52 45v6M56 45v6" stroke="var(--il-mid)" stroke-width="1.4"/>
        <rect x="31" y="40" width="5" height="16" rx="1.5" fill="var(--il-accent)" ${T}/>
        <rect x="60" y="40" width="5" height="16" rx="1.5" fill="var(--il-accent)" ${T}/>
        <polygon points="${hex(21, 48, 16)}" fill="var(--il-fill)" ${S}/><polygon points="${hex(21, 48, 8)}" fill="var(--il-fill2)" ${T}/>
        <polygon points="${hex(75, 48, 16)}" fill="var(--il-fill)" ${S}/><polygon points="${hex(75, 48, 8)}" fill="var(--il-fill2)" ${T}/>
      </g>`;
  },

  // Planchette : la dernière case se coche.
  inspection: () => `${shadow(22)}
    <rect x="22" y="12" width="52" height="72" rx="7" fill="var(--il-fill2)" ${S}/>
    <rect x="29" y="20" width="38" height="58" rx="3" fill="var(--il-fill)" ${T}/>
    <rect x="37" y="7" width="22" height="11" rx="3.5" fill="var(--il-mid)" ${S}/>
    ${[30, 44, 58].map((y, i) => `
      <rect x="34" y="${y}" width="8" height="8" rx="2" fill="${i < 2 ? 'var(--il-accent)' : 'var(--il-fill)'}" ${T}/>
      ${i < 2
        ? `<path d="M35.8 ${y + 4.2}l1.8 1.8 3-3.4" fill="none" stroke="var(--il-fill)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`
        : `<rect class="a a-box" x="34" y="${y}" width="8" height="8" rx="2" fill="var(--il-accent)" ${T}/>
           <path class="a a-check" pathLength="1" d="M35.8 ${y + 4.2}l1.8 1.8 3-3.4" fill="none" stroke="var(--il-fill)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`}
      <path d="M46 ${y + 4}h15" stroke="var(--il-mid)" stroke-width="2.4" stroke-linecap="round"/>`).join('')}`,

  // Seau et moppe : la moppe va et vient, l'eau bouge.
  tuiles: () => `${shadow(26)}
    <path class="a a-mop" d="M62 6L50 54" ${S} stroke-width="3.2"/>
    <path d="M26 46h44l-5 34a4 4 0 0 1-4 4H35a4 4 0 0 1-4-4z" fill="var(--il-fill)" ${S}/>
    <ellipse class="a a-ripple" cx="48" cy="46" rx="22" ry="5" fill="var(--il-accent-soft)" ${S}/>
    <path d="M40 46c2-6 14-6 18 0" fill="var(--il-mid)" ${T}/>
    <path d="M27 58h42" ${T} opacity=".5"/>
    <rect x="22" y="56" width="5" height="12" rx="2" fill="var(--il-accent)" ${T}/><rect x="69" y="56" width="5" height="12" rx="2" fill="var(--il-accent)" ${T}/>`,

  // Raclette : un passage, des gouttes qui tombent, un éclat.
  miroirs: () => `${shadow(22)}
    <g class="a a-squeegee"><g transform="rotate(-28 48 48)">
      <rect x="44" y="34" width="8" height="46" rx="4" fill="var(--il-fill2)" ${S}/>
      <path d="M44 70h8" ${T}/>
      <rect x="22" y="24" width="52" height="11" rx="3" fill="var(--il-fill)" ${S}/>
      <rect x="20" y="19" width="56" height="6" rx="2" fill="var(--il-accent)" ${S}/>
    </g></g>
    <path class="a a-drip" style="--d:0s" d="M70 66c1.5 2.2 2.4 3.6 2.4 4.8a2.4 2.4 0 0 1-4.8 0c0-1.2.9-2.6 2.4-4.8z" fill="var(--il-accent)"/>
    <path class="a a-drip" style="--d:.9s" d="M78 56c1.2 1.8 2 3 2 4a2 2 0 0 1-4 0c0-1 .8-2.2 2-4z" fill="var(--il-accent)"/>
    ${spark(16, 18, 0.5)}`,

  // Vélo de spinning : le volant tourne, le pédalier aussi.
  spinning: () => `${shadow(30)}
    <path d="M20 84h56" ${S} stroke-width="4"/>
    <path d="M30 84l8-30M38 54l-2-12" ${S} stroke-width="3.5"/>
    <path d="M26 39h18a3 3 0 0 1-3 4H29a3 3 0 0 1-3-4z" fill="var(--il-ink)"/>
    <path d="M38 58l26 8M60 84l2-56" ${S} stroke-width="3.5"/>
    <path d="M56 26h12a4 4 0 0 1 4 4v3" fill="none" ${S} stroke-width="3.2"/>
    <circle cx="66" cy="66" r="14" fill="var(--il-fill2)" ${S}/>
    <g class="a a-spin">
      <circle cx="66" cy="66" r="9" fill="none" stroke="var(--il-mid)" stroke-width="1.8"/>
      <path d="M66 57.5v17M57.5 66h17" stroke="var(--il-mid)" stroke-width="1.6" stroke-linecap="round"/>
    </g>
    <circle cx="66" cy="66" r="4.5" fill="var(--il-accent)" ${T}/>
    <g class="a a-crank">
      <circle cx="46" cy="64" r="12" fill="none"/>
      <path d="M46 64l5 9M48.5 75h6" ${S}/>
    </g>
    <circle cx="46" cy="64" r="4" fill="var(--il-fill)" ${S}/>`,

  // Calendrier : le jour avance d'une case à l'autre.
  hebdo: () => `${shadow(26)}
    <rect x="18" y="16" width="60" height="66" rx="8" fill="var(--il-fill)" ${S}/>
    <path d="M18 32V24a8 8 0 0 1 8-8h44a8 8 0 0 1 8 8v8z" fill="var(--il-accent)" ${S}/>
    <rect x="31" y="10" width="5" height="12" rx="2.5" fill="var(--il-fill2)" ${S}/><rect x="60" y="10" width="5" height="12" rx="2.5" fill="var(--il-fill2)" ${S}/>
    ${[0, 1, 2].map((r) => [0, 1, 2, 3].map((c) => `<rect x="${25 + c * 12}" y="${40 + r * 12}" width="9" height="9" rx="2.5" fill="var(--il-fill2)"/>`).join('')).join('')}
    <g class="a a-hop">
      <rect x="49" y="52" width="9" height="9" rx="2.5" fill="var(--il-accent)" ${T}/>
      <path d="M51.5 56.5l1.8 1.8 3-3.4" fill="none" stroke="var(--il-fill)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    </g>`,

  // Porte de bureau : elle s'entrouvre.
  bureaux: () => `${shadow(22)}
    <rect x="26" y="8" width="44" height="78" rx="3" fill="var(--il-fill2)" ${S}/>
    <rect x="31" y="13" width="34" height="73" rx="2" fill="var(--il-ink)" opacity=".22"/>
    <g class="a a-door">
      <rect x="31" y="13" width="34" height="73" rx="2" fill="var(--il-fill)" ${S}/>
      <rect x="36" y="22" width="24" height="8" rx="2" fill="var(--il-accent-soft)" ${T}/>
      <path d="M40 26h16" stroke="var(--il-accent)" stroke-width="1.8" stroke-linecap="round"/>
      <rect x="36" y="40" width="24" height="16" rx="2" fill="none" stroke="var(--il-mid)" stroke-width="1.8"/>
      <rect x="36" y="62" width="24" height="16" rx="2" fill="none" stroke="var(--il-mid)" stroke-width="1.8"/>
      <circle cx="58" cy="52" r="3" fill="var(--il-accent)" ${T}/>
    </g>`,

  // Grille de ventilation : l'air sort.
  ventilation: () => `${shadow(26)}
    <rect x="16" y="12" width="64" height="64" rx="10" fill="var(--il-fill)" ${S}/>
    <rect x="24" y="20" width="48" height="48" rx="5" fill="var(--il-fill2)" ${T}/>
    ${[29, 37, 45, 53, 61].map((y, i) => `<path class="a a-slat" style="--d:${i * 0.12}s" d="M29 ${y}h38" ${S} stroke-width="3"/>`).join('')}
    ${[[20, 16], [76, 16], [20, 72], [76, 72]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.6" fill="var(--il-mid)"/>`).join('')}
    <path class="a a-flow" d="M24 83c4-3 8 3 12 0s8 3 12 0 8 3 12 0 8 3 12 0" fill="none" stroke="var(--il-accent)" stroke-width="2.2" stroke-linecap="round" stroke-dasharray="7 5"/>`,

  // Clé 124 : elle se balance doucement.
  'fin-quart': () => `${shadow(26)}
    <g class="a a-swing">
      <circle cx="28" cy="34" r="60" fill="none"/>
      <circle cx="28" cy="34" r="12" fill="var(--il-fill)" ${S}/>
      <circle cx="28" cy="34" r="4.5" fill="var(--il-fill2)" ${T}/>
      <path d="M38 40l22 13M52 48l-3 6M58 52l-3 6" ${S} stroke-width="4"/>
      <path d="M24 46l-2 10" ${T}/>
      <g transform="rotate(12 30 66)">
        <rect x="14" y="56" width="34" height="20" rx="6" fill="var(--il-accent)" ${S}/>
        <circle cx="20" cy="66" r="2" fill="var(--il-fill)"/>
        <text x="35" y="70.5" text-anchor="middle" class="il-num">124</text>
      </g>
    </g>`,

  // Cadenas : il se referme d'un clic.
  fermeture: () => `${shadow(22)}
    <path class="a a-shackle" d="M34 42V31a14 14 0 0 1 28 0v11" fill="none" ${S} stroke-width="4"/>
    <g class="a a-thunk">
      <rect x="24" y="40" width="48" height="42" rx="8" fill="var(--il-fill)" ${S}/>
      <path d="M24 52h48" stroke="var(--il-accent)" stroke-width="5"/>
      <circle cx="48" cy="64" r="5" fill="var(--il-ink)"/>
      <path d="M48 66v8" stroke="var(--il-ink)" stroke-width="4" stroke-linecap="round"/>
    </g>`,

  // Dossier des rapports : les feuilles glissent dedans.
  dossier: () => `${shadow(30)}
    <path d="M14 26a5 5 0 0 1 5-5h18l6 7h34a5 5 0 0 1 5 5v44a5 5 0 0 1-5 5H19a5 5 0 0 1-5-5z" fill="var(--il-fill2)" ${S}/>
    <g class="a a-sheet" style="--d:0s"><rect x="24" y="20" width="44" height="40" rx="3" fill="var(--il-fill)" ${T}/><path d="M30 29h24M30 36h32M30 43h18" stroke="var(--il-mid)" stroke-width="2" stroke-linecap="round"/></g>
    <g class="a a-sheet" style="--d:.5s"><rect x="30" y="26" width="44" height="40" rx="3" fill="var(--il-fill)" ${T}/><path d="M36 35h14" stroke="var(--il-accent)" stroke-width="2.4" stroke-linecap="round"/><path d="M36 42h30M36 49h22" stroke="var(--il-mid)" stroke-width="2" stroke-linecap="round"/></g>
    <path d="M14 44a5 5 0 0 1 5-5h58a5 5 0 0 1 5 5v33a5 5 0 0 1-5 5H19a5 5 0 0 1-5-5z" fill="var(--il-accent-soft)" ${S}/>
    <rect x="40" y="52" width="16" height="5" rx="2.5" fill="var(--il-accent)"/>`,
};

ART['aspirateur-muscu'] = ART.aspirateur;
ART['aspirateur-cardio'] = ART.aspirateur;
ART['aspirateur-gym'] = ART.aspirateur;
ART['bureaux-patrons'] = ART.bureaux;
ART['bureaux-entraineurs'] = ART.bureaux;

// Petite carte des zones au même plan, la zone du jour en aqua.
const miniZone = (z) => () => `${shadow(30)}
    <rect x="14" y="14" width="32" height="38" rx="5" fill="var(${z === 'C' ? '--zC-strong' : '--il-fill2'})" ${S}/>
    <rect x="50" y="14" width="32" height="38" rx="5" fill="var(${z === 'B' ? '--zB-strong' : '--il-fill2'})" ${S}/>
    <rect x="14" y="56" width="68" height="26" rx="5" fill="var(${z === 'A' ? '--zA-strong' : '--il-fill2'})" ${S}/>
    <rect class="a a-glow" x="${z === 'A' ? 14 : z === 'B' ? 50 : 14}" y="${z === 'A' ? 56 : 14}" width="${z === 'A' ? 68 : 32}" height="${z === 'A' ? 26 : 38}" rx="5" fill="none" stroke="var(--il-accent)" stroke-width="3"/>
    <text x="${z === 'A' ? 48 : z === 'B' ? 66 : 30}" y="${z === 'A' ? 75 : 39}" text-anchor="middle" class="zm-id">${z}</text>`;
ART['zone-a'] = miniZone('A');
ART['zone-b'] = miniZone('B');
ART['zone-c'] = miniZone('C');

// Plan du 2e étage, vu du dessus, d'après le croquis, les photos et les
// corrections de l'équipe. La disposition vient de floor-layout.js (la même
// que la vue 3D). Planchers réels, équipement, miroirs, télés, pièces bâties
// dans les murs, portes.
// Options : highlight (zone de la tâche), selected (zone ou pièce touchée),
// tags { A: [{ text, state }] } (Matin, Soir… colorés selon le statut),
// labels { A, B, C, 2..5, r1..r5 }.
const r = (x, y, w, h, rx, cls) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" class="${cls}"/>`;
const dots = (g) => {
  const vertical = g.h > g.w;
  const len = vertical ? g.h : g.w;
  return Array.from({ length: Math.floor((len - 4) / 6) }, (_, i) => {
    const p = -len / 2 + 5 + i * 6;
    return `<circle cx="${vertical ? 0 : p}" cy="${vertical ? p : 0}" r="1.7" class="eq-dot"/>`;
  }).join('');
};
// Chaque pièce d'équipement, dessinée autour de (0, 0), l'avant vers le bas.
const GEAR_SVG = {
  treadmill: () => `${r(-6, -14, 12, 28, 3, 'eq')}${r(-3.5, -11, 7, 18, 2, 'eq-belt')}${r(-5, 9, 10, 4, 1.5, 'eq-dark')}`,
  stair: () => `${r(-5, -6.5, 10, 13, 2.5, 'eq')}${r(-3, -4.5, 6, 5, 1.5, 'eq-seat')}`,
  elliptical: () => `${r(-4.5, -12, 9, 24, 4.5, 'eq')}<path d="M0 -7v14" class="eq-bar"/>`,
  rower: () => `${r(-3, -20, 6, 40, 3, 'eq')}<circle cy="6" r="2.4" class="eq-dark"/>${r(-4, 15, 8, 5, 2, 'eq-dark')}`,
  bike: () => `${r(-3, -9, 6, 18, 3, 'eq')}<circle cy="5" r="3" class="eq-dark"/><path d="M-4 -6h8" class="eq-bar"/>`,
  machine: (g) => `${r(-g.w / 2, -g.h / 2, g.w, g.h, 2.5, 'eq')}${r(-g.w / 2 + 3, g.h / 2 - 5, g.w - 6, 3, 1.5, 'eq-seat')}`,
  bench: (g) => (g.h > g.w // en long sur le plan : le banc fait face vers le haut
    ? `${r(-3, -g.h / 2, 6, g.h, 3, 'eq')}${r(-1.5, -g.h / 2 + 2, 3, Math.min(10, g.h - 4), 1.5, 'eq-seat')}`
    : `${r(-g.w / 2, -3, g.w, 6, 3, 'eq')}${r(-g.w / 2 + 2, -1.5, 10, 3, 1.5, 'eq-seat')}`),
  squat: () => `${r(-9, -9, 18, 18, 1.5, 'eq frame')}<path d="M-12 0h24" class="eq-bar"/>`,
  press: () => `${r(-9.75, -13, 3.5, 3.5, 1, 'eq-dark')}${r(6.25, -13, 3.5, 3.5, 1, 'eq-dark')}<path d="M-13 -11.25h26" class="eq-bar"/>${r(-3.25, -7, 6.5, 20, 3, 'eq')}`,
  plates: () => `<circle r="7" class="eq"/><circle r="3" class="eq-seat"/>`,
  pulley: (g) => `${r(-g.w / 2, -g.h / 2, g.w, g.h, 3, 'eq')}<circle cx="-5" cy="${-g.h / 2 + 6}" r="2.5" class="eq-dark"/><circle cx="5" cy="${-g.h / 2 + 6}" r="2.5" class="eq-dark"/><path d="M-5 ${-g.h / 2 + 8}v26M5 ${-g.h / 2 + 8}v26" class="eq-bar"/>`,
  rack: (g) => `${r(-g.w / 2, -g.h / 2, g.w, g.h, 1.5, 'eq')}${dots(g)}`,
  platform: (g) => r(-g.w / 2, -g.h / 2, g.w, g.h, 3, 'eq-wood'),
  carpet: (g) => `${r(-g.w / 2, -g.h / 2, g.w, g.h, 5, 'eq-carpet')}<text y="3.5" text-anchor="middle" class="eq-carpet-label">${'{stretch}'}</text>`,
  mirror: (g) => r(-g.w / 2, -g.h / 2, g.w, g.h, 1.5, 'eq-mirror'),
  tv: (g) => r(-g.w / 2, -g.h / 2, g.w, g.h, 1, 'eq-tv'),
  aisle: (g) => r(-g.w / 2, -g.h / 2, g.w, g.h, 3, 'eq-aisle'),
  turf: (g) => `${r(-g.w / 2, -g.h / 2, g.w, g.h, 3, 'eq-turf')}${Array.from({ length: Math.floor(g.h / 10) }, (_, i) => `<path d="M${-g.w / 2 + 1} ${-g.h / 2 + 10 * (i + 1)}h${g.w - 2}" class="eq-turf-line"/>`).join('')}`,
  sled: () => `${r(-5, -4, 10, 10, 2, 'eq-dark')}<path d="M-4 -4V-7M4 -4V-7" class="eq-bar"/>`,
  smith: (g) => `${r(-g.w / 2, -g.h / 2, g.w, g.h, 1.5, 'eq frame')}<path d="M${-g.w / 2 - 3} 0h${g.w + 6}" class="eq-bar"/><path d="M${-g.w / 2 + 3} ${-g.h / 2}v${g.h}M${g.w / 2 - 3} ${-g.h / 2}v${g.h}" class="eq-rail"/>`,
  legpress: (g) => `${r(-g.w / 2, -g.h / 2, g.w, g.h, 2.5, 'eq')}${r(-g.w / 2 + 2, -g.h / 2 + 3, g.w - 4, 8, 2, 'eq-dark')}${r(-g.w / 2 + 3, g.h / 2 - 9, g.w - 6, 6, 2, 'eq-seat')}`,
  pullup: (g) => `${r(-g.w / 2, -g.h / 2, g.w, g.h, 2, 'eq frame')}<path d="M${-g.w / 2 - 2} ${-g.h / 2 + 2}h${g.w + 4}" class="eq-bar"/>${r(-3, 0, 6, 5, 1.5, 'eq-seat')}`,
  window: (g) => {
    const along = g.w > g.h;
    const len = along ? g.w : g.h;
    const lines = Array.from({ length: Math.max(0, Math.floor(len / 12) - (len % 12 ? 0 : 1)) }, (_, i) => {
      const p = -len / 2 + 12 * (i + 1);
      return along ? `<path d="M${p} ${-g.h / 2}v${g.h}" class="eq-mullion"/>` : `<path d="M${-g.w / 2} ${p}h${g.w}" class="eq-mullion"/>`;
    }).join('');
    return `${r(-g.w / 2, -g.h / 2, g.w, g.h, 1, 'eq-window')}${lines}`;
  },
  barre: (g) => `<path d="M${-g.w / 2} 0h${g.w}" class="eq-barre"/>`,
  clock: () => '<circle r="2" class="eq"/>',
  rollers: () => `${r(-4, -2, 3, 4, 1.5, 'eq-roller')}${r(1, -2, 3, 4, 1.5, 'eq-roller b2')}`,
  ballrack: (g) => `${r(-g.w / 2, -g.h / 2, g.w, g.h, 2, 'eq')}${[0, 1, 2].map((i) => `<circle cy="${-g.h / 2 + 4 + i * 6}" r="2.4" class="eq-ball ${['', 'b2', 'b3'][i]}"/>`).join('')}`,
  balls: () => `<circle cx="-2.5" cy="-2" r="2.6" class="eq-ball"/><circle cx="2.5" cy="1" r="2.2" class="eq-ball b2"/><circle cx="-1" cy="3.5" r="1.8" class="eq-ball b3"/>`,
  barbells: (g) => `${r(-g.w / 2, -g.h / 2, g.w, g.h, 2, 'eq frame')}${Array.from({ length: 4 }, (_, i) => `<path d="M${-g.w / 2 - 2} ${-g.h / 2 + 5 + i * 5.5}h${g.w + 4}" class="eq-bar"/>`).join('')}`,
};
export function zoneMap({ highlight = null, selected = null, tags = {}, labels } = {}) {
  const zoneBase = (id, z) => `<g class="zm z${id} ${id === highlight ? 'hot' : ''} ${id === selected ? 'sel' : ''}" data-area="${id}" role="button" tabindex="0" aria-label="${labels[id]}">
      <rect x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" rx="6" class="zm-floor ${z.floor}"/>
      <rect x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" rx="6" class="zm-tint"/>
    </g>`;
  const zoneTop = (id, z) => {
    return `<g class="zm-top z${id} ${id === highlight ? 'hot' : ''} ${id === selected ? 'sel' : ''}">
      <rect x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" rx="6" class="zm-edge"/>
    </g>`;
  };
  // Nom de la zone : un onglet sur le mur du haut pour C et B (leur bord du
  // haut est plein d'équipement), dans le coin pour A.
  const zoneLabel = (id, z) => {
    const tab = z.y < 40;
    const x = z.x + 6;
    const y = tab ? 1 : z.y + 6;
    const bw = 30 + labels[id].length * 5.3;
    let tx = x + bw + 4;
    const pills = (tags[id] || []).map((tag) => {
      const tw = 12 + tag.text.length * 6.2;
      const out = `<g class="zm-tag ${tag.state || 'planned'}"><rect x="${tx}" y="${y + 0.5}" width="${tw}" height="17" rx="8.5"/><text x="${tx + tw / 2}" y="${y + 12.5}" text-anchor="middle">${tag.text}</text></g>`;
      tx += tw + 4;
      return out;
    }).join('');
    return `<g class="zm-label-group z${id}"><g class="zm-badge"><rect x="${x}" y="${y}" width="${bw}" height="18" rx="6"/><text x="${x + 7}" y="${y + 14}" class="zm-id">${id}</text><text x="${x + 21}" y="${y + 13}" class="zm-label">${labels[id]}</text></g>${pills}</g>`;
  };
  const room = (id, m) => {
    const cx = m.x + m.w / 2;
    const cy = m.y + m.h / 2;
    const label = labels[`r${id}`] || '';
    return `<g class="zm room ${id === selected ? 'sel' : ''}" data-area="${id}" role="button" tabindex="0" aria-label="${labels[id] || label}">
      <rect x="${m.x}" y="${m.y}" width="${m.w}" height="${m.h}" class="zm-room"/>
      <text x="${cx}" y="${cy + 3}" text-anchor="middle" class="zm-room-label ${Math.min(m.w, m.h) < 24 ? 'tiny' : ''}" ${m.vertical ? `transform="rotate(-90 ${cx} ${cy})"` : ''}>${label}</text>
    </g>`;
  };
  // Murs intérieurs des pièces, avec la porte (ou l'ouverture) au bon endroit.
  const roomWalls = Object.values(ROOMS).map((m) => {
    const sides = {
      top: [m.x, m.y, m.x + m.w, m.y], bottom: [m.x, m.y + m.h, m.x + m.w, m.y + m.h],
      left: [m.x, m.y, m.x, m.y + m.h], right: [m.x + m.w, m.y, m.x + m.w, m.y + m.h],
    };
    const inner = Object.entries(sides).filter(([, [x1, y1, x2, y2]]) => !(x1 === x2 && (x1 <= 4 || x1 >= 356)) && !(y1 === y2 && (y1 <= 4 || y1 >= 276)));
    return inner.map(([side, [x1, y1, x2, y2]]) => {
      const d = m.door;
      if (!d || d.side !== side) return `M${x1} ${y1}L${x2} ${y2}`;
      return x1 === x2 ? `M${x1} ${y1}V${d.from}M${x1} ${d.to}V${y2}` : `M${x1} ${y1}H${d.from}M${d.to} ${y1}H${x2}`;
    }).join('');
  }).join('');
  const swings = Object.values(ROOMS).filter((m) => m.door && !m.open && Math.min(m.w, m.h) >= 24).map((m) => {
    const d = m.door;
    if (d.side === 'top') return `M${d.from} ${m.y}A${d.to - d.from} ${d.to - d.from} 0 0 0 ${d.to} ${m.y + (d.to - d.from)}`;
    if (d.side === 'left') return `M${m.x} ${d.from}A${d.to - d.from} ${d.to - d.from} 0 0 1 ${m.x + (d.to - d.from)} ${d.to}`;
    return `M${m.x + m.w} ${d.from}A${d.to - d.from} ${d.to - d.from} 0 0 0 ${m.x + m.w - (d.to - d.from)} ${d.to}`;
  }).join('');
  const { entrance: en, top: tp } = DOORS;
  const outer = `M4 ${en.from}V18A14 14 0 0 1 18 4${tp ? `H${tp.from}M${tp.to} 4` : ''}H342A14 14 0 0 1 356 18V262A14 14 0 0 1 342 276H18A14 14 0 0 1 4 262V${en.to}`;
  const gear = GEAR.map((g) => `<g transform="translate(${g.x} ${g.y})${g.rot ? ` rotate(${g.rot})` : ''}">${GEAR_SVG[g.t](g).replace('{stretch}', labels.stretch || '')}</g>`).join('');
  return `<svg viewBox="0 0 360 280" class="illus map floor" aria-label="Plan du 2e étage">
    <defs>
      <pattern id="fl-wood" width="36" height="6" patternUnits="userSpaceOnUse"><rect width="36" height="6" class="pt-wood"/><path d="M0 6H36M12 0V3M30 3V6" class="pt-wood-line"/></pattern>
      <pattern id="fl-rubber" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="12" height="12" class="pt-rubber"/><path d="M12 0V12H0" class="pt-rubber-line"/></pattern>
      <clipPath id="fl-clip"><rect x="4" y="4" width="352" height="272" rx="14"/></clipPath>
    </defs>
    <rect x="4" y="4" width="352" height="272" rx="14" class="zm-base"/>
    <path class="zm-walk" d="${WALK}"/>
    ${Object.entries(ZONES).map(([id, z]) => zoneBase(id, z)).join('')}
    <g class="zm-gear">${gear}</g>
    ${Object.entries(ZONES).map(([id, z]) => zoneTop(id, z)).join('')}
    <g clip-path="url(#fl-clip)">${Object.entries(ROOMS).map(([id, m]) => room(id, m)).join('')}</g>
    <path class="zm-wall" d="${outer}"/>
    <path class="zm-wall thin" d="${roomWalls}"/>
    <path class="zm-wall part" d="${PARTITIONS.map(([x1, y1, x2, y2]) => `M${x1} ${y1}L${x2} ${y2}`).join('')}"/>
    <path class="zm-swing" d="${swings}M4 ${en.from}h22M26 ${en.from}A22 22 0 0 1 4 ${en.from + 22}${tp ? `M${tp.from} 4v14M${tp.from} 18A14 14 0 0 0 ${tp.to} 4` : ''}"/>
    ${Object.entries(ZONES).map(([id, z]) => zoneLabel(id, z)).join('')}
    <g class="zm room door ${selected === '1' ? 'sel' : ''}" data-area="1" role="button" tabindex="0" aria-label="${labels[1]}">
      <rect x="0" y="${en.from - 6}" width="28" height="${en.to - en.from + 12}" fill="transparent"/>
      <text x="13" y="${(en.from + en.to) / 2 + 6}" text-anchor="middle" class="zm-door-label" transform="rotate(-90 13 ${(en.from + en.to) / 2 + 6})">${labels.r1 || ''}</text>
    </g>
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
