import { Component, EventEmitter, Input, Output } from '@angular/core';
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
export class TeamModalComponent {
  @Input() isOpen = false;
  @Input() tournamentId!: number;
  @Input() equipo: any = null;
  @Output() closeModal = new EventEmitter<void>();
  @Output() equipoUpdated = new EventEmitter<void>();

  private apiUrl = 'http://localhost:8000';
  nuevoJugador = { dorsal: 0, curp: '', nombres: '', ap_p: '', ap_m: '', edad: undefined };

  constructor(private http: HttpClient) {}

  close(): void { this.closeModal.emit(); }

  async agregarJugador(): Promise<void> {
    try {
      await this.http.post(`${this.apiUrl}/teams/${this.equipo.id_equipo}/players`, this.nuevoJugador).toPromise();
      this.equipoUpdated.emit();
    } catch (err) {
      console.error(err);
    }
  }
}
