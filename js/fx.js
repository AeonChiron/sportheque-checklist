// Effets : le verre d'eau (progrès du quart), les animations de fin
// de tâche (une par type de tâche) et leurs sons, synthétisés sur place
// (WebAudio, aucun fichier son). Tout part en silence si les sons sont coupés.

// ---------- Sons ----------
// Propriétaire : « des sons variés, haut de gamme, très satisfaisants ». Dix sons
// signature, tous synthétisés ici (aucun fichier), chacun avec son propre caractère :
//   tap       toucher d'interface : un petit « toc » de bois arrondi
//   step      étape cochée : une note de kalimba qui monte à chaque étape
//   check     tâche faite : maillet de marimba + quinte + scintillement (monte avec le progrès)
//   uncheck   tâche décochée / annulée : deux notes de marimba qui redescendent, feutrées
//   notify    petit message (toast) : une bulle qui « pop » et un tintement aérien
//   save      enregistré : un accord de piano électrique chaleureux
//   swish     une feuille s'ouvre / se ferme : un souffle d'air
//   error     pas possible : un double « bonk » doux, jamais agressif
//   flag      signalement envoyé : papier qui part + « ping » de cloche
//   urgent    signalement urgent : deux cloches claires qui appellent
//   celebrate fin du quart : un accord qui s'épanouit, une pluie d'étincelles
// Une seule chaîne de son : filtre des graves, compresseur doux, réverbération de pièce
// stéréo, et une limite finale pour que rien ne sature.
let ac = null;
let master = null;
let verbIn = null;
let lastAt = 0;
let stepN = 0;
let stepAt = 0;
const AC = () => window.AudioContext || window.webkitAudioContext;
function A() {
  if (!ac) {
    ac = new (AC())({ latencyHint: 'interactive' });
    const hp = ac.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 60;
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 10; comp.ratio.value = 2.6; comp.attack.value = 0.002; comp.release.value = 0.16;
    const lim = ac.createDynamicsCompressor();
    lim.threshold.value = -2; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.001; lim.release.value = 0.06;
    master = ac.createGain(); master.gain.value = 0.9;
    master.connect(hp).connect(comp).connect(lim).connect(ac.destination);
    // Réverbération : une pièce douce, stéréo, qui s'assombrit en s'éteignant.
    const len = Math.floor(ac.sampleRate * 2.6);
    const ir = ac.createBuffer(2, len, ac.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const k = i / len;
        const a = 0.35 + 0.6 * k; // de plus en plus sombre
        lp = lp * a + (Math.random() * 2 - 1) * (1 - a);
        d[i] = lp * (1 - k) ** 2.2 * 2.2;
      }
    }
    const pre = ac.createDelay(0.1); pre.delayTime.value = 0.022;
    const conv = ac.createConvolver(); conv.buffer = ir;
    const wet = ac.createGain(); wet.gain.value = 0.5;
    verbIn = ac.createGain();
    verbIn.connect(pre).connect(conv).connect(wet).connect(hp);
  }
  if (ac.state !== 'running') ac.resume().catch(() => {});
  return ac;
}
// iPhone : après un verrouillage ou un autre app, le son peut rester « interrompu » et ne
// plus repartir. Au prochain toucher, s'il ne repart pas, on le reconstruit au complet.
function revive() {
  if (!ac || ac.state === 'running') return;
  const old = ac;
  ac.resume().catch(() => {});
  setTimeout(() => {
    if (ac !== old || old.state === 'running') return;
    try { old.close(); } catch { /* ignore */ }
    ac = null; master = null; verbIn = null; // le prochain son recrée tout
    unlock();
  }, 250);
}
// iPhone : le son ne part qu'après un vrai toucher. Au premier toucher (et au retour
// dans l'app), on réveille le son avec un silence d'un instant.
function unlock() {
  try {
    const c = A();
    const b = c.createBuffer(1, 1, c.sampleRate), src = c.createBufferSource();
    src.buffer = b; src.connect(c.destination); src.start(0);
  } catch { /* pas de son ici */ }
}
if (typeof window !== 'undefined') {
  for (const ev of ['pointerdown', 'touchend', 'keydown']) addEventListener(ev, () => { revive(); unlock(); }, { passive: true, capture: true });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) revive(); });
  addEventListener('pageshow', revive);
}
// Une voix : gain → panoramique → sortie + envoi vers la réverbération.
function voice(t0, { pan = 0, verb = 0.25 } = {}) {
  const c = A();
  const g = c.createGain();
  g.gain.setValueAtTime(0, t0);
  const p = c.createStereoPanner ? c.createStereoPanner() : null;
  if (p) { p.pan.value = Math.max(-1, Math.min(1, pan)); g.connect(p).connect(master); } else g.connect(master);
  if (verb) { const s = c.createGain(); s.gain.value = verb; g.connect(s).connect(verbIn); }
  return g;
}
// Enveloppe naturelle : attaque rapide, déclin exponentiel.
function env(g, t0, peak, attack, decay) {
  // Fondu d'entrée (jamais sec) et fondu de sortie long, qui se fond dans la réverbération.
  const a = Math.max(attack, 0.008);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(peak, t0 + a);
  g.gain.setTargetAtTime(0.0001, t0 + a, decay / 3.6);
}
function sine(f, t0, dur, out, { type = 'sine', bend = 0 } = {}) {
  const o = A().createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f * (1 + bend), t0);
  if (bend) o.frequency.exponentialRampToValueAtTime(f, t0 + 0.03);
  o.connect(out); o.start(t0); o.stop(t0 + dur + 0.1);
  return o;
}
function partial(f, t0, dur, gain, opts = {}) {
  const g = voice(t0, opts);
  env(g, t0, gain, opts.attack ?? 0.003, dur);
  sine(f, t0, dur, g, opts);
}
function burst(t0, dur, gain, { type = 'bandpass', f0 = 2000, f1 = f0, q = 1, pan = 0, verb = 0.1, attack = 0.002 } = {}) {
  const c = A();
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource(), f = c.createBiquadFilter();
  src.buffer = buf; f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(f0, t0);
  if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
  const g = voice(t0, { pan, verb });
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(gain, t0 + Math.max(attack, 0.004));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g); src.start(t0);
}
// ---- Instruments ----
// Marimba : la note, ses partiels de lame (×3,93 et ×9,2) qui s'éteignent vite, et le coup du maillet.
function marimba(f, t0, { gain = 0.25, dur = 1, pan = 0, verb = 0.28, bright = 1 } = {}) {
  partial(f, t0, dur, gain, { pan, verb, bend: 0.004 });
  partial(f * 3.93, t0, dur * 0.28, gain * 0.22 * bright, { pan, verb });
  partial(f * 9.2, t0, dur * 0.09, gain * 0.07 * bright, { pan, verb: 0 });
  burst(t0, 0.012, gain * 0.35 * bright, { f0: f * 4, q: 2, pan, verb: 0 });
}
// Cloche FM : un modulateur au rapport inharmonique donne l'éclat, qui s'adoucit en tenant.
function bell(f, t0, { gain = 0.12, dur = 1.4, ratio = 3.5, index = 2.2, pan = 0, verb = 0.45 } = {}) {
  const c = A();
  const g = voice(t0, { pan, verb });
  env(g, t0, gain, 0.004, dur);
  const car = sine(f, t0, dur, g);
  const mod = c.createOscillator(), mg = c.createGain();
  mod.frequency.value = f * ratio;
  mg.gain.setValueAtTime(f * index, t0);
  mg.gain.setTargetAtTime(f * index * 0.08, t0, dur / 6);
  mod.connect(mg).connect(car.frequency);
  mod.start(t0); mod.stop(t0 + dur + 0.1);
}
// Piano électrique : deux porteuses à peine désaccordées (chorus), une « dent » brillante au début.
function epiano(f, t0, { gain = 0.14, dur = 1.6, pan = 0, verb = 0.35 } = {}) {
  for (const [det, p] of [[-0.0018, pan - 0.25], [0.0018, pan + 0.25]]) {
    const c = A();
    const g = voice(t0, { pan: p, verb });
    env(g, t0, gain * 0.6, 0.006, dur);
    const car = sine(f * (1 + det), t0, dur, g);
    const mod = c.createOscillator(), mg = c.createGain();
    mod.frequency.value = f;
    mg.gain.setValueAtTime(f * 1.3, t0);
    mg.gain.setTargetAtTime(f * 0.15, t0, dur / 8);
    mod.connect(mg).connect(car.frequency);
    mod.start(t0); mod.stop(t0 + dur + 0.1);
  }
  partial(f * 7.02, t0, 0.12, gain * 0.1, { pan, verb: 0.1 }); // la dent
}
// Kalimba : la lame pincée, un partiel aigu (×5,95) très court, un léger pincement de hauteur.
function kalimba(f, t0, { gain = 0.16, dur = 0.7, pan = 0, verb = 0.3 } = {}) {
  partial(f, t0, dur, gain, { pan, verb, bend: 0.012 });
  partial(f * 5.95, t0, dur * 0.12, gain * 0.25, { pan, verb: 0.1 });
}
// Un corps de bois : une note grave qui tombe vite (le « toc » sous les touchers).
function thump(f, t0, gain = 0.2, dur = 0.12) {
  const g = voice(t0, { verb: 0.04 });
  env(g, t0, gain, 0.002, dur);
  const o = A().createOscillator();
  o.frequency.setValueAtTime(f * 2.2, t0);
  o.frequency.exponentialRampToValueAtTime(f, t0 + 0.035);
  o.connect(g); o.start(t0); o.stop(t0 + dur + 0.1);
}
// La gamme : pentatonique de mi majeur (toutes les notes sonnent bien ensemble).
const PENTA = [329.63, 369.99, 415.3, 493.88, 554.37, 659.25, 739.99, 830.61, 987.77, 1108.73, 1318.51, 1479.98, 1661.22, 1975.53, 2217.46, 2637.02];
const r = (x) => x * (1 + (Math.random() - 0.5) * 0.008); // un rien d'humain d'une fois à l'autre
// Le chef d'orchestre (propriétaire : « une progression mélodique très satisfaisante ») :
// tous les sons suivent une même suite d'accords, Mi maj9 → Do#m9 → La maj9 → Si6/9.
// Chaque toucher prend la note suivante de l'accord en montant; l'accord change toutes
// les quatre notes. Après 4 s de calme, la phrase recommence au début.
const PROG = [
  [164.81, 246.94, 311.13, 369.99, 415.3],   // Mi maj9
  [138.59, 207.65, 246.94, 311.13, 329.63],  // Do#m9
  [110, 164.81, 207.65, 246.94, 277.18],     // La maj9
  [123.47, 185, 207.65, 277.18, 311.13],     // Si 6/9
];
const song = { step: 0, at: 0 };
function nextNote() {
  const now = performance.now();
  if (now - song.at > 4000) song.step = 0;
  song.at = now;
  const i = song.step++;
  const chord = PROG[Math.floor(i / 4) % PROG.length];
  const k = i % 4; // 4 notes qui montent dans l'accord
  return { chord, f: chord[1 + k], bass: chord[0] };
}

