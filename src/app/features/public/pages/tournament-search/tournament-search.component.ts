import { Component, HostListener, NgZone, ChangeDetectorRef } from '@angular/core';
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
    private zone: NgZone,
    private cdr: ChangeDetectorRef
  ) {
    console.log('🎯 TournamentSearchComponent inicializado');
  }

  // =================================================
  // 🚫 BLOQUEAR CLICS FUERA DEL COMPONENTE
  // =================================================
  @HostListener('document:click', ['$event'])
  handleDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const isInside = target.closest('app-tournament-search');
    
    if (isInside) {
      const isLink = target.closest('a');
      const isRouterLink = target.closest('[routerLink]');
      
      if ((isLink || isRouterLink) && !target.closest('.btn-enter, .tournament-card')) {
        console.log('🛑 Bloqueando navegación accidental');
        event.preventDefault();
        event.stopPropagation();
      }
    }
  }

  // =================================================
  // 🔍 MÉTODO PRINCIPAL DE BÚSQUEDA
  // =================================================
  onSearch(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    const query = this.searchQuery.trim();
    
    if (!query) return;

    this.searching = true;
    this.hasSearched = true;
    this.match = null;
    this.suggestions = [];

    // 🚀 Aquí ocurría el problema: SIN ZONA
    this.searchService.search(query).subscribe({
      next: (response: SearchResponse) => {
        this.zone.run(() => {
          this.match = response.match;
          this.suggestions = response.suggestions;
          this.searching = false;

          this.cdr.detectChanges(); // ⚡ fuerza actualización inmediata
        });
      },
      error: () => {
        this.zone.run(() => {
          this.searching = false;
          this.hasSearched = true;
          this.match = null;
          this.suggestions = [];

          alert('Error al buscar torneos');
          this.cdr.detectChanges();
        });
      }
    });
  }

  // =================================================
  // 🧹 Limpiar búsqueda
  // =================================================
  clearResults(): void {
    this.zone.run(() => {
      this.match = null;
      this.suggestions = [];
      this.hasSearched = false;
      this.searching = false;
      this.searchQuery = '';

      this.cdr.detectChanges();
    });
  }

  // =================================================
  // 👁 Navegar al torneo
  // =================================================
  viewTournament(t: TorneoPublico, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    this.router.navigate(['/torneos', t.id_torneo]);
  }
}
