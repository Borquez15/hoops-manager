import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Tournament } from '../../../../models/tournament.model';
import { ModalBaseComponent } from '../shared/modal-base/modal-base.component';
import { NgIf, NgFor } from '@angular/common';
import { ApiConfigService } from '../../../../services/api-config.service';
interface Cancha {
  id_cancha?: number;
  nombre: string;
  ubicacion: string;
  activa: boolean;
}

@Component({
  selector: 'app-config-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalBaseComponent],
  templateUrl: './config-modal.component.html',
  styleUrls: ['./config-modal.component.css']
})
export class ConfigModalComponent implements OnInit, OnChanges {
  @Input() isOpen = false;
  @Input() tournament: Tournament | null = null;
  @Input() canchas: Cancha[] = [];
  @Input() hasCalendar = false;
  @Input() tournamentStatus: 'configurando' | 'iniciado' | 'playoffs' | 'finalizado' = 'configurando';
  
  @Output() closeModal = new EventEmitter<void>();
  @Output() saveTournament = new EventEmitter<Partial<Tournament>>();
  @Output() canchasUpdated = new EventEmitter<void>();
  @Output() regenerateCalendar = new EventEmitter<void>();

  private apiConfig = inject(ApiConfigService);

  private apiUrl = this.apiConfig.apiBase;
  editForm: Partial<Tournament> = {
    nombre: '',
    vueltas: 1,
    cupos_playoffs: 0,
    formato_playoffs: 'directo', // ✅ AGREGADO
    modalidad: '5v5',
    dias_por_semana: 2,
    partidos_por_dia: 2,
    hora_ini: '18:00',
    hora_fin: '22:00',
    slot_min: 60
  };

  nuevaCancha = { nombre: '', ubicacion: '' };
  error: string | null = null;
  Math = Math;

