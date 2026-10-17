// Fonction serveur (Vercel) : reçoit le rapport et l'envoie par courriel
// au superviseur via Resend (https://resend.com).
//
// Variables d'environnement :
//   RESEND_API_KEY    clé API Resend
//   SUPERVISOR_EMAIL  destinataire(s), séparés par des virgules
//   REPORT_FROM       expéditeur vérifié, ex. « Checklist gym <rapports@mondomaine.com> »

import { renderReportHtml, renderReportText, reportSubject } from '../js/report.js';

const MAX_BYTES = 4_400_000; // limite de requête Vercel : 4,5 Mo
const MAX_PHOTOS = 8;
const PHOTO_NAME = /^photo-\d{1,2}\.jpg$/;

function valid(r) {
  return r && typeof r.name === 'string' && r.name.trim() && Array.isArray(r.items)
    && Array.isArray(r.flags) && Array.isArray(r.overflow) && r.completion;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST seulement' });

  const { RESEND_API_KEY, SUPERVISOR_EMAIL, REPORT_FROM } = process.env;
  if (!RESEND_API_KEY || !SUPERVISOR_EMAIL || !REPORT_FROM) {
    return res.status(503).json({ error: 'Envoi non configuré sur le serveur' });
  }

  const report = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  if (JSON.stringify(report ?? '').length > MAX_BYTES || !valid(report)) {
    return res.status(400).json({ error: 'Rapport invalide' });
  }

  const attachments = Array.isArray(report.attachments) ? report.attachments : [];
  delete report.attachments;
  if (attachments.length > MAX_PHOTOS
    || attachments.some((a) => !PHOTO_NAME.test(a?.filename) || typeof a.content !== 'string')) {
    return res.status(400).json({ error: 'Photos invalides' });
  }

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: REPORT_FROM,
      to: SUPERVISOR_EMAIL.split(',').map((s) => s.trim()),
      subject: reportSubject(report),
      html: renderReportHtml(report),
      text: renderReportText(report),
      attachments: attachments.map(({ filename, content }) => ({ filename, content })),
    }),
  });

  if (!r.ok) {
    console.error('Resend', r.status, await r.text());
    return res.status(502).json({ error: 'Échec de l’envoi du courriel' });
  }
  return res.status(200).json({ ok: true });
}
