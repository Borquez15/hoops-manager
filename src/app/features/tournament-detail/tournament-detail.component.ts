// tournament-detail.component.ts - COMPLETO CON TODAS LAS FEATURES
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

import { TournamentService } from '../../services/tournament.service';
import { Tournament } from '../../models/tournament.model';
import { PlayoffBracketComponent } from './modal/playoff-bracket/playoff-bracket.component';
import { ConfigModalComponent } from './modal/config-modal/config-modal.component';
import { TeamModalComponent } from './modal/team-modal/team-modal.component';
import { RefereeModalComponent } from './modal/referee-modal/referee-modal.component';
import { ProximosJuegosComponent } from './proximos-juegos/proximos-juegos.component';
import { NgIf, NgFor } from '@angular/common';

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
  jugadores?: JugadorEquipo[];
}

@Component({
  selector: 'app-tournament-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ConfigModalComponent,
    TeamModalComponent,
    RefereeModalComponent,
    ProximosJuegosComponent,
    PlayoffBracketComponent
  ],
  templateUrl: './tournament-detail.component.html',
  styleUrls: ['./tournament-detail.component.css']
})
export class TournamentDetailComponent implements OnInit {
  private apiUrl = 'https://hoopsbackend-production.up.railway.app';
  
  tournamentId!: number;
  tournament: Tournament | null = null;
  equipos: EquipoConJugadores[] = [];
  arbitros: Arbitro[] = [];
  canchas: Cancha[] = [];
  
  loading = false;
  error: string | null = null;
  tournamentStatus: 'configurando' | 'iniciado' | 'playoffs' | 'finalizado' = 'configurando';
  calendarGenerated = false;

  playoffsGenerated = false;
  generatingPlayoffs = false;
  
  generatingCalendar = false;
  calendarProgress = 0;
  calendarProgressMessage = '';
  
  modalConfigAbierto = false;
  modalEquipoAbierto = false;
  modalArbitroAbierto = false;
  
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

  async loadTournamentData(): Promise<void> {
    console.log('🔵 Iniciando carga del torneo:', this.tournamentId);
    this.loading = true;
    this.error = null;
    
    try {
      const tournamentData = await this.tournamentService
        .getTournament(this.tournamentId)
        .toPromise();
      
      this.tournament = tournamentData || null;
      
      if (!this.tournament) {
        throw new Error('No se encontró el torneo');
      }
      
      console.log('✅ Torneo cargado:', this.tournament.nombre);
      console.log('📊 Estado del torneo:', this.tournament.estado);
      
      if (this.tournament.estado) {
        const estado = this.tournament.estado.toUpperCase();
        
        if (estado === 'DRAFT' || estado === 'CONFIGURANDO') {
          this.tournamentStatus = 'configurando';
        } else if (estado === 'ACTIVO' || estado === 'INICIADO') {
          this.tournamentStatus = 'iniciado';
        } else if (estado === 'PLAYOFFS') {  // ✅ AGREGAR
          this.tournamentStatus = 'playoffs';
        } else if (estado === 'FINALIZADO') {
          this.tournamentStatus = 'finalizado';
        } else {
          this.tournamentStatus = 'configurando';
        }
      }
      
      console.log('🎯 Estado mapeado a:', this.tournamentStatus);
      
      await Promise.all([
        this.loadEquipos(),
        this.loadArbitros(),
        this.loadCanchas(),
        this.checkCalendarStatus()
      ]);
      
      console.log('✅ Todos los datos cargados');
      
    } catch (error: any) {
      console.error('❌ Error en carga:', error);
      this.error = error?.message || 'Error al cargar';
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
    } catch (error) {}
  }

  async loadArbitros(): Promise<void> {
    try {
      const response = await this.http.get<any[]>(
        `${this.apiUrl}/tournaments/${this.tournamentId}/referees`
      ).toPromise();
      
      this.arbitros = response || [];
      console.log('✅ Árbitros cargados:', this.arbitros.length);
    } catch (error) {
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
      
      this.calendarGenerated = (response || []).length > 0;
      console.log('📅 Calendario:', this.calendarGenerated ? 'GENERADO' : 'NO GENERADO');
    } catch (error) {
      this.calendarGenerated = false;
    }
  }

