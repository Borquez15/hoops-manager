import { Component, Input, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

interface Equipo {
  id: number;
  nombre: string;
  logo_url?: string;
}

interface Cancha {
  id_cancha: number;
  nombre: string;
  ubicacion?: string;
}

interface Match {
  id_partido: number;
  fecha: string;
  hora: string;
  local?: Equipo;
  visitante?: Equipo;
  cancha?: Cancha;
  estado: string;
}

type FiltroTiempo = 'todos' | 'semana' | 'mes';
type FiltroEstado = 'todos' | 'PROGRAMADO' | 'EN_CURSO' | 'JUGADO';

@Component({
  selector: 'app-proximos-juegos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './proximos-juegos.component.html',
  styleUrls: ['./proximos-juegos.component.css']
})
export class ProximosJuegosComponent implements OnChanges {
  @Input() tournamentId!: number;

  private apiUrl = 'https://hoopsbackend-production.up.railway.app';
  partidos: Match[] = [];
  partidosFiltrados: Match[] = [];
  loading = false;
  editandoId: number | null = null;
  editForm = { fecha: '', hora: '', id_cancha: null as number | null };
  canchasDisponibles: Cancha[] = [];

  // Filtros
  filtroTiempo: FiltroTiempo = 'todos';
  filtroEstado: FiltroEstado = 'todos';

  // Control de expansión
  expandido = false;

  constructor(
    private http: HttpClient,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['tournamentId'] && this.tournamentId) {
      this.loadData();
    }
  }

  async loadData(): Promise<void> {
    console.log('🔵 Iniciando carga de datos...');
    this.loading = true;
    this.cdr.detectChanges();
    
    try {
      const [partidosResponse, canchasResponse] = await Promise.all([
        this.http.get<Match[]>(`${this.apiUrl}/tournaments/${this.tournamentId}/matches`).toPromise(),
        this.http.get<Cancha[]>(`${this.apiUrl}/tournaments/${this.tournamentId}/courts`).toPromise()
      ]);
      
      this.partidos = partidosResponse || [];
      this.canchasDisponibles = canchasResponse || [];
      
      this.aplicarFiltros();
      
      console.log('✅ Partidos cargados:', this.partidos.length);
    } catch (error) {
      console.error('❌ Error al cargar datos:', error);
      this.partidos = [];
      this.canchasDisponibles = [];
      this.partidosFiltrados = [];
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  aplicarFiltros(): void {
    let filtrados = [...this.partidos];

    // Filtro por tiempo
    if (this.filtroTiempo !== 'todos') {
      const hoy = new Date();
      filtrados = filtrados.filter(p => {
        const fechaPartido = new Date(p.fecha);
        
        if (this.filtroTiempo === 'semana') {
          const unaSemana = new Date(hoy);
          unaSemana.setDate(hoy.getDate() + 7);
          return fechaPartido >= hoy && fechaPartido <= unaSemana;
        } else if (this.filtroTiempo === 'mes') {
          const unMes = new Date(hoy);
          unMes.setMonth(hoy.getMonth() + 1);
          return fechaPartido >= hoy && fechaPartido <= unMes;
        }
        return true;
      });
    }

    // Filtro por estado
    if (this.filtroEstado !== 'todos') {
      filtrados = filtrados.filter(p => p.estado === this.filtroEstado);
    }

    this.partidosFiltrados = filtrados;
  }

  cambiarFiltroTiempo(filtro: FiltroTiempo): void {
    this.filtroTiempo = filtro;
    this.aplicarFiltros();
  }

  cambiarFiltroEstado(filtro: FiltroEstado): void {
    this.filtroEstado = filtro;
    this.aplicarFiltros();
  }

  toggleExpandir(): void {
    this.expandido = !this.expandido;
  }

  iniciarPartido(partidoId: number): void {
    this.router.navigate(['/partido', partidoId]);
  }

  editarPartido(partido: Match): void {
    this.editandoId = partido.id_partido;
    this.editForm = {
      fecha: partido.fecha,
      hora: partido.hora,
      id_cancha: partido.cancha?.id_cancha || null
    };
  }

  cancelarEdicion(): void {
    this.editandoId = null;
  }

  async guardarCambios(partidoId: number): Promise<void> {
    try {
      const payload: any = {
        fecha: this.editForm.fecha,
        hora: this.editForm.hora
      };

      if (this.editForm.id_cancha) {
        payload.id_cancha = this.editForm.id_cancha;
      }

      await this.http.patch(
        `${this.apiUrl}/tournaments/${this.tournamentId}/matches/${partidoId}`,
        payload
      ).toPromise();
      
      alert('✅ Partido actualizado');
      this.editandoId = null;
      await this.loadData();
    } catch (error) {
      console.error('❌ Error al actualizar partido:', error);
      alert('❌ Error al actualizar partido');
    }
  }

  formatFecha(fecha: string): string {
    try {
      const date = new Date(fecha);
      const opciones: Intl.DateTimeFormatOptions = {
        weekday: 'short',
        day: 'numeric',
        month: 'short'
      };
      return date.toLocaleDateString('es-MX', opciones).toUpperCase();
    } catch (e) {
      return fecha;
    }
  }

  getCountByStatus(estado: string): number {
    return this.partidos.filter(p => p.estado === estado).length;
  }

  getNombreEquipo(equipo?: Equipo): string {
    return equipo?.nombre || 'Equipo no asignado';
  }

  getInicialEquipo(equipo?: Equipo): string {
    if (!equipo || !equipo.nombre) return '?';
    return equipo.nombre.charAt(0).toUpperCase();
  }

  tieneLogoEquipo(equipo?: Equipo): boolean {
    return !!(equipo?.logo_url);
  }

  getLogoEquipo(equipo?: Equipo): string {
    return equipo?.logo_url || '';
  }

  getEstadoBadgeClass(estado: string): string {
    switch (estado) {
      case 'PROGRAMADO': return 'estado-programado';
      case 'EN_CURSO': return 'estado-en-curso';
      case 'JUGADO': return 'estado-jugado';
      default: return '';
    }
  }

  puedeIniciar(partido: Match): boolean {
    return partido.estado === 'PROGRAMADO' && !!partido.cancha;
  }
}