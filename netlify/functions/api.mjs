// Point d'entrée Netlify : toute l'API du site (voir netlify/lib/api.mjs).
import { getStore } from '@netlify/blobs';
import { createApi } from '../lib/api.mjs';

export default createApi({
  getStore: (name) => getStore({ name, consistency: 'strong' }),
  // Noms sur Netlify : EMPLOYEE_CODE, SUPERVISOR_CODE, ADMIN_CODE (les anciens noms marchent encore).
  env: () => ({ TEAM_CODE: process.env.EMPLOYEE_CODE || process.env.TEAM_CODE, BOSS_CODE: process.env.SUPERVISOR_CODE || process.env.BOSS_CODE, ADMIN_CODE: process.env.ADMIN_CODE }),
});

export const config = { path: '/api/*' };