  originalConfig: Partial<Tournament> = {};
  configChanged = false;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.resetForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['tournament'] && this.tournament) {
      this.resetForm();
    }
  }

  resetForm(): void {
    if (this.tournament) {
      this.editForm = { ...this.tournament };
      this.originalConfig = { ...this.tournament };
    }
    this.error = null;
    this.configChanged = false;
  }

  checkConfigChanges(): void {
    if (!this.originalConfig) {
      this.configChanged = false;
      return;
    }

    const changed = 
      this.editForm.vueltas !== this.originalConfig.vueltas ||
      this.editForm.cupos_playoffs !== this.originalConfig.cupos_playoffs ||
      this.editForm.formato_playoffs !== this.originalConfig.formato_playoffs || // ✅ AGREGADO
      this.editForm.dias_por_semana !== this.originalConfig.dias_por_semana ||
      this.editForm.partidos_por_dia !== this.originalConfig.partidos_por_dia ||
      this.editForm.hora_ini !== this.originalConfig.hora_ini ||
      this.editForm.hora_fin !== this.originalConfig.hora_fin ||
      this.editForm.slot_min !== this.originalConfig.slot_min;

    this.configChanged = changed;
  }

  // ✅ INCREMENTO NORMAL PARA OTROS CAMPOS
  incrementar(campo: 'vueltas' | 'dias_por_semana' | 'partidos_por_dia') {
    const value = Number(this.editForm[campo] ?? 0);
    this.editForm[campo] = (value + 1) as any;
    this.checkConfigChanges();
  }

  decrementar(campo: 'vueltas' | 'dias_por_semana' | 'partidos_por_dia') {
    const value = Number(this.editForm[campo] ?? 0);
    if (value > 0) {
      this.editForm[campo] = (value - 1) as any;
      this.checkConfigChanges();
    }
  }

  // ✅ INCREMENTO INTELIGENTE DE PLAYOFFS (0, 2, 4, 8, 16)
  incrementarPlayoffs() {
    const valores = [0, 2, 4, 8, 16];
    const actual = this.editForm.cupos_playoffs || 0;
    const indiceActual = valores.indexOf(actual);
    
    if (indiceActual < valores.length - 1) {
      this.editForm.cupos_playoffs = valores[indiceActual + 1] as any;
      
      // Si era 0 y se activan playoffs, poner formato por defecto
      if (actual === 0) {
        this.editForm.formato_playoffs = 'mejor_de_3' as any;
      }
    }
    
    this.checkConfigChanges();
  }

  // ✅ DECREMENTO INTELIGENTE DE PLAYOFFS
  decrementarPlayoffs() {
    const valores = [0, 2, 4, 8, 16];
    const actual = this.editForm.cupos_playoffs || 0;
    const indiceActual = valores.indexOf(actual);
    
    if (indiceActual > 0) {
      this.editForm.cupos_playoffs = valores[indiceActual - 1] as any;
      
      // Si queda en 0, resetear formato
      if (this.editForm.cupos_playoffs === 0) {
        this.editForm.formato_playoffs = 'directo' as any;
      }
    }
    
    this.checkConfigChanges();
  }

  // ✅ MÉTODO PARA CAMBIAR FORMATO DE PLAYOFFS
  setFormatoPlayoffs(formato: string) {
    if (!this.isLocked()) {
      this.editForm.formato_playoffs = formato as any;
      this.checkConfigChanges();
    }
  }

  async agregarCancha(): Promise<void> {
    if (!this.nuevaCancha.nombre.trim()) {
      alert('El nombre es requerido');
      return;
    }
    
    if (!this.tournament?.id_torneo) return;

    try {
      await this.http.post(
        `${this.apiUrl}/tournaments/${this.tournament.id_torneo}/courts`,
        { ...this.nuevaCancha, activa: true }
      ).toPromise();
      
      this.nuevaCancha = { nombre: '', ubicacion: '' };
      this.canchasUpdated.emit();
    } catch (err: any) {
      this.error = err.error?.detail || 'Error al crear cancha';
    }
  }

  async eliminarCancha(cancha: Cancha): Promise<void> {
    if (!cancha.id_cancha || !this.tournament?.id_torneo) return;
    if (!confirm('¿Eliminar esta cancha?')) return;

    try {
      await this.http.delete(
        `${this.apiUrl}/tournaments/${this.tournament.id_torneo}/courts/${cancha.id_cancha}`
      ).toPromise();
      
      this.canchasUpdated.emit();
    } catch (err) {
      alert('Error al eliminar cancha');
    }
  }

  async regenerarCalendario(): Promise<void> {
    if (!this.tournament?.id_torneo) return;

    const mensaje = this.configChanged 
      ? '⚠️ Has modificado la configuración.\n\n¿Regenerar el calendario con los NUEVOS valores?\n\nEsto borrará todos los partidos actuales.'
      : '¿Regenerar el calendario?\n\nEsto borrará todos los partidos actuales y creará nuevos.';

    if (!confirm(mensaje)) {
      return;
    }

    try {
      if (this.configChanged) {
        console.log('💾 Guardando configuración antes de regenerar...');
        await this.http.put(
          `${this.apiUrl}/tournaments/${this.tournament.id_torneo}/config`,
          this.editForm,
          { withCredentials: true }
        ).toPromise();
      }

      console.log('🔄 Regenerando calendario...');
      await this.http.post(
        `${this.apiUrl}/tournaments/${this.tournament.id_torneo}/matches/auto-schedule?replace=true`,
        {},
        { withCredentials: true }
      ).toPromise();

      alert('✅ Calendario regenerado exitosamente');
      this.regenerateCalendar.emit();
      this.close();
    } catch (err: any) {
      const detail = err.error?.detail || 'No se pudo regenerar';
      alert('❌ Error: ' + detail);
    }
  }

  close(): void {
    this.closeModal.emit();
  }

  save(): void {
    if (!this.editForm.nombre?.trim()) {
      this.error = 'El nombre del torneo es obligatorio';
      return;
    }

    if (this.editForm.hora_fin && this.editForm.hora_ini && this.editForm.hora_fin <= this.editForm.hora_ini) {
      this.error = 'La hora de fin debe ser mayor a la de inicio';
      return;
    }

    if (this.hasCalendar && this.configChanged) {
      const confirmar = confirm(
        '⚠️ Has modificado parámetros que afectan el calendario.\n\n' +
        'Los cambios se guardarán, pero necesitarás REGENERAR el calendario ' +
        'para aplicarlos a los partidos.\n\n¿Continuar?'
      );
      
      if (!confirmar) {
        return;
      }
    }

    this.saveTournament.emit(this.editForm);
  }

  isLocked(): boolean {
    return this.tournamentStatus !== 'configurando';
  }
}
