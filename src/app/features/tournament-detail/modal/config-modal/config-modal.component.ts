import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Tournament } from '../../../../models/tournament.model';
import { ModalBaseComponent } from '../shared/modal-base/modal-base.component';

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
  @Output() closeModal = new EventEmitter<void>();
  @Output() saveTournament = new EventEmitter<Partial<Tournament>>();
  @Output() canchasUpdated = new EventEmitter<void>();

  private apiUrl = 'https://hoopsbackend-production.up.railway.app';
  
  editForm: Partial<Tournament> = {
    nombre: '',
    vueltas: 1,
    cupos_playoffs: 0,
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
    }
    this.error = null;
  }

  incrementar(campo: 'vueltas' | 'cupos_playoffs' | 'dias_por_semana' | 'partidos_por_dia') {
    const value = Number(this.editForm[campo] ?? 0);
    this.editForm[campo] = (value + 1) as any;
  }

  decrementar(campo: 'vueltas' | 'cupos_playoffs' | 'dias_por_semana' | 'partidos_por_dia') {
    const value = Number(this.editForm[campo] ?? 0);
    if (value > 0) {
      this.editForm[campo] = (value - 1) as any;
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

    this.saveTournament.emit(this.editForm);
  }
}