import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ModalBaseComponent } from '../shared/modal-base/modal-base.component';

@Component({
  selector: 'app-referee-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalBaseComponent],
  templateUrl: './referee-modal.component.html',
  styleUrls: ['./referee-modal.component.css']
})
export class RefereeModalComponent {
  @Input() isOpen = false;
  @Input() tournamentId!: number;
  @Output() closeModal = new EventEmitter<void>();
  @Output() refereesUpdated = new EventEmitter<void>();

  private apiUrl = 'http://localhost:8000';
  nuevoArbitroEmail = '';
  enviando = false;

  constructor(private http: HttpClient) {}

  close(): void { this.closeModal.emit(); }

  async enviarInvitacion(): Promise<void> {
    this.enviando = true;
    try {
      await this.http.post(`${this.apiUrl}/tournaments/${this.tournamentId}/referees/invite`, { email: this.nuevoArbitroEmail }).toPromise();
      alert('Invitación enviada');
      this.close();
    } catch (err) {
      console.error(err);
    } finally {
      this.enviando = false;
    }
  }
}
