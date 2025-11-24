import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TournamentSearchService, TorneoPublico, SearchResponse } from '../../../../services/tournament-search.service';

@Component({
  selector: 'app-tournament-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tournament-search.component.html',
  styleUrls: ['./tournament-search.component.css']
})
export class TournamentSearchComponent {
  searchQuery = '';
  searching = false;
  hasSearched = false;
  
  match: TorneoPublico | null = null;
  suggestions: TorneoPublico[] = [];

  constructor(
    private searchService: TournamentSearchService,
    private router: Router
  ) {}

  onSearch(): void {
    if (!this.searchQuery.trim()) {
      this.clearResults();
      return;
    }

    this.searching = true;
    this.hasSearched = true;

    this.searchService.search(this.searchQuery.trim()).subscribe({
      next: (response: SearchResponse) => {
        console.log('✅ Resultados:', response);
        this.match = response.match;
        this.suggestions = response.suggestions;
        this.searching = false;
      },
      error: (error) => {
        console.error('❌ Error en búsqueda:', error);
        this.clearResults();
        this.searching = false;
      }
    });
  }

  clearResults(): void {
    this.match = null;
    this.suggestions = [];
    this.hasSearched = false;
  }

  viewTournament(torneo: TorneoPublico): void {
    // Navegar a la vista pública del torneo
    this.router.navigate(['/torneos', torneo.id_torneo]);
  }

  getEstadoBadge(estado: string): string {
    switch (estado?.toUpperCase()) {
      case 'ACTIVO':
        return '🟢 Activo';
      case 'FINALIZADO':
        return '⚫ Finalizado';
      case 'DRAFT':
        return '🔴 Borrador';
      default:
        return estado || 'Desconocido';
    }
  }
}