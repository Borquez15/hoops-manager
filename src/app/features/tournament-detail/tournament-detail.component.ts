// src/app/features/tournament-detail/tournament-detail.component.ts
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TournamentService, Tournament, Equipo } from '../../services/tournament.service';

@Component({
  selector: 'app-tournament-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tournament-detail.component.html',
  styleUrls: ['./tournament-detail.component.css']
})
export class TournamentDetailComponent implements OnInit {
  tournamentId!: number;
  tournament: Tournament | null = null;
  equipos: Equipo[] = [];
  
  loading = true;
  error: string | null = null;
  
  // Estado del torneo
  tournamentStatus: 'configurando' | 'iniciado' | 'finalizado' = 'configurando';
  
  // Estado del calendario
  calendarGenerated = false;
  
  // Forms
  showAddEquipoForm = false;
  newEquipo = { nombre: '', logo: '' };
  
  // Edición de configuración
  editMode = false;
  editForm: Partial<Tournament> = {};

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private tournamentService: TournamentService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    console.log('🔵 TournamentDetailComponent inicializado');
    
    // Obtener ID del torneo desde la ruta
    this.route.params.subscribe(params => {
      this.tournamentId = +params['id'];
      console.log('🔵 Tournament ID:', this.tournamentId);
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
      console.log('🔵 Cargando datos del torneo...');
      
      // Cargar torneo
      this.tournament = await this.tournamentService.getTournament(this.tournamentId).toPromise() || null;
      console.log('✅ Torneo cargado:', this.tournament);
      
      // Determinar estado
      if (this.tournament?.estado) {
        this.tournamentStatus = this.tournament.estado as any;
      }
      
      // Cargar equipos
      await this.loadEquipos();
      
      // Verificar si el calendario ya fue generado
      await this.checkCalendarStatus();
      
      this.loading = false;
      this.cdr.detectChanges();
      
    } catch (error) {
      console.error('❌ Error al cargar torneo:', error);
      this.error = 'Error al cargar el torneo';
      this.loading = false;
    }
  }

  async loadEquipos(): Promise<void> {
    try {
      this.equipos = await this.tournamentService.getEquipos(this.tournamentId).toPromise() || [];
      console.log('✅ Equipos cargados:', this.equipos.length);
    } catch (error) {
      console.error('❌ Error al cargar equipos:', error);
    }
  }

  async checkCalendarStatus(): Promise<void> {
    try {
      // TODO: Hacer llamada al backend para verificar si hay partidos generados
      // Por ahora, asumimos que si el torneo está "iniciado", el calendario ya fue generado
      if (this.tournamentStatus !== 'configurando') {
        this.calendarGenerated = true;
      }
      
      // Puedes implementar algo como:
      // const partidos = await this.tournamentService.getPartidos(this.tournamentId).toPromise();
      // this.calendarGenerated = partidos && partidos.length > 0;
      
    } catch (error) {
      console.error('❌ Error al verificar calendario:', error);
    }
  }

  // ========================================
  // CONFIGURACIÓN
  // ========================================
  
  enableEditMode(): void {
    if (!this.tournament) return;
    
    this.editMode = true;
    this.editForm = {
      nombre: this.tournament.nombre,
      vueltas: this.tournament.vueltas,
      cupos_playoffs: this.tournament.cupos_playoffs,
      modalidad: this.tournament.modalidad,
      dias_por_semana: this.tournament.dias_por_semana,
      partidos_por_dia: this.tournament.partidos_por_dia,
      hora_ini: this.tournament.hora_ini,
      hora_fin: this.tournament.hora_fin,
      slot_min: this.tournament.slot_min
    };
  }

  cancelEdit(): void {
    this.editMode = false;
    this.editForm = {};
  }

  async saveConfig(): Promise<void> {
    if (!this.tournament) return;
    
    try {
      console.log('🔵 Guardando configuración:', this.editForm);
      
      this.tournament = await this.tournamentService
        .updateTournament(this.tournamentId, this.editForm)
        .toPromise() || null;
      
      console.log('✅ Configuración guardada');
      this.editMode = false;
      this.editForm = {};
      
      alert('✅ Configuración guardada exitosamente');
      
    } catch (error) {
      console.error('❌ Error al guardar:', error);
      alert('❌ Error al guardar la configuración');
    }
  }

  // ========================================
  // EQUIPOS
  // ========================================
  
  toggleAddEquipoForm(): void {
    this.showAddEquipoForm = !this.showAddEquipoForm;
    if (!this.showAddEquipoForm) {
      this.newEquipo = { nombre: '', logo: '' };
    }
  }