const SOUNDS = {
  // Toucher : une note de kalimba de l'accord du moment, deux octaves plus haut (jamais la même deux fois de suite).
  tap(t) {
    const { f } = nextNote();
    kalimba(f * 4, t, { gain: 0.13, dur: 0.6, pan: (Math.random() - 0.5) * 0.5, verb: 0.55 });
  },
  // Ouvrir (une tâche, une feuille) : une cloche de verre douce + sa quinte, qui monte en fondu.
  open(t) {
    const { f } = nextNote();
    bell(f * 4, t, { gain: 0.07, dur: 1.4, ratio: 2, index: 0.9, pan: -0.15, verb: 0.65 });
    bell(f * 6, t + 0.05, { gain: 0.035, dur: 1.2, ratio: 2, index: 0.6, pan: 0.2, verb: 0.75 });
  },
  close(t) {
    const { f } = nextNote();
    bell(f * 2, t, { gain: 0.05, dur: 0.9, ratio: 2, index: 0.5, verb: 0.6 });
  },
  step(t) {
    const { f } = nextNote();
    kalimba(f * 4, t, { gain: 0.24, dur: 0.9, pan: -0.15 + (song.step % 3) * 0.15, verb: 0.55 });
    kalimba(f * 6, t + 0.04, { gain: 0.06, dur: 0.7, pan: 0.3, verb: 0.7 });
  },
  check(t, { level = 0.5 } = {}) {
    // Le maillet de bois, la note de l'accord, sa quinte, puis une cloche qui scintille.
    // Plus le quart avance, plus le registre monte.
    const { f, bass } = nextNote();
    const up = level > 0.66 ? 4 : level > 0.33 ? 3 : 2;
    thump(bass, t, 0.26, 0.2);
    marimba(f * up, t, { gain: 0.28, dur: 1.4, pan: -0.12, verb: 0.45 });
    marimba(f * up * 1.5, t + 0.08, { gain: 0.22, dur: 1.6, pan: 0.14, verb: 0.5 });
    bell(f * up * 3, t + 0.17, { gain: 0.035, dur: 1.8, ratio: 3.5, index: 1.2, pan: 0.3, verb: 0.8 });
  },
  uncheck(t) {
    const { f } = nextNote();
    marimba(f * 3, t, { gain: 0.15, dur: 0.7, bright: 0.35, pan: 0.1, verb: 0.5 });
    marimba(f * 2, t + 0.09, { gain: 0.14, dur: 0.9, bright: 0.3, pan: -0.1, verb: 0.5 });
  },
  notify(t) {
    const { f } = nextNote();
    const c = A(), g = voice(t, { verb: 0.35 });
    env(g, t, 0.32, 0.01, 0.12);
    const o = c.createOscillator();
    o.frequency.setValueAtTime(f * 1.5, t);
    o.frequency.exponentialRampToValueAtTime(f * 4, t + 0.06);
    o.connect(g); o.start(t); o.stop(t + 0.3);
    bell(f * 6, t + 0.05, { gain: 0.08, dur: 1.3, ratio: 3.5, index: 1.4, pan: 0.2, verb: 0.7 });
  },
  save(t) {
    const { chord } = nextNote();
    epiano(chord[1] * 2, t, { gain: 0.15, dur: 1.8, pan: -0.2, verb: 0.5 });
    epiano(chord[2] * 2, t + 0.09, { gain: 0.14, dur: 1.9, verb: 0.5 });
    epiano(chord[4] * 2, t + 0.18, { gain: 0.13, dur: 2.2, pan: 0.2, verb: 0.55 });
  },
  swish(t, { down = false } = {}) { (down ? SOUNDS.close : SOUNDS.open)(t); },
  error(t) {
    for (const [at, f] of [[0, 196], [0.15, 165]]) {
      const c = A(), g = voice(t + at, { verb: 0.3 });
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
      env(g, t + at, 0.22, 0.01, 0.22);
      const o = c.createOscillator(); o.type = 'triangle';
      o.frequency.setValueAtTime(f * 1.15, t + at);
      o.frequency.exponentialRampToValueAtTime(f, t + at + 0.04);
      o.connect(lp).connect(g); o.start(t + at); o.stop(t + at + 0.5);
    }
  },
  flag(t) {
    burst(t, 0.26, 0.08, { f0: 700, f1: 3800, q: 0.8, verb: 0.35, attack: 0.08, pan: -0.3 });
    SOUNDS.notify(t + 0.17);
    bell(PENTA[13], t + 0.26, { gain: 0.07, dur: 1.6, ratio: 3.5, index: 2, pan: 0.35, verb: 0.75 });
  },
  urgent(t) {
    thump(90, t, 0.25, 0.25);
    bell(PENTA[10], t, { gain: 0.2, dur: 1.8, ratio: 1.4, index: 3, pan: -0.15, verb: 0.6 });
    bell(PENTA[8], t + 0.26, { gain: 0.2, dur: 2.2, ratio: 1.4, index: 3, pan: 0.15, verb: 0.6 });
  },
  celebrate(t) {
    // Une basse qui gonfle, l'accord de Mi maj9 qui s'égrène, puis une pluie d'étincelles.
    const g = voice(t, { verb: 0.3 });
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.12, t + 0.3);
    g.gain.setTargetAtTime(0.0001, t + 0.45, 0.55);
    sine(82.41, t, 2.5, g);
    [164.81, 246.94, 329.63, 415.3, 493.88, 622.25].forEach((f, i) => epiano(f, t + i * 0.045, { gain: 0.1, dur: 3, pan: -0.4 + i * 0.16, verb: 0.6 }));
    [PENTA[9], PENTA[10], PENTA[11], PENTA[12], PENTA[13], PENTA[14], PENTA[15]].forEach((f, i) => kalimba(f, t + 0.32 + i * 0.07, { gain: 0.07, dur: 1, pan: i % 2 ? 0.45 : -0.45, verb: 0.75 }));
    bell(PENTA[15], t + 0.85, { gain: 0.05, dur: 2.6, ratio: 3.5, index: 1.2, verb: 0.85 });
    song.step = 0;
  },
};
// Les anciens noms (et les scènes de fin de tâche) passent par les dix sons.
const ALIAS = {
  tick: 'step', tab: 'tap', toggle: 'tap', locked: 'error',
  punch: 'check', ready: 'notify', welcome: 'celebrate', sent: 'celebrate', pour: 'check', full: 'celebrate',
};
export function fxSound(name, opts = {}) {
  const key = ALIAS[name] || name;
  const fn = SOUNDS[key];
  if (!fn) return; // les scènes de tâche : le son « check » part déjà quand la tâche se coche
  try {
    const c = A();
    const now = performance.now();
    if (key === 'notify' && now - lastAt < 350) return; // un message qui suit un autre son : pas de doublon
    lastAt = now;
    fn(c.currentTime + 0.01, { ...opts, level: name === 'punch' ? 0.2 : opts.level });
  } catch { /* pas de son ici : tant pis */ }
}
// Pour écouter hors ligne (tests) : un son à un moment précis.
export function fxSoundAt(name, at, opts = {}) {
  const fn = SOUNDS[ALIAS[name] || name];
  if (fn) fn(A().currentTime + at, opts);
}
// Chaque toucher de bouton a son son (propriétaire) : si le bouton n'a pas déjà joué
// son propre son, le « tap » mélodique part juste après.
export function clickTap() {
  const t0 = performance.now();
  setTimeout(() => { if (lastAt < t0) fxSound('tap'); }, 0);
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
