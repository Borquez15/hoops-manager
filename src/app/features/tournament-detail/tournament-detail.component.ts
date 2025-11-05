// src/app/features/tournament-detail/tournament-detail.component.ts
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
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

  // ✅ Manejo de logo (archivo + vista previa)
  previewLogo: string | null = null;
  selectedLogoFile: File | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private tournamentService: TournamentService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(async params => {
      this.tournamentId = +params['id'];
      await this.loadTournamentData();
    });
  }

  ngAfterViewInit(): void {
    // (solo debug)
  }

  // ========================================
  // CARGA DE DATOS
  // ========================================
  async loadTournamentData(): Promise<void> {
    this.loading = true;
    this.error = null;

    try {
      this.tournament = await firstValueFrom(
        this.tournamentService.getTournament(this.tournamentId)
      );

      if (this.tournament?.estado) {
        this.tournamentStatus = this.tournament.estado as any;
      }

      await this.loadEquipos();
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
      this.equipos = await firstValueFrom(
        this.tournamentService.getEquipos(this.tournamentId)
      );
    } catch (error) {
      console.error('❌ Error al cargar equipos:', error);
      this.equipos = [];
    }
  }

  async checkCalendarStatus(): Promise<void> {
    try {
      if (this.tournamentStatus !== 'configurando') {
        this.calendarGenerated = true;
      }
      // Si tienes endpoint para verificar partidos, puedes usarlo aquí.
    } catch (error) {
      console.error('❌ Error al verificar calendario:', error);
    }
  }

  // ========================================
  // VALIDACIONES Y UTILIDADES
  // ========================================
  getMinimumTeams(): number {
    if (!this.tournament) return 2;
    const minByPlayoffs = this.tournament.cupos_playoffs || 0;
    const absoluteMin = 2;
    return Math.max(minByPlayoffs, absoluteMin);
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
      if (this.editForm.cupos_playoffs && this.editForm.cupos_playoffs > 0) {
        const currentTeams = this.equipos.length;
        if (currentTeams < this.editForm.cupos_playoffs) {
          const confirmRes = window.confirm(
            `Atención: Estás configurando ${this.editForm.cupos_playoffs} cupos de playoffs ` +
            `pero solo tienes ${currentTeams} equipos.\n\n¿Deseas continuar?`
          );
          if (!confirmRes) return;
        }
      }

      this.tournament = await firstValueFrom(
        this.tournamentService.updateTournament(this.tournamentId, this.editForm)
      );

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
  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    this.selectedLogoFile = file;

    const reader = new FileReader();
    reader.onload = () => (this.previewLogo = reader.result as string);
    reader.readAsDataURL(file);
  }

  toggleAddEquipoForm(): void {
    this.showAddEquipoForm = !this.showAddEquipoForm;
    if (!this.showAddEquipoForm) {
      this.newEquipo = { nombre: '', logo: '' };
      this.previewLogo = null;
      this.selectedLogoFile = null;
    }
  }

  async addEquipo(): Promise<void> {
  if (!this.newEquipo.nombre.trim()) {
    alert('⚠️ El nombre del equipo es requerido');
    return;
  }

  try {
    const formData = new FormData();
    formData.append('nombre', this.newEquipo.nombre);

    // 🔹 SOLO si hay logo seleccionado, lo agregamos
    if (this.selectedLogoFile) {
      formData.append('logo', this.selectedLogoFile, this.selectedLogoFile.name);
    }

    await firstValueFrom(
      this.tournamentService.addEquipoFormData(this.tournamentId, formData)
    );

    await this.loadEquipos();
    this.newEquipo = { nombre: '', logo: '' };
    this.previewLogo = null;
    this.selectedLogoFile = null;
    this.showAddEquipoForm = false;
    this.cdr.detectChanges();

  } catch (error: any) {
    console.error('❌ Error al agregar equipo:', error);
    const errorMsg = error?.error?.detail || error?.message || 'Error al agregar el equipo';
    alert('❌ ' + errorMsg);
  }
}


  async deleteEquipo(equipoId: number): Promise<void> {
    const minTeams = this.getMinimumTeams();
    if (this.equipos.length <= minTeams) {
      const confirmMsg =
        `⚠️ ATENCIÓN: Si eliminas este equipo, quedarás con menos de ${minTeams} equipos.\n\n` +
        `¿Estás seguro?`;
      if (!confirm(confirmMsg)) return;
    } else {
      if (!confirm('¿Estás seguro de eliminar este equipo?')) return;
    }

    try {
      await firstValueFrom(
        this.tournamentService.deleteEquipo(this.tournamentId, equipoId)
      );
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
  async generateCalendar(): Promise<void> {
    const minimumTeams = this.getMinimumTeams();

    if (this.equipos.length < minimumTeams) {
      alert(`⚠️ Necesitas al menos ${minimumTeams} equipos para generar el calendario`);
      return;
    }

    if (!confirm('¿Deseas generar el calendario automático?')) return;

    try {
      this.loading = true;

      await firstValueFrom(
        this.tournamentService.autoSchedule(this.tournamentId, undefined, true)
      );

      this.calendarGenerated = true;
      this.loading = false;

      alert('✅ Calendario generado exitosamente');
      this.cdr.detectChanges();
    } catch (error) {
      console.error('❌ Error al generar calendario:', error);
      this.loading = false;
      alert('❌ Error al generar el calendario');
    }
  }

  editCalendar(): void {
    alert('💡 Próximamente: edición del calendario');
  }

  async startTournament(): Promise<void> {
    if (!this.canStartTournament()) {
      alert('⚠️ No se puede iniciar el torneo. Verifica los requisitos.');
      return;
    }

    if (!confirm('¿Iniciar el torneo ahora?')) return;

    try {
      await firstValueFrom(
        this.tournamentService.updateTournament(this.tournamentId, { estado: 'iniciado' })
      );
      alert('🚀 ¡Torneo iniciado!');
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
    this.router.navigate(['/mis-torneos']);
  }
}
