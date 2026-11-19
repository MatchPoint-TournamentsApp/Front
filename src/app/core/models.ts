// Tipos que devuelve la API (espejo de Views.java / Requests.java)

export type Role = 'USER' | 'CLUB_ADMIN' | 'SUPERADMIN';
export type TournamentStatus = 'DRAFT' | 'REGISTRATION' | 'DRAW_READY' | 'IN_PROGRESS' | 'FINISHED';
export type Gender = 'MASCULINA' | 'FEMENINA' | 'MIXTA' | 'OPEN';
export type CategoryFormat = 'KNOCKOUT' | 'KNOCKOUT_CONSOLATION' | 'LEAGUE';
/** Formato de los partidos: solo cambia cómo se muestra el 3.er set («Super TB» o «Set 3»). */
export type MatchFormat = 'SUPER_TIEBREAK' | 'THREE_SETS';
export type PairStatus = 'PENDING' | 'CONFIRMED' | 'WITHDRAWN';
export type SponsorTier = 'PRINCIPAL' | 'COLABORADOR';
export type Stage = 'MAIN' | 'CONSOLATION' | 'GROUP' | 'FINAL' | 'CONSOLATION_FINAL' | 'THIRD_PLACE';
export type MatchStatus = 'PENDING' | 'PLAYED' | 'WALKOVER' | 'BYE';

/** Verificación de la entidad del club por MatchZone. */
export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';
/** Cargo de quien da de alta el club en la entidad. */
export type ClubRole = 'PRESIDENT' | 'SECRETARY' | 'TREASURER' | 'BOARD_MEMBER' | 'OWNER' | 'MANAGER' | 'STAFF';
export interface ClubSummary { id: string; name: string; slug: string; city?: string; logoUrl?: string; verificationStatus: VerificationStatus; }
export interface Profile {
  id: string; fullName?: string; phone?: string; email?: string; role: Role; clubs: ClubSummary[];
  /** Cuenta bloqueada por el administrador de MatchZone. */
  blockedAt?: string | null; blockedReason?: string | null;
}
export interface OpeningHour { dayOfWeek: number; openTime: string; closeTime: string; }
export interface Court { id: string; name: string; position: number; indoor: boolean; featured: boolean; active: boolean; }
export interface Club {
  id: string; name: string; slug: string; address?: string; city?: string; province?: string; postalCode?: string;
  phone?: string; email?: string; website?: string; instagram?: string; logoUrl?: string; description?: string;
  courts: Court[]; openingHours: OpeningHour[];

