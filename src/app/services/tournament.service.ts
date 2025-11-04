// src/app/services/tournament.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { environment } from '../../environment/environment';

export interface Tournament {
  id_torneo: number;
  nombre: string;
  vueltas: number;
  cupos_playoffs: number;
  modalidad: string;
  dias_por_semana: number;
  partidos_por_dia: number;
  hora_ini: string;
  hora_fin: string;
  slot_min: number;
  estado?: string;
  creado_por?: number;
  creado_en?: string;
  usuario_id?: string;
  created_at?: string;
}

export interface Equipo {
  id_equipo: number;
  nombre: string;
  logo_url?: string;
  id_torneo?: number;
}

export interface Arbitro {
  id_torneo: number;
  id_usuario: number;
  activo: number;
}

export interface Match {
  id_partido: number;
  id_torneo: number;
  fecha: string;
  hora: string;
  estado: string;
  cancha: { id: number; nombre: string } | null;
  local: { id: number; nombre: string };
  visitante: { id: number; nombre: string };
}

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
        console.log('✅ Torneos:', tournaments);
      }),
      catchError(error => {
        console.error('❌ Error al obtener torneos:', error);
        console.error('❌ Status:', error.status);
        console.error('❌ Message:', error.message);
        return throwError(() => error);
      })
    );
  }

  getTournament(id: number): Observable<Tournament> {
    console.log('🔵 Obteniendo torneo ID:', id);
    
    return this.http.get<Tournament>(`${this.apiUrl}/tournaments/${id}`).pipe(
      tap(tournament => {
        console.log('✅ Torneo obtenido:', tournament);
      }),
      catchError(error => {
        console.error('❌ Error al obtener torneo:', error);
        return throwError(() => error);
      })
    );
  }

  updateTournament(id: number, data: Partial<Tournament>): Observable<Tournament> {
    console.log('🔵 Actualizando torneo ID:', id, 'con data:', data);
    
    return this.http.put<Tournament>(`${this.apiUrl}/tournaments/${id}`, data).pipe(
      tap(tournament => {
        console.log('✅ Torneo actualizado:', tournament);
      }),
      catchError(error => {
        console.error('❌ Error al actualizar torneo:', error);
        return throwError(() => error);
      })
    );
  }

  deleteTournament(id: number): Observable<any> {
    console.log('🔵 Eliminando torneo ID:', id);
    
    return this.http.delete(`${this.apiUrl}/tournaments/${id}`).pipe(
      tap(() => {
        console.log('✅ Torneo eliminado');
      }),
      catchError(error => {
        console.error('❌ Error al eliminar torneo:', error);
        return throwError(() => error);
      })
    );
  }

  // ========== EQUIPOS (TEAMS) ==========
  getEquipos(tournamentId: number): Observable<Equipo[]> {
    console.log('🔵 Obteniendo equipos del torneo:', tournamentId);
    
    // ✅ RUTA CORRECTA: /tournaments/{id}/teams
    return this.http.get<Equipo[]>(`${this.apiUrl}/tournaments/${tournamentId}/teams`).pipe(
      tap(equipos => {
        console.log('✅ Equipos obtenidos:', equipos.length);
        console.log('✅ Equipos:', equipos);
      }),
      catchError(error => {
        console.error('❌ Error al obtener equipos:', error);
        return throwError(() => error);
      })
    );
  }

  addEquipo(tournamentId: number, data: { nombre: string; logo: string }): Observable<Equipo> {
    console.log('🔵 Agregando equipo:', data);
    
    // ✅ RUTA CORRECTA: /tournaments/{id}/teams
    // Adaptar el campo 'logo' a 'logo_url' que es lo que espera el backend
    const payload = {
      nombre: data.nombre,
      logo_url: data.logo || null
    };
    
    return this.http.post<Equipo>(`${this.apiUrl}/tournaments/${tournamentId}/teams`, payload).pipe(
      tap(equipo => {
        console.log('✅ Equipo agregado:', equipo);
      }),
      catchError(error => {
        console.error('❌ Error al agregar equipo:', error);
        return throwError(() => error);
      })
    );
  }

  deleteEquipo(tournamentId: number, equipoId: number): Observable<any> {
    console.log('🔵 Eliminando equipo:', equipoId);
    
    // ✅ RUTA CORRECTA: /tournaments/{id}/teams/{id_equipo}
    return this.http.delete(`${this.apiUrl}/tournaments/${tournamentId}/teams/${equipoId}`).pipe(
      tap(() => {
        console.log('✅ Equipo eliminado');
      }),
      catchError(error => {
        console.error('❌ Error al eliminar equipo:', error);
        return throwError(() => error);
      })
    );
  }

  // ========== ÁRBITROS (REFEREES) ==========
  getArbitros(tournamentId: number): Observable<Arbitro[]> {
    console.log('🔵 Obteniendo árbitros del torneo:', tournamentId);
    
    // ✅ RUTA CORRECTA: /tournaments/{id}/referees
    return this.http.get<Arbitro[]>(`${this.apiUrl}/tournaments/${tournamentId}/referees`).pipe(
      tap(arbitros => {
        console.log('✅ Árbitros obtenidos:', arbitros.length);
        console.log('✅ Árbitros:', arbitros);
      }),
      catchError(error => {
        console.error('❌ Error al obtener árbitros:', error);
        return throwError(() => error);
      })
    );
  }

  // Nota: El backend de referees usa un sistema de invitación por email
  // Por ahora no implementamos agregar árbitros directamente
  // Para simplificar, comentamos estos métodos
  
  /*
  addArbitro(tournamentId: number, nombre: string): Observable<Arbitro> {
    console.log('🔵 Agregando árbitro:', nombre);
    // El backend actual usa invitaciones por email
    // No hay endpoint directo para agregar árbitros
    return this.http.post<Arbitro>(`${this.apiUrl}/tournaments/${tournamentId}/referees`, { nombre });
  }

  deleteArbitro(tournamentId: number, arbitroId: number): Observable<any> {
    console.log('🔵 Eliminando árbitro:', arbitroId);
    // El backend usa toggle activo, no elimina directamente
    return this.http.delete(`${this.apiUrl}/tournaments/${tournamentId}/referees/${arbitroId}`);
  }
  */

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