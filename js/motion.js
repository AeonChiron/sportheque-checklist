// Petite boîte à mouvements (owner, 27 oct.) : ressorts, FLIP, bulles (physique),
// reflets d'eau (shader WebGL), carnet animé (flipbook) et avion de papier (suivre un chemin).
// Tout se tait en mode calme ou « mouvement réduit » : on saute directement à l'état final.

const calm = () => document.body.classList.contains('calm') || matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- Ressorts : une vraie physique (masse, raideur, amortissement), pas une courbe fixe ----------
const springs = new Map();
export function spring(key, from, to, onFrame, { stiffness = 320, damping = 24, mass = 1, velocity = 0 } = {}) {
  const prev = springs.get(key);
  if (prev) { cancelAnimationFrame(prev.raf); from = prev.x; velocity = prev.v; }
  if (calm() || from === to && !velocity) { springs.delete(key); onFrame(to); return; }
  const st = { x: from, v: velocity, raf: 0 };
  springs.set(key, st);
  let last = performance.now();
  const tick = (now) => {
    let dt = Math.min(0.064, (now - last) / 1000); last = now;
    // Petits pas : stable même si l'iPad saute des images.
    while (dt > 0) { const h = Math.min(dt, 1 / 120); const a = (-stiffness * (st.x - to) - damping * st.v) / mass; st.v += a * h; st.x += st.v * h; dt -= h; }
    if (Math.abs(st.x - to) < 0.001 && Math.abs(st.v) < 0.01) { onFrame(to); springs.delete(key); return; }
    onFrame(st.x);
    st.raf = requestAnimationFrame(tick);
  };
  st.raf = requestAnimationFrame(tick);
}
// Un « boing » : le bouton s'écrase un peu puis rebondit (vitesse de départ, pas d'image clé).
export function boing(el, { kick = -4.5 } = {}) {
  if (!el) return;
  spring(el, 1, 1, (s) => { el.style.scale = s.toFixed(4); if (s === 1) el.style.scale = ''; }, { stiffness: 520, damping: 16, velocity: kick });
}

// ---------- FLIP : les cartes glissent vers leur nouvelle place au lieu de sauter ----------
export function flip(root, selector, mutate, key = (el) => el.dataset.fk) {
  if (!root || calm()) { mutate(); return; }
  const before = new Map();
  for (const el of root.querySelectorAll(selector)) { const k = key(el); if (k) before.set(k, el.getBoundingClientRect()); }
  mutate();
  let i = 0;
  for (const el of root.querySelectorAll(selector)) {
    const k = key(el), r0 = k && before.get(k);
    if (r0) {
      const r1 = el.getBoundingClientRect(), dx = r0.left - r1.left, dy = r0.top - r1.top;
      if (Math.abs(dx) + Math.abs(dy) < 1) continue;
      el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 380, easing: 'cubic-bezier(.2, .9, .25, 1.05)' });
    } else {
      el.animate([{ opacity: 0, transform: 'translateY(10px) scale(.97)' }, { opacity: 1, transform: 'none' }], { duration: 320, delay: Math.min(i++, 8) * 35, easing: 'cubic-bezier(.2, .8, .2, 1)', fill: 'backwards' });
    }
  }
}

