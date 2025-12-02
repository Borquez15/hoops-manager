import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

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
  private apiUrl = 'https://hoops-manager-production.up.railway.app';

  constructor(private http: HttpClient) {}

  search(query: string): Observable<SearchResponse> {
    const url = `${this.apiUrl}/tournaments/search?q=${encodeURIComponent(query)}`;
    console.log('🌐 Llamando a:', url);
    
    return this.http.get<SearchResponse>(url).pipe(
      tap(response => console.log('📦 Respuesta del servidor:', response))
    );
  }

  getPublicTournament(id: number): Observable<TorneoPublico> {
    return this.http.get<TorneoPublico>(
      `${this.apiUrl}/tournaments/${id}/public`
    );
  }
}