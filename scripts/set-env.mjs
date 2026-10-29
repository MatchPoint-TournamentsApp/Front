// Genera src/environments/environment.production.ts (no se versiona) antes del build de producción.
// En Vercel los valores llegan por variables de entorno: API_URL, SUPABASE_URL, SUPABASE_ANON_KEY.
// En local, sin variables, se respeta el archivo si ya existe o se crea con los valores de environment.ts.
import { copyFileSync, existsSync, writeFileSync } from 'node:fs';

const dir = new URL('../src/environments/', import.meta.url);
const target = new URL('environment.production.ts', dir);
const { API_URL, SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;

if (API_URL && SUPABASE_URL && SUPABASE_ANON_KEY) {
  writeFileSync(target, `// Generado por scripts/set-env.mjs: no editar ni versionar.
export const environment = {
  apiUrl: ${JSON.stringify(API_URL.replace(/\/+$/, ''))},
  supabaseUrl: ${JSON.stringify(SUPABASE_URL.replace(/\/+$/, ''))},
  supabaseAnonKey: ${JSON.stringify(SUPABASE_ANON_KEY)},
  storageBucket: ${JSON.stringify(process.env.STORAGE_BUCKET || 'matchpoint-public')},
};
`);
  console.log('environment.production.ts generado desde variables de entorno');
} else if (process.env.VERCEL) {
  console.error('Faltan variables de entorno en Vercel: API_URL, SUPABASE_URL y SUPABASE_ANON_KEY');
  process.exit(1);
} else if (!existsSync(target)) {
  copyFileSync(new URL('environment.ts', dir), target);
  console.log('environment.production.ts creado a partir de environment.ts');
}