  /** Datos de la entidad y estado de la verificación. */
  legalName?: string; taxId?: string; fiscalAddress?: string; contactRole?: ClubRole;
  verificationStatus: VerificationStatus; rejectionReason?: string | null;
}
export interface ClubRequest {
  name: string; address?: string; city?: string; province?: string; postalCode?: string; phone?: string;
  email?: string; website?: string; instagram?: string; logoUrl?: string; description?: string;
  courtCount?: number; openingHours?: OpeningHour[];
  /** Solo en el alta: acepta condiciones y encargo de tratamiento de datos (RGPD). */
  termsAccepted?: boolean;
  legalName?: string; taxId?: string; fiscalAddress?: string; contactRole?: ClubRole;
  /** Solo en el alta: declaración responsable de que puede representar a la entidad. */
  declarationAccepted?: boolean;
}
export interface TournamentSummary {
  id: string; name: string; slug: string; startDate: string; endDate: string; status: TournamentStatus;
  registrationOpen: boolean; categories: number; pairs: number; clubName: string; clubLogoUrl?: string;
  city?: string; primaryColor: string;
}
/** Día de juego. {@code courtCount}: pistas que el club dedica al torneo ese día (vacío = todas). */
export interface Day {
  playDate: string; startTime: string; endTime: string; courtCount?: number | null;
  /** false: ese día el club no admite restricciones horarias (por defecto, sí). */
  restrictionsAllowed?: boolean;
}
/** Restricciones que se quitarían al guardar los días. */
export interface RestrictionLoss { date: string; pairs: string[]; }
export interface Category {
  id: string; name: string; gender: Gender; level?: string; format: CategoryFormat; groupCount: number;
  splitDraws?: boolean | null; maxPairs?: number | null; matchDurationMinutes?: number | null; color?: string;
  position: number; drawGenerated: boolean; confirmedPairs: number; pendingPairs: number;
}
export interface Sponsor { id: string; name: string; logoUrl?: string; website?: string; tier: SponsorTier; position: number; }
export interface Tournament {
  id: string; clubId: string; name: string; slug: string; description?: string; rules?: string; organizerNotes?: string;
  startDate: string; endDate: string; status: TournamentStatus; registrationOpen: boolean; onlinePaymentEnabled: boolean;
  entryFee?: number; matchDurationMinutes: number; minRestMinutes: number; courtStaggerMinutes: number;
  splitThreshold: number; scoringFormat: string; primaryColor: string; publicVisible: boolean; courtIds: string[];
  days: Day[]; categories: Category[]; sponsors: Sponsor[];
  /** Duración por franjas horarias (vacío = la general o la de cada categoría en todo el torneo). */
  durationBands?: DurationBand[];
  /** Pistas por tramos horarios (vacío = el número de pistas de cada día). */
  courtBands?: CourtBand[];
  /** Semifinales y finales obligatoriamente el último día (que no admite restricciones). */
  finalsLastDay?: boolean;
  /** Formato general de los partidos (cada partido puede cambiarlo). */
  matchFormat?: MatchFormat;
  /** Precios por jugador (entryFee = general 1.ª): 2.ª inscripción y de alumno; vacíos = ver Ajustes. */
  entryFeeSecond?: number | null; entryFeeStudent?: number | null; entryFeeStudentSecond?: number | null;
  /** Primer día y hora de juego (hora de España): desde entonces los cuadros quedan bloqueados. */
  startsAt?: string | null; started: boolean;
  /** Hay cambios desde la última generación de cuadros. */
  drawsOutdated: boolean;
  /** MatchZone ha activado el torneo (tras el pago). canGenerate también es true para el superadministrador. */
  generationApproved: boolean; generationRequestedAt?: string | null; canGenerate: boolean;
}
/** Franja con otra duración: los partidos que EMPIEZAN en ella duran «minutes» (manda sobre la categoría). */
export interface DurationBand { playDate: string; fromTime: string; toTime: string; minutes: number; }
/** Tramo con otro número de pistas: el horario generado no pone más partidos a la vez. No limita el panel de control. */
export interface CourtBand { playDate: string; fromTime: string; toTime: string; courts: number; }
/** ¿Caben todos los partidos en las horas de pista? */
export interface DayCapacity { date: string; courtHours: number; }
export interface Capacity {
  courtHours: number; days: DayCapacity[]; matches: number; maxMatches: number; neededHours?: number | null;
  ok: boolean; tight: boolean; message: string;
  /** Con semis y finales el último día: cuántas hay y cuántas caben ese día. */
  lastDayMatches?: number | null; lastDayMax?: number | null;
}
export interface TournamentRequest {
  name: string; description?: string; rules?: string; organizerNotes?: string; startDate: string; endDate: string;
  matchDurationMinutes?: number; minRestMinutes?: number; courtStaggerMinutes?: number; splitThreshold?: number;
  entryFee?: number | null; scoringFormat?: string; primaryColor?: string; registrationOpen?: boolean;
  onlinePaymentEnabled?: boolean; publicVisible?: boolean; courtIds?: string[]; matchFormat?: MatchFormat;
  entryFeeSecond?: number | null; entryFeeStudent?: number | null; entryFeeStudentSecond?: number | null;
}
export interface TrashedTournament { id: string; name: string; startDate: string; endDate: string; deletedAt: string; purgeAt: string; }
export interface Player { id: string; fullName: string; phone?: string; email?: string; student?: boolean; }
export interface PlayerInput { fullName: string; phone?: string; email?: string; }
export interface Unavailability { playDate: string; fromTime?: string | null; toTime?: string | null; note?: string; }
export interface PairView {
  id: string; categoryId: string; player1: Player; player2: Player; seed?: number | null; status: PairStatus;
  source: 'ORGANIZER' | 'PUBLIC'; paymentStatus: string; notes?: string; groupLabel?: string; unavailabilities: Unavailability[];
}
export interface PairRequest {
  player1: PlayerInput; player2: PlayerInput; seed?: number | null; notes?: string;
  unavailabilities: Unavailability[]; status?: PairStatus;
}

