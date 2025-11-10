import { Component, EventEmitter, Input, Output, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ModalBaseComponent } from '../shared/modal-base/modal-base.component';

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
  calendario: any = null;
  anio = new Date().getFullYear();
  mes = new Date().getMonth() + 1;
  loading = false;

  constructor(private http: HttpClient) {}

  ngOnChanges(): void {
    if (this.isOpen) this.loadCalendario();
  }

  close(): void { this.closeModal.emit(); }

  async loadCalendario(): Promise<void> {
    this.loading = true;
    try {
      this.calendario = await this.http.get(`${this.apiUrl}/tournaments/${this.tournamentId}/calendar/month/${this.anio}/${this.mes}`).toPromise();
    } catch (err) {
      console.error(err);
    } finally {
      this.loading = false;
    }
  }
}
