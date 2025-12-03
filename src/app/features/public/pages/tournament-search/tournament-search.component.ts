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
    
    // ✅ Asegurar que los cambios se detecten
    this.zone.run(() => {
      this.searching = true;
      this.hasSearched = true;
      this.match = null;
      this.suggestions = [];
      this.cdr.detectChanges();
    });

    console.log('📊 Estado antes de búsqueda:', {
      searching: this.searching,
      hasSearched: this.hasSearched
    });

    this.searchService.search(query).subscribe({
      next: (response: SearchResponse) => {
        console.log('✅ Resultados recibidos:', response);
        
        this.zone.run(() => {
          this.match = response.match;
          this.suggestions = response.suggestions || [];
          this.searching = false;
          
          console.log('📊 Estado después de búsqueda:', {
            searching: this.searching,
            match: this.match,
            suggestions: this.suggestions.length
          });
          
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        console.error('❌ Error en búsqueda:', err);
        console.error('❌ Tipo de error:', err.constructor.name);
        console.error('❌ Status:', err.status);
        
        this.zone.run(() => {
          this.match = null;
          this.suggestions = [];
          this.searching = false;
          this.hasSearched = true;
          
          // ✅ Manejo específico de timeout
          if (err instanceof TimeoutError) {
            alert('⏱️ La búsqueda tardó demasiado. El servidor puede estar ocupado. Intenta de nuevo.');
          } else if (err.status === 0) {
            alert('❌ No se pudo conectar con el servidor. Verifica tu conexión a internet.');
          } else if (err.status === 404) {
            alert('❌ Endpoint no encontrado. Contacta a soporte.');
          } else {
            alert(`❌ Error al buscar torneos: ${err.message || 'Desconocido'}`);
          }
          
          this.cdr.detectChanges();
        });
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