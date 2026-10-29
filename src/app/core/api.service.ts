import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import * as M from './models';

/** Cliente de la API de MatchZone. Todas las llamadas devuelven promesas con errores en español. */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  private run<T>(o: Observable<T>): Promise<T> {
    return firstValueFrom(o).catch((e: HttpErrorResponse) => {
      const msg = e.error?.message
        ?? (e.status === 0 ? 'No se puede conectar con el servidor de MatchZone' : `Error ${e.status}`);
      throw new Error(msg);
    });
  }
  private get<T>(u: string) { return this.run(this.http.get<T>(this.base + u)); }
  private post<T>(u: string, b: unknown = {}) { return this.run(this.http.post<T>(this.base + u, b)); }
  private put<T>(u: string, b: unknown) { return this.run(this.http.put<T>(this.base + u, b)); }
  private patch<T>(u: string, b: unknown) { return this.run(this.http.patch<T>(this.base + u, b)); }
  private del<T = void>(u: string) { return this.run(this.http.delete<T>(this.base + u)); }

  // perfil
  me() { return this.get<M.Profile>('/me'); }
  updateMe(b: { fullName?: string; phone?: string }) { return this.put<M.Profile>('/me', b); }

  // clubes y pistas
  myClubs() { return this.get<M.ClubSummary[]>('/clubs'); }
  club(id: string) { return this.get<M.Club>(`/clubs/${id}`); }
  createClub(b: M.ClubRequest) { return this.post<M.Club>('/clubs', b); }
  updateClub(id: string, b: M.ClubRequest) { return this.put<M.Club>(`/clubs/${id}`, b); }
  deleteClub(id: string) { return this.del(`/clubs/${id}`); }
  addCourt(clubId: string, name?: string) { return this.post<M.Court>(`/clubs/${clubId}/courts`, { name }); }
  updateCourt(id: string, b: Partial<M.Court>) { return this.put<M.Court>(`/courts/${id}`, b); }
  deleteCourt(id: string) { return this.del(`/courts/${id}`); }

  // torneos
  clubTournaments(clubId: string) { return this.get<M.TournamentSummary[]>(`/clubs/${clubId}/tournaments`); }
  createTournament(clubId: string, b: M.TournamentRequest) { return this.post<M.Tournament>(`/clubs/${clubId}/tournaments`, b); }
  tournament(id: string) { return this.get<M.Tournament>(`/tournaments/${id}`); }
  updateTournament(id: string, b: M.TournamentRequest) { return this.put<M.Tournament>(`/tournaments/${id}`, b); }
  deleteTournament(id: string) { return this.del(`/tournaments/${id}`); }
  setDays(id: string, days: M.Day[]) { return this.put<M.Tournament>(`/tournaments/${id}/days`, days); }
  setCourts(id: string, courtIds: string[]) { return this.put<M.Tournament>(`/tournaments/${id}/courts`, courtIds); }
  board(id: string) { return this.get<M.Board>(`/tournaments/${id}/board`); }
  players(id: string) { return this.get<M.Player[]>(`/tournaments/${id}/players`); }

  // patrocinadores
  addSponsor(tid: string, b: Partial<M.Sponsor>) { return this.post<M.Sponsor>(`/tournaments/${tid}/sponsors`, b); }
  updateSponsor(id: string, b: Partial<M.Sponsor>) { return this.put<M.Sponsor>(`/sponsors/${id}`, b); }
  deleteSponsor(id: string) { return this.del(`/sponsors/${id}`); }

  // categorías y parejas
  addCategory(tid: string, b: Partial<M.Category>) { return this.post<M.Category>(`/tournaments/${tid}/categories`, b); }
  updateCategory(id: string, b: Partial<M.Category>) { return this.put<M.Category>(`/categories/${id}`, b); }
  deleteCategory(id: string) { return this.del(`/categories/${id}`); }
  pairs(categoryId: string) { return this.get<M.PairView[]>(`/categories/${categoryId}/pairs`); }
  addPair(categoryId: string, b: M.PairRequest) { return this.post<M.PairView>(`/categories/${categoryId}/pairs`, b); }
  updatePair(id: string, b: M.PairRequest) { return this.put<M.PairView>(`/pairs/${id}`, b); }
  setPairStatus(id: string, status: M.PairStatus) { return this.patch<M.PairView>(`/pairs/${id}/status`, { status }); }
  deletePair(id: string) { return this.del(`/pairs/${id}`); }
  /** Derecho de supresión (RGPD): borra nombre, teléfono y email del jugador sin romper el cuadro. */
  erasePlayer(id: string) { return this.post<M.Player>(`/players/${id}/erase`); }

  // cuadros, horarios y resultados
  generate(tid: string, categoryIds?: string[]) { return this.post<M.DrawSummary>(`/tournaments/${tid}/draw`, { categoryIds }); }
  resetDraw(categoryId: string) { return this.del(`/categories/${categoryId}/draw`); }
  reschedule(tid: string) { return this.post<M.DrawSummary>(`/tournaments/${tid}/reschedule`); }
  saveResult(matchId: string, b: { sets?: number[][]; walkover: boolean; winnerPairId?: string }) {
    return this.put<M.CategoryBoard>(`/matches/${matchId}/result`, b);
  }
  clearResult(matchId: string) { return this.del<M.CategoryBoard>(`/matches/${matchId}/result`); }
  scheduleMatch(matchId: string, b: { courtId?: string | null; playDate?: string | null; startTime?: string | null; locked?: boolean }) {
    return this.put<M.MatchView>(`/matches/${matchId}/schedule`, b);
  }

  // público (invitados)
  publicTournaments() { return this.get<M.TournamentSummary[]>('/public/tournaments'); }
  publicBoard(slug: string) { return this.get<M.Board>(`/public/tournaments/${slug}`); }
  register(slug: string, b: { categoryId: string; player1: M.PlayerInput; player2: M.PlayerInput; notes?: string; unavailabilities: M.Unavailability[];
    privacyAccepted: boolean; website?: string; elapsedMs?: number }) {
    return this.post<{ message: string }>(`/public/tournaments/${slug}/registrations`, b);
  }
}
