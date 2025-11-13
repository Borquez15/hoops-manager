import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ModalBaseComponent } from '../shared/modal-base/modal-base.component';

@Component({
  selector: 'app-team-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalBaseComponent],
  templateUrl: './team-modal.component.html',
  styleUrls: ['./team-modal.component.css']
})
export class TeamModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() tournamentId!: number;
  @Input() equipo: any = null; // Recibe el equipo seleccionado
  @Output() closeModal = new EventEmitter<void>();
  @Output() equipoUpdated = new EventEmitter<void>();

  private apiUrl = 'http://localhost:8000';
  nuevoJugador = { dorsal: 0, curp: '', nombres: '', ap_p: '', ap_m: '', edad: undefined };

  // Copia editable del equipo (para evitar errores y manejar null)
  equipoTemp: any = { nombre: '', jugadores: [] };

  constructor(private http: HttpClient) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['equipo']) {
      // Si llega null o undefined, inicializa vacío
      this.equipoTemp = this.equipo
        ? { ...this.equipo, jugadores: this.equipo.jugadores || [] }
        : { nombre: '', jugadores: [] };
    }
  }

  close(): void {
    this.closeModal.emit();
  }

  async agregarJugador(): Promise<void> {
    if (!this.equipoTemp.id_equipo) {
      console.warn('No se puede agregar jugador: equipo sin ID');
      return;
    }

    try {
      await this.http
        .post(`${this.apiUrl}/teams/${this.equipoTemp.id_equipo}/players`, this.nuevoJugador)
        .toPromise();

      this.equipoUpdated.emit();
      this.nuevoJugador = { dorsal: 0, curp: '', nombres: '', ap_p: '', ap_m: '', edad: undefined };
    } catch (err) {
      console.error('Error al agregar jugador', err);
    }
  }
}
