import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-referee-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './referee-modal.component.html',
  styleUrls: ['./referee-modal.component.css']
})
export class RefereeModalComponent {
  @Input() isOpen = false;
  @Input() tournamentId!: number;
  @Output() close = new EventEmitter<void>();
  @Output() invitationSent = new EventEmitter<void>();

  email = '';
  loading = false;
  error: string | null = null;

  private apiUrl = 'http://localhost:8000';

  constructor(private http: HttpClient) {}

  async sendInvitation(): Promise<void> {
    const emailTrim = this.email.trim().toLowerCase();

    if (!emailTrim) {
      this.error = 'Ingresa un email válido';
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailTrim)) {
      this.error = 'Formato de email inválido';
      return;
    }

    this.loading = true;
    this.error = null;

    try {
      await this.http.post(
        `${this.apiUrl}/tournaments/${this.tournamentId}/referee-invites`,
        { email: emailTrim, dias_validez: 7 }
      ).toPromise();

      alert(`✅ Invitación enviada a ${emailTrim}`);
      this.closeModal();
      this.invitationSent.emit();

    } catch (err: any) {
      console.error('❌ Error:', err);
      this.error = err.error?.detail || 'Error al enviar invitación';
    } finally {
      this.loading = false;
    }
  }

  closeModal(): void {
    this.email = '';
    this.error = null;
    this.close.emit();
  }
}