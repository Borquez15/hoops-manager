import { Component, Input, OnInit, OnChanges, SimpleChanges, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { EditPlayoffMatchComponent } from './edit-playoff-match/edit-playoff-match.component';

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
  cancha_id?: number;
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
  imports: [CommonModule, EditPlayoffMatchComponent],
  templateUrl: './playoff-bracket.component.html',
  styleUrls: ['./playoff-bracket.component.css']
})
export class PlayoffBracketComponent implements OnInit, OnChanges {

  @Input() tournamentId!: number;

  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  private apiUrl = 'https://hoopsbackend-production.up.railway.app';

  bracket: PlayoffBracket | null = null;
  loading = false;
  error = '';

  // 🔥 NUEVO: Modal para editar partidos
  modalEditarAbierto = false;
  partidoSeleccionado: Partido | null = null;

  ngOnInit() {
    console.log('🎯 ngOnInit - tournamentId:', this.tournamentId);
  }

  ngOnChanges(changes: SimpleChanges) {
    console.log('🔄 ngOnChanges detectado:', changes);
    
    if (changes['tournamentId'] && this.tournamentId) {
      console.log('✅ tournamentId válido, cargando bracket:', this.tournamentId);
      this.loadBracket();
    }
  }

  loadBracket() {
    console.log('📡 Cargando bracket para torneo:', this.tournamentId);
    
    if (!this.tournamentId) {
      console.warn('⚠️ No hay tournamentId, saliendo...');
      return;
    }

    this.loading = true;
    this.error = '';
    this.bracket = null;
    this.cdr.detectChanges();

    this.http.get<PlayoffBracket>(`${this.apiUrl}/tournaments/${this.tournamentId}/playoffs`)
      .subscribe({
        next: (data) => {
          console.log('✅ Bracket cargado exitosamente:', data);
          this.bracket = data;
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: (e) => {
          console.error('❌ Error al cargar bracket:', e);
          this.loading = false;

          if (e.status === 404) {
            this.error = 'No se han generado playoffs para este torneo';
          } else {
            this.error = e.error?.detail || 'Error al cargar el bracket de playoffs';
          }
          
          this.cdr.detectChanges();
        }
      });
  }

  // 🔥 NUEVO: abrir modal
  abrirModalEditar(partido: Partido) {
    this.partidoSeleccionado = partido;
    this.modalEditarAbierto = true;
    this.cdr.detectChanges();
  }

  // 🔥 NUEVO: cerrar modal
  cerrarModalEditar() {
    this.modalEditarAbierto = false;
    this.partidoSeleccionado = null;
    this.cdr.detectChanges();
  }

  // 🔥 NUEVO: recargar bracket después de editar
  onPartidoActualizado() {
    this.cerrarModalEditar();
    this.loadBracket();
  }

  // 🔥 NUEVO: formatear fecha
  formatFecha(fecha: string): string {
    const d = new Date(fecha);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    
    return `${day}/${month} ${hours}:${minutes}`;
  }

  getInitials(nombre: string): string {
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
