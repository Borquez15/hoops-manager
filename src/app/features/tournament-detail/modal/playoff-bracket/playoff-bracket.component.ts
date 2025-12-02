import { Component, Input, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

interface Equipo {
  id_equipo: number;
  nombre: string;
  logo_url?: string;
}

interface Partido {
  id_partido_playoff: number;
  numero_partido: number;
  fecha?: string;
  equipo_local: number;
  equipo_visitante: number;
  puntos_local?: number;
  puntos_visitante?: number;
  estado: string;
  nombre_local?: string;
  nombre_visitante?: string;
}

interface Serie {
  id_serie: number;
  fase: string;
  numero_serie: number;
  equipo_1: Equipo;
  equipo_2: Equipo;
  formato: string;
  victorias_equipo_1: number;
  victorias_equipo_2: number;
  ganador?: Equipo;
  estado: string;
  partidos: Partido[];
}

interface PlayoffBracket {
  id_torneo: number;
  formato: string;
  octavos: Serie[];
  cuartos: Serie[];
  semifinales: Serie[];
  final?: Serie;
}

@Component({
  selector: 'app-playoff-bracket',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './playoff-bracket.component.html',
  styleUrls: ['./playoff-bracket.component.css']
})
export class PlayoffBracketComponent implements OnInit {
  @Input() tournamentId!: number;
  
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  private apiUrl = 'https://hoopsbackend-production.up.railway.app';

  bracket: PlayoffBracket | null = null;
  loading = true;
  error = '';

  ngOnInit() {
    if (this.tournamentId) {
      this.loadBracket();
    }
  }

  loadBracket() {
    this.loading = true;
    this.http.get<PlayoffBracket>(`${this.apiUrl}/tournaments/${this.tournamentId}/playoffs`)
      .subscribe({
        next: (data) => {
          this.bracket = data;
          this.loading = false;
          this.cdr.detectChanges();
          console.log('✅ Bracket cargado:', data);
        },
        error: (e) => {
          console.error('❌ Error al cargar bracket:', e);
          this.error = e.error?.detail || 'No se pudo cargar el bracket';
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }

  getVictoriasNecesarias(formato: string): number {
    switch (formato) {
      case 'directo': return 1;
      case 'mejor_de_3': return 2;
      case 'mejor_de_5': return 3;
      case 'mejor_de_7': return 4;
      default: return 1;
    }
  }

  getFormatoTexto(formato: string): string {
    switch (formato) {
      case 'directo': return 'Eliminación Directa';
      case 'mejor_de_3': return 'Mejor de 3';
      case 'mejor_de_5': return 'Mejor de 5';
      case 'mejor_de_7': return 'Mejor de 7';
      default: return formato;
    }
  }

  getFaseTexto(fase: string): string {
    switch (fase) {
      case 'OCTAVOS': return 'Octavos de Final';
      case 'CUARTOS': return 'Cuartos de Final';
      case 'SEMIFINAL': return 'Semifinales';
      case 'FINAL': return 'Final';
      default: return fase;
    }
  }

  getEstadoClase(estado: string): string {
    switch (estado) {
      case 'PENDIENTE': return 'status-pending';
      case 'EN_CURSO': return 'status-live';
      case 'FINALIZADA': return 'status-finished';
      default: return '';
    }
  }

  hasPlayoffs(): boolean {
    if (!this.bracket) return false;
    return this.bracket.octavos.length > 0 || 
           this.bracket.cuartos.length > 0 || 
           this.bracket.semifinales.length > 0 || 
           !!this.bracket.final;
  }
}