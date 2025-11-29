import { Component, NgZone } from '@angular/core';
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
    private zone: NgZone
  ) {}

  // ✅ NUEVO MÉTODO: Manejar Enter
  handleEnter(): void {
    console.log('🎯 Enter presionado');
  this.onSearch();
}

  // ✅ MÉTODO ACTUALIZADO: Búsqueda
  onSearch(): void {
    const query = this.searchQuery.trim();
    
    console.log('\n🔍 ===== INICIO DE BÚSQUEDA =====');
    console.log('Query:', `"${query}"`);
    
    if (!query) {
      console.log('⚠️ Query vacío, cancelando');
      return;
    }

    // ✅ Ejecutar dentro de NgZone para forzar detección de cambios
    this.zone.run(() => {
      this.searching = true;
      this.hasSearched = true;
      this.match = null;
      this.suggestions = [];
      
      console.log('🔄 Estado actualizado: searching=true');
    });

    this.searchService.search(query).subscribe({
      next: (response: SearchResponse) => {
        console.log('✅ Respuesta recibida del servidor:', response);
        
        // ✅ Forzar actualización en NgZone
        this.zone.run(() => {
          this.match = response.match;
          this.suggestions = response.suggestions;
          this.searching = false;
          
          console.log('📊 Resultados procesados:');
          console.log('  - Match:', this.match ? this.match.nombre : 'ninguno');
          console.log('  - Sugerencias:', this.suggestions.length);
          console.log('  - searching:', this.searching);
        });
      },
      error: (error) => {
        console.error('❌ Error en búsqueda:', error);
        
        // ✅ Forzar actualización en NgZone
        this.zone.run(() => {
          this.match = null;
          this.suggestions = [];
          this.searching = false;
          this.hasSearched = true;
        });
        
        alert('Error al buscar torneos. Por favor intenta de nuevo.');
      }
    });
  }

  clearResults(): void {
    this.zone.run(() => {
      this.match = null;
      this.suggestions = [];
      this.hasSearched = false;
      this.searching = false;
    });
  }

  viewTournament(torneo: TorneoPublico): void {
    console.log('👁️ Navegando a torneo:', torneo.id_torneo);
    this.router.navigate(['/torneos', torneo.id_torneo]);
  }
}