/**
 * Configuración del frontal. Rellena con los datos de tu proyecto de Supabase
 * (Project Settings -> API): URL y clave pública "anon" / "publishable".
 */
export const environment = {
  // En desarrollo, ng serve redirige /api a http://localhost:8080 (proxy.conf.json).
  // En producción pon la URL completa del backend, p. ej. 'https://api.matchpoint.es/api'.
  apiUrl: '/api',
  supabaseUrl: 'https://TU-PROYECTO.supabase.co',
  supabaseAnonKey: 'TU_CLAVE_ANON_PUBLICA',
  storageBucket: 'matchpoint-public',
};
