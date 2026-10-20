// Photos de profil : des mascottes (images fixes), ou une photo du téléphone
// réduite à 96 px. Valeur gardée dans le compte : « m:ours » ou « data:image/… ».

// Les mascottes : des images fixes (rien ne bouge), petites (~6 ko chacune).
export const MASCOTS = {
  lapin: { fr: 'Lapin', en: 'Bunny' },
  salut: { fr: 'Lapin salut', en: 'Peace bunny' },
  coucou: { fr: 'Lapin coucou', en: 'Hi bunny' },
  ours: { fr: 'Ours', en: 'Bear' },
  renard: { fr: 'Renard', en: 'Fox' },
  chat: { fr: 'Chat', en: 'Cat' },
  faon: { fr: 'Faon', en: 'Fawn' },
  souris: { fr: 'Souris', en: 'Mouse' },
};

export const mascotImg = (id, label = '') => (MASCOTS[id] ? `<img src="icons/avatars/${id}.webp" alt="${label}" draggable="false" loading="lazy">` : '');

// L'image dans la pastille ronde : mascotte, photo, ou l'initiale si rien n'est choisi.
export function avatarHTML(user, letter) {
  const v = user?.avatar || '';
  if (v.startsWith('m:') && MASCOTS[v.slice(2)]) return mascotImg(v.slice(2));
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
