import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Tournament } from '../../../../models/tournament.model';
import { ModalBaseComponent } from '../shared/modal-base/modal-base.component';

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
  @Output() closeModal = new EventEmitter<void>();
  @Output() saveTournament = new EventEmitter<Partial<Tournament>>();

  editForm: Partial<Tournament> = {
    nombre: '',
    vueltas: 1,
    cupos_playoffs: 0,
    modalidad: '5v5',
    dias_por_semana: 2,
    partidos_por_dia: 2,
    hora_ini: '18:00',
    hora_fin: '22:00',
    slot_min: 60,
    canchas: []
  };

  canchas: { nombre: string; ubicacion: string }[] = [];
  nuevaCancha = { nombre: '', ubicacion: '' };
  error: string | null = null;

  // 👇 Añadimos Math para que Angular lo reconozca en el template
  Math = Math;

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
      this.canchas = this.tournament.canchas ?? [];
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

  agregarCancha(): void {
    if (!this.nuevaCancha.nombre.trim() || !this.nuevaCancha.ubicacion.trim()) {
      alert('Completa todos los campos de la cancha.');
      return;
    }
    this.canchas.push({ ...this.nuevaCancha });
    this.nuevaCancha = { nombre: '', ubicacion: '' };
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

    this.saveTournament.emit({
      ...this.editForm,
      canchas: this.canchas
    });
  }
}
