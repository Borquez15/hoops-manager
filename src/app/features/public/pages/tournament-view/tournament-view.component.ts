import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TournamentSearchService, TorneoPublico } from '../../../../services/tournament-search.service';
import { HttpClient } from '@angular/common/http';

interface StandingRow {
  id_equipo: number;
  equipo: string;
  jj: number;
  jg: number;
  jp: number;
  pf: number;
  pc: number;
  dif: number;
  pts: number;
}

interface ScorerRow {
  jugador: string;
  equipo: string;
  jj: number;
  pts: number;
}

@Component({
  standalone: true,
  selector: 'app-tournament-view',
  imports: [CommonModule],
  templateUrl: './tournament-view.component.html',
  styleUrls: ['./tournament-view.component.css']
})
export class TournamentViewComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private searchService = inject(TournamentSearchService);
  private http = inject(HttpClient);

  loading = true;
  error = '';
  torneo: TorneoPublico | null = null;

  // Datos de estadísticas
  loadingStandings = false;
  loadingScorers = false;
  standings: StandingRow[] = [];
  scorers: ScorerRow[] = [];

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    console.log('📍 Cargando torneo ID:', id);
    
    if (!id || isNaN(id)) {
      this.error = 'ID de torneo inválido';
      this.loading = false;
      return;
    }

    // Cargar información del torneo
    this.searchService.getPublicTournament(id).subscribe({
      next: (t) => {
        console.log('✅ Torneo cargado:', t);
        this.torneo = t;
        this.loading = false;
        
        // Cargar estadísticas
        this.loadStandings(id);
        this.loadScorers(id);
      },
      error: (e) => {
        console.error('❌ Error al cargar torneo:', e);
        this.error = e?.error?.detail || 'No se pudo cargar el torneo.';
        this.loading = false;
      }
    });
  }

  loadStandings(id: number) {
    this.loadingStandings = true;
    this.http.get<{torneo: number, rows: StandingRow[]}>(`http://localhost:8000/tournaments/${id}/standings`)
      .subscribe({
        next: (response) => {
          this.standings = response.rows || [];
          this.loadingStandings = false;
          console.log('✅ Tabla cargada:', this.standings);
        },
        error: (e) => {
          console.error('❌ Error al cargar tabla:', e);
          this.loadingStandings = false;
        }
      });
  }

  loadScorers(id: number) {
    this.loadingScorers = true;
    this.http.get<{torneo: number, rows: ScorerRow[]}>(`http://localhost:8000/tournaments/${id}/leaders/scorers?limit=10`)
      .subscribe({
        next: (response) => {
          this.scorers = response.rows || [];
          this.loadingScorers = false;
          console.log('✅ Anotadores cargados:', this.scorers);
        },
        error: (e) => {
          console.error('❌ Error al cargar anotadores:', e);
          this.loadingScorers = false;
        }
      });
  }

  volver() {
    this.router.navigate(['/']);
  }
}