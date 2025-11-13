// tournament-detail.component.ts - FIX DEFINITIVO DEL LOADING
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

import { TournamentService } from '../../services/tournament.service';
import { Tournament } from '../../models/tournament.model';

import { ConfigModalComponent } from './modal/config-modal/config-modal.component';
import { CourtModalComponent } from './modal/court-modal/court-modal.component';
import { TeamModalComponent } from './modal/team-modal/team-modal.component';
import { RefereeModalComponent } from './modal/referee-modal/referee-modal.component';
import { CalendarModalComponent } from './modal/calendar-modal/calendar-modal.component';

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
  
  loading = false;
  error: string | null = null;
  tournamentStatus: 'configurando' | 'iniciado' | 'finalizado' = 'configurando';
  calendarGenerated = false;
  
  // ✨ PROPIEDADES PARA BARRA DE PROGRESO
  generatingCalendar = false;
  calendarProgress = 0;
  calendarProgressMessage = '';
  
  modalConfigAbierto = false;
  modalCanchaAbierto = false;
  modalEquipoAbierto = false;
  modalArbitroAbierto = false;
  modalCalendarioAbierto = false;
  
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
  // ✅ FIX: CARGA DE DATOS MEJORADA
  // ========================================

  async loadTournamentData(): Promise<void> {
    console.log('🔵 Iniciando carga del torneo:', this.tournamentId);
    this.loading = true;
    this.error = null;
    
    try {
      // 1. Cargar datos del torneo
      console.log('📥 Cargando datos del torneo...');
      const tournamentData = await this.tournamentService
        .getTournament(this.tournamentId)
        .toPromise();
      
      this.tournament = tournamentData || null;
      
      if (!this.tournament) {
        throw new Error('No se encontró el torneo');
      }
      
      console.log('✅ Torneo cargado:', this.tournament.nombre);
      
      if (this.tournament.estado) {
        this.tournamentStatus = this.tournament.estado as any;
      }
      
      // 2. Cargar todos los datos en paralelo
      console.log('📥 Cargando equipos, árbitros, canchas y calendario...');
      await Promise.all([
        this.loadEquipos(),
        this.loadArbitros(),
        this.loadCanchas(),
        this.checkCalendarStatus()
      ]);
      
      console.log('✅ Todos los datos cargados exitosamente');
      console.log('📊 Resumen:');
      console.log('   - Equipos:', this.equipos.length);
      console.log('   - Árbitros:', this.arbitros.length);
      console.log('   - Canchas:', this.canchas.length);
      console.log('   - Calendario generado:', this.calendarGenerated);
      
    } catch (error: any) {
      console.error('❌ Error en carga:', error);
      this.error = error?.message || 'Error al cargar';
    } finally {
      // ✅ CRÍTICO: Siempre poner loading en false
      this.loading = false;
      console.log('🏁 Loading completado. Estado loading:', this.loading);
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

      // Cargar jugadores
      for (const equipo of this.equipos) {
        if (equipo.id_equipo) {
          await this.loadJugadoresEquipo(equipo.id_equipo);
        }
      }
      
      console.log('✅ Equipos cargados:', this.equipos.length);
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
      // Silenciar error de jugadores
    }
  }

  async loadArbitros(): Promise<void> {
    try {
      const response = await this.http.get<any[]>(
        `${this.apiUrl}/tournaments/${this.tournamentId}/referees`
      ).toPromise();
      
      this.arbitros = response || [];
      console.log('✅ Árbitros cargados:', this.arbitros.length);
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
      console.log('✅ Canchas cargadas:', this.canchas.length);
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
      
      const hasMatches = (response || []).length > 0;
      this.calendarGenerated = hasMatches;
      
      console.log('📅 Estado del calendario:', hasMatches ? 'GENERADO' : 'NO GENERADO');
      console.log('📊 Partidos encontrados:', (response || []).length);
    } catch (error) {
      console.error('❌ Error al verificar calendario:', error);
      this.calendarGenerated = false;
    }
  }

  // ========================================
  // MODALES
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

  abrirModalCanchas(): void {
    this.modalCanchaAbierto = true;
  }

  cerrarModalCanchas(): void {
    this.modalCanchaAbierto = false;
  }

  async onCanchasUpdated(): Promise<void> {
    await this.loadCanchas();
  }

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
    if (!id || !confirm('¿Eliminar este equipo?')) return;

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

  abrirModalArbitro(): void {
    this.modalArbitroAbierto = true;
  }

  cerrarModalArbitro(): void {
    this.modalArbitroAbierto = false;
  }

  async onArbitrosUpdated(): Promise<void> {
    await this.loadArbitros();
  }

  abrirModalCalendario(): void {
    this.modalCalendarioAbierto = true;
  }

  cerrarModalCalendario(): void {
    this.modalCalendarioAbierto = false;
  }

  // ========================================
  // ✨ GENERAR CALENDARIO CON BARRA DE PROGRESO
  // ========================================

  async generateCalendar(): Promise<void> {
    const minimumTeams = this.getMinimumTeams();
    
    if (this.equipos.length < minimumTeams) {
      alert(`⚠️ Necesitas al menos ${minimumTeams} equipos`);
      return;
    }
    
    if (!confirm('¿Generar calendario? Esto puede tardar unos segundos.')) {
      return;
    }
    
    let progressInterval: any = null;
    
    try {
      console.log('🚀 Iniciando generación de calendario...');
      
      // Iniciar barra de progreso
      this.generatingCalendar = true;
      this.calendarProgress = 0;
      this.calendarProgressMessage = 'Iniciando generación...';
      this.cdr.detectChanges();
      
      // Simular progreso
      progressInterval = setInterval(() => {
        if (this.calendarProgress < 90) {
          this.calendarProgress += 10;
          
          if (this.calendarProgress <= 30) {
            this.calendarProgressMessage = '🔍 Analizando equipos...';
          } else if (this.calendarProgress <= 60) {
            this.calendarProgressMessage = '⚙️ Generando partidos...';
          } else if (this.calendarProgress <= 90) {
            this.calendarProgressMessage = '📅 Asignando fechas...';
          }
          
          this.cdr.detectChanges();
        }
      }, 300);
      
      // Llamada al backend
      await this.tournamentService
        .autoSchedule(this.tournamentId, undefined, true)
        .toPromise();
      
      console.log('✅ Calendario generado en el backend');
      
      // Detener simulación
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      
      // Completar progreso
      this.calendarProgress = 100;
      this.calendarProgressMessage = '✅ ¡Calendario generado!';
      this.cdr.detectChanges();
      
      // Esperar para mostrar mensaje
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // ✅ CRÍTICO: Actualizar estado del calendario
      await this.checkCalendarStatus();
      
      alert('✅ Calendario generado exitosamente');
      
    } catch (error) {
      console.error('❌ Error al generar calendario:', error);
      
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      
      this.calendarProgress = 100;
      this.calendarProgressMessage = '❌ Error al generar';
      this.cdr.detectChanges();
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      alert('❌ Error al generar calendario');
    } finally {
      // Ocultar barra después de 2 segundos
      setTimeout(() => {
        this.generatingCalendar = false;
        this.calendarProgress = 0;
        this.calendarProgressMessage = '';
        this.cdr.detectChanges();
      }, 2000);
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