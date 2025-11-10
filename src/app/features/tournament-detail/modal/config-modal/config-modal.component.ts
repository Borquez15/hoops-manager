// config-modal.component.ts
import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Tournament, Modalidad } from '../../../../models/tournament.model';
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

  // Form model (coincide con el template actual que usa editForm)
  editForm: Partial<Tournament> = {
    nombre: '',
    vueltas: 1,
    cupos_playoffs: 0,
    modalidad: '5v5',
    dias_por_semana: 2,
    partidos_por_dia: 2,
    hora_ini: '18:00:00',
    hora_fin: '22:00:00',
    slot_min: 60
  };

  error: string | null = null;

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
      this.editForm = {
        nombre: this.tournament.nombre,
        vueltas: this.tournament.vueltas,
        cupos_playoffs: this.tournament.cupos_playoffs,
        modalidad: this.tournament.modalidad,
        dias_por_semana: this.tournament.dias_por_semana,
        partidos_por_dia: this.tournament.partidos_por_dia,
        hora_ini: this.tournament.hora_ini,
        hora_fin: this.tournament.hora_fin,
        slot_min: this.tournament.slot_min
      };
    }
    this.error = null;
  }

  close(): void {
    this.error = null;
    this.closeModal.emit();
  }

  save(): void {
    // Validaciones
    this.error = null;

    if (!this.editForm.nombre?.trim()) {
      this.error = 'El nombre del torneo es obligatorio';
      return;
    }

    if (this.editForm.vueltas && (this.editForm.vueltas < 1 || this.editForm.vueltas > 6)) {
      this.error = 'Las vueltas deben estar entre 1 y 6';
      return;
    }

    if (this.editForm.cupos_playoffs && this.editForm.cupos_playoffs < 0) {
      this.error = 'Los cupos de playoffs no pueden ser negativos';
      return;
    }

    if (this.editForm.hora_fin && this.editForm.hora_ini && this.editForm.hora_fin <= this.editForm.hora_ini) {
      this.error = 'La hora de fin debe ser mayor a la hora de inicio';
      return;
    }

    // Emitir datos para guardar
    this.saveTournament.emit(this.editForm);
  }
}