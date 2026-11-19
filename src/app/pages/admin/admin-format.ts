const dt = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/** Fecha y hora local de un instante ISO ("8 nov 2026, 12:57"). */
export function dateTime(s?: string | null) { return s ? dt.format(new Date(s)).replace('.', '') : ''; }

export const ACTION_LABEL: Record<string, string> = {
  APPROVE_TOURNAMENT: 'Activó un torneo',
  REVOKE_TOURNAMENT: 'Quitó la activación',
  ADD_PAYMENT: 'Apuntó un cobro',
  DELETE_PAYMENT: 'Borró un cobro',
  RESET_DRAWS: 'Borró los cuadros',
  SHOW_TOURNAMENT: 'Publicó un torneo',
  HIDE_TOURNAMENT: 'Ocultó un torneo',
  BLOCK_USER: 'Bloqueó una cuenta',
  UNBLOCK_USER: 'Desbloqueó una cuenta',
  VERIFY_CLUB: 'Verificó un club',
  REJECT_CLUB: 'Rechazó un club',
};

/** «hace 5 min», «hace 3 h», «hace 2 días», «hace 3 meses». */
export function ago(s?: string | null, now = Date.now()): string {
  if (!s) return '';
  const min = Math.max(0, Math.round((now - new Date(s).getTime()) / 60000));
  if (min < 1) return 'ahora mismo';
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  if (d < 31) return d === 1 ? 'hace 1 día' : `hace ${d} días`;
  const m = Math.round(d / 30);
  return m < 12 ? (m === 1 ? 'hace 1 mes' : `hace ${m} meses`) : 'hace más de un año';
}

export type ActivityLevel = 'active' | 'low' | 'inactive' | 'never';

export interface Activity {
  level: ActivityLevel; label: string;
  /** Última conexión conocida (la registrada por la app o, si no hay, el último inicio de sesión). */
  at: string | null;
  /** Solo hay inicio de sesión de Supabase: dato aproximado (la sesión dura semanas). */
  approx: boolean;
}

const LEVEL_LABEL: Record<ActivityLevel, string> = { active: 'Activo', low: 'Poco activo', inactive: 'Inactivo', never: 'Nunca ha entrado' };

/** Activo: últimos 7 días; poco activo: hasta 30; inactivo: más de 30; nunca: sin datos. */
export function activity(lastSeenAt?: string | null, lastSignInAt?: string | null, now = Date.now()): Activity {
  const at = lastSeenAt ?? lastSignInAt ?? null;
  const approx = !lastSeenAt && !!lastSignInAt;
  if (!at) return { level: 'never', label: LEVEL_LABEL.never, at: null, approx: false };
  const days = (now - new Date(at).getTime()) / 86_400_000;
  const level: ActivityLevel = days <= 7 ? 'active' : days <= 30 ? 'low' : 'inactive';
  return { level, label: LEVEL_LABEL[level], at, approx };
}
