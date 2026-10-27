// L'écran de connexion : un plancher de gym qui vient d'être lavé, vu d'en
// haut. Tout est dessiné en code : les joints des tuiles qui ondulent sous le
// film d'eau, les reflets des lumières qui glissent, le nom peint au sol, les
// ronds dans l'eau. Le lapin glisse quand on touche le plancher près de lui
// ou qu'on le traîne; sans geste, il reste en place et se balance doucement.

const TILE = 58;
const FOOT_X = 0.52; // ses pieds (fraction de l'image) : le pivot quand il penche
const FOOT_Y = 0.95;
const RATIO = 659 / 491;
const LOOK_X = 0.56; // le milieu « visuel » du lapin (sa tête penche à droite) : c'est lui qu'on centre

export function mountPool(root) {
  const canvas = root.querySelector('canvas');
  const hero = root.querySelector('.mascot-float');
  const ctx = canvas.getContext('2d');
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W = 0, H = 0, dpr = 1, raf = 0, last = 0, t = 0, emit = 0;
  const ripples = [];
  const s = { touched: false, x: 0, y: 0, vx: 0, vy: 0, lean: 0, drag: null, size: 150, sq: 0, sqv: 0, sqAxis: 0 };
  const hold = { on: false, x: 0, y: 0 };
  const edges = { top: 96, bottom: 600 };
  const dark = () => document.documentElement.dataset.theme === 'dark';

  // Propriétaire : le lapin va partout sur l'écran (pas juste de gauche à droite).
  function bounds() {
    const h = s.size * RATIO;
    return { minX: s.size * FOOT_X + 6, maxX: W - s.size * (1 - FOOT_X) - 6, minY: h * FOOT_Y + 6, maxY: H - 8 };
  }
  // Les objets de l'écran (titre, boutons, grande carte) : s'il les touche, il rebondit.
  let obstacles = [];
  function readObstacles() {
    const r = root.getBoundingClientRect();
    const sel = '.pool-head h1, .pool-top button:not([hidden]), .pool-top .lang-switch, .pool-bottom > :not([hidden])';
    obstacles = [...(root.parentElement?.querySelectorAll(sel) || [])]
      .filter((el) => el.offsetParent && getComputedStyle(el).visibility !== 'hidden')
      .map((el) => { const b = el.getBoundingClientRect(); return { l: b.left - r.left, t: b.top - r.top, r: b.right - r.left, b: b.bottom - r.top }; })
      .filter((o) => o.r - o.l > 4 && o.b - o.t > 4);
  }
  // Sa « boîte » : un peu plus petite que l'image (les oreilles et le balai ont du vide autour).
  const body = () => { const h = s.size * RATIO; return { l: s.x - s.size * 0.38, r: s.x + s.size * 0.38, t: s.y - h * 0.97, b: s.y }; };
  // Pendant qu'on le traîne, il passe partout (sinon il « colle » aux boutons puis saute à travers).
  // Lâché par-dessus un bouton, il en glisse doucement; en glissant tout seul, il rebondit dessus.
  function collide(dt) {
    const b = bounds();
    for (const o of obstacles) {
      const m = body();
      if (m.r <= o.l || m.l >= o.r || m.b <= o.t || m.t >= o.b) continue;
      const ox = Math.min(m.r - o.l, o.r - m.l), oy = Math.min(m.b - o.t, o.b - m.t);
      // Par où sortir : le côté le plus proche qui reste dans l'écran.
      const left = (m.l + m.r) / 2 < (o.l + o.r) / 2, above = (m.t + m.b) / 2 < (o.t + o.b) / 2;
      let horiz = ox < oy;
      if (horiz && (left ? s.x - ox < b.minX : s.x + ox > b.maxX)) horiz = false;
      else if (!horiz && (above ? s.y - oy < b.minY : s.y + oy > b.maxY)) horiz = true;
      const depth = horiz ? ox : oy;
      const sp = Math.hypot(s.vx, s.vy);
      if (depth > 14 && sp < 260) {
        // Bien enfoncé (on vient de le lâcher dessus) : il en sort en glissant, sans saut.
        const k = Math.min(1, dt * 7), push = Math.max(depth * k, 1.5);
        if (horiz) { s.x += left ? -push : push; s.vx = 0; } else { s.y += above ? -push : push; s.vy = 0; }
        continue;
      }
      if (horiz) {
        s.x += left ? -ox : ox;
        s.vx = (left ? -1 : 1) * Math.max(Math.abs(s.vx) * 0.6, 40); s.sqAxis = 0;
      } else {
        s.y += above ? -oy : oy;
        s.vy = (above ? -1 : 1) * Math.max(Math.abs(s.vy) * 0.6, 40); s.sqAxis = 1;
      }
      if (sp > 120) s.sqv = -Math.min(1, sp / 900) * 0.6;
    }
  }
  function resize() {
    const r = root.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = r.width; H = r.height;
    const head = root.parentElement.querySelector('.pool-head')?.getBoundingClientRect(), foot = root.parentElement.querySelector('.pool-bottom')?.getBoundingClientRect();
    edges.top = head?.height ? head.bottom - r.top : 96;
    edges.bottom = foot?.height ? foot.top - r.top : H - 210;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
    const big = root.closest('#auth')?.classList.contains('inside'); // connecté : moins de boutons, lapin plus grand
    // Grand écran (ordinateur) : le lapin grandit avec la hauteur de l'écran (propriétaire).
    const cap = big ? Math.max(250, Math.min(500, H * 0.4)) : Math.max(170, Math.min(380, H * 0.3));
    s.size = Math.max(84, Math.min(cap, W * (big ? 0.56 : 0.38), (edges.bottom - edges.top - 40) / RATIO));
    hero.style.width = `${s.size}px`;
    hero.style.transformOrigin = `${FOOT_X * 100}% ${FOOT_Y * 100}%`;
    readObstacles();
    // Au repos : pile au milieu de l'espace libre entre le titre et le bouton.
    if (!s.touched && W > 200) { const h = s.size * RATIO; s.x = W * 0.5 + (FOOT_X - LOOK_X) * s.size; s.y = (edges.top + edges.bottom) / 2 + h * 0.45; }
    if (still) draw();
  }

  // Le film d'eau déforme un peu ce qu'on voit dessous.
  const wobble = (x, y) => [
    2.2 * Math.sin(y * 0.025 + t * 1.1 + x * 0.01) + 1.2 * Math.sin(y * 0.06 - t * 0.7),
    2.2 * Math.sin(x * 0.022 - t * 0.9 + y * 0.012) + 1.2 * Math.sin(x * 0.05 + t * 0.6),
  ];

  // ---- La lumière (propriétaire, 23 oct. : « plus beau, pas trop pâle ») ----
  // Des faisceaux qui viennent d'en haut à gauche, comme le soleil par une grande fenêtre.
  // Chaque faisceau est une texture faite une seule fois (bords très doux, fines stries de
  // lumière, fondu sur la longueur), puis dessinée en éventail. Deux couches se balancent
  // lentement, chacune à son rythme; la lumière scintille à peine, comme à travers l'eau.
  function rnd(seed) { let x = seed >>> 0; return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 4294967296); }
  function makeBeam(seed, streaks, soft) {
    const w = 128, h = 720, r = rnd(seed);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d');
    for (let y = 0; y < h; y++) {
      const f = y / h;
      const half = (0.16 + 0.84 * f) * w / 2;
      const a = Math.min(1, f / 0.05) * Math.pow(1 - f, 1.35);
      const lg = g.createLinearGradient(w / 2 - half, 0, w / 2 + half, 0);
      lg.addColorStop(0, 'rgba(255,255,255,0)');
      lg.addColorStop(soft ? 0.22 : 0.3, `rgba(255,255,255,${a * 0.28})`);
      lg.addColorStop(0.5, `rgba(255,255,255,${a})`);
      lg.addColorStop(soft ? 0.78 : 0.7, `rgba(255,255,255,${a * 0.28})`);
      lg.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = lg; g.fillRect(0, y, w, 1);
    }
    // Les stries : de fins filets plus clairs dans le faisceau (la poussière qui attrape la lumière).
    g.globalCompositeOperation = 'lighter';
    for (let k = 0; k < streaks; k++) {
      const u = (r() * 2 - 1) * 0.7, lw = 0.6 + r() * 2.2, al = 0.08 + r() * 0.16;
      const sg = g.createLinearGradient(0, 0, 0, h);
      sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.12 + r() * 0.2, `rgba(255,255,255,${al})`);
      sg.addColorStop(0.55 + r() * 0.3, `rgba(255,255,255,${al * 0.4})`); sg.addColorStop(1, 'rgba(255,255,255,0)');
      g.strokeStyle = sg; g.lineWidth = lw;
      g.beginPath(); g.moveTo(w / 2 + u * 0.16 * w / 2, 0); g.lineTo(w / 2 + u * w / 2, h); g.stroke();
    }
    return c;
  }
  // tx : où le faisceau tombe (part de la largeur), bw : sa largeur, a : sa force, layer 0 = large et doux.
  const BEAMS = [
    { tx: -0.1, bw: 0.22, a: 0.3, sp: 0.05, ph: 0.4, layer: 0 },
    { tx: 0.22, bw: 0.26, a: 0.24, sp: 0.04, ph: 2.6, layer: 0 },
    { tx: 0.58, bw: 0.22, a: 0.26, sp: 0.045, ph: 4.1, layer: 0 },
    { tx: 0.98, bw: 0.28, a: 0.2, sp: 0.035, ph: 5.6, layer: 0 },
    { tx: 0.04, bw: 0.05, a: 0.5, sp: 0.09, ph: 1.1, layer: 1 },
    { tx: 0.3, bw: 0.035, a: 0.55, sp: 0.11, ph: 3.3, layer: 1 },
    { tx: 0.44, bw: 0.075, a: 0.4, sp: 0.08, ph: 5.0, layer: 1 },
    { tx: 0.7, bw: 0.04, a: 0.5, sp: 0.1, ph: 0.2, layer: 1 },
    { tx: 0.85, bw: 0.06, a: 0.42, sp: 0.07, ph: 2.0, layer: 1 },
  ];
  let sprites = null;
  // Des grains de poussière qui flottent dans la lumière.
  const MOTES = Array.from({ length: 34 }, (_, i) => { const r = rnd(900 + i); return { x: r(), y: r(), z: 0.4 + r() * 0.6, ph: r() * 6.28, sp: 0.4 + r() * 0.8 }; });
  // Les grains de poussière : une petite image faite une fois (pas de dégradé recalculé à chaque image).
  let moteImg = null;
  function makeMote() {
    const c = document.createElement('canvas'); c.width = c.height = 32;
    const g = c.getContext('2d'), rg = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    rg.addColorStop(0, 'rgba(255,255,255,1)'); rg.addColorStop(0.35, 'rgba(255,255,255,.45)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg; g.fillRect(0, 0, 32, 32);
    return c;
  }
  function light(D) {
    if (W < 2 || H < 2) return; // pas encore mesuré
    if (!sprites) sprites = BEAMS.map((b, i) => makeBeam(77 + i * 13, b.layer ? 9 : 5, !b.layer));
    if (!moteImg) moteImg = makeMote();
    const R = Math.max(W, H);
    const Sx = -R * 0.06, Sy = -R * 0.42; // la fenêtre, loin au-dessus à gauche
    const ty = H * 0.62;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    BEAMS.forEach((b, i) => {
      const sway = Math.sin(t * b.sp + b.ph) * 0.045 + Math.sin(t * b.sp * 2.3 + b.ph * 1.7) * 0.015;
      const tx = W * (b.tx + sway) + (R - W) * 0.25 * b.tx;
      const dx = tx - Sx, dy = ty - Sy, d = Math.hypot(dx, dy);
      const breathe = 0.7 + 0.3 * (0.5 + 0.5 * Math.sin(t * (0.21 + b.sp) + b.ph * 2));
      const shimmer = 1 + 0.07 * Math.sin(t * 1.9 + b.ph * 3) * Math.sin(t * 1.3 + b.ph);
      ctx.globalAlpha = Math.min(1, b.a * breathe * shimmer * (D ? 0.6 : 1));
      const L = d * 1.75, wb = R * b.bw * (1 + 0.12 * Math.sin(t * 0.17 + b.ph)) * 1.75;
      ctx.save();
      ctx.translate(Sx, Sy); ctx.rotate(Math.atan2(-dx, dy));
      ctx.drawImage(sprites[i], -wb / 2, 0, wb, L);
      ctx.restore();
    });
    ctx.restore();
    // Les grains : plus visibles là où la lumière passe (en haut à gauche), ils montent doucement.
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (const m of MOTES) {
      const y = ((m.y - t * 0.006 * m.sp) % 1 + 1) % 1, x = m.x + Math.sin(t * 0.25 * m.sp + m.ph) * 0.015;
      const px = x * W, py = y * H;
      const near = Math.max(0, 1 - Math.hypot(px / W - 0.25, py / H - 0.3) * 1.3);
      const a = (0.1 + 0.5 * near) * (0.55 + 0.45 * Math.sin(t * m.sp * 1.7 + m.ph)) * (D ? 0.7 : 1);
      if (!(a >= 0.03)) continue;
      const rr = (0.6 + 1.5 * m.z) * 2.6;
      ctx.globalAlpha = Math.min(1, a);
      ctx.drawImage(moteImg, px - rr, py - rr, rr * 2, rr * 2);
    }
    ctx.restore();
  }
  function draw() {
    const D = dark();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Plancher de sport bleu vif (les couleurs d'origine), un peu plus foncé vers le bas.
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, D ? '#1d5f9e' : '#47a8ea');
    g.addColorStop(1, D ? '#0e365f' : '#2a80c8');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // Joints des tuiles de caoutchouc, qui ondulent sous l'eau.
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const [lw, a] of [[5, 0.14], [1.6, D ? 0.35 : 0.55]]) {
      ctx.lineWidth = lw; ctx.strokeStyle = `rgba(255,255,255,${a})`;
      ctx.beginPath();
      for (let x0 = (W % TILE) / 2; x0 <= W; x0 += TILE) for (let y = -10; y <= H + 10; y += 26) { const [ox] = wobble(x0, y); y === -10 ? ctx.moveTo(x0 + ox, y) : ctx.lineTo(x0 + ox, y); }
      for (let y0 = 0; y0 <= H; y0 += TILE) for (let x = -10; x <= W + 10; x += 26) { const [, oy] = wobble(x, y0); x === -10 ? ctx.moveTo(x, y0 + oy) : ctx.lineTo(x, y0 + oy); }
      ctx.stroke();
    }
    // Les bords un peu plus profonds (garde le bleu riche, pas délavé).
    const R = Math.max(W, H);
    const vig = ctx.createRadialGradient(W * 0.5, H * 0.42, R * 0.3, W * 0.5, H * 0.5, R * 0.9);
    vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, D ? 'rgba(0,8,25,.5)' : 'rgba(4,40,110,.26)');
    ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);
    // Un peu de chaleur près de la fenêtre (une lueur colorée, pas un voile blanc).
    const glow = ctx.createRadialGradient(W * 0.08, -H * 0.05, 0, W * 0.08, -H * 0.05, R * 0.6);
    glow.addColorStop(0, D ? 'rgba(120,200,255,.14)' : 'rgba(150,230,255,.2)'); glow.addColorStop(1, 'rgba(120,200,255,0)');
    ctx.save(); ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H); ctx.restore();
    if (!still) light(D); else { t = 3; light(D); }
    // Les ronds dans l'eau : bord fin et clair, bande plus sombre juste en dedans.
    for (const rp of ripples) {
      const life = 1.5;
      if (rp.age >= life) continue;
      const r = (14 + 70 * rp.str) * (1 - Math.exp(-rp.age * 3.2)) + 4;
      const fade = (1 - rp.age / life) * rp.str;
      const ring = (rr0, color, lw) => {
        ctx.beginPath();
        for (let k = 0; k <= 28; k++) {
          const th = (k / 28) * Math.PI * 2;
          const rr = rr0 * (1 + 0.035 * Math.sin(th * 3 + rp.seed + rp.age * 2) + 0.02 * Math.sin(th * 5 - rp.seed));
          k ? ctx.lineTo(rp.x + Math.cos(th) * rr, rp.y + Math.sin(th) * rr) : ctx.moveTo(rp.x + Math.cos(th) * rr, rp.y + Math.sin(th) * rr);
        }
        ctx.closePath(); ctx.lineWidth = lw; ctx.strokeStyle = color; ctx.stroke();
      };
      if (r > 5) ring(r - 4, `rgba(11,58,116,${fade * 0.28})`, 5);
      ring(r, `rgba(255,255,255,${fade * 0.85})`, 1.4);
    }
    // Son ombre au sol, un peu en bas à droite; la ligne mouillée autour des pieds.
    const sh = ctx.createRadialGradient(s.x + 14, s.y + 4, 0, s.x + 14, s.y + 4, s.size * 0.5);
    sh.addColorStop(0, 'rgba(6,38,79,.36)'); sh.addColorStop(1, 'rgba(6,38,79,0)');
    ctx.fillStyle = sh;
    ctx.save(); ctx.translate(s.x + 14, s.y + 4); ctx.scale(1, 0.26); ctx.translate(-(s.x + 14), -(s.y + 4));
    ctx.beginPath(); ctx.arc(s.x + 14, s.y + 4, s.size * 0.5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.ellipse(s.x, s.y, s.size * 0.36 * (1 + Math.sin(t * 3) * 0.03), 9, s.lean * 0.15 * Math.PI / 180, 0, Math.PI * 2); ctx.stroke();
    // Le lapin.
    const bob = Math.sin(t * 2.2) * 1.6;
    const sq = Math.max(-0.06, Math.min(0.06, s.sq));
    const sx = 1 + (s.sqAxis === 0 ? sq : -sq * 0.6), sy = 1 + (s.sqAxis === 1 ? sq : -sq * 0.6);
    const h = s.size * RATIO;
    hero.style.transform = `translate(${s.x - s.size * FOOT_X}px, ${s.y - h * FOOT_Y + bob}px) rotate(${s.lean + Math.sin(t * 1.4) * 1.2}deg) scale(${sx}, ${sy})`;
  }

  let obsAt = 0;
  function step(now) {
    if (Math.abs(root.clientWidth - W) > 1 || Math.abs(root.clientHeight - H) > 1) resize();
    if (now - obsAt > 600) { obsAt = now; readObstacles(); } // les boutons peuvent bouger (animation d'entrée)
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now; t += dt;
    const b = bounds();
    if (s.drag) {
      const a = 1 - Math.exp(-16 * dt); // suit le doigt en douceur, un peu « dans l'eau », sans à-coups
      const nx = s.x + (s.drag.tx - s.x) * a, ny = s.y + (s.drag.ty - s.y) * a;
      s.vx = (nx - s.x) / Math.max(dt, 1e-3); s.vy = (ny - s.y) / Math.max(dt, 1e-3);
      s.x = nx; s.y = ny;
    }
    if (!s.drag) {
      // Glisse sur l'eau : accélère doucement, puis s'arrête tout seul. Aucun déplacement sans geste.
      let ax = 0, ay = 0;
      if (hold.on) {
        const dx = hold.x - s.x, dy = hold.y - s.y, d = Math.max(1, Math.hypot(dx, dy));
        const pull = Math.min(1, d / 160) * 320; // doux : il glisse lentement vers le doigt
        ax = (dx / d) * pull; ay = (dy / d) * pull;
      }
      const drag = Math.exp(-2.8 * dt); // il s'arrête plus vite (eau plus « épaisse »)
      s.vx = (s.vx + ax * dt) * drag; s.vy = (s.vy + ay * dt) * drag;
      if (Math.abs(s.vx) < 0.5 && !ax) s.vx = 0;
      if (Math.abs(s.vy) < 0.5 && !ay) s.vy = 0;
      s.x += s.vx * dt; s.y += s.vy * dt;
      const hit = (v, axis) => { if (v > 220) { s.sqAxis = axis; s.sqv = -Math.min(1, v / 900) * 0.65; } };
      if (s.x < b.minX) { hit(Math.abs(s.vx), 0); s.x = b.minX; s.vx = Math.abs(s.vx) * 0.42; }
      if (s.x > b.maxX) { hit(Math.abs(s.vx), 0); s.x = b.maxX; s.vx = -Math.abs(s.vx) * 0.42; }
      if (s.y < b.minY) { hit(Math.abs(s.vy), 1); s.y = b.minY; s.vy = Math.abs(s.vy) * 0.42; }
      if (s.y > b.maxY) { hit(Math.abs(s.vy), 1); s.y = b.maxY; s.vy = -Math.abs(s.vy) * 0.42; }
      collide(dt);
    }
    s.sqv += (-170 * s.sq - 9 * s.sqv) * dt; s.sq += s.sqv * dt;
    const target = Math.max(-30, Math.min(30, s.vx * 0.06));
    s.lean += (target - s.lean) * Math.min(1, dt * 5);
    // Des ronds seulement quand il bouge : plus il va vite, plus il y en a.
    const speed = Math.hypot(s.vx, s.vy);
    for (const rp of ripples) rp.age += dt;
    while (ripples.length && ripples[0].age > 1.5) ripples.shift();
    if (speed > 18) {
      emit += dt * Math.min(14, speed / 45);
      while (emit >= 1) {
        emit -= 1;
        const back = 16 / Math.max(1, speed);
        ripples.push({ x: s.x - s.vx * back * 1.2 + (Math.random() - 0.5) * 10, y: s.y - s.vy * back * 1.2 + (Math.random() - 0.5) * 6, age: 0, str: Math.min(1, 0.25 + speed / 500), seed: Math.random() * 6.28 });
      }
    } else emit = 0;
    draw();
    raf = requestAnimationFrame(step);
  }

  // Le traîner, ou garder le doigt sur le plancher pour qu'il glisse vers toi.
  const pt = (e) => { const r = root.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  function down(e) {
    if (e.target.closest('button, a, .auth-sheet, .pool-ui')) return;
    const [x, y] = pt(e);
    s.touched = true;
    // Une zone généreuse autour de l'image (un doigt sur iPad est large) : on l'attrape facilement.
    const r = hero.getBoundingClientRect(), o = root.getBoundingClientRect(), pad = 36;
    const onHim = x > r.left - o.left - pad && x < r.right - o.left + pad && y > r.top - o.top - pad && y < r.bottom - o.top + pad;
    if (!onHim) {
      // Tout près sans le toucher : il glisse doucement vers le doigt (pas de saut).
      const cx = (r.left + r.right) / 2 - o.left, cy = (r.top + r.bottom) / 2 - o.top;
      if (Math.hypot(x - cx, y - cy) < Math.max(r.width, r.height) * 1.2) { Object.assign(hold, { on: true, id: e.pointerId, x, y }); try { root.setPointerCapture(e.pointerId); } catch { /* ignore */ } }
      return;
    }
    e.preventDefault(); // iPad : pas de loupe, de sélection ni de défilement pendant qu'on le tient
    try { root.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    s.drag = { id: e.pointerId, ox: x - s.x, oy: y - s.y, tx: s.x, ty: s.y, px: x, py: y, pt: performance.now(), vx: 0, vy: 0 };
    s.vx = 0; s.vy = 0;
    hero.classList.add('held');
  }
  function move(e) {
    const [x, y] = pt(e);
    if (hold.on && e.pointerId === hold.id) { hold.x = x; hold.y = y; }
    if (!s.drag || e.pointerId !== s.drag.id) return;
    const now = performance.now(), k = Math.max(8, now - s.drag.pt);
    // Vitesse lissée (pour le lancer) et cible : le lapin suit le doigt en douceur dans step().
    s.drag.vx = s.drag.vx * 0.6 + ((x - s.drag.px) / k) * 1000 * 0.4;
    s.drag.vy = s.drag.vy * 0.6 + ((y - s.drag.py) / k) * 1000 * 0.4;
    s.drag.px = x; s.drag.py = y; s.drag.pt = now;
    const b = bounds();
    s.drag.tx = Math.min(b.maxX, Math.max(b.minX, x - s.drag.ox));
    s.drag.ty = Math.min(b.maxY, Math.max(b.minY, y - s.drag.oy));
  }
  function up(e) {
    if (hold.on && e.pointerId === hold.id) hold.on = false;
    if (!s.drag || e.pointerId !== s.drag.id) return;
    const stale = performance.now() - s.drag.pt > 90; // doigt arrêté avant de lâcher : pas de lancer
    s.vx = stale ? 0 : Math.max(-520, Math.min(520, s.drag.vx));
    s.vy = stale ? 0 : Math.max(-520, Math.min(520, s.drag.vy));
    s.drag = null;
    hero.classList.remove('held');
  }
  root.addEventListener('pointerdown', down);
  // Safari iPad : sans ça, un toucher sur le plancher peut devenir un geste de la page.
  root.addEventListener('touchstart', (e) => { if (!e.target.closest('button, a, .auth-sheet')) e.preventDefault(); }, { passive: false });
  root.addEventListener('pointermove', move);
  root.addEventListener('pointerup', up);
  root.addEventListener('pointercancel', up);
  window.addEventListener('resize', resize);
  // Les boutons du bas changent de taille (prochain quart, langue) : le lapin s'ajuste.
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(() => { if (W) resize(); }) : null;
  for (const el of [root.parentElement?.querySelector('.pool-head'), root.parentElement?.querySelector('.pool-bottom')]) if (el) ro?.observe(el);

  return {
    start() { requestAnimationFrame(resize); if (!still && !raf) { last = 0; raf = requestAnimationFrame(step); } else requestAnimationFrame(() => { resize(); draw(); }); },
    stop() { cancelAnimationFrame(raf); raf = 0; },
    cheer() {
      for (let k = 0; k < 4; k++) setTimeout(() => ripples.push({ x: s.x + (Math.random() - 0.5) * 30, y: s.y + (Math.random() - 0.5) * 10, age: 0, str: 1 - k * 0.15, seed: Math.random() * 6.28 }), 380 + k * 90);
    },
  };
}
