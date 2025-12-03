import { Injectable } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap, timeout } from 'rxjs/operators';

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

// ✅ Token para deshabilitar el interceptor en esta petición
export const SKIP_AUTH = 'SKIP_AUTH';

@Injectable({
  providedIn: 'root'
})
export class TournamentSearchService {
  private apiUrl = 'https://hoopsbackend-production.up.railway.app';

  constructor(private http: HttpClient) {}

  search(query: string): Observable<SearchResponse> {
    const url = `${this.apiUrl}/tournaments/search?q=${encodeURIComponent(query)}`;
    console.log('🌐 Llamando a:', url);
    
    // ✅ Petición sin autenticación y con timeout
    return this.http.get<SearchResponse>(url, {
      // No enviar credenciales
      withCredentials: false,
      
      // Agregar headers explícitos
      headers: {
        'Content-Type': 'application/json'
      }
    }).pipe(
      timeout(10000), // ✅ Timeout de 10 segundos
      tap(response => console.log('📦 Respuesta del servidor:', response))
    );
  }

  getPublicTournament(id: number): Observable<TorneoPublico> {
    return this.http.get<TorneoPublico>(
      `${this.apiUrl}/tournaments/${id}/public`,
      {
        withCredentials: false,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    ).pipe(
      timeout(10000)
    );
  }
}