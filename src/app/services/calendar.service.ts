// src/app/services/calendar.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment.prod';

// ==================== INTERFACES ====================

export interface EquipoSimple {
  id: number;
  nombre: string;
  logo_url?: string;
}

export interface CanchaSimple {
  id: number;
  nombre: string;
  ubicacion?: string;
}

export interface ArbitroSimple {
  id: number;
  nombre: string;
  email: string;
}

export interface CalendarMatch {
  id_partido: number;
  fecha: string;  // date
  hora: string;   // time
  fecha_hora: string;  // datetime
  estado: string;
  local: EquipoSimple;
  visitante: EquipoSimple;
  cancha?: CanchaSimple;
  arbitros: ArbitroSimple[];
  score_local?: number;
  score_visitante?: number;
}

export interface CalendarDay {
  dia: number;
  fecha: string;
  partidos: CalendarMatch[];
  tiene_partidos: boolean;
  es_mes_actual: boolean;
}

export interface CalendarMonth {
  año: number;
  mes: number;
  nombre_mes: string;
  semanas: CalendarDay[][];
  total_partidos: number;
  partidos_programados: number;
  partidos_jugados: number;
  partidos_suspendidos: number;
}

export interface CalendarRange {
  fecha_inicio: string;
  fecha_fin: string;
  partidos: CalendarMatch[];
  total_partidos: number;
}

export interface TimeSlot {
  hora: string;
  partidos: CalendarMatch[];
}

export interface DaySchedule {
  fecha: string;
  slots: TimeSlot[];
}

export interface CanchaDisponibilidad {
  id_cancha: number;
  nombre: string;
  disponible: boolean;
  motivo?: string;
}

export interface DisponibilidadResponse {
  fecha: string;
  hora: string;
  canchas: CanchaDisponibilidad[];
}

// ==================== SERVICIO ====================

@Injectable({
  providedIn: 'root'
})
export class CalendarService {
  private baseUrl = `${environment.apiBase}/tournaments`;

  constructor(private http: HttpClient) { }

  // ==================== CALENDARIO MENSUAL ====================

  /**
   * Obtiene el calendario mensual completo
   */
  getMonthCalendar(tournamentId: number, año: number, mes: number): Observable<CalendarMonth> {
    return this.http.get<CalendarMonth>(
      `${this.baseUrl}/${tournamentId}/calendar/month/${año}/${mes}`
    );
  }

  // ==================== RANGO DE FECHAS ====================

  /**
   * Obtiene partidos en un rango de fechas
   */
  getRangeCalendar(
    tournamentId: number,
    fechaInicio: string,
    fechaFin: string
  ): Observable<CalendarRange> {
    const params = new HttpParams()
      .set('fecha_inicio', fechaInicio)
      .set('fecha_fin', fechaFin);

    return this.http.get<CalendarRange>(
      `${this.baseUrl}/${tournamentId}/calendar/range`,
      { params }
    );
  }

  // ==================== HORARIO DE UN DÍA ====================

  /**
   * Obtiene el horario completo de un día
   */
  getDaySchedule(tournamentId: number, fecha: string): Observable<DaySchedule> {
    return this.http.get<DaySchedule>(
      `${this.baseUrl}/${tournamentId}/calendar/day/${fecha}`
    );
  }

  // ==================== DISPONIBILIDAD ====================

  /**
   * Verifica disponibilidad de canchas para una fecha/hora
   */
  checkAvailability(
    tournamentId: number,
    fecha: string,
    hora: string
  ): Observable<DisponibilidadResponse> {
    const params = new HttpParams()
      .set('fecha', fecha)
      .set('hora', hora);

    return this.http.get<DisponibilidadResponse>(
      `${this.baseUrl}/${tournamentId}/calendar/disponibilidad`,
      { params }
    );
  }

  // ==================== PRÓXIMOS PARTIDOS ====================

  /**
   * Obtiene los próximos N partidos
   */
  getNextMatches(tournamentId: number, limit: number = 5): Observable<CalendarMatch[]> {
    return this.http.get<CalendarMatch[]>(
      `${this.baseUrl}/${tournamentId}/calendar/next-matches`,
      { params: { limit: limit.toString() } }
    );
  }

  // ==================== HELPERS DE FECHAS ====================

  /**
   * Formatea una fecha para mostrar en español
   */
  formatDateES(fecha: string): string {
    const date = new Date(fecha);
    const opciones: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };
    return date.toLocaleDateString('es-MX', opciones);
  }

  /**
   * Formatea una hora para mostrar
   */
  formatTime(hora: string): string {
    return hora.substring(0, 5);  // HH:MM
  }

  /**
   * Obtiene el mes actual
   */
  getCurrentMonth(): { año: number; mes: number } {
    const now = new Date();
    return {
      año: now.getFullYear(),
      mes: now.getMonth() + 1  // getMonth() devuelve 0-11
    };
  }

  /**
   * Navega al mes anterior
   */
  getPreviousMonth(año: number, mes: number): { año: number; mes: number } {
    if (mes === 1) {
      return { año: año - 1, mes: 12 };
    }
    return { año, mes: mes - 1 };
  }

  /**
   * Navega al mes siguiente
   */
  getNextMonth(año: number, mes: number): { año: number; mes: number } {
    if (mes === 12) {
      return { año: año + 1, mes: 1 };
    }
    return { año, mes: mes + 1 };
  }

  /**
   * Convierte Date a string YYYY-MM-DD
   */
  dateToString(date: Date): string {
    const año = date.getFullYear();
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const dia = String(date.getDate()).padStart(2, '0');
    return `${año}-${mes}-${dia}`;
  }

  /**
   * Convierte string YYYY-MM-DD a Date
   */
  stringToDate(dateString: string): Date {
    return new Date(dateString + 'T00:00:00');
  }

  // ==================== BADGES DE ESTADO ====================

  /**
   * Obtiene el badge de estado del partido
   */
  getMatchStateBadge(estado: string): { text: string; class: string } {
    switch (estado.toUpperCase()) {
      case 'PROGRAMADO':
        return { text: 'Programado', class: 'badge-info' };
      case 'JUGADO':
      case 'FINALIZADO':
        return { text: 'Finalizado', class: 'badge-success' };
      case 'SUSPENDIDO':
        return { text: 'Suspendido', class: 'badge-warning' };
      case 'CANCELADO':
        return { text: 'Cancelado', class: 'badge-danger' };
      default:
        return { text: estado, class: 'badge-secondary' };
    }
  }

  /**
   * Obtiene el color para un partido en el calendario
   */
  getMatchColor(estado: string): string {
    switch (estado.toUpperCase()) {
      case 'PROGRAMADO':
        return '#3498db';  // Azul
      case 'JUGADO':
      case 'FINALIZADO':
        return '#2ecc71';  // Verde
      case 'SUSPENDIDO':
        return '#f39c12';  // Naranja
      case 'CANCELADO':
        return '#e74c3c';  // Rojo
      default:
        return '#95a5a6';  // Gris
    }
  }
}