// L'écran d'accueil (connexion) : une piscine vue d'en haut, où Susie flotte
// sur sa bouée. Tout est dessiné en code : les lignes de tuiles qui ondulent,
// la lumière qui danse, les ronds dans l'eau quand on touche, et Susie qui
// dérive, se fait pousser par les vagues et qu'on peut traîner du doigt.

const TILE = 46;

export function mountPool(root) {
  const canvas = root.querySelector('canvas');
  const susie = root.querySelector('.susie-float');
  const ctx = canvas.getContext('2d');
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W = 0, H = 0, dpr = 1, raf = 0, last = 0, t = 0;
  const ripples = [];
  const s = { x: 0, y: 0, vx: 18, vy: -10, rot: 0, drag: null, size: 150, wake: 0 };

  const dark = () => document.documentElement.dataset.theme === 'dark';

  function resize() {
    const r = root.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
    s.size = Math.max(120, Math.min(190, W * 0.42));
    susie.style.width = `${s.size}px`;
    if (!s.x && W) { s.x = W * 0.58; s.y = Math.max(140 + s.size * 0.5, H * 0.36); }
    if (still) draw();
  }

  // Déplacement de l'eau en (x, y) : houle lente + les ronds qui s'étendent.
  function wave(x, y) {
    let dx = 5 * Math.sin(0.021 * y + t * 1.1) + 3 * Math.sin(0.033 * (x + y) + t * 0.7);
    let dy = 5 * Math.sin(0.019 * x - t * 0.9) + 3 * Math.sin(0.027 * (x - y) + t * 1.3);
    for (const rp of ripples) {
      const ex = x - rp.x, ey = y - rp.y;
      const d = Math.hypot(ex, ey) || 1;
      const front = d - rp.r;
      if (Math.abs(front) > 60) continue;
      const k = rp.a * Math.exp(-(front * front) / 900) * Math.sin(front * 0.18);
      dx += (ex / d) * k; dy += (ey / d) * k;
    }
    return [dx, dy];
  }

  function draw() {
    const D = dark();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // L'eau : dégradé profond, plus clair vers le haut.
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, D ? '#1b5fa3' : '#5ab4f5');
    g.addColorStop(1, D ? '#0d3a6e' : '#2f8ae6');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // Taches de lumière qui dérivent (caustiques douces).
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 5; i++) {
      const cx = W * (0.15 + 0.7 * ((Math.sin(t * 0.13 + i * 2.1) + 1) / 2));
      const cy = H * (0.1 + 0.8 * ((Math.cos(t * 0.11 + i * 1.7) + 1) / 2));
      const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, W * 0.45);
      rg.addColorStop(0, D ? 'rgba(120,190,255,.10)' : 'rgba(255,255,255,.13)');
      rg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, W, H);
    }
    ctx.globalCompositeOperation = 'source-over';
    // Les joints des tuiles, déformés par l'eau.
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const line = (pts) => {
      ctx.beginPath();
      pts.forEach(([x, y], i) => { const [dx, dy] = wave(x, y); i ? ctx.lineTo(x + dx, y + dy) : ctx.moveTo(x + dx, y + dy); });
      ctx.stroke();
    };
    for (const [w, a] of [[3.2, D ? 0.10 : 0.16], [1.4, D ? 0.30 : 0.62]]) {
      ctx.lineWidth = w;
      ctx.strokeStyle = `rgba(255,255,255,${a})`;
      for (let x = (W % TILE) / 2; x <= W + TILE; x += TILE) line(Array.from({ length: Math.ceil(H / 10) + 2 }, (_, i) => [x, i * 10 - 10]));
      for (let y = 0; y <= H + TILE; y += TILE) line(Array.from({ length: Math.ceil(W / 10) + 2 }, (_, i) => [i * 10 - 10, y]));
    }
    // Les ronds dans l'eau.
    for (const rp of ripples) {
      const life = 1 - rp.r / rp.max;
      ctx.lineWidth = 2;
      ctx.strokeStyle = `rgba(255,255,255,${0.5 * life})`;
      ctx.beginPath(); ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2); ctx.stroke();
      if (rp.r > 18) {
        ctx.strokeStyle = `rgba(255,255,255,${0.25 * life})`;
        ctx.beginPath(); ctx.arc(rp.x, rp.y, rp.r - 16, 0, Math.PI * 2); ctx.stroke();
      }
    }
    // L'ombre de Susie au fond de l'eau.
    ctx.fillStyle = D ? 'rgba(0,10,30,.35)' : 'rgba(10,50,110,.18)';
    ctx.beginPath(); ctx.ellipse(s.x + 14, s.y + s.size * 0.42, s.size * 0.42, s.size * 0.14, 0, 0, Math.PI * 2); ctx.fill();
    // Susie suit l'eau.
    susie.style.transform = `translate(${s.x - s.size / 2}px, ${s.y - s.size / 2}px) rotate(${s.rot}deg)`;
  }

  function step(now) {
    if (Math.abs(root.clientWidth - W) > 1 || Math.abs(root.clientHeight - H) > 1) resize();
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now; t += dt;
    if (!s.drag) {
      // Dérive : un courant lent qui tourne, frottement de l'eau, rebonds doux.
      s.vx += Math.cos(t * 0.31) * 6 * dt; s.vy += Math.sin(t * 0.23) * 6 * dt;
      s.vx *= 1 - 0.55 * dt; s.vy *= 1 - 0.55 * dt;
      s.x += s.vx * dt; s.y += s.vy * dt;
      const m = s.size * 0.62, top = 120 + s.size * 0.5, bottom = Math.max(top + 40, H - 330);
      if (s.x < m) { s.x = m; s.vx = Math.abs(s.vx) * 0.6; }
      if (s.x > W - m) { s.x = W - m; s.vx = -Math.abs(s.vx) * 0.6; }
      if (s.y < top) { s.y = top; s.vy = Math.abs(s.vy) * 0.6; }
      if (s.y > bottom) { s.y = bottom; s.vy = -Math.abs(s.vy) * 0.6; }
    }
    s.rot = Math.sin(t * 1.3) * 4 + s.vx * 0.05;
    // Un petit sillage quand elle bouge.
    s.wake -= dt;
    const speed = Math.hypot(s.vx, s.vy);
    if (s.wake <= 0 && speed > 25) { ripples.push({ x: s.x, y: s.y + s.size * 0.3, r: s.size * 0.32, max: s.size * 0.9, a: 2.5, v: 40 }); s.wake = 0.5; }
    for (const rp of ripples) { rp.r += rp.v * dt; rp.a *= 1 - 0.6 * dt; }
    while (ripples.length && ripples[0].r > ripples[0].max) ripples.shift();
    draw();
    raf = requestAnimationFrame(step);
  }

  // Toucher l'eau : un rond, et Susie se fait pousser par la vague.
  const pt = (e) => { const r = root.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  function down(e) {
    if (e.target.closest('button, a, .auth-sheet, .pool-ui')) return;
    const [x, y] = pt(e);
    const onSusie = Math.hypot(x - s.x, y - s.y) < s.size * 0.45;
    if (onSusie) {
      s.drag = { id: e.pointerId, ox: x - s.x, oy: y - s.y, px: x, py: y, pt: performance.now() };
      susie.classList.add('held');
      try { root.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      return;
    }
    ripples.push({ x, y, r: 4, max: 240, a: 9, v: 150 });
    const dx = s.x - x, dy = s.y - y, d = Math.hypot(dx, dy) || 1;
    const push = 9000 / Math.max(60, d);
    s.vx += (dx / d) * push * 0.6; s.vy += (dy / d) * push * 0.6;
    if (still) draw();
  }
  function move(e) {
    if (!s.drag || e.pointerId !== s.drag.id) return;
    const [x, y] = pt(e);
    const now = performance.now(), k = Math.max(16, now - s.drag.pt);
    s.vx = ((x - s.drag.px) / k) * 1000; s.vy = ((y - s.drag.py) / k) * 1000;
    s.drag.px = x; s.drag.py = y; s.drag.pt = now;
    s.x = x - s.drag.ox; s.y = y - s.drag.oy;
    if (Math.random() < 0.12) ripples.push({ x: s.x, y: s.y + s.size * 0.3, r: s.size * 0.3, max: s.size, a: 3, v: 60 });
  }
  function up(e) {
    if (!s.drag || e.pointerId !== s.drag.id) return;
    s.drag = null;
    susie.classList.remove('held');
    s.vx = Math.max(-500, Math.min(500, s.vx)); s.vy = Math.max(-500, Math.min(500, s.vy));
    ripples.push({ x: s.x, y: s.y + s.size * 0.3, r: s.size * 0.3, max: s.size * 1.4, a: 6, v: 110 });
  }
  root.addEventListener('pointerdown', down);
  root.addEventListener('pointermove', move);
  root.addEventListener('pointerup', up);
  root.addEventListener('pointercancel', up);
  window.addEventListener('resize', resize);

  return {
    start() { requestAnimationFrame(resize); if (!still && !raf) { last = 0; raf = requestAnimationFrame(step); } else requestAnimationFrame(() => { resize(); draw(); }); },
    stop() { cancelAnimationFrame(raf); raf = 0; },
  };
}
