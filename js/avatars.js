// Photos de profil : des mascottes en peluche (SVG), ou une photo du téléphone
// réduite à 96 px. Valeur gardée dans le compte : « m:ours » ou « data:image/… ».

// Visage de peluche commun : tête ronde, couture pointillée, yeux boutons, joues roses.
const face = ({ head, ears = '', muzzle = '', extra = '', eye = '#2a2230', cheek = '#ff8fa3' }) => `
  ${ears}
  <circle cx="50" cy="54" r="30" fill="${head}"/>
  <path d="M50 24.5v8" stroke="rgba(0,0,0,.18)" stroke-width="1.6" stroke-dasharray="2.4 2.2" stroke-linecap="round"/>
  ${muzzle}
  <circle cx="39" cy="52" r="4.2" fill="${eye}"/><circle cx="61" cy="52" r="4.2" fill="${eye}"/>
  <circle cx="40.4" cy="50.6" r="1.3" fill="#fff"/><circle cx="62.4" cy="50.6" r="1.3" fill="#fff"/>
  <ellipse cx="31" cy="62" rx="5" ry="3.2" fill="${cheek}" opacity=".55"/><ellipse cx="69" cy="62" rx="5" ry="3.2" fill="${cheek}" opacity=".55"/>
  ${extra}`;
const mouth = (y = 64, c = '#2a2230') => `<path d="M45.5 ${y}q4.5 4 9 0" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round"/>`;
const nose = (y = 59.5, c = '#2a2230') => `<path d="M47 ${y}h6l-3 3.2z" fill="${c}" stroke="${c}" stroke-width="1" stroke-linejoin="round"/>`;

