import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment.prod';
export type Modalidad = '3v3' | '5v5';
export type EstadoTorneo = 'DRAFT' | 'ACTIVO' | 'FINALIZADO';

export interface Torneo {
  id_torneo?: number;
  nombre: string;
  vueltas: number;
  cupos_playoffs: number;
  formato_playoffs?: string; // ✅ AGREGAR ESTA LÍNEA
  modalidad: string;
  estado?: string;
  dias_por_semana: number;
  partidos_por_dia: number;
  hora_ini: string;
  hora_fin: string;
  slot_min: number;
  creado_por?: number;
  creado_en?: string;
}

export interface SearchResponse {
  match: Torneo | null;
  suggestions: Torneo[];
}

@Injectable({ providedIn: 'root' })
export class TournamentsService {
  private http = inject(HttpClient);

  search(q: string, limit = 10): Observable<SearchResponse> {
    const params = new HttpParams().set('q', q).set('limit', limit);
    return this.http.get<SearchResponse>(`${environment.apiBase}/tournaments/search`, { params });
  }

  getById(id: number): Observable<Torneo> {
    return this.http.get<Torneo>(`${environment.apiBase}/tournaments/by-id/${id}`);
  }
}