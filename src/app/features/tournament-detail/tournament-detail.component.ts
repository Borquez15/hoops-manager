import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

import { TournamentService } from '../../services/tournament.service';
import { Tournament } from '../../models/tournament.model';

import { ConfigModalComponent } from './modal/config-modal/config-modal.component';
import { TeamModalComponent } from './modal/team-modal/team-modal.component';
import { RefereeModalComponent } from './modal/referee-modal/referee-modal.component';
import { ProximosJuegosComponent } from './proximos-juegos/proximos-juegos.component';

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
    TeamModalComponent,
    RefereeModalComponent,
    ProximosJuegosComponent
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
      
      if (this.tournament.estado) {
        this.tournamentStatus = this.tournament.estado as any;
      }
      
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
      alert('❌ Error al actualizar configuración');
    }
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
    
    if (!confirm('¿Generar calendario? Esto puede tardar unos segundos.')) {
      return;
    }
    
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
      
      await this.tournamentService
        .autoSchedule(this.tournamentId, undefined, true)
        .toPromise();
      
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
    
    return null;
  }

  canStartTournament(): boolean {
    if (!this.tournament) return false;
    
    return this.equipos.length >= this.getMinimumTeams() &&
           this.calendarGenerated &&
           this.tournamentStatus === 'configurando';
  }

  getStatusBadge(): { text: string; class: string } {
    switch (this.tournamentStatus) {
      case 'iniciado':
        return { text: '🟢 Iniciado', class: 'badge-success' };
      case 'finalizado':
        return { text: '⚫ Finalizado', class: 'badge-finished' };
      default:
        return { text: '🔴 Configurando', class: 'badge-warning' };
    }
  }

  async startTournament(): Promise<void> {
    if (!this.canStartTournament()) {
      alert('⚠️ No se puede iniciar');
      return;
    }
    
    if (!confirm('¿Iniciar el torneo?')) return;
    
    try {
      await this.tournamentService
        .updateTournament(this.tournamentId, { estado: 'ACTIVO' })
        .toPromise();
      
      alert('🚀 ¡Torneo iniciado!');
      await this.loadTournamentData();
    } catch (error) {
      alert('❌ Error al iniciar');
    }
  }

  getJugadoresCount(equipo: EquipoConJugadores): number {
    return equipo.jugadores ? equipo.jugadores.length : 0;
  }

  goBack(): void {
    this.router.navigate(['/mis-torneos']);
  }
}