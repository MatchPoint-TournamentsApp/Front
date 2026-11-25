/**
 * Configuración del frontal. Rellena con los datos de tu proyecto de Supabase
 * (Project Settings -> API): URL y clave pública "anon" / "publishable".
 */
export const environment = {
  // En desarrollo, ng serve redirige /api a http://localhost:8080 (proxy.conf.json).
  // En producción pon la URL completa del backend, p. ej. 'https://api.tudominio.es/api'.
  apiUrl: '/api',
  supabaseUrl: 'https://TU-PROYECTO.supabase.co',
  supabaseAnonKey: 'TU_CLAVE_ANON_PUBLICA',
  storageBucket: 'matchpoint-public',
  // Solo si Supabase se usa a través de un intermediario: el nombre de sesión de siempre (sb-<proyecto>-auth-token)
  supabaseStorageKey: '',
};
