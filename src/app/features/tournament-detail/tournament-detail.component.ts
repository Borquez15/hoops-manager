// tournament-detail.component.ts
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

// Servicios y Modelos
import { TournamentService } from '../../services/tournament.service';
import { Tournament } from '../../models/tournament.model';

// Modales
import { ConfigModalComponent } from './modal/config-modal/config-modal.component';
import { CourtModalComponent } from './modal/court-modal/court-modal.component';
import { TeamModalComponent } from './modal/team-modal/team-modal.component';
import { RefereeModalComponent } from './modal/referee-modal/referee-modal.component';
import { CalendarModalComponent } from './modal/calendar-modal/calendar-modal.component';

// Interfaces
interface Arbitro {
  id_arbitro?: number;
  nombre: string;
}

interface Cancha {
  id_cancha?: number;
  nombre: string;
  ubicacion: string;
  activa: boolean;
}

interface HoopsJugador {
  id_jugador?: number;
  curp: string;
  nombres: string;
  ap_p: string;
  ap_m?: string;
  edad?: number;
}

interface JugadorEquipo {
  id_equipo: number;
  dorsal: number;
  activo: boolean;
  persona: HoopsJugador;
}

interface EquipoConJugadores {
  id_equipo?: number;
  nombre: string;
  logo_url?: string;
  jugadores: JugadorEquipo[];
}

@Component({
  selector: 'app-tournament-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ConfigModalComponent,
    CourtModalComponent,
    TeamModalComponent,
    RefereeModalComponent,
    CalendarModalComponent
  ],
  templateUrl: './tournament-detail.component.html',
  styleUrls: ['./tournament-detail.component.css']
})
export class TournamentDetailComponent implements OnInit {
  private apiUrl = 'http://localhost:8000';
  
  tournamentId!: number;
  tournament: Tournament | null = null;
  equipos: EquipoConJugadores[] = [];
  arbitros: Arbitro[] = [];
  canchas: Cancha[] = [];
  
  // Estados
  loading = false;
  error: string | null = null;
  tournamentStatus: 'configurando' | 'iniciado' | 'finalizado' = 'configurando';
  calendarGenerated = false;
  
  // Control de modales
  modalConfigAbierto = false;
  modalCanchaAbierto = false;
  modalEquipoAbierto = false;
  modalArbitroAbierto = false;
  modalCalendarioAbierto = false;
  
