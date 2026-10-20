// Effets : le verre d'eau (progrès du quart), les animations de fin
// de tâche (une par type de tâche) et leurs sons, synthétisés sur place
// (WebAudio, aucun fichier son). Tout part en silence si les sons sont coupés.

// ---------- Sons ----------
let ac = null;
function A() {
  ac ||= new (window.AudioContext || window.webkitAudioContext)();
  if (ac.state === 'suspended') ac.resume();
  return ac;
}
function osc(type, f0, f1, at, dur, gain) {
  const c = A(), t0 = c.currentTime + at;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t0);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}
function noise(at, dur, gain, { type = 'bandpass', f0 = 1000, f1 = f0, q = 1 } = {}) {
  const c = A(), t0 = c.currentTime + at;
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  src.buffer = buf;
  f.type = type;
  f.Q.value = q;
  f.frequency.setValueAtTime(f0, t0);
  if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + Math.min(0.02, dur / 4));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(c.destination);
  src.start(t0);
}

const SOUNDS = {
  pour() { // un « glouglou » d'eau qui tombe dans le verre
    noise(0, 0.28, 0.12, { f0: 500, f1: 1400, q: 2.5 });
    osc('sine', 620, 300, 0.08, 0.12, 0.16);
    osc('sine', 760, 380, 0.2, 0.11, 0.13);
    osc('sine', 900, 480, 0.3, 0.1, 0.1);
  },
  full() {
    [523, 659, 784, 1047].forEach((f, i) => osc('triangle', f, f, 0.35 + i * 0.09, 0.45, 0.14));
  },
  rag() {
    noise(0.05, 0.13, 0.32, { f0: 900, f1: 2600, q: 0.8 });
    noise(0.36, 0.13, 0.32, { f0: 900, f1: 2600, q: 0.8 });
    noise(0.78, 0.08, 0.25, { type: 'lowpass', f0: 600 });
  },
  trash() {
    noise(0.28, 0.18, 0.4, { type: 'lowpass', f0: 320 });
    osc('sine', 95, 55, 0.28, 0.22, 0.45);
    osc('square', 700, 520, 0.62, 0.05, 0.08);
    noise(0.62, 0.06, 0.25, { type: 'highpass', f0: 2800 });
  },
  spray() {
    noise(0.12, 0.38, 0.22, { type: 'highpass', f0: 4200 });
    osc('sine', 2093, 2093, 0.62, 0.3, 0.04);
    osc('sine', 2794, 2794, 0.7, 0.3, 0.035);
  },
  vacuum() {
    noise(0.05, 0.75, 0.22, { f0: 300, f1: 2400, q: 1.4 });
    osc('sawtooth', 110, 330, 0.05, 0.75, 0.03);
    osc('sine', 900, 1300, 0.82, 0.08, 0.12);
  },
  mop() {
    osc('sine', 900, 1600, 0.1, 0.16, 0.12);
    osc('sine', 1100, 1900, 0.34, 0.16, 0.12);
    osc('triangle', 1320, 1320, 0.75, 0.2, 0.06);
  },
  mirror() {
    osc('sine', 2637, 2637, 0.25, 0.9, 0.09);
    osc('sine', 3951, 3951, 0.3, 0.7, 0.05);
  },
  sparkle() {
    [784, 988, 1175, 1568].forEach((f, i) => osc('triangle', f, f, 0.15 + i * 0.08, 0.35, 0.1));
  },
  bike() {
    osc('sawtooth', 240, 70, 0.05, 0.75, 0.035);
    noise(0.05, 0.7, 0.1, { f0: 1600, f1: 400, q: 2 });
    osc('sine', 1760, 1760, 0.8, 0.5, 0.1);
    osc('sine', 2637, 2637, 0.8, 0.4, 0.05);
  },
  stamp() {
    noise(0.36, 0.12, 0.45, { type: 'lowpass', f0: 420 });
    osc('sine', 150, 70, 0.36, 0.16, 0.45);
  },
  power() {
    osc('sine', 220, 880, 0.1, 0.35, 0.12);
    osc('sine', 1320, 1320, 0.48, 0.25, 0.08);
  },
  clipboard() {
    [0.15, 0.33, 0.51].forEach((at) => osc('square', 1800, 1800, at, 0.03, 0.05));
    osc('sine', 1568, 1568, 0.72, 0.4, 0.1);
  },
  lock() {
    noise(0.4, 0.03, 0.3, { type: 'highpass', f0: 2500 });
    osc('square', 1200, 900, 0.4, 0.025, 0.06);
    noise(0.52, 0.03, 0.3, { type: 'highpass', f0: 2000 });
    osc('sine', 300, 300, 0.56, 0.12, 0.08);
  },
  rack() {
    noise(0.42, 0.08, 0.3, { type: 'lowpass', f0: 700 });
    [380, 1090, 2310].forEach((f, i) => osc('sine', f, f, 0.42, 0.22 - i * 0.04, 0.12));
  },
};
export function fxSound(name) {
  try { SOUNDS[name]?.(); } catch { /* pas de son ici : tant pis */ }
}

