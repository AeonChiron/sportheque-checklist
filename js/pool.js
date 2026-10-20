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
    s.size = Math.max(84, Math.min(big ? 250 : 170, W * (big ? 0.56 : 0.38), (edges.bottom - edges.top - 40) / RATIO));
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
    // Reflets des lumières du gym qui glissent lentement sur le plancher mouillé.
    ctx.save();
    ctx.translate(W / 2 + Math.sin(t * 0.08) * W * 0.25, H / 2 + Math.cos(t * 0.06) * 40);
    ctx.rotate(-28 * Math.PI / 180);
    for (const [y, h, a] of [[-H * 0.32, 46, 1], [0, 90, 0.7], [H * 0.26, 34, 1]]) {
      const lg = ctx.createLinearGradient(-W, 0, W, 0);
      lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.5, `rgba(255,255,255,${0.16 * a})`); lg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = lg; ctx.fillRect(-W * 1.1, y, W * 2.2, h);
    }
    ctx.restore();
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
    try { root.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    if (Math.abs(x - s.x) < s.size * 0.5 && y < s.y + 10 && y > s.y - h) {
      s.drag = { id: e.pointerId, ox: x - s.x, oy: y - s.y, px: x, py: y, pt: performance.now() };
      hero.classList.add('held');
      return;
    }
    hold.on = true; hold.x = x; hold.y = y; hold.id = e.pointerId;
  }
  function move(e) {
    const [x, y] = pt(e);
    if (hold.on && e.pointerId === hold.id) { hold.x = x; hold.y = y; }
    if (!s.drag || e.pointerId !== s.drag.id) return;
    const now = performance.now(), k = Math.max(16, now - s.drag.pt);
    s.vx = ((x - s.drag.px) / k) * 1000; s.vy = ((y - s.drag.py) / k) * 1000;
    s.drag.px = x; s.drag.py = y; s.drag.pt = now;
    const b = bounds();
    s.x = Math.min(b.maxX, Math.max(b.minX, x - s.drag.ox));
    s.y = Math.min(b.maxY, Math.max(b.minY, y - s.drag.oy));
  }
  function up(e) {
    if (hold.on && e.pointerId === hold.id) hold.on = false;
    if (!s.drag || e.pointerId !== s.drag.id) return;
    s.drag = null;
    hero.classList.remove('held');
    s.vx = Math.max(-200, Math.min(200, s.vx)); s.vy = Math.max(-200, Math.min(200, s.vy));
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
