import { Component, ChangeDetectorRef, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TournamentSearchService, TorneoPublico, SearchResponse } from '../../../../services/tournament-search.service';
import { TimeoutError } from 'rxjs';

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
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  onSearch(event?: Event): void {
      if (event) event.preventDefault();

      const query = this.searchQuery.trim();
      if (!query) return;

      console.log('🔍 Iniciando búsqueda:', query);
      
      this.searching = true;
      this.hasSearched = true;
      this.match = null;
      this.suggestions = [];

      this.searchService.search(query).subscribe({
        next: (response: SearchResponse) => {
          console.log('✅ Resultados recibidos:', response);
          
          this.match = response.match;
          this.suggestions = response.suggestions || [];
          this.searching = false;
        },
        error: (err) => {
          console.error('❌ Error en búsqueda:', err);
          
          this.match = null;
          this.suggestions = [];
          this.searching = false;
          this.hasSearched = true;

          if (err.status === 0) {
            alert('❌ No se pudo conectar con el servidor.');
          } else {
            alert('❌ Error al buscar torneos.');
          }
        }
      });
    }


  clearResults(): void {
    this.searchQuery = '';
    this.match = null;
    this.suggestions = [];
    this.searching = false;
    this.hasSearched = false;
    this.cdr.detectChanges();
  }

  viewTournament(t: TorneoPublico): void {
    this.router.navigate(['/torneos', t.id_torneo]);
  }
}