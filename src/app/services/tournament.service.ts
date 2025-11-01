// src/app/services/tournament.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
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
  usuario_id?: string;
  created_at?: string;
}

export interface Arbitro {
  id: number;
  nombre: string;
}

export interface Equipo {
  id_equipo: number;
  nombre: string;
  logo: string;
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

  constructor(private http: HttpClient) {}

  // Torneos
  getTournaments(): Observable<Tournament[]> {
    return this.http.get<Tournament[]>(`${this.apiUrl}/tournaments`);
  }

  getTournament(id: number): Observable<Tournament> {
    return this.http.get<Tournament>(`${this.apiUrl}/tournaments/${id}`);
  }

  updateTournament(id: number, data: Partial<Tournament>): Observable<Tournament> {
    return this.http.put<Tournament>(`${this.apiUrl}/tournaments/${id}`, data);
  }

  deleteTournament(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/tournaments/${id}`);
  }

  // Árbitros
  getArbitros(tournamentId: number): Observable<Arbitro[]> {
    return this.http.get<Arbitro[]>(`${this.apiUrl}/tournaments/${tournamentId}/arbitros`);
  }

  addArbitro(tournamentId: number, nombre: string): Observable<Arbitro> {
    return this.http.post<Arbitro>(`${this.apiUrl}/tournaments/${tournamentId}/arbitros`, { nombre });
  }

  deleteArbitro(tournamentId: number, arbitroId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/tournaments/${tournamentId}/arbitros/${arbitroId}`);
  }

  // Equipos
  getEquipos(tournamentId: number): Observable<Equipo[]> {
    return this.http.get<Equipo[]>(`${this.apiUrl}/tournaments/${tournamentId}/equipos`);
  }

  addEquipo(tournamentId: number, data: { nombre: string; logo: string }): Observable<Equipo> {
    return this.http.post<Equipo>(`${this.apiUrl}/tournaments/${tournamentId}/equipos`, data);
  }

  deleteEquipo(tournamentId: number, equipoId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/tournaments/${tournamentId}/equipos/${equipoId}`);
  }

  // Partidos/Calendario
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