// ---------- Bulles de savon : de la physique (poussée vers le haut, frottement, oscillation) ----------
let bub = null;
function bubbleLayer() {
  if (bub) return bub;
  const c = document.createElement('canvas');
  c.className = 'fx-bubbles'; c.setAttribute('aria-hidden', 'true');
  document.body.append(c);
  bub = { c, ctx: c.getContext('2d'), list: [], raf: 0, last: 0 };
  return bub;
}
export function bubbles(x, y, n = 9) {
  if (calm()) return;
  const L = bubbleLayer();
  const dpr = Math.min(2, devicePixelRatio || 1);
  if (L.c.width !== innerWidth * dpr || L.c.height !== innerHeight * dpr) { L.c.width = innerWidth * dpr; L.c.height = innerHeight * dpr; }
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
    const sp = 60 + Math.random() * 120;
    L.list.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 3 + Math.random() * 7, age: 0, life: 0.9 + Math.random() * 0.9, ph: Math.random() * 6.28, pop: 0 });
  }
  if (!L.raf) { L.last = performance.now(); L.raf = requestAnimationFrame(stepBubbles); }
}
function stepBubbles(now) {
  const L = bub, dt = Math.min(0.05, (now - L.last) / 1000), dpr = L.c.width / innerWidth;
  L.last = now;
  const g = L.ctx;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, innerWidth, innerHeight);
  L.list = L.list.filter((p) => p.age < p.life + 0.18);
  for (const p of L.list) {
    p.age += dt;
    const buoy = -140 * (p.r / 10); // les grosses bulles montent plus vite
    p.vy += buoy * dt; p.vx *= Math.exp(-2.2 * dt); p.vy *= Math.exp(-1.6 * dt);
    p.x += (p.vx + Math.sin(p.age * 7 + p.ph) * 22) * dt; p.y += p.vy * dt;
    const popping = p.age > p.life;
    const k = popping ? (p.age - p.life) / 0.18 : Math.min(1, p.age / 0.12);
    const r = popping ? p.r * (1 + k * 0.8) : p.r * k;
    g.globalAlpha = popping ? 1 - k : 0.9;
    g.lineWidth = popping ? 1 : 1.4;
    g.strokeStyle = 'rgba(70, 150, 200, .75)';
    g.fillStyle = popping ? 'transparent' : 'rgba(190, 235, 255, .22)';
    g.beginPath(); g.arc(p.x, p.y, Math.max(0.5, r), 0, Math.PI * 2);
    if (!popping) g.fill();
    g.stroke();
    if (!popping) { g.fillStyle = 'rgba(255, 255, 255, .85)'; g.beginPath(); g.arc(p.x - r * 0.35, p.y - r * 0.35, r * 0.22, 0, Math.PI * 2); g.fill(); }
  }
  g.globalAlpha = 1;
  L.raf = L.list.length ? requestAnimationFrame(stepBubbles) : 0;
  if (!L.raf) g.clearRect(0, 0, innerWidth, innerHeight);
}

// ---------- Reflets d'eau : un petit shader WebGL (des caustiques comme au fond d'une piscine) ----------
const FRAG = `precision mediump float;
uniform vec2 u_res; uniform float u_t;
void main() {
  vec2 uv = gl_FragCoord.xy / u_res.y * 3.2;
  vec2 p = uv; float c = 0.0;
  for (int i = 1; i < 5; i++) {
    float fi = float(i);
    p += vec2(sin(p.y * 1.3 + u_t * 0.35 * fi) / fi, cos(p.x * 1.1 - u_t * 0.3 * fi) / fi);
    c += abs(sin(p.x + p.y)) ;
  }
  c = pow(1.0 - clamp(c / 4.0, 0.0, 1.0), 3.0) * 2.4;
  gl_FragColor = vec4(vec3(1.0), clamp(c, 0.0, 1.0) * 0.55);
}`;
export function mountCaustics(host) {
  if (!host || host.querySelector('.fx-caustics')) return;
  const cv = document.createElement('canvas');
  cv.className = 'fx-caustics'; cv.setAttribute('aria-hidden', 'true');
  const gl = cv.getContext('webgl', { premultipliedAlpha: false, alpha: true, antialias: false, powerPreference: 'low-power' });
  if (!gl) return; // vieux appareil : la carte reste telle quelle
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const pr = gl.createProgram();
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}'));
  gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return;
  gl.useProgram(pr);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  const uRes = gl.getUniformLocation(pr, 'u_res'), uT = gl.getUniformLocation(pr, 'u_t');
  host.prepend(cv);
  let raf = 0, last = 0, seen = true;
  const t0 = performance.now() - Math.random() * 20000;
  const draw = (now) => {
    raf = 0;
    if (!cv.isConnected) return;
    const w = Math.max(1, Math.round(cv.clientWidth / 2)), h = Math.max(1, Math.round(cv.clientHeight / 2)); // demi-résolution : léger
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; gl.viewport(0, 0, w, h); }
    gl.uniform2f(uRes, w, h); gl.uniform1f(uT, (now - t0) / 1000);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    if (!calm() && seen && !document.hidden) raf = requestAnimationFrame((n) => (n - last < 33 ? (raf = requestAnimationFrame(draw)) : ((last = n), draw(n)))); // ~30 images/s
  };
  new IntersectionObserver(([e]) => { seen = e.isIntersecting; if (seen && !raf) raf = requestAnimationFrame(draw); }).observe(cv);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && !raf && cv.isConnected) raf = requestAnimationFrame(draw); });
  raf = requestAnimationFrame(draw);
}

