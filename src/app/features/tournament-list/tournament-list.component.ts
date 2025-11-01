// src/app/features/tournament-list/tournament-list.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TournamentService, Tournament } from '../../services/tournament.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-tournament-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tournament-list.component.html',
  styleUrls: ['./tournament-list.component.css']
})
export class TournamentListComponent implements OnInit {
  tournaments: Tournament[] = [];
  loading = true;
  error: string | null = null;

  constructor(
    private tournamentService: TournamentService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadTournaments();
  }

  loadTournaments(): void {
    this.loading = true;
    this.error = null;

    this.tournamentService.getTournaments().subscribe({
      next: (data) => {
        this.tournaments = data;
        this.loading = false;
      },
      error: (error: HttpErrorResponse) => {
        this.error = 'Error al cargar los torneos';
        this.loading = false;
        console.error(error);
      }
    });
  }

  viewTournament(id: number): void {
    this.router.navigate(['/tournament-edit', id]);
  }

  createTournament(): void {
    this.router.navigate(['/create-tournament']);
  }

  deleteTournament(id: number, event: Event): void {
    event.stopPropagation();
    
    if (confirm('¿Estás seguro de que deseas eliminar este torneo?')) {
      this.tournamentService.deleteTournament(id).subscribe({
        next: () => {
          this.loadTournaments();
        },
        error: (error) => {
          alert('Error al eliminar el torneo');
          console.error(error);
        }
      });
    }
  }
}