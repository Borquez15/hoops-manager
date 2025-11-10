// src/app/services/tournament.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { environment } from '../../environment/environment';
import { Tournament, Equipo, Arbitro, Match } from '../models/tournament.model';

@Injectable({
  providedIn: 'root'
})
export class TournamentService {
  private apiUrl = environment.apiBase || 'http://localhost:8000';

  constructor(private http: HttpClient) {
    console.log('🔵 TournamentService inicializado');
    console.log('🔵 API URL:', this.apiUrl);
  }

  // ========== TORNEOS ==========
  getTournaments(): Observable<Tournament[]> {
    console.log('🔵 Obteniendo lista de torneos...');
    console.log('🔵 Token en localStorage:', !!localStorage.getItem('auth_token'));
    
    return this.http.get<Tournament[]>(`${this.apiUrl}/tournaments`).pipe(
      tap(tournaments => {
        console.log('✅ Torneos obtenidos:', tournaments.length);
      }),
      catchError(error => {
        console.error('❌ Error al obtener torneos:', error);
        return throwError(() => error);
      })
    );
  }

  getTournament(id: number): Observable<Tournament> {
    console.log('🔵 Obteniendo torneo ID:', id);
    return this.http.get<Tournament>(`${this.apiUrl}/tournaments/${id}`).pipe(
      tap(tournament => console.log('✅ Torneo obtenido:', tournament)),
      catchError(error => {
        console.error('❌ Error al obtener torneo:', error);
        return throwError(() => error);
      })
    );
  }

  updateTournament(id: number, data: Partial<Tournament>): Observable<Tournament> {
    console.log('🔵 Actualizando torneo ID:', id, 'con data:', data);
    return this.http.put<Tournament>(`${this.apiUrl}/tournaments/${id}`, data).pipe(
      tap(tournament => console.log('✅ Torneo actualizado:', tournament)),
      catchError(error => {
        console.error('❌ Error al actualizar torneo:', error);
        return throwError(() => error);
      })
    );
  }

  deleteTournament(id: number): Observable<any> {
    console.log('🔵 Eliminando torneo ID:', id);
    return this.http.delete(`${this.apiUrl}/tournaments/${id}`).pipe(
      tap(() => console.log('✅ Torneo eliminado')),
      catchError(error => {
        console.error('❌ Error al eliminar torneo:', error);
        return throwError(() => error);
      })
    );
  }

  // ========== EQUIPOS (TEAMS) ==========
  getEquipos(tournamentId: number): Observable<Equipo[]> {
    console.log('🔵 Obteniendo equipos del torneo:', tournamentId);
    return this.http.get<Equipo[]>(`${this.apiUrl}/tournaments/${tournamentId}/teams`).pipe(
      tap(equipos => console.log('✅ Equipos obtenidos:', equipos.length)),
      catchError(error => {
        console.error('❌ Error al obtener equipos:', error);
        return throwError(() => error);
      })
    );
  }

  // 🔹 Nuevo método: subir equipo con archivo (FormData)
  addEquipoFormData(tournamentId: number, formData: FormData): Observable<Equipo> {
    console.log('🔵 Enviando equipo con FormData:', [...formData.entries()]);
    return this.http.post<Equipo>(`${this.apiUrl}/tournaments/${tournamentId}/teams`, formData).pipe(
      tap(equipo => console.log('✅ Equipo agregado (FormData):', equipo)),
      catchError(error => {
        console.error('❌ Error al agregar equipo (FormData):', error);
        return throwError(() => error);
      })
    );
  }

  // Versión JSON anterior (por compatibilidad)
  addEquipo(tournamentId: number, data: { nombre: string; logo: string }): Observable<Equipo> {
    console.log('🔵 Agregando equipo (JSON):', data);
    const payload = {
      nombre: data.nombre,
      logo_url: data.logo || null
    };
    return this.http.post<Equipo>(`${this.apiUrl}/tournaments/${tournamentId}/teams`, payload).pipe(
      tap(equipo => console.log('✅ Equipo agregado (JSON):', equipo)),
      catchError(error => {
        console.error('❌ Error al agregar equipo (JSON):', error);
        return throwError(() => error);
      })
    );
  }

  deleteEquipo(tournamentId: number, equipoId: number): Observable<any> {
    console.log('🔵 Eliminando equipo:', equipoId);
    return this.http.delete(`${this.apiUrl}/tournaments/${tournamentId}/teams/${equipoId}`).pipe(
      tap(() => console.log('✅ Equipo eliminado')),
      catchError(error => {
        console.error('❌ Error al eliminar equipo:', error);
        return throwError(() => error);
      })
    );
  }

  // ========== ÁRBITROS (REFEREES) ==========
  getArbitros(tournamentId: number): Observable<Arbitro[]> {
    console.log('🔵 Obteniendo árbitros del torneo:', tournamentId);
    return this.http.get<Arbitro[]>(`${this.apiUrl}/tournaments/${tournamentId}/referees`).pipe(
      tap(arbitros => console.log('✅ Árbitros obtenidos:', arbitros.length)),
      catchError(error => {
        console.error('❌ Error al obtener árbitros:', error);
        return throwError(() => error);
      })
    );
  }

  // ========== PARTIDOS/CALENDARIO ==========
  getMatches(tournamentId: number, start?: string, end?: string): Observable<Match[]> {
    let url = `${this.apiUrl}/tournaments/${tournamentId}/matches`;
    const params: string[] = [];
    if (start) params.push(`start=${start}`);
    if (end) params.push(`end=${end}`);
    if (params.length) url += `?${params.join('&')}`;
    return this.http.get<Match[]>(url);
  }

  autoSchedule(tournamentId: number, start?: string, replace: boolean = false): Observable<any> {
    let url = `${this.apiUrl}/tournaments/${tournamentId}/matches/auto-schedule?replace=${replace}`;
    if (start) url += `&start=${start}`;
    return this.http.post(url, {});
  }

  updateMatch(tournamentId: number, matchId: number, data: any): Observable<Match> {
    return this.http.patch<Match>(`${this.apiUrl}/tournaments/${tournamentId}/matches/${matchId}`, data);
  }
}