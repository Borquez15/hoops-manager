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
  
  // Tabs - Removemos árbitros por ahora
  activeTab: 'config' | 'equipos' | 'calendario' = 'config';
  
  // Estado del torneo
  tournamentStatus: 'configurando' | 'iniciado' | 'finalizado' = 'configurando';
  
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

  // ========== CARGA DE DATOS ==========
  
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

  // ========== TABS ==========
  
  changeTab(tab: 'config' | 'equipos' | 'calendario'): void {
    console.log('🔵 Cambiando a tab:', tab);
    this.activeTab = tab;
    this.cdr.detectChanges();
  }

  // ========== CONFIGURACIÓN ==========
  
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
      
      alert('Configuración guardada exitosamente');
      
    } catch (error) {
      console.error('❌ Error al guardar:', error);
      alert('Error al guardar la configuración');
    }
  }

  // ========== EQUIPOS ==========
  
  toggleAddEquipoForm(): void {
    this.showAddEquipoForm = !this.showAddEquipoForm;
    if (!this.showAddEquipoForm) {
      this.newEquipo = { nombre: '', logo: '' };
    }
  }

  async addEquipo(): Promise<void> {
    if (!this.newEquipo.nombre.trim()) {
      alert('El nombre del equipo es requerido');
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
      alert(errorMsg);
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
      alert('Error al eliminar el equipo');
    }
  }

  // ========== CALENDARIO ==========
  
  async generateCalendar(): Promise<void> {
    // Validaciones
    if (this.equipos.length < 2) {
      alert('Necesitas al menos 2 equipos para generar el calendario');
      return;
    }
    
    if (!confirm('¿Deseas generar el calendario automático? Esto reemplazará cualquier calendario existente.')) {
      return;
    }
    
    try {
      console.log('🔵 Generando calendario...');
      
      await this.tournamentService
        .autoSchedule(this.tournamentId, undefined, true)
        .toPromise();
      
      console.log('✅ Calendario generado');
      
      alert('Calendario generado exitosamente');
      
      // Cambiar a tab de calendario
      this.changeTab('calendario');
      
    } catch (error) {
      console.error('❌ Error al generar calendario:', error);
      alert('Error al generar el calendario');
    }
  }

  async startTournament(): Promise<void> {
    // Validaciones
    if (this.equipos.length < 2) {
      alert('Necesitas al menos 2 equipos para iniciar el torneo');
      return;
    }
    
    if (!confirm('¿Estás seguro de iniciar el torneo? Se generará el calendario automáticamente.')) {
      return;
    }
    
    try {
      console.log('🔵 Iniciando torneo...');
      
      // Generar calendario
      await this.generateCalendar();
      
      // Actualizar estado del torneo
      await this.tournamentService
        .updateTournament(this.tournamentId, { estado: 'iniciado' })
        .toPromise();
      
      console.log('✅ Torneo iniciado');
      
      alert('¡Torneo iniciado exitosamente!');
      
      // Recargar datos
      await this.loadTournamentData();
      
    } catch (error) {
      console.error('❌ Error al iniciar torneo:', error);
      alert('Error al iniciar el torneo');
    }
  }

  // ========== NAVEGACIÓN ==========
  
  goBack(): void {
    console.log('🔵 Volviendo a mis torneos');
    this.router.navigate(['/mis-torneos']);
  }

  // ========== UTILIDADES ==========
  
  canStartTournament(): boolean {
    return this.equipos.length >= 2 && this.tournamentStatus === 'configurando';
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