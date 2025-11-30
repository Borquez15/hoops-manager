import { Component, HostListener } from '@angular/core';
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
  ) {
    console.log('🎯 TournamentSearchComponent inicializado');
  }

  /**
   * ✅ BLOQUEAR NAVEGACIÓN ACCIDENTAL
   * Captura clicks en el documento y los detiene si vienen de dentro del componente
   */
  @HostListener('document:click', ['$event'])
  handleDocumentClick(event: MouseEvent): void {
    // Solo actuar si el click viene de nuestro componente
    const target = event.target as HTMLElement;
    const isInsideComponent = target.closest('app-tournament-search');
    
    if (isInsideComponent) {
      const isLink = target.closest('a');
      const isRouterLink = target.closest('[routerLink]');
      
      // Si es un link que NO sea de navegación interna, detenerlo
      if ((isLink || isRouterLink) && !target.closest('.btn-enter, .tournament-card')) {
        console.log('🛑 Bloqueando navegación no deseada');
        event.preventDefault();
        event.stopPropagation();
      }
    }
  }

  /**
   * ✅ MÉTODO DE BÚSQUEDA
   */
  onSearch(event?: Event): void {
    // Detener cualquier comportamiento por defecto
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    const query = this.searchQuery.trim();
    
    console.log('\n🔍 ===== INICIO DE BÚSQUEDA =====');
    console.log('Query:', `"${query}"`);
    console.log('Ruta actual ANTES:', this.router.url);
    
    if (!query) {
      console.log('⚠️ Query vacío, cancelando');
      return;
    }

    // Actualizar estado
    this.searching = true;
    this.hasSearched = true;
    this.match = null;
    this.suggestions = [];
    
    console.log('🔄 Estado actualizado: searching=true');

    // Realizar búsqueda
    this.searchService.search(query).subscribe({
      next: (response: SearchResponse) => {
        console.log('✅ Respuesta recibida del servidor:', response);
        console.log('Ruta actual DESPUÉS:', this.router.url);
        
        this.match = response.match;
        this.suggestions = response.suggestions;
        this.searching = false;
        
        console.log('📊 Resultados procesados:');
        console.log('  - Match:', this.match ? this.match.nombre : 'ninguno');
        console.log('  - Sugerencias:', this.suggestions.length);
        console.log('================================\n');
      },
      error: (error) => {
        console.error('❌ Error en búsqueda:', error);
        
        this.match = null;
        this.suggestions = [];
        this.searching = false;
        this.hasSearched = true;
        
        alert('Error al buscar torneos. Por favor intenta de nuevo.');
      }
    });
  }

  /**
   * Limpia los resultados
   */
  clearResults(): void {
    this.match = null;
    this.suggestions = [];
    this.hasSearched = false;
    this.searching = false;
    this.searchQuery = '';
    console.log('🧹 Resultados limpiados');
  }

  /**
   * Navega al detalle del torneo
   */
  viewTournament(torneo: TorneoPublico, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    console.log('👁️ Navegando a torneo:', torneo.id_torneo);
    this.router.navigate(['/torneos', torneo.id_torneo]);
  }
}