  // Equipo en edición (para modal de equipo)
  equipoEditando: EquipoConJugadores | null = null;
  indiceEquipoEditando: number = -1;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private tournamentService: TournamentService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.tournamentId = +params['id'];
      this.loadTournamentData();
    });
  }

  // ========================================
  // CARGA DE DATOS
  // ========================================

  async loadTournamentData(): Promise<void> {
    this.loading = true;
    this.error = null;
    
    try {
      // Cargar torneo
      const tournamentData = await this.tournamentService
        .getTournament(this.tournamentId)
        .toPromise();
      
      this.tournament = tournamentData || null;
      
      if (!this.tournament) {
        throw new Error('No se encontró el torneo');
      }
      
      if (this.tournament.estado) {
        this.tournamentStatus = this.tournament.estado as any;
      }
      
      // Cargar todos los datos en paralelo
      await Promise.all([
        this.loadEquipos(),
        this.loadArbitros(),
        this.loadCanchas(),
        this.checkCalendarStatus()
      ]);
      
    } catch (error: any) {
      console.error('❌ Error en carga:', error);
      this.error = error?.message || 'Error al cargar el torneo';
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  async loadEquipos(): Promise<void> {
    try {
      const result = await this.tournamentService
        .getEquipos(this.tournamentId)
        .toPromise();
      
      this.equipos = (result || []).map(equipo => ({
        ...equipo,
        jugadores: []
      }));

      // Cargar jugadores para cada equipo
      for (const equipo of this.equipos) {
        if (equipo.id_equipo) {
          await this.loadJugadoresEquipo(equipo.id_equipo);
        }
      }
    } catch (error) {
      console.error('❌ Error al cargar equipos:', error);
      this.equipos = [];
    }
  }

  async loadJugadoresEquipo(equipoId: number): Promise<void> {
    try {
      const response = await this.http.get<any[]>(
        `${this.apiUrl}/teams/${equipoId}/players`
      ).toPromise();

      const equipo = this.equipos.find(e => e.id_equipo === equipoId);
      if (equipo && response) {
        equipo.jugadores = response.map(j => ({
          id_equipo: j.id_equipo,
          dorsal: j.dorsal,
          activo: j.activo,
          persona: j.persona
        }));
      }
    } catch (error) {
      console.error(`❌ Error al cargar jugadores del equipo ${equipoId}:`, error);
    }
  }

  async loadArbitros(): Promise<void> {
    try {
      const response = await this.http.get<any[]>(
        `${this.apiUrl}/tournaments/${this.tournamentId}/referees`
      ).toPromise();
      
      this.arbitros = response || [];
    } catch (error) {
      console.error('❌ Error al cargar árbitros:', error);
      this.arbitros = [];
    }
  }

  async loadCanchas(): Promise<void> {
    try {
      const response = await this.http.get<Cancha[]>(
        `${this.apiUrl}/tournaments/${this.tournamentId}/courts`
      ).toPromise();
      
      this.canchas = response || [];
    } catch (error) {
      console.error('❌ Error al cargar canchas:', error);
      this.canchas = [];
    }
  }

  async checkCalendarStatus(): Promise<void> {
    try {
      const response = await this.http.get<any[]>(
        `${this.apiUrl}/tournaments/${this.tournamentId}/matches`
      ).toPromise();
      
      this.calendarGenerated = (response || []).length > 0;
    } catch (error) {
      console.error('❌ Error al verificar calendario:', error);
      this.calendarGenerated = false;
    }
  }

  // ========================================
  // MODAL DE CONFIGURACIÓN
  // ========================================

  abrirModalConfig(): void {
    this.modalConfigAbierto = true;
  }

  cerrarModalConfig(): void {
    this.modalConfigAbierto = false;
  }

  async actualizarConfiguracion(data: Partial<Tournament>): Promise<void> {
    try {
      await this.tournamentService
        .updateTournament(this.tournamentId, data)
        .toPromise();
      
      this.cerrarModalConfig();
      await this.loadTournamentData();
      alert('✅ Configuración actualizada');
    } catch (error) {
      console.error('❌ Error al actualizar configuración:', error);
      alert('❌ Error al actualizar configuración');
    }
  }

  // ========================================
  // MODAL DE CANCHAS
  // ========================================

  abrirModalCanchas(): void {
    this.modalCanchaAbierto = true;
  }

  cerrarModalCanchas(): void {
    this.modalCanchaAbierto = false;
  }

  async onCanchasUpdated(): Promise<void> {
    await this.loadCanchas();
  }

  // ========================================
  // MODAL DE EQUIPOS
  // ========================================

  abrirModalEquipo(): void {
    this.equipoEditando = {
      nombre: '',
      logo_url: '',
      jugadores: []
    };
    this.indiceEquipoEditando = -1;
    this.modalEquipoAbierto = true;
  }

  editarEquipo(index: number): void {
    this.indiceEquipoEditando = index;
    this.equipoEditando = { ...this.equipos[index] };
    this.modalEquipoAbierto = true;
  }

  cerrarModalEquipo(): void {
    this.modalEquipoAbierto = false;
    this.equipoEditando = null;
    this.indiceEquipoEditando = -1;
  }

  async onEquipoUpdated(): Promise<void> {
    await this.loadEquipos();
    this.cerrarModalEquipo();
  }

  async eliminarEquipo(index: number, id?: number): Promise<void> {
    if (!id) return;
    
    if (!confirm('¿Eliminar este equipo?')) return;

    try {
      await this.http.delete(
        `${this.apiUrl}/tournaments/${this.tournamentId}/teams/${id}`
      ).toPromise();

      await this.loadEquipos();
    } catch (error) {
      console.error('❌ Error al eliminar equipo:', error);
      alert('❌ Error al eliminar equipo');
    }
  }

  // ========================================
  // MODAL DE ÁRBITROS
  // ========================================

  abrirModalArbitro(): void {
    this.modalArbitroAbierto = true;
  }

  cerrarModalArbitro(): void {
    this.modalArbitroAbierto = false;
  }

  async onArbitrosUpdated(): Promise<void> {
    await this.loadArbitros();
  }

  // ========================================
  // MODAL DE CALENDARIO
  // ========================================

  abrirModalCalendario(): void {
    this.modalCalendarioAbierto = true;
  }

  cerrarModalCalendario(): void {
    this.modalCalendarioAbierto = false;
  }

  // ========================================
  // CALENDARIO
  // ========================================

  async generateCalendar(): Promise<void> {
    const minimumTeams = this.getMinimumTeams();
    
    if (this.equipos.length < minimumTeams) {
      alert(`⚠️ Necesitas al menos ${minimumTeams} equipos`);
      return;
    }
    
    if (!confirm('¿Generar calendario automático?')) {
      return;
    }
    
    try {
      this.loading = true;
      
      await this.tournamentService
        .autoSchedule(this.tournamentId, undefined, true)
        .toPromise();
      
      this.calendarGenerated = true;
      this.loading = false;
      
      alert('✅ Calendario generado');
      
    } catch (error) {
      console.error('❌ Error al generar calendario:', error);
      this.loading = false;
      alert('❌ Error al generar calendario');
    }
  }

  // ========================================
  // VALIDACIONES
  // ========================================

  getMinimumTeams(): number {
    if (!this.tournament) return 2;
    const minByPlayoffs = this.tournament.cupos_playoffs || 0;
    return Math.max(minByPlayoffs, 2);
  }

  getValidationMessage(): string | null {
    if (!this.tournament) return null;
    
    const minimumTeams = this.getMinimumTeams();
    const currentTeams = this.equipos.length;
    
    if (currentTeams < minimumTeams) {
      const needed = minimumTeams - currentTeams;
      return `Necesitas agregar ${needed} equipo${needed > 1 ? 's' : ''} más. Con ${this.tournament.cupos_playoffs} cupos de playoffs, requieres mínimo ${minimumTeams} equipos.`;
    }
    
    if (!this.calendarGenerated && currentTeams >= minimumTeams) {
      return 'Genera el calendario para poder iniciar el torneo.';
    }
    
    return null;
  }

  canStartTournament(): boolean {
    if (!this.tournament) return false;
    
    const hasEnoughTeams = this.equipos.length >= this.getMinimumTeams();
    const hasCalendar = this.calendarGenerated;
    const isConfiguring = this.tournamentStatus === 'configurando';
    
    return hasEnoughTeams && hasCalendar && isConfiguring;
  }

  getStatusBadge(): { text: string; class: string } {
    switch (this.tournamentStatus) {
      case 'iniciado':
        return { text: '🟢 Iniciado', class: 'badge-success' };
      case 'finalizado':
        return { text: '⚫ Finalizado', class: 'badge-finished' };
      case 'configurando':
      default:
        return { text: '🔴 Configurando', class: 'badge-warning' };
    }
  }

  async startTournament(): Promise<void> {
    if (!this.canStartTournament()) {
      alert('⚠️ No se puede iniciar. Verifica los requisitos.');
      return;
    }
    
    if (!confirm('¿Iniciar el torneo?')) {
      return;
    }
    
    try {
      await this.tournamentService
        .updateTournament(this.tournamentId, { estado: 'ACTIVO' })
        .toPromise();
      
      alert('🚀 ¡Torneo iniciado!');
      await this.loadTournamentData();
      
    } catch (error) {
      console.error('❌ Error al iniciar:', error);
      alert('❌ Error al iniciar');
    }
  }

  // Helper para obtener cantidad de jugadores
  getJugadoresCount(equipo: EquipoConJugadores): number {
    return equipo.jugadores ? equipo.jugadores.length : 0;
  }

  // ========================================
  // NAVEGACIÓN
  // ========================================

  goBack(): void {
    this.router.navigate(['/mis-torneos']);
  }
}