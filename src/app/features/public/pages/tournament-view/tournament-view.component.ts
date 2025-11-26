import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
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

interface UpcomingGame {
  id_partido: number;
  fecha: string;
  hora: string;
  equipo_local_nombre: string;
  equipo_visitante_nombre: string;
  cancha: string | number;
  jornada: number;
  estado: string;
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
  private cdr = inject(ChangeDetectorRef);  // ← NUEVO: Detector de cambios

  loading = true;
  error = '';
  torneo: TorneoPublico | null = null;

  loadingStandings = false;
  loadingScorers = false;
  loadingGames = false;
  standings: StandingRow[] = [];
  scorers: ScorerRow[] = [];
  upcomingGames: UpcomingGame[] = [];

  downloadingPDF = false;
  downloadMessage = '';

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    console.log('🔍 Cargando torneo ID:', id);
    
    if (!id || isNaN(id)) {
      this.error = 'ID de torneo inválido';
      this.loading = false;
      this.cdr.detectChanges();  // ← FORZAR detección
      return;
    }

    this.searchService.getPublicTournament(id).subscribe({
      next: (t) => {
        console.log('✅ Torneo cargado:', t);
        this.torneo = t;
        this.loading = false;
        this.cdr.detectChanges();  // ← FORZAR detección
        
        this.loadStandings(id);
        this.loadScorers(id);
        this.loadUpcomingGames(id);
      },
      error: (e) => {
        console.error('❌ Error al cargar torneo:', e);
        this.error = e?.error?.detail || 'No se pudo cargar el torneo.';
        this.loading = false;
        this.cdr.detectChanges();  // ← FORZAR detección
      }
    });
  }

  loadStandings(id: number) {
    this.loadingStandings = true;
    this.cdr.detectChanges();  // ← FORZAR detección
    
    this.http.get<{torneo: number, rows: StandingRow[]}>(`http://localhost:8000/tournaments/${id}/standings`)
      .subscribe({
        next: (response) => {
          this.standings = response.rows || [];
          this.loadingStandings = false;
          this.cdr.detectChanges();  // ← FORZAR detección
          console.log('✅ Tabla cargada:', this.standings);
        },
        error: (e) => {
          console.error('❌ Error al cargar tabla:', e);
          this.standings = [];
          this.loadingStandings = false;
          this.cdr.detectChanges();  // ← FORZAR detección
        }
      });
  }

  loadScorers(id: number) {
    this.loadingScorers = true;
    this.cdr.detectChanges();  // ← FORZAR detección
    
    this.http.get<{torneo: number, rows: ScorerRow[]}>(`http://localhost:8000/tournaments/${id}/leaders/scorers?limit=10`)
      .subscribe({
        next: (response) => {
          this.scorers = response.rows || [];
          this.loadingScorers = false;
          this.cdr.detectChanges();  // ← FORZAR detección
          console.log('✅ Anotadores cargados:', this.scorers);
        },
        error: (e) => {
          console.error('❌ Error al cargar anotadores:', e);
          this.scorers = [];
          this.loadingScorers = false;
          this.cdr.detectChanges();  // ← FORZAR detección
        }
      });
  }

  loadUpcomingGames(id: number) {
    this.loadingGames = true;
    this.cdr.detectChanges();  // ← FORZAR detección
    
    this.http.get<UpcomingGame[]>(`http://localhost:8000/tournaments/${id}/games/upcoming?limit=5`)
      .subscribe({
        next: (games) => {
          this.upcomingGames = games || [];
          this.loadingGames = false;
          this.cdr.detectChanges();  // ← FORZAR detección
          console.log('✅ Próximos juegos cargados:', this.upcomingGames);
        },
        error: (e) => {
          console.error('❌ Error al cargar juegos:', e);
          this.upcomingGames = [];
          this.loadingGames = false;
          this.cdr.detectChanges();  // ← FORZAR detección
        }
      });
  }

  downloadStandingsPDF() {
    if (!this.torneo || this.downloadingPDF) return;
    
    this.downloadingPDF = true;
    const url = `http://localhost:8000/tournaments/${this.torneo.id_torneo}/pdf/standings`;
    
    this.http.get(url, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        this.downloadFile(blob, `tabla_${this.torneo!.nombre.replace(/ /g, '_')}.pdf`);
        this.showDownloadMessage('✅ Tabla descargada correctamente');
        this.downloadingPDF = false;
        this.cdr.detectChanges();
      },
      error: (e) => {
        console.error('❌ Error descargando PDF:', e);
        this.showDownloadMessage('❌ Error al descargar PDF');
        this.downloadingPDF = false;
        this.cdr.detectChanges();
      }
    });
  }

  downloadScorersPDF() {
    if (!this.torneo || this.downloadingPDF) return;
    
    this.downloadingPDF = true;
    const url = `http://localhost:8000/tournaments/${this.torneo.id_torneo}/pdf/scorers`;
    
    this.http.get(url, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        this.downloadFile(blob, `anotadores_${this.torneo!.nombre.replace(/ /g, '_')}.pdf`);
        this.showDownloadMessage('✅ Anotadores descargados correctamente');
        this.downloadingPDF = false;
        this.cdr.detectChanges();
      },
      error: (e) => {
        console.error('❌ Error descargando PDF:', e);
        this.showDownloadMessage('❌ Error al descargar PDF');
        this.downloadingPDF = false;
        this.cdr.detectChanges();
      }
    });
  }

  downloadSchedulePDF() {
    if (!this.torneo || this.downloadingPDF) return;
    
    this.downloadingPDF = true;
    const url = `http://localhost:8000/tournaments/${this.torneo.id_torneo}/pdf/schedule`;
    
    this.http.get(url, { responseType: 'blob' }).subscribe({
      next: (blob) => {
        this.downloadFile(blob, `calendario_${this.torneo!.nombre.replace(/ /g, '_')}.pdf`);
        this.showDownloadMessage('✅ Calendario descargado correctamente');
        this.downloadingPDF = false;
        this.cdr.detectChanges();
      },
      error: (e) => {
        console.error('❌ Error descargando PDF:', e);
        this.showDownloadMessage('❌ Error al descargar PDF');
        this.downloadingPDF = false;
        this.cdr.detectChanges();
      }
    });
  }

  private downloadFile(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  private showDownloadMessage(message: string) {
    this.downloadMessage = message;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.downloadMessage = '';
      this.cdr.detectChanges();
    }, 3000);
  }

  formatDate(fecha: string | Date): string {
    if (!fecha) return 'Por definir';
    
    const date = typeof fecha === 'string' ? new Date(fecha) : fecha;
    if (isNaN(date.getTime())) return 'Por definir';
    
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 
                    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    
    const day = date.getDate();
    const month = months[date.getMonth()];
    
    return `${day} ${month}`;
  }

  volver() {
    this.router.navigate(['/']);
  }
}