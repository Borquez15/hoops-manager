import { Component, Input, OnInit, OnChanges, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { NgIf, NgFor } from '@angular/common';

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
  equipo_local_nombre: string;
  equipo_visitante_nombre: string;
}

interface Serie {
  id_serie: number;
  id_torneo: number;
  fase: string;
  numero_serie: number;
  equipo_1: number;
  equipo_2: number;
  ganador: number | null;
  equipo_local_info: Equipo;
  equipo_visitante_info: Equipo;
  ganador_info?: Equipo | null;
  formato: string;
  victorias_equipo_1: number;
  victorias_equipo_2: number;
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
export class PlayoffBracketComponent implements OnInit, OnChanges {

  @Input() tournamentId!: number;

  private http = inject(HttpClient);
  private apiUrl = 'https://hoopsbackend-production.up.railway.app';

  bracket: PlayoffBracket | null = null;
  loading = true;
  error = '';

  ngOnInit() {
    console.log('🎯 ngOnInit - tournamentId:', this.tournamentId);
    if (this.tournamentId) {
      this.loadBracket();
    } else {
      this.loading = false;
      this.error = 'No se proporcionó un ID de torneo válido';
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['tournamentId'] && !changes['tournamentId'].firstChange) {
      console.log('🔄 tournamentId cambió:', this.tournamentId);
      if (this.tournamentId) {
        this.loadBracket();
      }
    }
  }

  loadBracket() {
    console.log('📡 Cargando bracket para torneo:', this.tournamentId);
    this.loading = true;
    this.error = '';

    this.http.get<PlayoffBracket>(`${this.apiUrl}/tournaments/${this.tournamentId}/playoffs`)
      .subscribe({
        next: (data) => {
          console.log('✅ Bracket cargado:', data);
          this.bracket = data;
          this.loading = false;
        },
        error: (e) => {
          console.error('❌ Error al cargar bracket:', e);
          this.loading = false;

          if (e.status === 404) {
            this.error = 'No se han generado playoffs para este torneo';
          } else {
            this.error = e.error?.detail || 'Error al cargar el bracket de playoffs';
          }
        }
      });
  }

  getInitials(nombre?: string): string {
    if (!nombre) return '?';
    return nombre
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  getFormatoTexto(formato: string): string {
    const formatos: { [key: string]: string } = {
      'directo': 'Eliminación Directa',
      'mejor_de_3': 'Mejor de 3',
      'mejor_de_5': 'Mejor de 5',
      'mejor_de_7': 'Mejor de 7'
    };
    return formatos[formato] || formato;
  }

  getFaseTexto(fase: string): string {
    const fases: { [key: string]: string } = {
      'OCTAVOS': 'Octavos de Final',
      'CUARTOS': 'Cuartos de Final',
      'SEMIFINAL': 'Semifinales',
      'FINAL': 'Final'
    };
    return fases[fase] || fase;
  }

  getEstadoClase(estado: string): string {
    const estados: { [key: string]: string } = {
      'PENDIENTE': 'status-pending',
      'EN_CURSO': 'status-live',
      'FINALIZADA': 'status-finished'
    };
    return estados[estado] || '';
  }

  hasPlayoffs(): boolean {
    if (!this.bracket) return false;
    return this.bracket.octavos.length > 0 ||
           this.bracket.cuartos.length > 0 ||
           this.bracket.semifinales.length > 0 ||
           !!this.bracket.final;
  }
}