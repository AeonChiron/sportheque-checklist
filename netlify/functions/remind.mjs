// Fonction planifiée (Netlify, gratuite) : toutes les 5 minutes, envoie le rappel
// « ton quart commence bientôt » à ceux qui l'ont activé (10 min avant, selon leur horaire).
import { getStore } from '@netlify/blobs';
import { createApi } from '../lib/api.mjs';

const api = createApi({ getStore: (name) => getStore({ name, consistency: 'strong' }), env: () => ({}) });

export default async () => {
  const sent = await api.remindDue(new Date());
  return new Response(JSON.stringify({ sent }), { headers: { 'Content-Type': 'application/json' } });
};

export const config = { schedule: '*/5 * * * *' };