export interface SlotView { pairId?: string; empty: boolean; placeholder?: string; sourceType: string; sourceMatchId?: string; }
export interface MatchView {
  id: string; number: number; stage: Stage; drawLabel?: string; groupLabel?: string; round: number; position: number;
  roundName?: string; slot1: SlotView; slot2: SlotView; courtId?: string; courtName?: string; courtFeatured: boolean;
  playDate?: string; startTime?: string; locked: boolean; status: MatchStatus; score?: number[][];
  winnerPairId?: string; warning?: string;
  /** En pista ahora mismo (el club lo empezó y aún no tiene resultado). */
  live: boolean; startedAt?: string;
  /** Comentario público del club (p. ej. la sede donde se juega). */
  note?: string;
  /** Formato propio del partido (vacío = el del torneo). */
  matchFormat?: MatchFormat | null;
}
/** Pareja con problemas de horario (solo el club: incluye contacto). */
export interface ConflictPlayer { fullName: string; phone?: string; email?: string; }
export interface ConflictMatch { matchId: string; number: number; roundName?: string; playDate: string; startTime: string; sure: boolean; reason: string; }
export interface PairConflict { pairId: string; categoryId: string; categoryName: string; player1: ConflictPlayer; player2: ConflictPlayer; matches: ConflictMatch[]; }
/** Pago de inscripción de un jugador de una pareja (slot 1 o 2). */
export interface PlayerPayment {
  pairId: string; slot: 1 | 2; playerId?: string; fullName: string; phone?: string; pairStatus: PairStatus; paidAt?: string | null;
  /** Nº de inscripción del jugador en el torneo (1 = la primera), su precio (null sin precios) y si es alumno. */
  order?: number; price?: number | null; student?: boolean;
}
/** Una inscripción de un jugador con su orden y precio. */
export interface InscriptionCharge {
  pairId: string; slot: 1 | 2; categoryId: string; categoryName: string; order: number; price?: number | null;
  paidAt?: string | null; pairStatus: PairStatus;
}
/** Lo que debe un jugador (importes null si el torneo no tiene precio). */
export interface PlayerAccount {
  playerId: string; fullName: string; phone?: string; student: boolean; inscriptions: InscriptionCharge[];
  total?: number | null; paid?: number | null; pending?: number | null;
}
export interface PlayerAccounts { priced: boolean; total?: number | null; paid?: number | null; pending?: number | null; players: PlayerAccount[]; }
export interface CategoryPayments { categoryId: string; categoryName: string; players: PlayerPayment[]; }
export interface BoardPair { id: string; player1: string; player2: string; seed?: number; groupLabel?: string; }
export interface Standing { pairId: string; played: number; won: number; lost: number; setsFor: number; setsAgainst: number; gamesFor: number; gamesAgainst: number; }
export interface CategoryBoard { category: Category; pairs: BoardPair[]; matches: MatchView[]; standings: Record<string, Standing[]>; }
export interface ClubPublic { id: string; name: string; address?: string; city?: string; logoUrl?: string; website?: string; instagram?: string; phone?: string; }
export interface Board { tournament: Tournament; club: ClubPublic; courts: Court[]; categories: CategoryBoard[]; }
export interface DrawSummary { categories: number; matches: number; scheduled: number; unscheduled: number; warnings: number; messages: string[]; }

// ------------------------------------------------------------ administración (solo SUPERADMIN)
export type PaymentMethod = 'BIZUM' | 'EFECTIVO' | 'TRANSFERENCIA' | 'OTRO';
export interface PaymentRequest { amount: number; method: PaymentMethod; paidOn: string; note?: string; }
export interface AdminOverview { users: number; blockedUsers: number; clubs: number; tournaments: number; pendingRequests: number; newMessages: number; pendingClubs: number; }
export interface AdminClub {
  id: string; name: string; city?: string; province?: string; phone?: string; email?: string; website?: string;
  legalName?: string; taxId?: string; taxIdKind?: string; fiscalAddress?: string; contactRole?: ClubRole | null;
  verificationStatus: VerificationStatus; rejectionReason?: string | null; verifiedAt?: string | null; createdAt: string;
  ownerName?: string; ownerEmail?: string; ownerPhone?: string; tournaments: number; sameTaxId: number;
}
/** Formulario de contacto: soporte va a support@, el resto a info@. */
export type ContactReason = 'ORGANIZE' | 'SUPPORT' | 'OTHER' | 'SUGGESTION';
export interface ContactRequest {
  reason: ContactReason; name?: string; email?: string; club?: string; phone?: string; message: string;
  privacyAccepted: boolean; website?: string; elapsedMs?: number;
}
export interface AdminContactMessage {
  id: string; reason: ContactReason; name?: string | null; email?: string | null; phone?: string | null; club?: string | null; message: string;
  emailSent: boolean; handledAt?: string | null; replyText?: string | null; repliedAt?: string | null; createdAt: string;
}
export interface AdminTournament {
  id: string; name: string; slug: string; startDate: string; endDate: string; status: TournamentStatus; publicVisible: boolean;
  generationRequestedAt?: string | null; generationApprovedAt?: string | null;
  clubId: string; clubName: string; city?: string; clubPhone?: string; clubEmail?: string;
  ownerName?: string; ownerEmail?: string; ownerPhone?: string;
  confirmedPairs: number; generatedCategories: number; paid: number;
  /** En la papelera desde esta fecha. */
  deletedAt?: string | null;
}
export interface AdminUser {
  id: string; fullName?: string; email?: string; phone?: string; role: Role; createdAt?: string;
  blockedAt?: string | null; blockedReason?: string | null; clubs: number; tournaments: number;
}
export interface AdminPayment {
  id: string; tournamentId?: string | null; tournamentName: string; clubName: string; amount: number;
  method: PaymentMethod; paidOn: string; note?: string | null; createdAt?: string;
}
export interface AdminAction {
  id: string; adminEmail?: string; action: string; targetType?: string; targetId?: string; detail?: string; createdAt: string;
}
