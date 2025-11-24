import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TorneoPublico {
  id_torneo: number;
  nombre: string;
  modalidad: string;
  estado: string;
  vueltas: number;
  cupos_playoffs: number;
  hora_ini?: string;
  hora_fin?: string;
}

export interface SearchResponse {
  match: TorneoPublico | null;
  suggestions: TorneoPublico[];
}

@Injectable({
  providedIn: 'root'
})
export class TournamentSearchService {
  private apiUrl = 'http://localhost:8000';

  constructor(private http: HttpClient) {}

  search(query: string): Observable<SearchResponse> {
    return this.http.get<SearchResponse>(
      `${this.apiUrl}/tournaments/search?q=${encodeURIComponent(query)}`
    );
  }

  getPublicTournament(id: number): Observable<TorneoPublico> {
    return this.http.get<TorneoPublico>(
      `${this.apiUrl}/tournaments/${id}/public`
    );
  }
}