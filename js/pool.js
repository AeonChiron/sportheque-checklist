// L'écran de connexion : un plancher de gym qui vient d'être lavé, vu d'en
// haut. Tout est dessiné en code : les joints des tuiles qui ondulent sous le
// film d'eau, les reflets des lumières qui glissent, le nom peint au sol, les
// ronds dans l'eau. Le lapin glisse quand on touche le plancher près de lui
// ou qu'on le traîne; sans geste, il reste en place et se balance doucement.

const TILE = 58;
const FOOT_X = 0.52; // ses pieds (fraction de l'image) : le pivot quand il penche
const FOOT_Y = 0.95;
const RATIO = 659 / 491;

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

  function bounds() {
    const h = s.size * RATIO, top = edges.top + h * FOOT_Y + 8;
    return { minX: s.size * FOOT_X + 6, maxX: W - s.size * (1 - FOOT_X) - 6, minY: top, maxY: Math.max(top + 10, edges.bottom - 14) };
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
    const cap = big ? Math.max(250, Math.min(620, H * 0.5)) : Math.max(170, Math.min(420, H * 0.34));
    s.size = Math.max(84, Math.min(cap, W * (big ? 0.56 : 0.38), (edges.bottom - edges.top - 40) / RATIO));
    hero.style.width = `${s.size}px`;
    hero.style.transformOrigin = `${FOOT_X * 100}% ${FOOT_Y * 100}%`;
    if (!s.touched && W > 200) { const b = bounds(); s.x = W * 0.5; s.y = (b.minY + b.maxY) / 2; }
    if (still) draw();
  }

  // Le film d'eau déforme un peu ce qu'on voit dessous.
  const wobble = (x, y) => [
    2.2 * Math.sin(y * 0.025 + t * 1.1 + x * 0.01) + 1.2 * Math.sin(y * 0.06 - t * 0.7),
    2.2 * Math.sin(x * 0.022 - t * 0.9 + y * 0.012) + 1.2 * Math.sin(x * 0.05 + t * 0.6),
  ];

  // Les rayons : position (part de l'écran), largeur, force, vitesse, phase.
  const RAYS = [
    { x: -0.34, w: 0.07, a: 0.24, sp: 0.06, ph: 0 }, { x: -0.18, w: 0.03, a: 0.34, sp: 0.09, ph: 1.7 },
    { x: -0.04, w: 0.10, a: 0.2, sp: 0.05, ph: 3.1 }, { x: 0.1, w: 0.025, a: 0.36, sp: 0.08, ph: 4.4 },
    { x: 0.22, w: 0.06, a: 0.22, sp: 0.07, ph: 2.2 }, { x: 0.38, w: 0.035, a: 0.3, sp: 0.1, ph: 5.3 },
  ];
  function draw() {
    const D = dark();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Plancher de sport bleu vif, un peu plus foncé vers le bas.
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
    // Lumière (propriétaire : « de vrais rayons », plus de profondeur, un reflet 3D).
    // 1. La source : une grande lueur douce en haut, et les bords plus sombres (profondeur).
    const R = Math.max(W, H);
    const glow = ctx.createRadialGradient(W * 0.5, -H * 0.08, 0, W * 0.5, -H * 0.08, R * 0.95);
    glow.addColorStop(0, D ? 'rgba(140,210,255,.22)' : 'rgba(200,245,255,.42)');
    glow.addColorStop(0.45, D ? 'rgba(80,160,255,.06)' : 'rgba(150,215,255,.12)');
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
    const vig = ctx.createRadialGradient(W * 0.5, H * 0.42, R * 0.25, W * 0.5, H * 0.5, R * 0.85);
    vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, D ? 'rgba(0,8,25,.55)' : 'rgba(5,35,90,.32)');
    ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);
    // 2. Les rayons : des cônes de lumière aux bords doux, qui respirent et glissent lentement.
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.translate(W * 0.5, -H * 0.12);
    ctx.rotate(-22 * Math.PI / 180);
    const L = R * 1.9;
    for (const b of RAYS) {
      const cx = R * b.x + Math.sin(t * b.sp + b.ph) * R * 0.05;
      const w0 = R * b.w * 0.35, w1 = R * b.w * (1.6 + 0.2 * Math.sin(t * 0.3 + b.ph));
      const a = b.a * (D ? 0.55 : 1) * (0.7 + 0.3 * Math.sin(t * 0.45 + b.ph * 2));
      const lg = ctx.createLinearGradient(cx - w1, 0, cx + w1, 0);
      lg.addColorStop(0, 'rgba(210,248,255,0)');
      lg.addColorStop(0.42, `rgba(200,246,255,${a * 0.55})`);
      lg.addColorStop(0.5, `rgba(235,253,255,${a})`);
      lg.addColorStop(0.58, `rgba(200,246,255,${a * 0.55})`);
      lg.addColorStop(1, 'rgba(210,248,255,0)');
      ctx.fillStyle = lg;
      ctx.beginPath(); ctx.moveTo(cx - w0, 0); ctx.lineTo(cx + w0, 0); ctx.lineTo(cx + w1, L); ctx.lineTo(cx - w1, L); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    // 3. Un reflet spéculaire passe de temps en temps sur le plancher mouillé.
    const sweep = (t * 0.06) % 1.6 - 0.3;
    if (sweep > -0.2 && sweep < 1.2) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.translate(W * sweep, H * 0.5); ctx.rotate(-28 * Math.PI / 180);
      const sg = ctx.createLinearGradient(-R * 0.12, 0, R * 0.12, 0);
      sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, `rgba(255,255,255,${D ? 0.07 : 0.13})`); sg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = sg; ctx.fillRect(-R * 0.12, -R, R * 0.24, R * 2);
      ctx.restore();
    }
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

  function step(now) {
    if (Math.abs(root.clientWidth - W) > 1 || Math.abs(root.clientHeight - H) > 1) resize();
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now; t += dt;
    const b = bounds();
    if (s.drag) {
      const a = 1 - Math.exp(-22 * dt); // suit le doigt sans à-coups
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
    const h = s.size * RATIO;
    // Seulement si on touche le lapin lui-même; ailleurs, rien ne bouge.
    if (!(Math.abs(x - s.x) < s.size * 0.55 && y < s.y + 24 && y > s.y - h - 10)) return;
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
