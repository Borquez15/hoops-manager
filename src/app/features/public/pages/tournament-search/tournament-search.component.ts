import { Component, ChangeDetectorRef } from '@angular/core';
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
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  onSearch(): void {
    // ✅ GUARDAR el valor ANTES de cualquier operación
    const query = this.searchQuery.trim();
    
    console.log('🔍 onSearch() llamado con query:', `"${query}"`);
    console.log('🔍 searchQuery actual:', `"${this.searchQuery}"`);
    
    if (!query) {
      console.log('⚠️ Query vacío, no haciendo nada');
      return;
    }

    this.searching = true;
    this.hasSearched = true;
    this.cdr.detectChanges();

    console.log('🔍 Ejecutando búsqueda para:', query);

    this.searchService.search(query).subscribe({
      next: (response: SearchResponse) => {
        console.log('✅ Respuesta recibida:', response);
        this.match = response.match;
        this.suggestions = response.suggestions;
        this.searching = false;
        this.cdr.detectChanges();
        
        console.log('Match:', this.match);
        console.log('Suggestions:', this.suggestions.length, 'encontradas');
      },
      error: (error) => {
        console.error('❌ Error en búsqueda:', error);
        this.match = null;
        this.suggestions = [];
        this.hasSearched = true;
        this.searching = false;
        this.cdr.detectChanges();
        alert('Error al buscar torneos. Por favor intenta de nuevo.');
      }
    });
  }

  clearResults(): void {
    this.match = null;
    this.suggestions = [];
    this.hasSearched = false;
    this.cdr.detectChanges();
  }

  viewTournament(torneo: TorneoPublico): void {
    console.log('👁️ Navegando a torneo:', torneo.id_torneo);
    this.router.navigate(['/torneos', torneo.id_torneo]);
  }
}