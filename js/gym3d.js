// Vue 3D du 2e étage, bâtie avec les mêmes mesures que le plan (unités du
// plan : 360 × 280). Three.js est hébergé sur le site (vendor/) et chargé
// seulement quand on ouvre la vue 3D. On fait tourner en glissant, on zoome
// en pinçant (ou à la molette), on touche une zone pour la voir.

import * as THREE from '../vendor/three.module.min.js';

const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#888';
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const dark = () => {
  const forced = document.documentElement.dataset.theme;
  return forced ? forced === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
};

// Une étiquette (texte sur une texture), à plat au sol ou face à la caméra.
function labelTexture(lines, { bg, fg, pad = 18, size = 44 }) {
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  const font = (w, s) => `${w} ${s}px "Barlow Condensed", "Arial Narrow", sans-serif`;
  ctx.font = font(700, size);
  const widths = lines.map((l, i) => { ctx.font = font(i ? 600 : 700, i ? size * 0.62 : size); return ctx.measureText(l.text).width; });
  const w = Math.ceil(Math.max(...widths) + pad * 2);
  const h = Math.ceil(size * 1.25 + (lines.length - 1) * size * 0.8 + pad);
  c.width = w * 2; c.height = h * 2;
  ctx.scale(2, 2);
  if (bg) {
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, 12);
    ctx.fill();
  }
  lines.forEach((l, i) => {
    ctx.font = font(i ? 600 : 700, i ? size * 0.62 : size);
    ctx.fillStyle = l.color || fg;
    ctx.textBaseline = 'top';
    ctx.fillText(l.text, pad, pad * 0.55 + (i ? size * 1.05 + (i - 1) * size * 0.8 : 0));
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return { tex, w, h };
}

export function mountGym3D(host, { highlight = null, selected = null, tags = {}, labels, onPick }) {
  const D = dark();
  const C = {
    bg: css('--surface'),
    base: D ? '#121819' : '#e8ecec',
    wood: D ? '#4a3c2a' : '#e7d3b0',
    rubber: D ? '#151b1d' : '#cfd6d6',
    room: D ? '#1a2224' : '#f4f7f7',
    wall: D ? '#2b3638' : '#ffffff',
    wallTop: D ? '#45c9c4' : '#2d3131',
    metal: D ? '#56656a' : '#dfe5e6',
    dark: D ? '#0b0f10' : '#2b3434',
    accent: css('--accent'),
    mat: D ? '#174443' : '#bfe8e6',
    zA: css('--zA-strong'), zB: css('--zB-strong'), zC: css('--zC-strong'),
  };

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = D ? 1.15 : 1.05;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const root = new THREE.Group();
  root.position.set(-180, 0, -140); // centre du plan à l'origine
  scene.add(root);

  // Lumières : ciel doux + une lampe qui fait les ombres, comme les plafonniers.
  scene.add(new THREE.HemisphereLight(D ? '#9fdcda' : '#ffffff', D ? '#0a0f10' : '#b9c4c4', D ? 1.4 : 1.9));
  const sun = new THREE.DirectionalLight('#ffffff', D ? 1.6 : 1.9);
  sun.position.set(-120, 260, 140);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -220, right: 220, top: 200, bottom: -200, near: 10, far: 700 });
  sun.shadow.bias = -0.0006;
  scene.add(sun);
  if (D) {
    const glow = new THREE.PointLight(C.accent, 900, 260, 1.6);
    glow.position.set(0, 60, 0);
    scene.add(glow);
  }

  const mats = new Map();
  const mat = (color, extra = {}) => {
    const k = `${color}|${JSON.stringify(extra)}`;
    if (!mats.has(k)) mats.set(k, new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0.05, ...extra }));
    return mats.get(k);
  };
  const geo = new THREE.BoxGeometry(1, 1, 1);
  // Boîte posée au sol : x, z = coin du plan; w, d = taille; h = hauteur; y = élévation.
  const box = (x, z, w, d, h, color, { y = 0, shadow = true, extra } = {}) => {
    const m = new THREE.Mesh(geo, mat(color, extra));
    m.scale.set(w, h, d);
    m.position.set(x + w / 2, y + h / 2, z + d / 2);
    m.castShadow = shadow;
    m.receiveShadow = true;
    root.add(m);
    return m;
  };
  const cyl = (x, z, r, h, color, { y = 0, axis = 'y' } = {}) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 20), mat(color, { metalness: 0.4, roughness: 0.4 }));
    m.position.set(x, y + (axis === 'y' ? h / 2 : 0), z);
    if (axis === 'x') m.rotation.z = Math.PI / 2;
    m.castShadow = true;
    root.add(m);
    return m;
  };

  // Sol du bâtiment et des pièces.
  box(4, 4, 352, 272, 0.5, C.base, { shadow: false });

  // ---------- Zones ----------
  const pickables = [];
  const borders = {};
  const ZONES = {
    C: { x: 30, z: 12, w: 148, d: 110, floor: C.rubber },
    B: { x: 186, z: 12, w: 162, d: 110, floor: C.rubber },
    A: { x: 30, z: 130, w: 318, d: 90, floor: C.wood },
  };
  for (const [id, z] of Object.entries(ZONES)) {
    const floor = box(z.x, z.z, z.w, z.d, 1, new THREE.Color(z.floor).lerp(new THREE.Color(C[`z${id}`]), D ? 0.18 : 0.22).getStyle(), { y: 0.5, shadow: false });
    floor.userData.area = id;
    pickables.push(floor);
    // Bordure lumineuse de la zone (plus haute si c'est la zone de la tâche).
    const color = C[`z${id}`];
    const t = 1.6;
    const h = id === highlight ? 3 : 1.6;
    const em = { emissive: color, emissiveIntensity: D ? 0.9 : 0.35 };
    borders[id] = [
      box(z.x, z.z, z.w, t, h, color, { y: 1.5, shadow: false, extra: em }),
      box(z.x, z.z + z.d - t, z.w, t, h, color, { y: 1.5, shadow: false, extra: em }),
      box(z.x, z.z, t, z.d, h, color, { y: 1.5, shadow: false, extra: em }),
      box(z.x + z.w - t, z.z, t, z.d, h, color, { y: 1.5, shadow: false, extra: em }),
    ];
  }

  // ---------- Équipement (vu dans les photos) ----------
  const y0 = 1.5;
  const at = { y: y0 };
  const platform = (x, z, w, d) => box(x, z, w, d, 1.4, C.wood, { y: y0, shadow: false });
  const machine = (x, z, w = 14, d = 12, h = 16) => { box(x, z, w, d, 3, C.metal, at); box(x + w / 2 - 1.5, z + 1, 3, 3, h, C.dark, at); box(x + 2, z + d - 5, w - 4, 4, 6, C.dark, at); };
  const bench = (x, z, w = 34) => { box(x, z, w, 6, 5, C.dark, at); box(x + 2, z + 1, 2, 4, 3, C.metal, at); box(x + w - 4, z + 1, 2, 4, 3, C.metal, at); };
  const rack = (x, z, len, vertical) => {
    const [w, d] = vertical ? [6, len] : [len, 6];
    box(x, z, w, d, 7, C.metal, at);
    for (let i = 0; i < Math.floor((len - 4) / 6); i++) {
      const px = vertical ? x + 3 : x + 5 + i * 6;
      const pz = vertical ? z + 5 + i * 6 : z + 3;
      cyl(px, pz, 2, 4.5, C.dark, { y: y0 + 7.2, axis: vertical ? 'x' : 'y' });
    }
  };
  const squat = (x, z) => {
    for (const [dx, dz] of [[0, 0], [16, 0], [0, 16], [16, 16]]) box(x + dx, z + dz, 2, 2, 26, C.dark, at);
    box(x, z, 18, 2, 1.5, C.dark, { y: y0 + 26 });
    box(x, z + 16, 18, 2, 1.5, C.dark, { y: y0 + 26 });
    cyl(x + 9, z + 9, 0.8, 30, C.metal, { y: y0 + 16, axis: 'x' });
  };
  const treadmill = (x, z) => {
    box(x, z, 12, 28, 3, C.metal, at);
    box(x + 2.5, z + 3, 7, 18, 0.6, C.dark, { y: y0 + 3 });
    box(x + 1, z + 25, 1.5, 2, 13, C.dark, at);
    box(x + 9.5, z + 25, 1.5, 2, 13, C.dark, at);
    box(x + 1, z + 24, 10, 3, 3, C.dark, { y: y0 + 13 });
    box(x + 2.5, z + 24.5, 7, 0.6, 2.2, C.accent, { y: y0 + 13.4, shadow: false, extra: { emissive: C.accent, emissiveIntensity: D ? 1.2 : 0.5 } });
  };
  const stair = (x, z) => { box(x, z, 10, 13, 18, C.metal, at); box(x + 1, z + 1, 8, 5, 1, C.dark, { y: y0 + 18 }); };
  const elliptical = (x, z) => { box(x, z, 9, 24, 4, C.metal, at); box(x + 3, z + 19, 3, 3, 16, C.dark, at); };
  const rower = (x, z) => { box(x, z, 6, 40, 3, C.metal, at); box(x + 0.5, z + 22, 5, 6, 3, C.dark, { y: y0 + 3 }); box(x - 1, z, 8, 6, 7, C.dark, at); };

  // C : haut du corps.
  platform(36, 64, 108, 22);
  for (let i = 0; i < 5; i++) machine(40 + i * 21, 69);
  box(150, 18, 20, 6, 32, C.dark, at);
  cyl(155, 21, 2.5, 3, C.metal, { y: y0 + 30 });
  cyl(165, 21, 2.5, 3, C.metal, { y: y0 + 30 });
  for (const x of [50, 100]) { box(x, 94, 3.5, 3.5, 20, C.dark, at); box(x + 16, 94, 3.5, 3.5, 20, C.dark, at); cyl(x + 9.7, 95.7, 0.8, 30, C.metal, { y: y0 + 18, axis: 'x' }); bench(x + 6.5, 100, 6.5); }
  rack(160, 68, 48, true);
  // B : bas du corps.
  rack(296, 16, 46, false);
  rack(338, 28, 88, true);
  platform(192, 70, 76, 46);
  squat(198, 76);
  squat(224, 76);
  machine(250, 74, 13, 30, 18);
  box(198, 100, 44, 12, 6, C.metal, at);
  box(232, 101, 8, 10, 14, C.dark, at);
  for (const z of [40, 58, 76]) bench(280, z);
  cyl(300, 102, 7, 2, C.dark, at);
  cyl(300, 102, 1.4, 14, C.metal, at);
  // A : cardio.
  for (let i = 0; i < 6; i++) { treadmill(42 + i * 18, 158); stair(43 + i * 18, 194); }
  rower(166, 160);
  rower(180, 160);
  elliptical(206, 178);
  elliptical(220, 178);
  for (let i = 0; i < 3; i++) box(250 + i * 30, 156, 24, 34, 0.8, C.mat, { y: y0, shadow: false });
  for (let i = 0; i < 3; i++) stair(300 + i * 15, 198);

  // ---------- Murs, pièces, télés ----------
  const WALL = 16;
  const wall = (x, z, w, d, h = WALL) => box(x, z, w, d, h, C.wall, { extra: { transparent: true, opacity: D ? 0.9 : 0.95 } });
  wall(2, 2, 356, 3);
  wall(2, 275, 356, 3);
  wall(355, 2, 3, 276);
  wall(2, 2, 3, 144);
  wall(2, 190, 3, 88);
  for (const [a, b] of [[4, 12], [24, 110], [160, 236], [248, 272], [284, 356]]) wall(a, 227, b - a, 2.5, 12);
  for (const x of [96, 176, 262]) wall(x - 1, 228, 2.5, 48, 12);
  // Lisière lumineuse sur le dessus du mur extérieur (le « tech » du mode sombre).
  if (D) {
    const em = { emissive: C.accent, emissiveIntensity: 1.4 };
    box(2, 2, 356, 3, 0.6, C.accent, { y: WALL, shadow: false, extra: em });
    box(2, 275, 356, 3, 0.6, C.accent, { y: WALL, shadow: false, extra: em });
    box(355, 2, 3, 276, 0.6, C.accent, { y: WALL, shadow: false, extra: em });
    box(2, 2, 3, 144, 0.6, C.accent, { y: WALL, shadow: false, extra: em });
    box(2, 190, 3, 88, 0.6, C.accent, { y: WALL, shadow: false, extra: em });
  }
  for (let i = 0; i < 4; i++) {
    box(44 + i * 28, 224, 16, 1.5, 9, C.dark, { y: 12 });
    box(45 + i * 28, 223.6, 14, 0.4, 7, C.accent, { y: 13, shadow: false, extra: { emissive: C.accent, emissiveIntensity: D ? 0.9 : 0.4 } });
  }
  const ROOMS = { 5: [4, 92], 2: [96, 80], 3: [176, 86], 4: [262, 94] };
  for (const [id, [x, w]] of Object.entries(ROOMS)) {
    const f = box(x + 1, 229, w - 2, 46, 0.8, C.room, { y: 0.5, shadow: false });
    f.userData.area = id;
    pickables.push(f);
  }
  const door = box(4, 146, 24, 44, 0.6, C.base, { y: 0.5, shadow: false, extra: { transparent: true, opacity: 0 } });
  door.userData.area = '1';
  pickables.push(door);
  // Quelques vélos dans le studio de spinning.
  for (let i = 0; i < 4; i++) { box(272 + i * 20, 236, 6, 14, 10, C.metal, { y: 1.3 }); cyl(275 + i * 20, 248, 4, 1.5, C.dark, { y: 4, axis: 'x' }); }

  // ---------- Étiquettes ----------
  const sprites = [];
  const flatLabel = (text, x, z, scale = 0.36, color = css('--ink')) => {
    const { tex, w, h } = labelTexture([{ text }], { fg: color, size: 40, pad: 6 });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w * scale, h * scale), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 1.5, z);
    root.add(m);
  };
  for (const [id, [x, w]] of Object.entries(ROOMS)) flatLabel(labels[`r${id}`] || '', x + w / 2, 262);
  flatLabel(labels.r1 || '', 16, 168, 0.28, C.accent);

  const TAGC = { done: css('--ok'), notdone: css('--bad'), unchecked: css('--sun'), planned: D ? '#d9e4e4' : '#5a6362' };
  for (const [id, z] of Object.entries(ZONES)) {
    const lines = [{ text: `${id} · ${labels[id]}` }];
    const ts = tags[id] || [];
    if (ts.length) lines.push({ text: ts.map((t) => t.text).join(' · '), color: TAGC[ts[0].state] || TAGC.planned });
    const { tex, w, h } = labelTexture(lines, { bg: D ? 'rgba(7,10,11,.82)' : 'rgba(255,255,255,.92)', fg: D ? '#eef3f3' : '#1f2323', size: 44 });
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
    s.scale.set(w * 0.3, h * 0.3, 1);
    s.position.set(z.x + z.w / 2, 46, z.z + z.d / 2);
    s.renderOrder = 10;
    s.userData = { area: id, base: 46 };
    root.add(s);
    sprites.push(s);
    // Fil vertical : relie l'étiquette à sa zone.
    box(z.x + z.w / 2 - 0.3, z.z + z.d / 2 - 0.3, 0.6, 0.6, 38, C[`z${id}`], { y: 2, shadow: false, extra: { emissive: C[`z${id}`], emissiveIntensity: 0.6 } });
  }

  // ---------- Caméra et gestes ----------
  const camera = new THREE.PerspectiveCamera(32, 1, 10, 3000);
  const view = { az: -0.38, pol: 0.88, r: 575, az0: -0.38 };
  let target = { az: view.az, pol: view.pol, r: view.r };
  const place = () => {
    camera.position.set(Math.sin(view.az) * Math.sin(view.pol) * view.r, Math.cos(view.pol) * view.r, Math.cos(view.az) * Math.sin(view.pol) * view.r);
    camera.lookAt(0, 0, 8);
  };
  const resize = () => {
    const w = host.clientWidth || 320;
    const h = Math.round(w * 0.74);
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = `${w}px`;
    renderer.domElement.style.height = `${h}px`;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  resize();

  const ptrs = new Map();
  let drag = null;
  let lastMove = performance.now();
  const el = renderer.domElement;
  el.style.touchAction = 'pan-y';
  el.addEventListener('pointerdown', (e) => {
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    drag = { x: e.clientX, y: e.clientY, moved: 0, az: target.az, pol: target.pol, r: target.r, dist: null };
    if (ptrs.size === 2) {
      const [a, b] = [...ptrs.values()];
      drag.dist = Math.hypot(a.x - b.x, a.y - b.y);
    }
  });
  el.addEventListener('pointermove', (e) => {
    if (!drag || !ptrs.has(e.pointerId)) return;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    lastMove = performance.now();
    if (ptrs.size === 2 && drag.dist) {
      const [a, b] = [...ptrs.values()];
      target.r = Math.min(800, Math.max(260, drag.r * (drag.dist / Math.hypot(a.x - b.x, a.y - b.y))));
      drag.moved = 99;
      return;
    }
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    if (drag.moved < 8 && Math.abs(dy) > Math.abs(dx) * 1.3 && e.pointerType === 'touch') { drag = null; return; } // laisse défiler la page
    drag.moved = Math.max(drag.moved, Math.hypot(dx, dy));
    if (drag.moved > 6) {
      try { el.setPointerCapture(e.pointerId); } catch { /* rien */ }
      target.az = drag.az - dx * 0.008;
      target.pol = Math.min(1.25, Math.max(0.35, drag.pol - dy * 0.006));
    }
  });
  const up = (e) => {
    const d = drag;
    ptrs.delete(e.pointerId);
    if (!ptrs.size) drag = null;
    if (!d || d.moved > 6) return;
    // Un toucher : quelle zone ou pièce est sous le doigt?
    const rect = el.getBoundingClientRect();
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1), camera);
    const hit = ray.intersectObjects([...sprites, ...pickables], false)[0];
    if (hit) onPick?.(hit.object.userData.area);
  };
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', (e) => { ptrs.delete(e.pointerId); drag = null; });
  el.addEventListener('wheel', (e) => { e.preventDefault(); target.r = Math.min(800, Math.max(260, target.r * (1 + e.deltaY * 0.001))); }, { passive: false });

  // ---------- Sélection et animation ----------
  let sel = selected;
  const setSelected = (id) => {
    sel = id;
    for (const [zid, list] of Object.entries(borders)) {
      for (const m of list) {
        const on = zid === sel;
        m.material = mat(on ? C.accent : C[`z${zid}`], { emissive: on ? C.accent : C[`z${zid}`], emissiveIntensity: on ? 1.3 : D ? 0.9 : 0.35 });
      }
    }
  };
  setSelected(sel);

  let raf = 0;
  let visible = true;
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
  io.observe(host);
  const t0 = performance.now();
  const tick = (now) => {
    if (!host.isConnected) { destroy(); return; }
    raf = requestAnimationFrame(tick);
    if (!visible || document.hidden) return;
    const t = (now - t0) / 1000;
    // Au repos, la caméra se balance doucement d'un côté à l'autre.
    if (!reduced() && !drag && now - lastMove > 2500) target.az += (view.az0 + Math.sin(t * 0.25) * 0.35 - target.az) * 0.01;
    view.az += (target.az - view.az) * 0.12;
    view.pol += (target.pol - view.pol) * 0.12;
    view.r += (target.r - view.r) * 0.12;
    place();
    if (!reduced()) {
      for (const s of sprites) s.position.y = s.userData.base + Math.sin(t * 1.6 + s.position.x * 0.05) * 1.6 + (s.userData.area === sel ? 6 : 0);
      if (highlight && borders[highlight]) for (const m of borders[highlight]) m.scale.y = 2.6 + Math.sin(t * 3) * 1.2;
    }
    renderer.render(scene, camera);
  };
  // Entrée : la caméra descend vers le plan.
  if (!reduced()) { view.r = 1100; view.pol = 0.5; }
  place();
  raf = requestAnimationFrame(tick);

  function destroy() {
    cancelAnimationFrame(raf);
    ro.disconnect();
    io.disconnect();
    renderer.dispose();
    scene.traverse((o) => { o.geometry?.dispose?.(); o.material?.map?.dispose?.(); });
    mats.forEach((m) => m.dispose());
  }
  return { setSelected, destroy };
}