  abrirModalConfig(): void {
    if (this.tournamentStatus !== 'configurando') {
      alert('⚠️ No se puede editar un torneo que ya fue iniciado');
      return;
    }
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
    } catch (error: any) {
      const mensaje = error?.error?.detail || 'Error al actualizar configuración';
      alert('❌ ' + mensaje);
    }
  }

  async onRegenerateCalendar(): Promise<void> {
    await this.loadTournamentData();
  }

  abrirModalEquipo(): void {
    if (this.tournamentStatus !== 'configurando') {
      alert('⚠️ No se pueden agregar equipos a un torneo iniciado');
      return;
    }
    
    this.equipoEditando = {
      nombre: '',
      logo_url: '',
      jugadores: []
    };
    this.indiceEquipoEditando = -1;
    this.modalEquipoAbierto = true;
  }

  editarEquipo(index: number): void {
    if (this.tournamentStatus !== 'configurando') {
      alert('⚠️ No se pueden editar equipos en un torneo iniciado');
      return;
    }
    
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
    if (this.tournamentStatus !== 'configurando') {
      alert('⚠️ No se pueden eliminar equipos de un torneo iniciado');
      return;
    }
    
    if (!id || !confirm('¿Eliminar este equipo?')) return;

    try {
      await this.http.delete(
        `${this.apiUrl}/tournaments/${this.tournamentId}/teams/${id}`
      ).toPromise();
      await this.loadEquipos();
    } catch (error) {
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

  async generateCalendar(): Promise<void> {
  const minimumTeams = this.getMinimumTeams();
  
  if (this.equipos.length < minimumTeams) {
    alert(`⚠️ Necesitas al menos ${minimumTeams} equipos`);
    return;
  }
  
  // 🔥 PRIMER INTENTO: Sin confirm (para recibir advertencias)
  try {
    const firstAttempt = await this.tournamentService
      .autoSchedule(this.tournamentId, undefined, false) // ← confirm=false
      .toPromise();
    
    // Si tiene warnings, mostrar confirmación
    if (firstAttempt && !firstAttempt.ok && firstAttempt.requires_confirmation) {
      const warnings = firstAttempt.warnings.join('\n\n');
      const mensaje = `⚠️ ADVERTENCIAS:\n\n${warnings}\n\n¿Deseas continuar de todos modos?`;
      
      if (!confirm(mensaje)) {
        return; // Usuario canceló
      }
      
      // Usuario confirmó, generar con confirm=true
      await this.generateCalendarConfirmed();
    } else {
      // No hay warnings, generar directamente
      await this.generateCalendarConfirmed();
    }
  } catch (error) {
    console.error('❌ Error en primera validación:', error);
    alert('❌ Error al validar configuración');
  }
}

// 🔥 MÉTODO AUXILIAR: Generar calendario con confirm=true
private async generateCalendarConfirmed(): Promise<void> {
  let progressInterval: any = null;
  
  try {
    console.log('🚀 Generando calendario...');
    
    this.generatingCalendar = true;
    this.calendarProgress = 0;
    this.calendarProgressMessage = 'Iniciando...';
    this.cdr.detectChanges();
    
    progressInterval = setInterval(() => {
      if (this.calendarProgress < 90) {
        this.calendarProgress += 10;
        
        if (this.calendarProgress <= 30) {
          this.calendarProgressMessage = '🔍 Analizando equipos...';
        } else if (this.calendarProgress <= 60) {
          this.calendarProgressMessage = '⚙️ Generando partidos...';
        } else {
          this.calendarProgressMessage = '📅 Asignando fechas...';
        }
        
        this.cdr.detectChanges();
      }
    }, 300);
    
    // ✅ GENERAR CON CONFIRM=TRUE
    await this.http.post(
  `${this.apiUrl}/tournaments/${this.tournamentId}/matches/auto-schedule?confirm=true`,
      {}
    ).toPromise();

    
    console.log('✅ Calendario generado');
    
    if (progressInterval) clearInterval(progressInterval);
    
    this.calendarProgress = 100;
    this.calendarProgressMessage = '✅ ¡Calendario generado!';
    this.cdr.detectChanges();
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    await this.checkCalendarStatus();
    
    alert('✅ Calendario generado exitosamente');
    
  } catch (error) {
    console.error('❌ Error:', error);
    
    if (progressInterval) clearInterval(progressInterval);
    
    this.calendarProgress = 100;
    this.calendarProgressMessage = '❌ Error al generar';
    this.cdr.detectChanges();
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    alert('❌ Error al generar calendario');
  } finally {
    setTimeout(() => {
      this.generatingCalendar = false;
      this.calendarProgress = 0;
      this.calendarProgressMessage = '';
      this.cdr.detectChanges();
    }, 2000);
  }
}

  async reactivarTorneo(): Promise<void> {
  if (this.tournamentStatus !== 'finalizado') {
    alert('⚠️ Solo se pueden reactivar torneos finalizados');
    return;
  }

  if (!confirm('¿Reactivar el torneo? Volverá al estado ACTIVO y podrás registrar más resultados.')) {
    return;
  }

  try {
    await this.http.post(
      `${this.apiUrl}/tournaments/${this.tournamentId}/reactivate`,
      {},
      { withCredentials: true }
    ).toPromise();

    alert('✅ ¡Torneo reactivado exitosamente!');
    await this.loadTournamentData();
  } catch (error: any) {
    const mensaje = error?.error?.detail || 'Error al reactivar torneo';
    alert(`❌ ${mensaje}`);
  }
  }

  async finalizarTemporadaRegular(): Promise<void> {
  if (this.tournamentStatus !== 'iniciado') {
    alert('⚠️ El torneo debe estar iniciado');
    return;
  }

  if (!confirm('¿Finalizar la Temporada Regular?\n\nEsto marcará el fin de la fase regular y habilitará los playoffs.')) {
    return;
  }

  try {
    await this.http.post(
      `${this.apiUrl}/tournaments/${this.tournamentId}/finish-regular-season`,
      {},
      { withCredentials: true }
    ).toPromise();

    alert('✅ ¡Temporada Regular finalizada!\n\nAhora puedes gestionar los playoffs.');
    await this.loadTournamentData();
  } catch (error: any) {
    const mensaje = error?.error?.detail || 'Error al finalizar temporada';
    alert(`❌ ${mensaje}`);
  }
}

irAPlayoffs(): void {
  this.router.navigate([`/torneos/${this.tournamentId}/playoffs`]);
  }

  getMinimumTeams(): number {
    if (!this.tournament) return 2;
    return Math.max(this.tournament.cupos_playoffs || 0, 2);
  }

  getValidationMessage(): string | null {
    if (!this.tournament) return null;
    
    const minimumTeams = this.getMinimumTeams();
    const currentTeams = this.equipos.length;
    
    if (currentTeams < minimumTeams) {
      const needed = minimumTeams - currentTeams;
      return `Necesitas agregar ${needed} equipo${needed > 1 ? 's' : ''} más.`;
    }
    
    if (!this.calendarGenerated && currentTeams >= minimumTeams) {
      return 'Genera el calendario para iniciar.';
    }

    if (!this.equipos.every(eq => (eq.jugadores?.length || 0) >= 7)) {
      return 'Todos los equipos deben tener al menos 7 jugadores.';
    }

    
    return null;
  }

  canStartTournament(): boolean {
    if (!this.tournament) {
      console.log('❌ No tournament');
      return false;
    }

    const hasMinTeams = this.equipos.length >= this.getMinimumTeams();
    const hasCalendar = this.calendarGenerated;
    const isConfiguring = this.tournamentStatus === 'configurando';

    // 🔥 NUEVO: validar que todos los equipos tengan al menos 7 jugadores
    const allTeamsHaveMinPlayers = this.equipos.every(
      eq => (eq.jugadores?.length || 0) >= 7
    );

    console.log('🔍 canStartTournament check:', {
      hasMinTeams,
      hasCalendar,
      isConfiguring,
      allTeamsHaveMinPlayers,   // 👈 agregado
      tournamentStatus: this.tournamentStatus,
      equipos: this.equipos.length,
      minTeams: this.getMinimumTeams()
    });

    // 🔥 SE AGREGA A TU VALIDACIÓN EXISTENTE
    return hasMinTeams && hasCalendar && isConfiguring && allTeamsHaveMinPlayers;
  }


  getStatusBadge(): { text: string; class: string } {
  switch (this.tournamentStatus) {
    case 'iniciado':
      return { text: '🟢 Iniciado', class: 'badge-success' };
    case 'playoffs':
      return { text: '🟠 Playoffs', class: 'badge-playoffs' };
    case 'finalizado':
      return { text: '⚫ Finalizado', class: 'badge-finished' };
    case 'configurando':
    default:
      return { text: '🔴 Configurando', class: 'badge-warning' };
    }
  }


  async startTournament(): Promise<void> {
    if (!this.canStartTournament()) {
      alert('⚠️ No se puede iniciar el torneo');
      return;
    }

    if (!confirm('¿Iniciar el torneo y hacerlo PÚBLICO? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      await this.http.post(
        `${this.apiUrl}/tournaments/${this.tournamentId}/start`,
        {},
        { withCredentials: true }
      ).toPromise();

      alert('🚀 ¡Torneo iniciado y ahora es PÚBLICO!');
      await this.loadTournamentData();
    } catch (error: any) {
      const mensaje = error?.error?.detail || 'Error al iniciar torneo';
      alert(`❌ ${mensaje}`);
    }
  }

  async finalizarTorneo(): Promise<void> {
    if (this.tournamentStatus !== 'iniciado') {
      alert('⚠️ Solo se pueden finalizar torneos que están activos');
      return;
    }

    if (!confirm('¿Finalizar el torneo? Esta acción no se puede deshacer.\n\nEl torneo quedará como histórico y no se podrá modificar.')) {
      return;
    }

    try {
      await this.http.post(
        `${this.apiUrl}/tournaments/${this.tournamentId}/finish`,
        {},
        { withCredentials: true }
      ).toPromise();

      alert('🏁 ¡Torneo finalizado exitosamente!');
      await this.loadTournamentData();
    } catch (error: any) {
      const mensaje = error?.error?.detail || 'Error al finalizar torneo';
      alert(`❌ ${mensaje}`);
    }
  }

  getJugadoresCount(equipo: EquipoConJugadores): number {
    return equipo.jugadores ? equipo.jugadores.length : 0;
  }

  goBack(): void {
    this.router.navigate(['/mis-torneos']);
  }

  // ========================================
  // ✅ MÉTODOS DE PLAYOFFS - NUEVOS
  // ========================================

  /**
   * Callback cuando el bracket notifica si existen playoffs
   */
  onPlayoffsLoaded(exists: boolean) {
    console.log('🏆 Playoffs cargados:', exists);
    this.playoffsGenerated = exists;
    this.cdr.detectChanges();
  }

  /**
   * Genera el bracket de playoffs
   */
  generarPlayoffs() {
    if (!this.tournament || this.generatingPlayoffs) return;

    if (this.tournamentStatus !== 'iniciado') {
      alert('⚠️ El torneo debe estar iniciado para generar playoffs');
      return;
    }

    if (!this.tournament.cupos_playoffs || this.tournament.cupos_playoffs === 0) {
      alert('⚠️ No hay cupos de playoffs configurados');
      return;
    }

    const mensaje = `¿Generar bracket de playoffs para ${this.tournament.cupos_playoffs} equipos?\n\nSe crearán las series según la tabla de posiciones actual.`;

    if (!confirm(mensaje)) {
      return;
    }

    this.generatingPlayoffs = true;

    this.http.post<any>(
      `${this.apiUrl}/tournaments/${this.tournamentId}/playoffs/generate`,
      {}
    ).subscribe({
      next: (response) => {
        console.log('✅ Playoffs generados:', response);
        alert(`✅ Playoffs generados exitosamente!\n\n📊 Series creadas: ${response.series_creadas}`);
        
        this.playoffsGenerated = true;
        this.generatingPlayoffs = false;
        this.cdr.detectChanges();
        
        // Recargar la página para ver el bracket
        window.location.reload();
      },
      error: (error) => {
        console.error('❌ Error al generar playoffs:', error);
        alert(`❌ Error: ${error.error?.detail || 'No se pudieron generar los playoffs'}`);
        this.generatingPlayoffs = false;
        this.cdr.detectChanges();
      }
    });
  }
}