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
};
