import { Component, EventEmitter, Input, Output, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ModalBaseComponent } from '../shared/modal-base/modal-base.component';

interface CalendarDay {
  dia: number;
  fecha: string;
  partidos: any[];
  tiene_partidos: boolean;
  es_mes_actual: boolean;
}

interface CalendarMonth {
  anio: number;  // ✅ Sin ñ para evitar errores de Angular
  mes: number;
  nombre_mes: string;
  semanas: CalendarDay[][];
  total_partidos: number;
  partidos_programados: number;
  partidos_jugados: number;
  partidos_suspendidos: number;
}

@Component({
  selector: 'app-calendar-modal',
  standalone: true,
  imports: [CommonModule, ModalBaseComponent],
  templateUrl: './calendar-modal.component.html',
  styleUrls: ['./calendar-modal.component.css']
})
export class CalendarModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() tournamentId!: number;
  @Output() closeModal = new EventEmitter<void>();

  private apiUrl = 'http://localhost:8000';
  calendario: CalendarMonth | null = null;
  anio = new Date().getFullYear();
  mes = new Date().getMonth() + 1;
  loading = false;

  constructor(private http: HttpClient) {}

  ngOnChanges(): void {
    if (this.isOpen && this.tournamentId) {
      this.loadCalendario();
    }
  }

  close(): void {
    this.closeModal.emit();
  }

  async loadCalendario(): Promise<void> {
    this.loading = true;
    try {
      const url = `${this.apiUrl}/tournaments/${this.tournamentId}/calendar/month/${this.anio}/${this.mes}`;
      console.log('🔵 Cargando calendario:', url);
      
      this.calendario = await this.http.get<CalendarMonth>(url).toPromise() as CalendarMonth;
      console.log('✅ Calendario cargado:', this.calendario);
      
    } catch (err: any) {
      console.error('❌ Error al cargar calendario:', err);
      
      if (err.status === 404) {
        alert('No se encontró el calendario. Asegúrate de haber generado el calendario primero.');
      } else {
        alert('Error al cargar el calendario. Intenta nuevamente.');
      }
    } finally {
      this.loading = false;
    }
  }

  // ==================== NAVEGACIÓN ====================

  async mesAnterior(): Promise<void> {
    if (this.mes === 1) {
      this.mes = 12;
      this.anio--;
    } else {
      this.mes--;
    }
    await this.loadCalendario();
  }

  async mesSiguiente(): Promise<void> {
    if (this.mes === 12) {
      this.mes = 1;
      this.anio++;
    } else {
      this.mes++;
    }
    await this.loadCalendario();
  }

  async irAHoy(): Promise<void> {
    const hoy = new Date();
    this.anio = hoy.getFullYear();
    this.mes = hoy.getMonth() + 1;
    await this.loadCalendario();
  }

  // ==================== FORMATEO ====================

  formatTime(hora: string): string {
    try {
      if (hora.includes('T')) {
        return hora.split('T')[1].substring(0, 5);
      } else if (hora.includes(' ')) {
        return hora.split(' ')[1].substring(0, 5);
      } else {
        return hora.substring(0, 5);
      }
    } catch (e) {
      return hora;
    }
  }

  getTeamShort(nombreEquipo: string): string {
    if (nombreEquipo.length > 12) {
      return nombreEquipo.substring(0, 10) + '...';
    }
    return nombreEquipo;
  }

  verDetallesDia(dia: CalendarDay): void {
    if (dia.tiene_partidos) {
      console.log('Ver detalles del día:', dia);
    }
  }
}