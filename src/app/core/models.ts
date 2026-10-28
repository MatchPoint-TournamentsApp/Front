// Tipos que devuelve la API (espejo de Views.java / Requests.java)

export type Role = 'USER' | 'CLUB_ADMIN' | 'SUPERADMIN';
export type TournamentStatus = 'DRAFT' | 'REGISTRATION' | 'DRAW_READY' | 'IN_PROGRESS' | 'FINISHED';
export type Gender = 'MASCULINA' | 'FEMENINA' | 'MIXTA' | 'OPEN';
export type CategoryFormat = 'KNOCKOUT' | 'KNOCKOUT_CONSOLATION' | 'LEAGUE';
export type PairStatus = 'PENDING' | 'CONFIRMED' | 'WITHDRAWN';
export type SponsorTier = 'PRINCIPAL' | 'COLABORADOR';
export type Stage = 'MAIN' | 'CONSOLATION' | 'GROUP' | 'FINAL' | 'CONSOLATION_FINAL' | 'THIRD_PLACE';
export type MatchStatus = 'PENDING' | 'PLAYED' | 'WALKOVER' | 'BYE';

export interface ClubSummary { id: string; name: string; slug: string; city?: string; logoUrl?: string; }
export interface Profile { id: string; fullName?: string; phone?: string; email?: string; role: Role; clubs: ClubSummary[]; }
export interface OpeningHour { dayOfWeek: number; openTime: string; closeTime: string; }
export interface Court { id: string; name: string; position: number; indoor: boolean; featured: boolean; active: boolean; }
export interface Club {
  id: string; name: string; slug: string; address?: string; city?: string; province?: string; postalCode?: string;
  phone?: string; email?: string; website?: string; instagram?: string; logoUrl?: string; description?: string;
  courts: Court[]; openingHours: OpeningHour[];
}
export interface ClubRequest {
  name: string; address?: string; city?: string; province?: string; postalCode?: string; phone?: string;
  email?: string; website?: string; instagram?: string; logoUrl?: string; description?: string;
  courtCount?: number; openingHours?: OpeningHour[];
}
export interface TournamentSummary {
  id: string; name: string; slug: string; startDate: string; endDate: string; status: TournamentStatus;
  registrationOpen: boolean; categories: number; pairs: number; clubName: string; clubLogoUrl?: string;
  city?: string; primaryColor: string;
}
export interface Day { playDate: string; startTime: string; endTime: string; }
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
}
export interface TournamentRequest {
  name: string; description?: string; rules?: string; organizerNotes?: string; startDate: string; endDate: string;
  matchDurationMinutes?: number; minRestMinutes?: number; courtStaggerMinutes?: number; splitThreshold?: number;
  entryFee?: number | null; scoringFormat?: string; primaryColor?: string; registrationOpen?: boolean;
  onlinePaymentEnabled?: boolean; publicVisible?: boolean; courtIds?: string[];
}
export interface Player { id: string; fullName: string; phone?: string; email?: string; }
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
}
export interface BoardPair { id: string; player1: string; player2: string; seed?: number; groupLabel?: string; }
export interface Standing { pairId: string; played: number; won: number; lost: number; setsFor: number; setsAgainst: number; gamesFor: number; gamesAgainst: number; }
export interface CategoryBoard { category: Category; pairs: BoardPair[]; matches: MatchView[]; standings: Record<string, Standing[]>; }
export interface ClubPublic { id: string; name: string; address?: string; city?: string; logoUrl?: string; website?: string; instagram?: string; phone?: string; }
export interface Board { tournament: Tournament; club: ClubPublic; courts: Court[]; categories: CategoryBoard[]; }
export interface DrawSummary { categories: number; matches: number; scheduled: number; unscheduled: number; warnings: number; messages: string[]; }
