// Vue 3D du 2e étage, bâtie avec les mêmes mesures que le plan (unités du
// plan : 360 × 280). Three.js est hébergé sur le site (vendor/) et chargé
// seulement quand on ouvre la vue 3D. On fait tourner en glissant, on zoome
// en pinçant (ou à la molette), on touche une zone pour la voir.

import * as THREE from '../vendor/three.module.min.js';
import { ZONES, ROOMS, DOORS, GEAR } from './floor-layout.js';

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
    carpet: D ? '#3a4245' : '#a9b1b4',
    glass: D ? '#6fb3c8' : '#cdeaf3',
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

  // Sol du bâtiment et des pièces.
  box(4, 4, 352, 272, 0.5, C.base, { shadow: false });

  // ---------- Zones ----------
  const pickables = [];
  const borders = {};
  for (const [id, z] of Object.entries(ZONES)) {
    const base = z.floor === 'wood' ? C.wood : C.rubber;
    const floor = box(z.x, z.y, z.w, z.h, 1, new THREE.Color(base).lerp(new THREE.Color(C[`z${id}`]), D ? 0.18 : 0.22).getStyle(), { y: 0.5, shadow: false });
    floor.userData.area = id;
    pickables.push(floor);
    // Bordure lumineuse de la zone (plus haute si c'est la zone de la tâche).
    const color = C[`z${id}`];
    const t = 1.6;
    const h = id === highlight ? 3 : 1.6;
    const em = { emissive: color, emissiveIntensity: D ? 0.9 : 0.35 };
    borders[id] = [
      box(z.x, z.y, z.w, t, h, color, { y: 1.5, shadow: false, extra: em }),
      box(z.x, z.y + z.h - t, z.w, t, h, color, { y: 1.5, shadow: false, extra: em }),
      box(z.x, z.y, t, z.h, h, color, { y: 1.5, shadow: false, extra: em }),
      box(z.x + z.w - t, z.y, t, z.h, h, color, { y: 1.5, shadow: false, extra: em }),
    ];
  }

  // ---------- Équipement : même liste que le plan ----------
  // Chaque pièce est bâtie autour de son centre, l'avant vers +z, puis tournée.
  const y0 = 1.5;
  const part = (g, cx, cz, w, d, h, color, { y = y0, extra, shadow = true } = {}) => {
    const m = new THREE.Mesh(geo, mat(color, extra));
    m.scale.set(w, h, d);
    m.position.set(cx, y + h / 2, cz);
    m.castShadow = shadow;
    m.receiveShadow = true;
    g.add(m);
    return m;
  };
  const rod = (g, cx, cz, r, len, color, { y = y0, axis = 'y' } = {}) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 18), mat(color, { metalness: 0.4, roughness: 0.4 }));
    m.position.set(cx, y + (axis === 'y' ? len / 2 : 0), cz);
    if (axis === 'x') m.rotation.z = Math.PI / 2;
    if (axis === 'z') m.rotation.x = Math.PI / 2;
    m.castShadow = true;
    g.add(m);
  };
  const screen = { emissive: C.accent, emissiveIntensity: D ? 1.2 : 0.5 };
  const BUILD = {
    treadmill: (g) => { part(g, 0, 0, 12, 28, 3, C.metal); part(g, 0, -1.5, 7, 18, 0.6, C.dark, { y: y0 + 3 }); part(g, -4.2, 12, 1.5, 2, 13, C.dark); part(g, 4.2, 12, 1.5, 2, 13, C.dark); part(g, 0, 11.5, 10, 3, 3, C.dark, { y: y0 + 13 }); part(g, 0, 13.1, 7, 0.6, 2.2, C.accent, { y: y0 + 13.4, shadow: false, extra: screen }); },
    stair: (g) => { part(g, 0, 0, 10, 13, 18, C.metal); part(g, 0, 3, 8, 5, 1, C.dark, { y: y0 + 18 }); },
    elliptical: (g) => { part(g, 0, 0, 9, 24, 4, C.metal); part(g, 0, 9.5, 3, 3, 16, C.dark); },
    rower: (g) => { part(g, 0, 0, 6, 40, 3, C.metal); part(g, 0, 5, 5, 6, 3, C.dark, { y: y0 + 3 }); part(g, 0, 17, 8, 6, 7, C.dark); },
    bike: (g) => { part(g, 0, 0, 6, 18, 3, C.metal); rod(g, 0, 5, 3.5, 1.5, C.dark, { y: y0 + 5, axis: 'x' }); part(g, 0, -4, 2, 2, 11, C.dark); part(g, 0, -4, 4, 6, 1.2, C.dark, { y: y0 + 11 }); part(g, 0, 6, 2, 2, 13, C.dark); part(g, 0, 6, 8, 2, 1, C.dark, { y: y0 + 13 }); },
    machine: (g, it) => { part(g, 0, 0, it.w, it.h, 3, C.metal); part(g, 0, -it.h / 2 + 2, 3, 3, 16, C.dark); part(g, 0, it.h / 2 - 3, it.w - 4, 4, 6, C.dark); },
    bench: (g, it) => { part(g, 0, 0, it.w, 6, 5, C.dark); part(g, -it.w / 2 + 3, 0, 2, 4, 3, C.metal); part(g, it.w / 2 - 3, 0, 2, 4, 3, C.metal); },
    squat: (g) => { for (const [dx, dz] of [[-8, -8], [8, -8], [-8, 8], [8, 8]]) part(g, dx, dz, 2, 2, 26, C.dark); part(g, 0, -8, 18, 2, 1.5, C.dark, { y: y0 + 26 }); part(g, 0, 8, 18, 2, 1.5, C.dark, { y: y0 + 26 }); rod(g, 0, 0, 0.8, 30, C.metal, { y: y0 + 16, axis: 'x' }); },
    press: (g) => { part(g, -8, -11, 3.5, 3.5, 20, C.dark); part(g, 8, -11, 3.5, 3.5, 20, C.dark); rod(g, 0, -11, 0.8, 30, C.metal, { y: y0 + 18, axis: 'x' }); part(g, 0, 3, 6.5, 20, 5, C.dark); },
    plates: (g) => { rod(g, 0, 0, 7, 2, C.dark); rod(g, 0, 0, 1.4, 14, C.metal); },
    pulley: (g, it) => { part(g, 0, 0, it.w, 6, 32, C.dark); rod(g, -5, 0, 2.5, 3, C.metal, { y: y0 + 30 }); rod(g, 5, 0, 2.5, 3, C.metal, { y: y0 + 30 }); },
    rack: (g, it) => {
      part(g, 0, 0, it.w, it.h, 7, C.metal);
      const vertical = it.h > it.w;
      const len = vertical ? it.h : it.w;
      for (let i = 0; i < Math.floor((len - 4) / 6); i++) {
        const p = -len / 2 + 5 + i * 6;
        rod(g, vertical ? 0 : p, vertical ? p : 0, 2, 4.5, C.dark, { y: y0 + 7.2, axis: vertical ? 'x' : 'z' });
      }
    },
    platform: (g, it) => part(g, 0, 0, it.w, it.h, 1.4, C.wood, { shadow: false }),
    carpet: (g, it) => part(g, 0, 0, it.w, it.h, 0.8, C.carpet, { shadow: false }),
    mirror: (g, it) => part(g, 0, 0, it.w, it.h, 22, C.glass, { y: 1, extra: { metalness: 0.9, roughness: 0.05, transparent: true, opacity: 0.75 } }),
    tv: (g, it) => { part(g, 0.6, 0, it.w + 0.5, it.h + 4, 8, C.dark, { y: 16 }); part(g, 1.8, 0, 0.3, it.h + 3, 6.5, C.accent, { y: 16.7, shadow: false, extra: screen }); },
  };
  for (const it of GEAR) {
    const g = new THREE.Group();
    BUILD[it.t](g, it);
    g.position.set(it.x, 0, it.y);
    g.rotation.y = -((it.rot || 0) * Math.PI) / 180;
    root.add(g);
  }

  // ---------- Murs, pièces, portes ----------
  const WALL = 16;
  const wallMat = { transparent: true, opacity: D ? 0.9 : 0.95 };
  const seg = (x1, y1, x2, y2, h = WALL, t = 3) => {
    if (x1 === x2) box(x1 - t / 2, Math.min(y1, y2), t, Math.abs(y2 - y1), h, C.wall, { extra: wallMat });
    else box(Math.min(x1, x2), y1 - t / 2, Math.abs(x2 - x1), t, h, C.wall, { extra: wallMat });
  };
  const { entrance: en, top: tp } = DOORS;
  const outer = [[4, 4, tp.from, 4], [tp.to, 4, 356, 4], [356, 4, 356, 276], [4, 276, 356, 276], [4, 4, 4, en.from], [4, en.to, 4, 276]];
  for (const s of outer) seg(...s);
  if (D) {
    const em = { emissive: C.accent, emissiveIntensity: 1.4 };
    for (const [x1, y1, x2, y2] of outer) {
      if (x1 === x2) box(x1 - 1.5, Math.min(y1, y2), 3, Math.abs(y2 - y1), 0.6, C.accent, { y: WALL, shadow: false, extra: em });
      else box(Math.min(x1, x2), y1 - 1.5, Math.abs(x2 - x1), 3, 0.6, C.accent, { y: WALL, shadow: false, extra: em });
    }
  }
  for (const [id, m] of Object.entries(ROOMS)) {
    const sides = { top: [m.x, m.y, m.x + m.w, m.y], left: [m.x, m.y, m.x, m.y + m.h], right: [m.x + m.w, m.y, m.x + m.w, m.y + m.h] };
    for (const [side, [x1, y1, x2, y2]] of Object.entries(sides)) {
      if ((x1 === x2 && (x1 <= 4 || x1 >= 356))) continue;
      const d = m.door;
      if (d && d.side === side) {
        if (x1 === x2) { seg(x1, y1, x1, d.from, 12, 2.5); seg(x1, d.to, x1, y2, 12, 2.5); } else { seg(x1, y1, d.from, y1, 12, 2.5); seg(d.to, y1, x2, y1, 12, 2.5); }
      } else seg(x1, y1, x2, y2, 12, 2.5);
    }
    const f = box(m.x + 1, m.y + 1, m.w - 2, m.h - 2, 0.8, C.room, { y: 0.5, shadow: false });
    f.userData.area = id;
    pickables.push(f);
  }
  const door = box(4, en.from, 24, en.to - en.from, 0.6, C.base, { y: 0.5, shadow: false, extra: { transparent: true, opacity: 0 } });
  door.userData.area = '1';
  pickables.push(door);

  // ---------- Étiquettes ----------
  const sprites = [];
  const flatLabel = (text, x, z, { scale = 0.36, color = css('--ink'), turn = 0 } = {}) => {
    const { tex, w, h } = labelTexture([{ text }], { fg: color, size: 40, pad: 6 });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w * scale, h * scale), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
    m.rotation.set(-Math.PI / 2, 0, turn);
    m.position.set(x, 1.6, z);
    root.add(m);
  };
  for (const [id, m] of Object.entries(ROOMS)) flatLabel(labels[`r${id}`] || '', m.x + m.w / 2, m.y + m.h / 2 + (id === '4' ? 40 : 0), { turn: m.vertical ? Math.PI / 2 : 0, scale: m.vertical ? 0.3 : 0.36 });
  flatLabel(labels.r1 || '', 18, (en.from + en.to) / 2, { scale: 0.26, color: C.accent, turn: Math.PI / 2 });
  const carpet = GEAR.find((g) => g.t === 'carpet');
  if (carpet && labels.stretch) flatLabel(labels.stretch, carpet.x, carpet.y, { scale: 0.3 });

  const TAGC = { done: css('--ok'), notdone: css('--bad'), unchecked: css('--sun'), planned: D ? '#d9e4e4' : '#5a6362' };
  for (const [id, z] of Object.entries(ZONES)) {
    const lines = [{ text: `${id} · ${labels[id]}` }];
    const ts = tags[id] || [];
    if (ts.length) lines.push({ text: ts.map((t) => t.text).join(' · '), color: TAGC[ts[0].state] || TAGC.planned });
    const { tex, w, h } = labelTexture(lines, { bg: D ? 'rgba(7,10,11,.82)' : 'rgba(255,255,255,.92)', fg: D ? '#eef3f3' : '#1f2323', size: 44 });
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
    s.scale.set(w * 0.3, h * 0.3, 1);
    s.position.set(z.x + z.w / 2, 46, z.y + z.h / 2);
    s.renderOrder = 10;
    s.userData = { area: id, base: 46 };
    root.add(s);
    sprites.push(s);
    // Fil vertical : relie l'étiquette à sa zone.
    box(z.x + z.w / 2 - 0.3, z.y + z.h / 2 - 0.3, 0.6, 0.6, 38, C[`z${id}`], { y: 2, shadow: false, extra: { emissive: C[`z${id}`], emissiveIntensity: 0.6 } });
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
