import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment';

export interface Player {
  id_equipo: number;
  dorsal: number;
  activo: boolean;
  persona: {
    id_jugador: number;
    curp: string;
    nombres: string;
    ap_p: string;
    ap_m?: string;
    edad?: number;
  };
}

@Injectable({ providedIn: 'root' })
export class TeamPlayersService {
  private apiUrl = environment.apiBase || 'http://localhost:8000';

  constructor(private http: HttpClient) {}

  listarJugadores(id_equipo: number): Observable<Player[]> {
    return this.http.get<Player[]>(`${this.apiUrl}/teams/${id_equipo}/players`);
  }

  crearJugador(id_equipo: number, data: any): Observable<Player> {
    return this.http.post<Player>(`${this.apiUrl}/teams/${id_equipo}/players`, data);
  }

  eliminarJugador(id_equipo: number, dorsal: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/teams/${id_equipo}/players/${dorsal}`);
  }
}