// ---------- Verre d'eau (progrès du quart) ----------
// Chaque tâche finie remplit le verre : le niveau monte en ressort (il dépasse
// un peu et revient), la surface clapote, quelques gouttes sautent, des bulles
// montent. Au repos, l'eau bouge doucement. Rien ne tourne quand c'est caché.
const NS = 'http://www.w3.org/2000/svg';
const GLASS = 'M8 6H92L83.5 107Q82.6 114 76 114H24Q17.4 114 16.5 107Z';
const TOP = 14, BOTTOM = 113; // niveau plein / vide (unités du dessin)

export function mountGlass(host) {
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const uid = `g${Math.random().toString(36).slice(2, 7)}`;
  host.innerHTML = `<div class="glass"><svg viewBox="0 -14 100 130" aria-hidden="true">
      <defs><clipPath id="${uid}"><path d="${GLASS}"/></clipPath></defs>
      <path class="glass-in" d="${GLASS}"/>
      <g clip-path="url(#${uid})"><path class="water-back"/><path class="water"/><g class="bubbles"></g></g>
      <g class="drops"></g>
      <path class="glass-shine" d="M15 14L20 100" />
      <path class="glass-rim" d="${GLASS}"/>
    </svg></div>`;
  const svg = host.querySelector('svg');
  const front = svg.querySelector('.water'), back = svg.querySelector('.water-back');
  const bubbleG = svg.querySelector('.bubbles'), dropG = svg.querySelector('.drops');
  const s = { y: BOTTOM, v: 0, target: BOTTOM, slosh: 0, t: 0, last: 0, bubbles: [], drops: [], raf: 0 };

  const wave = (amp, ph, k1, k2) => {
    let d = '';
    for (let x = -4; x <= 104; x += 4) {
      const y = s.y + amp * Math.sin(x * k1 + ph) + amp * 0.45 * Math.sin(x * k2 - ph * 1.3);
      d += `${x === -4 ? 'M' : 'L'}${x} ${y.toFixed(2)}`;
    }
    return `${d}L104 130L-4 130Z`;
  };
  const circle = (cls) => { const c = document.createElementNS(NS, 'circle'); c.setAttribute('class', cls); return c; };
  function bubble(big = false) {
    const el = circle('bubble');
    bubbleG.append(el);
    s.bubbles.push({ el, x: 24 + Math.random() * 52, y: BOTTOM - 2, r: big ? 1.6 + Math.random() * 1.6 : 0.9 + Math.random() * 1.1, sp: 14 + Math.random() * 18, wob: Math.random() * 6 });
  }
  function splash(n) {
    for (let i = 0; i < n; i++) {
      const el = circle('drop');
      dropG.append(el);
      s.drops.push({ el, x: 30 + Math.random() * 40, y: s.y, vx: (Math.random() - 0.5) * 40, vy: -(40 + Math.random() * 45), r: 1.2 + Math.random() * 1.4, life: 1 });
    }
  }
  function draw() {
    const amp = 1.3 + s.slosh;
    back.setAttribute('d', wave(amp * 0.9, s.t * 2.1 + 1.7, 0.075, 0.16));
    front.setAttribute('d', wave(amp, s.t * 2.8, 0.09, 0.19));
    for (const b of s.bubbles) {
      b.el.setAttribute('cx', (b.x + Math.sin(s.t * 3 + b.wob) * 1.2).toFixed(2));
      b.el.setAttribute('cy', b.y.toFixed(2));
      b.el.setAttribute('r', b.r);
      b.el.setAttribute('opacity', Math.max(0, Math.min(1, (b.y - s.y) / 10)).toFixed(2));
    }
    for (const d of s.drops) {
      d.el.setAttribute('cx', d.x.toFixed(2)); d.el.setAttribute('cy', d.y.toFixed(2));
      d.el.setAttribute('r', d.r); d.el.setAttribute('opacity', d.life.toFixed(2));
    }
  }
  function step(now) {
    s.raf = 0;
    if (!host.isConnected) return;
    if (!svg.getClientRects().length || document.hidden) { s.last = 0; setTimeout(() => { if (!s.raf) s.raf = requestAnimationFrame(step); }, 400); return; }
    const dt = Math.min(0.05, (now - (s.last || now)) / 1000);
    s.last = now; s.t += dt;
    // Ressort : le niveau dépasse un peu sa marque, puis se pose.
    const acc = 70 * (s.target - s.y) - 7.5 * s.v;
    s.v += acc * dt; s.y += s.v * dt;
    s.slosh *= Math.exp(-1.6 * dt);
    if (s.y < BOTTOM - 3 && Math.random() < dt * 0.9) bubble();
    for (const b of s.bubbles) b.y -= b.sp * dt;
    s.bubbles = s.bubbles.filter((b) => (b.y > s.y - 1 ? true : (b.el.remove(), false)));
    for (const d of s.drops) { d.vy += 260 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.life -= dt * 1.3; }
    s.drops = s.drops.filter((d) => (d.life > 0 && d.y < s.y + 2 ? true : (d.el.remove(), false)));
    draw();
    s.raf = requestAnimationFrame(step);
  }
  return {
    set(frac, { pour = false } = {}) {
      const f = Math.max(0, Math.min(1, frac));
      s.target = BOTTOM - (BOTTOM - TOP) * f;
      if (still) { s.y = s.target; s.v = 0; draw(); return; }
      if (pour && f > 0) {
        s.slosh += 3.2;
        s.v -= 18;
        splash(4);
        for (let i = 0; i < 6; i++) setTimeout(() => bubble(true), i * 70);
      } else if (!s.raf && s.y === BOTTOM) { s.y = s.target; }
      if (!s.raf) s.raf = requestAnimationFrame(step);
    },
  };
}