export const MASCOTS = {
  lapin: { bg: '#cfe6fb', fr: 'Lapin', en: 'Bunny', svg: face({
    head: '#f4f7fb',
    ears: '<ellipse cx="38" cy="22" rx="7.5" ry="19" fill="#f4f7fb" transform="rotate(-12 38 22)"/><ellipse cx="38" cy="23" rx="3.6" ry="13" fill="#2f86d6" transform="rotate(-12 38 23)"/><ellipse cx="62" cy="22" rx="7.5" ry="19" fill="#f4f7fb" transform="rotate(12 62 22)"/><ellipse cx="62" cy="23" rx="3.6" ry="13" fill="#2f86d6" transform="rotate(12 62 23)"/>',
    extra: nose(58, '#ff8fa3') + mouth(63),
  }) },
  ours: { bg: '#f6dfc4', fr: 'Ours', en: 'Bear', svg: face({
    head: '#b07a4f',
    ears: '<circle cx="27" cy="31" r="10" fill="#b07a4f"/><circle cx="27" cy="31" r="5" fill="#e6b98f"/><circle cx="73" cy="31" r="10" fill="#b07a4f"/><circle cx="73" cy="31" r="5" fill="#e6b98f"/>',
    muzzle: '<ellipse cx="50" cy="64" rx="12" ry="9" fill="#e6c49f"/>',
    extra: nose(59) + mouth(64.5),
  }) },
  chat: { bg: '#fde3c8', fr: 'Chat', en: 'Cat', svg: face({
    head: '#f39a4a',
    ears: '<path d="M24 40L27 15l20 14z" fill="#f39a4a"/><path d="M28 34l1.5-12 9.5 7z" fill="#ffc9a3"/><path d="M76 40L73 15 53 29z" fill="#f39a4a"/><path d="M72 34l-1.5-12-9.5 7z" fill="#ffc9a3"/>',
    extra: nose(58.5, '#d9576f') + '<path d="M50 61.5q-2.5 3.5-5.5 2M50 61.5q2.5 3.5 5.5 2" fill="none" stroke="#2a2230" stroke-width="1.6" stroke-linecap="round"/><path d="M22 58h10M23 64l9-2M78 58H68M77 64l-9-2" stroke="#7a4a20" stroke-width="1.3" stroke-linecap="round"/>',
  }) },
  grenouille: { bg: '#d6f1d0', fr: 'Grenouille', en: 'Frog', svg: face({
    head: '#5cbf5a',
    ears: '<circle cx="35" cy="31" r="10.5" fill="#5cbf5a"/><circle cx="65" cy="31" r="10.5" fill="#5cbf5a"/><circle cx="35" cy="31" r="6.5" fill="#fff"/><circle cx="65" cy="31" r="6.5" fill="#fff"/>',
    extra: '<path d="M38 63q12 9 24 0" fill="none" stroke="#2a2230" stroke-width="2" stroke-linecap="round"/>',
  }).replace('cy="52" r="4.2" fill="#2a2230"/><circle cx="61" cy="52"', 'cy="31" r="4.2" fill="#2a2230"/><circle cx="61" cy="31"').replace('cx="40.4" cy="50.6"', 'cx="36.4" cy="29.6"').replace('cx="62.4" cy="50.6"', 'cx="66.4" cy="29.6"').replace('<circle cx="39" cy="31"', '<circle cx="35" cy="31"').replace('<circle cx="61" cy="31"', '<circle cx="65" cy="31"') },
  canard: { bg: '#fff1b8', fr: 'Canard', en: 'Duck', svg: face({
    head: '#ffd43b',
    ears: '<path d="M46 25q2-10 8-8-3 2-2 8z" fill="#ffd43b"/>',
    extra: '<ellipse cx="50" cy="63" rx="11" ry="5.5" fill="#ff9f43"/><path d="M40 63h20" stroke="#e07b1f" stroke-width="1.4" stroke-linecap="round"/>',
  }) },
  panda: { bg: '#e6e9ef', fr: 'Panda', en: 'Panda', svg: face({
    head: '#ffffff',
    ears: '<circle cx="27" cy="31" r="10" fill="#2a2a32"/><circle cx="73" cy="31" r="10" fill="#2a2a32"/>',
    muzzle: '<ellipse cx="38" cy="52" rx="7" ry="8.5" fill="#2a2a32" transform="rotate(-18 38 52)"/><ellipse cx="62" cy="52" rx="7" ry="8.5" fill="#2a2a32" transform="rotate(18 62 52)"/>',
    eye: '#fff', extra: nose(59) + mouth(64),
  }).replace(/<circle cx="(40\.4|62\.4)" cy="50\.6" r="1\.3" fill="#fff"\/>/g, (m) => m.replace('#fff', '#2a2a32')) },
  renard: { bg: '#ffd9c2', fr: 'Renard', en: 'Fox', svg: face({
    head: '#ef6c2f',
    ears: '<path d="M23 42L25 13l22 16z" fill="#ef6c2f"/><path d="M27 35l1-13 10 7z" fill="#3a2a24"/><path d="M77 42L75 13 53 29z" fill="#ef6c2f"/><path d="M73 35l-1-13-10 7z" fill="#3a2a24"/>',
    muzzle: '<path d="M27 58q8 4 23 26 15-22 23-26-6 22-23 26-17-4-23-26z" fill="#fff"/>',
    extra: nose(62),
  }) },
  mouton: { bg: '#ece4f7', fr: 'Mouton', en: 'Sheep', svg: `
    <g fill="#ffffff">${[[30, 34], [42, 27], [58, 27], [70, 34], [76, 47], [24, 47]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="11"/>`).join('')}</g>
    ${face({ head: '#f3e9da', ears: '<ellipse cx="21" cy="55" rx="9" ry="5" fill="#d9c7b0" transform="rotate(20 21 55)"/><ellipse cx="79" cy="55" rx="9" ry="5" fill="#d9c7b0" transform="rotate(-20 79 55)"/>', extra: nose(60) + mouth(65) })}
    <g fill="#ffffff">${[[38, 30], [50, 26], [62, 30]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9"/>`).join('')}</g>` },
};

export const mascotSvg = (id, label = '') => {
  const m = MASCOTS[id];
  if (!m) return '';
  return `<svg viewBox="0 0 100 100" ${label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"'}><circle cx="50" cy="50" r="50" fill="${m.bg}"/>${m.svg}</svg>`;
};

// L'image dans la pastille ronde : mascotte, photo, ou l'initiale si rien n'est choisi.
export function avatarHTML(user, letter) {
  const v = user?.avatar || '';
  if (v.startsWith('m:') && MASCOTS[v.slice(2)]) return mascotSvg(v.slice(2));
  if (/^data:image\/(jpeg|webp);base64,/.test(v)) return `<img src="${v}" alt="" draggable="false">`;
  return `<span>${letter}</span>`;
}

// Une photo du téléphone → carré de 96 px, JPEG ~10 ko (petit pour le compte).
export function shrinkPhoto(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const s = Math.min(img.naturalWidth, img.naturalHeight);
      const c = document.createElement('canvas');
      c.width = 96; c.height = 96;
      c.getContext('2d').drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, 96, 96);
      URL.revokeObjectURL(url);
      let q = 0.82, out = c.toDataURL('image/jpeg', q);
      while (out.length > 38000 && q > 0.4) { q -= 0.12; out = c.toDataURL('image/jpeg', q); }
      resolve(out);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('photo')); };
    img.src = url;
  });
}
