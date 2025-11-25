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
    const query = this.searchQuery.trim();
    
    if (!query) {
      this.clearResults();
      return;
    }

    this.searching = true;
    this.hasSearched = true;

    console.log('🔍 Buscando:', query);

    this.searchService.search(query).subscribe({
      next: (response: SearchResponse) => {
        console.log('✅ Respuesta recibida:', response);
        this.match = response.match;
        this.suggestions = response.suggestions;
        this.searching = false;
        
        console.log('Match:', this.match);
        console.log('Suggestions:', this.suggestions);
      },
      error: (error) => {
        console.error('❌ Error en búsqueda:', error);
        this.clearResults();
        this.searching = false;
        alert('Error al buscar torneos. Por favor intenta de nuevo.');
      }
    });
  }

  clearResults(): void {
    this.match = null;
    this.suggestions = [];
    this.hasSearched = false;
  }

  viewTournament(torneo: TorneoPublico): void {
    console.log('📍 Navegando a torneo:', torneo.id_torneo);
    // Navegar usando la ruta correcta: /torneos/:id
    this.router.navigate(['/torneos', torneo.id_torneo]);
  }
}