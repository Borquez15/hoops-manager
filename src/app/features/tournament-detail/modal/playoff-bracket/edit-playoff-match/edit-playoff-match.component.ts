import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-edit-playoff-match',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-playoff-match.component.html',
  styleUrls: ['./edit-playoff-match.component.css']
})
export class EditPlayoffMatchComponent {
  @Input() match: any;
  @Input() torneoId!: number;

  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<void>();

  apiUrl = 'https://hoopsbackend-production.up.railway.app';

  fecha: string = '';
  hora: string = '';
  cancha: number | null = null;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    if (this.match.fecha) {
      const d = new Date(this.match.fecha);
      this.fecha = d.toISOString().substring(0, 10);
      this.hora = d.toTimeString().substring(0, 5);
    }
    this.cancha = this.match.cancha_id;
  }

  guardar() {
    const fechaCompleta = new Date(`${this.fecha}T${this.hora}:00`);

    this.http.put(
      `${this.apiUrl}/tournaments/${this.torneoId}/playoffs/matches/${this.match.id_partido_playoff}/edit`,
      {
        fecha: fechaCompleta,
        cancha_id: this.cancha,
        estado: this.match.estado
      }
    ).subscribe({
      next: () => {
        alert('📅 Partido actualizado correctamente');
        this.saved.emit();
      },
      error: (err) => {
        console.error(err);
        alert('❌ Error al actualizar partido');
      }
    });
  }
}
