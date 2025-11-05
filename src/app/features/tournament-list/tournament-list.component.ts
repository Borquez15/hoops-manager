// src/app/features/tournament-list/tournament-list.component.ts
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TournamentService, Tournament } from '../../services/tournament.service';
import { HttpErrorResponse } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-tournament-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tournament-list.component.html',
  styleUrls: ['./tournament-list.component.css']
})
export class TournamentListComponent implements OnInit, OnDestroy {
  tournaments: Tournament[] = [];
  loading = true;
  error: string | null = null;
  private subscription?: Subscription;

  constructor(
    private tournamentService: TournamentService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    console.log('🔵 Constructor TournamentListComponent');
  }

  ngOnInit(): void {
    console.log('🔵 ngOnInit - TournamentListComponent inicializado');
    this.loadTournaments();
  }

  ngOnDestroy(): void {
    console.log('🔵 ngOnDestroy - Limpiando suscripciones');
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  /**
   * ========================================
   * NAVEGACIÓN
   * ========================================
   */

  /**
   * Navega al HOME de la aplicación
   */
  goBack(): void {
    console.log('🔵 Regresando al HOME');
    // Ajusta la ruta según tu configuración de rutas
    // Puede ser '/home', '/inicio', '/', etc.
    this.router.navigate(['/home']);
  }

  /**
   * Navega al panel de administración del torneo
   */
  viewTournament(id: number): void {
    console.log('🔵 Navegando al panel de administración del torneo:', id);
    this.router.navigate(['/torneo', id, 'admin']);
  }

  /**
   * Navega a la página de crear torneo
   */
  createTournament(): void {
    console.log('🔵 Navegando a crear torneo');
    this.router.navigate(['/crear-torneo']);
  }

  /**
   * ========================================
   * CARGA DE DATOS - OPTIMIZADO
   * ========================================
   */

  loadTournaments(): void {
    console.log('🔵 loadTournaments() - Iniciando carga...');
    this.loading = true;
    this.error = null;

    // Usar finalize para asegurar que loading siempre se establece a false
    this.subscription = this.tournamentService.getTournaments()
      .pipe(
        finalize(() => {
          this.loading = false;
          this.cdr.detectChanges();
          console.log('✅ Carga finalizada - loading:', this.loading);
        })
      )
      .subscribe({
        next: (data) => {
          console.log('✅ Datos recibidos:', data.length, 'torneos');
          this.tournaments = data;
          console.log('✅ Torneos asignados correctamente');
        },
        error: (error: HttpErrorResponse) => {
          console.error('❌ Error al cargar torneos:', error);
          this.error = 'Error al cargar los torneos. Por favor, intenta nuevamente.';
        }
      });
  }

  /**
   * ========================================
   * OPERACIONES
   * ========================================
   */

  deleteTournament(id: number, event: Event): void {
    event.stopPropagation();
    
    console.log('🔵 Intentando eliminar torneo:', id);
    
    if (confirm('¿Estás seguro de que deseas eliminar este torneo?')) {
      this.loading = true; // Mostrar loading durante eliminación
      
      this.tournamentService.deleteTournament(id).subscribe({
        next: () => {
          console.log('✅ Torneo eliminado exitosamente');
          this.loadTournaments();
        },
        error: (error) => {
          console.error('❌ Error al eliminar torneo:', error);
          this.error = 'Error al eliminar el torneo';
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
    }
  }

  /**
   * ========================================
   * MÉTODOS PARA ESTADOS (Si necesitas badges)
   * ========================================
   */
  
  getTournamentStatus(tournament: Tournament): string {
    if (tournament.estado) {
      return tournament.estado;
    }
    return 'configurando';
  }

  getStatusBadge(tournament: Tournament): { text: string; class: string } {
    const status = this.getTournamentStatus(tournament);
    
    switch (status) {
      case 'iniciado':
        return { text: '🟢 Iniciado', class: 'badge-success' };
      case 'finalizado':
        return { text: '⚫ Finalizado', class: 'badge-finished' };
      case 'configurando':
      default:
        return { text: '🔴 Configurar', class: 'badge-warning' };
    }
  }

  getButtonText(tournament: Tournament): string {
    const status = this.getTournamentStatus(tournament);
    
    switch (status) {
      case 'iniciado':
        return 'Gestionar';
      case 'finalizado':
        return 'Ver resultados';
      case 'configurando':
      default:
        return 'Configurar';
    }
  }

  isConfigured(tournament: Tournament): boolean {
    return this.getTournamentStatus(tournament) !== 'configurando';
  }
}