// ---------- Carnet animé (flipbook) : la carte de pointage, 6 images jouées une fois ----------
const PUNCH_FRAMES = 6;
function punchSprite() {
  const W = 64, H = 64;
  const frame = (i) => {
    const cardY = [-30, -14, 4, 4, 4, -26][i]; // la carte descend dans l'horloge, puis ressort poinçonnée
    const stamped = i >= 3;
    const hand = [0, 30, 60, 150, 240, 330][i];
    return `<g transform="translate(${i * W} 0)">
      <rect x="10" y="30" width="44" height="28" rx="6" fill="#ffd25a" stroke="#3a2400" stroke-width="2.5"/>
      <circle cx="32" cy="44" r="8" fill="#fff" stroke="#3a2400" stroke-width="2"/>
      <path d="M32 44 L32 38" stroke="#3a2400" stroke-width="2" stroke-linecap="round" transform="rotate(${hand} 32 44)"/>
      <g transform="translate(0 ${cardY})"><rect x="20" y="10" width="24" height="26" rx="3" fill="#fff" stroke="#3a2400" stroke-width="2"/>
      <path d="M24 18h16M24 23h10" stroke="#b9b6ad" stroke-width="2" stroke-linecap="round"/>
      ${stamped ? '<path d="M25 29l4 4 9-9" fill="none" stroke="#1f8a4c" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' : ''}</g>
      ${i === 3 ? '<path d="M8 22l5 4M56 22l-5 4M32 6v6" stroke="#f39a2c" stroke-width="2.5" stroke-linecap="round"/>' : ''}
    </g>`;
  };
  return `<svg viewBox="0 0 ${W * PUNCH_FRAMES} ${H}" width="${PUNCH_FRAMES * 100}%" height="100%">${Array.from({ length: PUNCH_FRAMES }, (_, i) => frame(i)).join('')}</svg>`;
}
export function flipbookPunch(host) {
  if (!host || calm()) return;
  const el = document.createElement('span');
  el.className = 'fx-flipbook'; el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `<span class="fb-strip" style="--frames:${PUNCH_FRAMES}">${punchSprite()}</span>`;
  host.append(el);
  setTimeout(() => el.remove(), 1100);
}

// ---------- Avion de papier : il suit une courbe (offset-path) quand le rapport part ----------
export function paperPlane(from) {
  if (calm() || !CSS.supports('offset-path', 'path("M0 0L1 1")')) return;
  const r = from?.getBoundingClientRect() || { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
  const x0 = r.left + r.width / 2, y0 = r.top + r.height / 2;
  const w = innerWidth, h = innerHeight;
  const el = document.createElement('span');
  el.className = 'fx-plane'; el.setAttribute('aria-hidden', 'true');
  el.innerHTML = '<svg viewBox="0 0 24 24"><path d="M2 11l19-8-6 18-4-7z" fill="#fff" stroke="#1f5cc4" stroke-width="1.6" stroke-linejoin="round"/><path d="M11 14l10-11" stroke="#1f5cc4" stroke-width="1.4"/></svg>';
  el.style.offsetPath = `path("M ${x0} ${y0} C ${x0 - w * 0.35} ${y0 - h * 0.1}, ${x0 - w * 0.2} ${y0 - h * 0.55}, ${x0 + w * 0.05} ${y0 - h * 0.35} S ${x0 + w * 0.45} ${y0 - h * 0.25}, ${w + 60} ${h * 0.08}")`;
  document.body.append(el);
  el.animate([{ offsetDistance: '0%', opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, offset: 0.12 }, { opacity: 1, offset: 0.85 }, { offsetDistance: '100%', opacity: 0, scale: 0.8 }], { duration: 1900, easing: 'cubic-bezier(.45, .05, .35, 1)' }).finished.then(() => el.remove(), () => el.remove());
}