// ---------- Fin de tâche : une scène par type de tâche ----------
const KIND_BY_PHOTO = {
  guenilles: 'rag', poubelles: 'trash', desinfection: 'spray', 'points-contact': 'spray',
  'aspirateur-muscu': 'vacuum', 'aspirateur-cardio': 'vacuum', 'aspirateur-gym': 'vacuum',
  tuiles: 'mop', miroirs: 'mirror', spinning: 'bike', hebdo: 'stamp', 'bureaux-patrons': 'stamp', 'bureaux-entraineurs': 'stamp',
  ouverture: 'power', inspection: 'clipboard', 'tour-general': 'clipboard', fermeture: 'lock', 'fin-quart': 'lock', rangement: 'rack',
};
export const fxKind = (it) => (it.deep ? 'sparkle' : KIND_BY_PHOTO[it.photo] || 'sparkle');

const sparks = (pts) => pts.map(([x, y, s, d], i) => `<g transform="translate(${x} ${y}) scale(${s})"><path class="spark" style="--d:${d ?? 0.55 + i * 0.07}s" d="M0-8L2-2 8 0 2 2 0 8-2 2-8 0-2-2z"/></g>`).join('');

const SCENES = {
  rag: `<rect class="pile" x="68" y="118" width="64" height="12" rx="3"/><rect class="pile p2" x="72" y="108" width="56" height="11" rx="3"/>
    <g class="rag"><rect x="40" y="38" width="120" height="66" rx="6"/><path d="M48 52h104M48 66h104M48 80h104M48 94h104"/></g>`,
  trash: `<g class="bag"><path d="M84 30q16-14 32 0l6 34H78z"/><path class="tie" d="M94 24q6-6 12 0"/></g>
    <g class="can"><path class="can-body" d="M64 70h72l-7 64H71z"/><path class="ribs" d="M86 82v42M100 82v42M114 82v42"/></g>
    <g class="lid"><rect x="58" y="62" width="84" height="9" rx="4"/><rect x="92" y="56" width="16" height="7" rx="3"/></g>`,
  spray: `<g class="bottle"><rect x="58" y="62" width="42" height="72" rx="10"/><rect x="66" y="46" width="22" height="18" rx="4"/><path class="nozzle" d="M70 46V36h34l8 6"/><path class="trigger" d="M92 50l8 14"/><rect class="label" x="66" y="84" width="26" height="28" rx="4"/></g>
    ${[[0, -22], [14, -14], [18, 0], [14, 14], [6, -26], [22, -6], [20, 10], [10, 22]].map(([dx, dy], i) => `<circle class="mist" style="--dx:${dx * 2}px;--dy:${dy * 1.6}px;--d:${0.18 + i * 0.03}s" cx="116" cy="40" r="${3 + (i % 3)}"/>`).join('')}
    ${sparks([[150, 70, 1.1], [168, 100, 0.8], [140, 112, 0.9]])}`,
  vacuum: `<rect class="floor" x="20" y="124" width="160" height="4" rx="2"/>
    ${[40, 62, 84, 106, 128, 150].map((x, i) => `<circle class="dust" style="--d:${0.12 + i * 0.1}s" cx="${x}" cy="${118 - (i % 2) * 3}" r="${3 + (i % 3)}"/>`).join('')}
    <g class="vac"><rect x="-6" y="102" width="40" height="18" rx="5"/><circle cx="2" cy="122" r="4"/><circle cx="26" cy="122" r="4"/><path class="pole" d="M14 102L-8 40"/></g>`,
  mop: `${[0, 1, 2, 3].map((i) => `<rect class="tile" x="${30 + i * 36}" y="96" width="34" height="34" rx="3"/>`).join('')}
    <rect class="streak" x="30" y="96" width="142" height="34" rx="3"/>
    <g class="mophead"><path class="pole" d="M20 94L44 24"/><rect x="2" y="92" width="38" height="12" rx="4"/><path class="strands" d="M6 104v8M14 104v9M22 104v8M30 104v9M38 104v8"/></g>
    <g class="sign"><path d="M150 50l18 36h-36z"/><path class="mark" d="M150 62v12M150 79v1"/></g>`,
  mirror: `<defs><clipPath id="fxMirror"><rect x="50" y="24" width="100" height="112" rx="8"/></clipPath></defs>
    <rect class="frame" x="46" y="20" width="108" height="120" rx="10"/><rect class="glass" x="50" y="24" width="100" height="112" rx="8"/>
    <g clip-path="url(#fxMirror)">${[[78, 60, 14], [118, 90, 11], [92, 112, 9]].map(([x, y, r], i) => `<ellipse class="smudge" style="--d:${0.15 + i * 0.12}s" cx="${x}" cy="${y}" rx="${r}" ry="${r * 0.7}"/>`).join('')}<path class="glint" d="M20 160L70 0h22L42 160z"/></g>
    ${sparks([[146, 30, 1], [56, 128, 0.7]])}`,
  sparkle: `<g class="bench"><rect x="40" y="88" width="120" height="14" rx="5"/><path d="M58 102v28M142 102v28M50 130h20M132 130h20"/><rect x="118" y="58" width="30" height="34" rx="5"/></g>
    ${[[60, 92], [96, 95], [130, 74], [70, 120], [146, 118], [110, 92]].map(([x, y], i) => `<circle class="grime" style="--d:${0.1 + i * 0.08}s" cx="${x}" cy="${y}" r="5"/>`).join('')}
    ${sparks([[56, 70, 1.2, 0.55], [100, 52, 1.5, 0.62], [150, 44, 1, 0.7], [170, 96, 0.9, 0.76], [34, 112, 0.8, 0.82]])}`,
  bike: `<g class="speed"><path d="M20 70h30M14 84h36M24 98h26"/></g>
    <g class="wheel"><circle cx="110" cy="84" r="44"/><circle class="hub" cx="110" cy="84" r="6"/><path d="M110 40v88M66 84h88M79 53l62 62M79 115l62-62"/></g>`,
  stamp: `<g class="cal"><rect x="44" y="40" width="112" height="96" rx="8"/><rect class="cal-top" x="44" y="40" width="112" height="22" rx="8"/><path class="rings" d="M70 32v16M130 32v16"/></g>
    <g class="mark"><circle cx="100" cy="100" r="22"/><path d="M89 100l8 8 15-16"/></g>
    <g class="stamper"><rect x="80" y="20" width="40" height="12" rx="4"/><rect x="94" y="-4" width="12" height="26" rx="5"/><circle cx="100" cy="-8" r="10"/></g>`,
  power: `<rect class="tv" x="36" y="34" width="128" height="80" rx="8"/><rect class="screen" x="42" y="40" width="116" height="68" rx="4"/><rect class="scan" x="42" y="72" width="116" height="4"/><path class="stand" d="M100 114v12M78 128h44"/>
    ${sparks([[168, 30, 0.9, 0.6], [30, 40, 0.7, 0.7]])}`,
  clipboard: `<rect class="board" x="54" y="26" width="92" height="116" rx="8"/><rect class="clip" x="80" y="18" width="40" height="16" rx="5"/>
    ${[56, 84, 112].map((y, i) => `<rect class="line" x="94" y="${y - 3}" width="40" height="6" rx="3"/><rect class="box" x="66" y="${y - 9}" width="18" height="18" rx="4"/><path class="tick" style="--d:${0.12 + i * 0.18}s" d="M69 ${y}l4 4 8-9"/>`).join('')}`,
  lock: `<path class="shackle" d="M78 78V56a22 22 0 0 1 44 0v22"/><rect class="body" x="64" y="76" width="72" height="58" rx="10"/><circle class="keyhole" cx="100" cy="100" r="6"/><path class="keyhole" d="M100 104v12"/>
    <path class="moon" d="M160 30a14 14 0 1 0 12 22 11 11 0 0 1-12-22z"/>${sparks([[40, 36, 0.7, 0.75], [150, 70, 0.6, 0.85]])}`,
  rack: `<rect class="rail" x="30" y="112" width="140" height="7" rx="3.5"/><path class="leg2" d="M38 118v20M162 118v20"/>
    <g class="db2"><rect x="46" y="96" width="9" height="20" rx="2.4"/><rect x="73" y="96" width="9" height="20" rx="2.4"/><rect class="bar" x="54" y="104" width="20" height="4" rx="2"/></g>
    <g class="db3"><rect x="118" y="96" width="9" height="20" rx="2.4"/><rect x="145" y="96" width="9" height="20" rx="2.4"/><rect class="bar" x="126" y="104" width="20" height="4" rx="2"/></g>
    <g class="drop"><rect x="83" y="92" width="10" height="24" rx="2.6"/><rect x="107" y="92" width="10" height="24" rx="2.6"/><rect class="bar" x="92" y="102" width="16" height="4" rx="2"/></g>`,
};

// Joue la scène par-dessus la feuille de la tâche. Résout quand c'est fini.
export function playFinish(it, host, { sound = true, still = false } = {}) {
  const kind = fxKind(it);
  if (sound) fxSound(kind);
  if (still) return Promise.resolve();
  const stage = document.createElement('div');
  stage.className = `fx-stage fx-${kind}`;
  stage.style.setProperty('--pc', `var(--plate-${it.plate || 'g'})`);
  stage.setAttribute('aria-hidden', 'true');
  stage.innerHTML = `<div class="fx-card"><svg viewBox="0 0 200 160">${SCENES[kind]}</svg><span class="fx-check"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></span></div>`;
  host.append(stage);
  return new Promise((res) => setTimeout(() => { stage.classList.add('out'); setTimeout(() => { stage.remove(); res(); }, 220); }, 1350));
}