  async addEquipo(): Promise<void> {
    if (!this.newEquipo.nombre.trim()) {
      alert('⚠️ El nombre del equipo es requerido');
      return;
    }
    
    try {
      console.log('🔵 Agregando equipo:', this.newEquipo);
      
      await this.tournamentService
        .addEquipo(this.tournamentId, this.newEquipo)
        .toPromise();
      
      console.log('✅ Equipo agregado');
      
      // Recargar equipos
      await this.loadEquipos();
      
      // Limpiar form
      this.newEquipo = { nombre: '', logo: '' };
      this.showAddEquipoForm = false;
      
      this.cdr.detectChanges();
      
    } catch (error: any) {
      console.error('❌ Error al agregar equipo:', error);
      const errorMsg = error.error?.detail || 'Error al agregar el equipo';
      alert('❌ ' + errorMsg);
    }
  }

  async deleteEquipo(equipoId: number): Promise<void> {
    if (!confirm('¿Estás seguro de eliminar este equipo?')) return;
    
    try {
      console.log('🔵 Eliminando equipo:', equipoId);
      
      await this.tournamentService
        .deleteEquipo(this.tournamentId, equipoId)
        .toPromise();
      
      console.log('✅ Equipo eliminado');
      
      // Recargar equipos
      await this.loadEquipos();
      this.cdr.detectChanges();
      
    } catch (error) {
      console.error('❌ Error al eliminar equipo:', error);
      alert('❌ Error al eliminar el equipo');
    }
  }

  // ========================================
  // CALENDARIO
  // ========================================
  
  /**
   * Genera el calendario automático (SEPARADO de iniciar torneo)
   * Permite al admin revisar y editar antes de iniciar oficialmente
   */
  async generateCalendar(): Promise<void> {
    // Validaciones
    if (this.equipos.length < 2) {
      alert('⚠️ Necesitas al menos 2 equipos para generar el calendario');
      return;
    }
    
    if (!confirm('¿Deseas generar el calendario automático?\n\nPodrás revisarlo y modificarlo antes de iniciar el torneo.')) {
      return;
    }
    
    try {
      console.log('🔵 Generando calendario...');
      
      // Mostrar loading
      this.loading = true;
      
      await this.tournamentService
        .autoSchedule(this.tournamentId, undefined, true)
        .toPromise();
      
      console.log('✅ Calendario generado');
      
      this.calendarGenerated = true;
      this.loading = false;
      
      alert('✅ Calendario generado exitosamente\n\nPuedes revisarlo y editarlo antes de iniciar el torneo');
      
      this.cdr.detectChanges();
      
    } catch (error) {
      console.error('❌ Error al generar calendario:', error);
      this.loading = false;
      alert('❌ Error al generar el calendario');
    }
  }

  /**
   * Permite editar el calendario (TODO: implementar vista de edición)
   */
  editCalendar(): void {
    console.log('🔵 Editando calendario');
    alert('💡 Próximamente: Aquí podrás editar las fechas del calendario');
    
    // TODO: Navegar a vista de edición de calendario
    // this.router.navigate(['/torneo', this.tournamentId, 'calendario']);
  }

  /**
   * Inicia el torneo oficialmente (solo si el calendario ya fue generado)
   */
  async startTournament(): Promise<void> {
    // Validaciones
    if (!this.calendarGenerated) {
      alert('⚠️ Primero debes generar el calendario');
      return;
    }
    
    if (!confirm('¿Estás seguro de iniciar el torneo?\n\nEsto marcará el torneo como "iniciado" y ya no podrás modificar la configuración básica.')) {
      return;
    }
    
    try {
      console.log('🔵 Iniciando torneo...');
      
      // Actualizar estado del torneo a "iniciado"
      await this.tournamentService
        .updateTournament(this.tournamentId, { estado: 'iniciado' })
        .toPromise();
      
      console.log('✅ Torneo iniciado');
      
      alert('🚀 ¡Torneo iniciado exitosamente!\n\nEl calendario ahora está activo');
      
      // Recargar datos
      await this.loadTournamentData();
      
    } catch (error) {
      console.error('❌ Error al iniciar torneo:', error);
      alert('❌ Error al iniciar el torneo');
    }
  }

  // ========================================
  // NAVEGACIÓN
  // ========================================
  
  goBack(): void {
    console.log('🔵 Volviendo a mis torneos');
    this.router.navigate(['/mis-torneos']);
  }

  // ========================================
  // UTILIDADES
  // ========================================
  
  /**
   * Puede iniciar el torneo si:
   * - Hay equipos suficientes (>=2)
   * - El calendario ya fue generado
   * - El torneo está en estado "configurando"
   */
  canStartTournament(): boolean {
    return this.equipos.length >= 2 
      && this.calendarGenerated 
      && this.tournamentStatus === 'configurando';
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
}