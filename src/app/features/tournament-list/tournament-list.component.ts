// src/app/features/tournament-list/tournament-list.component.ts
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TournamentService, Tournament } from '../../services/tournament.service';
import { HttpErrorResponse } from '@angular/common/http';
import { Subscription } from 'rxjs';

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
    console.log('🔵 Loading inicial:', this.loading);
    this.loadTournaments();
  }

  ngOnDestroy(): void {
    console.log('🔵 ngOnDestroy - Limpiando suscripciones');
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  loadTournaments(): void {
    console.log('🔵 loadTournaments() - Iniciando carga...');
    this.loading = true;
    this.error = null;
    this.cdr.detectChanges();
    console.log('🔵 Loading establecido a true');

    this.subscription = this.tournamentService.getTournaments().subscribe({
      next: (data) => {
        console.log('✅ next() - Datos recibidos:', data);
        console.log('✅ Cantidad de torneos:', data.length);
        
        this.tournaments = data;
        this.loading = false;
        
        console.log('✅ tournaments asignado:', this.tournaments);
        console.log('✅ loading establecido a:', this.loading);
        
        // Forzar detección de cambios
        this.cdr.detectChanges();
        console.log('✅ detectChanges() ejecutado');
      },
      error: (error: HttpErrorResponse) => {
        console.error('❌ error() - Error recibido:', error);
        console.error('❌ Status:', error.status);
        console.error('❌ Message:', error.message);
        
        this.error = 'Error al cargar los torneos';
        this.loading = false;
        
        this.cdr.detectChanges();
        console.log('❌ Error manejado, loading:', this.loading);
      },
      complete: () => {
        console.log('✅ complete() - Observable completado');
        console.log('✅ Estado final - loading:', this.loading, 'tournaments:', this.tournaments.length);
      }
    });
  }

  viewTournament(id: number): void {
    console.log('🔵 Navegando al torneo:', id);
    this.router.navigate(['/tournament-edit', id]);
  }

  createTournament(): void {
    console.log('🔵 Navegando a crear torneo');
    this.router.navigate(['/create-tournament']);
  }

  deleteTournament(id: number, event: Event): void {
    event.stopPropagation();
    
    console.log('🔵 Intentando eliminar torneo:', id);
    
    if (confirm('¿Estás seguro de que deseas eliminar este torneo?')) {
      this.tournamentService.deleteTournament(id).subscribe({
        next: () => {
          console.log('✅ Torneo eliminado exitosamente');
          this.loadTournaments();
        },
        error: (error) => {
          console.error('❌ Error al eliminar torneo:', error);
          alert('Error al eliminar el torneo');
        }
      });
    }
  }
}