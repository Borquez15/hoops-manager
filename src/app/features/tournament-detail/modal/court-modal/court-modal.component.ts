import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ModalBaseComponent } from '../shared/modal-base/modal-base.component';

export interface Cancha {
  id_cancha?: number; nombre: string; ubicacion: string; activa: boolean;
}

@Component({
  selector: 'app-court-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalBaseComponent],
  templateUrl: './court-modal.component.html',
  styleUrls: ['./court-modal.component.css']
})
export class CourtModalComponent {
  @Input() isOpen = false;
  @Input() tournamentId!: number;
  @Input() canchas: Cancha[] = [];
  @Output() closeModal = new EventEmitter<void>();
  @Output() canchasUpdated = new EventEmitter<void>();

  private apiUrl = 'https://hoopsbackend-production.up.railway.app';
  nuevaCancha: Cancha = { nombre: '', ubicacion: '', activa: true };
  loading = false;
  error: string | null = null;

  constructor(private http: HttpClient) {}

  close(): void { this.closeModal.emit(); }

  async agregarCancha(): Promise<void> {
    if (!this.nuevaCancha.nombre.trim()) {
      this.error = 'El nombre es requerido';
      return;
    }
    this.loading = true;
    try {
      await this.http.post(`${this.apiUrl}/tournaments/${this.tournamentId}/courts`, this.nuevaCancha).toPromise();
      this.canchasUpdated.emit();
      this.nuevaCancha = { nombre: '', ubicacion: '', activa: true };
    } catch (err: any) {
      this.error = err.error?.detail || 'Error al crear cancha';
    } finally {
      this.loading = false;
    }
  }
}
