// src/app/services/referee.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment.prod';

// ==================== INTERFACES ====================

export interface Referee {
  id_usuario: number;
  nombre: string;
  ap_p: string;
  ap_m?: string;
  email: string;
  activo: boolean;
}

export interface RefereeInvite {
  id_inv: number;
  email: string;
  estado: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
  enviado_en: string;
  expira_en: string;
  aceptado_en?: string;
  rechazado_en?: string;
  nombre_arbitro?: string;
}

export interface InviteStatus {
  torneo: string;
  email: string;
  estado: string;
  expira_en: string;
}

export interface AcceptInviteResponse {
  message: string;
  torneo_id: number;
  torneo_nombre: string;
}

// ==================== SERVICIO ====================

@Injectable({
  providedIn: 'root'
})
export class RefereeService {
  private baseUrl = `${environment.apiBase}/tournaments`;

  constructor(private http: HttpClient) { }

  // ==================== INVITACIONES ====================

  /**
   * Envía una invitación a un árbitro por email
   */
  sendInvite(tournamentId: number, email: string, diasValidez: number = 7): Observable<any> {
    return this.http.post(
      `${this.baseUrl}/${tournamentId}/referee-invites`,
      { email, dias_validez: diasValidez }
    );
  }

  /**
   * Lista todas las invitaciones del torneo
   */
  listInvites(tournamentId: number, estado?: string): Observable<RefereeInvite[]> {
    let url = `${this.baseUrl}/${tournamentId}/referee-invites`;
    if (estado) {
      url += `?estado=${estado}`;
    }
    return this.http.get<RefereeInvite[]>(url);
  }

  /**
   * Consulta el estado de una invitación (NO requiere auth)
   */
  checkInviteStatus(token: string): Observable<InviteStatus> {
    // Este endpoint no requiere autenticación
    return this.http.get<InviteStatus>(
      `${environment.apiBase}/tournaments/0/referee-invites/check/${token}`
    );
  }

  /**
   * Acepta una invitación (requiere auth)
   */
  acceptInvite(token: string): Observable<AcceptInviteResponse> {
    // Extraemos torneo_id de alguna forma o usamos 0 como placeholder
    // El backend lo extrae del token
    return this.http.post<AcceptInviteResponse>(
      `${environment.apiBase}/tournaments/0/referee-invites/accept/${token}`,
      {}
    );
  }

  /**
   * Rechaza una invitación (NO requiere auth)
   */
  declineInvite(token: string): Observable<any> {
    return this.http.post(
      `${environment.apiBase}/tournaments/0/referee-invites/decline/${token}`,
      {}
    );
  }

  /**
   * Cancela/elimina una invitación pendiente
   */
  deleteInvite(tournamentId: number, inviteId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/${tournamentId}/referee-invites/${inviteId}`
    );
  }

  // ==================== ÁRBITROS DEL TORNEO ====================

  /**
   * Lista todos los árbitros del torneo
   */
  listReferees(tournamentId: number, activo?: boolean): Observable<Referee[]> {
    let url = `${this.baseUrl}/${tournamentId}/referees`;
    if (activo !== undefined) {
      url += `?activo=${activo}`;
    }
    return this.http.get<Referee[]>(url);
  }

  /**
   * Activa o desactiva un árbitro
   */
  toggleReferee(tournamentId: number, userId: number, activo: boolean): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}/${tournamentId}/referees/${userId}/toggle`,
      { activo }
    );
  }

  /**
   * Elimina un árbitro del torneo
   */
  removeReferee(tournamentId: number, userId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/${tournamentId}/referees/${userId}`
    );
  }

  /**
   * Obtiene los partidos asignados a un árbitro
   */
  getRefereeMatches(tournamentId: number, userId: number): Observable<number[]> {
    return this.http.get<number[]>(
      `${this.baseUrl}/${tournamentId}/referees/${userId}/matches`
    );
  }

  // ==================== ASIGNACIÓN A PARTIDOS ====================

  /**
   * Asigna un árbitro a un partido
   */
  assignToMatch(tournamentId: number, matchId: number, userId: number): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}/${tournamentId}/referees/matches/${matchId}/assign`,
      { id_usuario: userId }
    );
  }

  /**
   * Quita un árbitro de un partido
   */
  unassignFromMatch(tournamentId: number, matchId: number, userId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/${tournamentId}/referees/matches/${matchId}/assign/${userId}`
    );
  }

  /**
   * Obtiene los árbitros asignados a un partido
   */
  getMatchReferees(tournamentId: number, matchId: number): Observable<Referee[]> {
    return this.http.get<Referee[]>(
      `${this.baseUrl}/${tournamentId}/referees/matches/${matchId}/assigned`
    );
  }

  // ==================== HELPERS ====================

  /**
   * Formatea el nombre completo del árbitro
   */
  getFullName(referee: Referee): string {
    const partes = [referee.nombre, referee.ap_p, referee.ap_m];
    return partes.filter(p => p).join(' ');
  }

  /**
   * Obtiene el badge de estado de invitación
   */
  getInviteStateBadge(estado: string): { text: string; class: string } {
    switch (estado) {
      case 'PENDING':
        return { text: 'Pendiente', class: 'badge-warning' };
      case 'ACCEPTED':
        return { text: 'Aceptado', class: 'badge-success' };
      case 'DECLINED':
        return { text: 'Rechazado', class: 'badge-danger' };
      case 'EXPIRED':
        return { text: 'Expirado', class: 'badge-secondary' };
      default:
        return { text: estado, class: 'badge-secondary' };
    }
  }
}