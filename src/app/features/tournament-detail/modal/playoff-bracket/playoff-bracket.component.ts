import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { EditPlayoffMatchComponent } from './edit-playoff-match/edit-playoff-match.component';

interface Equipo {
  id_equipo: number;
  nombre: string;
  logo_url?: string;
}


export interface Partido {
  id_partido_playoff: number;
  numero_partido: number;
  fecha?: string;
  equipo_local: number;
  equipo_visitante: number;
  puntos_local?: number;
  puntos_visitante?: number;
  estado: string;

  // NOMBRES CORRECTOS QUE ENVÍA EL BACKEND
  equipo_local_nombre: string;
  equipo_visitante_nombre: string;
}


interface Serie {
  id_serie: number;
  id_torneo: number;
  fase: string;
  numero_serie: number;

  // 🔥 AHORA COINCIDE CON EL BACKEND
  equipo_1: number;
  equipo_2: number;
  ganador: number | null;

  // 🔥 OBJETOS QUE VIENEN EN el backend
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
  imports: [CommonModule, EditPlayoffMatchComponent],
  templateUrl: './playoff-bracket.component.html',
  styleUrls: ['./playoff-bracket.component.css']
})
export class PlayoffBracketComponent implements OnInit, OnChanges {

  @Input() tournamentId!: number;
  @Output() playoffsLoaded = new EventEmitter<boolean>();

  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  private apiUrl = 'https://hoopsbackend-production.up.railway.app';

  bracket: PlayoffBracket | null = null;
  loading = true;
  error = '';
  selectedMatch: any = null;

  openEditMatch(match: any) {
    this.selectedMatch = match;
  }

  closeModal() {
    this.selectedMatch = null;
    this.loadBracket();
  }


  // 🔥 SE EJECUTA SOLO UNA VEZ, NO SIRVE PARA INPUTS ASÍNCRONOS
  ngOnInit() {
    if (this.tournamentId) this.loadBracket();
  }

  // 🔥 SE EJECUTA CADA VEZ QUE cambia tournamentId → ESTA ES LA CLAVE
  ngOnChanges(changes: SimpleChanges) {
    if (changes['tournamentId'] && this.tournamentId) {
      console.log('🔄 tournamentId cambió → cargando bracket…', this.tournamentId);
      this.loadBracket();
    }
  }

  loadBracket() {
    this.loading = true;
    this.error = '';

    this.http.get<PlayoffBracket>(`${this.apiUrl}/tournaments/${this.tournamentId}/playoffs`)
      .subscribe({
        next: (data) => {
          console.log('✅ Bracket cargado:', data);
          this.bracket = data;
          this.loading = false;
          this.playoffsLoaded.emit(true);
        },
        error: (e) => {
          console.error('❌ Error al cargar bracket:', e);

          if (e.status === 404) {
            this.error = 'No se han generado playoffs para este torneo';
          } else {
            this.error = e.error?.detail || 'Error al cargar el bracket de playoffs';
          }

          this.loading = false;
          this.playoffsLoaded.emit(false);
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
