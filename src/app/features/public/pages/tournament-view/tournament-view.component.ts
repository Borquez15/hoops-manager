import { Component, inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TournamentSearchService, TorneoPublico } from '../../../../services/tournament-search.service';
import { HttpClient, HttpParams } from '@angular/common/http';
import { WebSocketService, WebSocketMessage } from '../../../../services/websocket.service';
import { Subscription } from 'rxjs';

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
  estado: string;
  en_vivo?: boolean;
  puntos_local?: number;
  puntos_visitante?: number;
}

type FiltroPeriodo = 'todos' | 'semana' | 'mes';
type FiltroEstado = 'todos' | 'PROGRAMADO' | 'JUGADO' | 'FINALIZADO';

interface ScheduleFilters {
  periodo: FiltroPeriodo;
  estado: FiltroEstado;
}

@Component({
  standalone: true,
  selector: 'app-tournament-view',
  imports: [CommonModule, FormsModule],
  templateUrl: './tournament-view.component.html',
  styleUrls: ['./tournament-view.component.css']
})
export class TournamentViewComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private searchService = inject(TournamentSearchService);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  private wsService = inject(WebSocketService);

  loading = true;
  error = '';
  torneo: TorneoPublico | null = null;

  loadingStandings = false;
  loadingScorers = false;
  loadingGames = false;
  standings: StandingRow[] = [];
  scorers: ScorerRow[] = [];
  upcomingGames: UpcomingGame[] = [];
  filteredGames: UpcomingGame[] = [];

  downloadingPDF = false;
  downloadMessage = '';

  // 🔴 WEBSOCKET
  wsConnected = false;
  wsSubscription?: Subscription;
  liveGamesCount = 0;

  scheduleFilters: ScheduleFilters = {
    periodo: 'todos',
    estado: 'todos'
  };

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    console.log('🔍 Cargando torneo ID:', id);
    
    if (!id || isNaN(id)) {
      this.error = 'ID de torneo inválido';
      this.loading = false;
      this.cdr.detectChanges();
      return;
    }

    this.searchService.getPublicTournament(id).subscribe({
      next: (t) => {
        console.log('✅ Torneo cargado:', t);
        this.torneo = t;
        this.loading = false;
        this.cdr.detectChanges();
        
        this.loadStandings(id);
        this.loadScorers(id);
        this.loadUpcomingGames(id);
        
        // 🔴 CONECTAR WEBSOCKET
        this.connectWebSocket(id);
      },
      error: (e) => {
        console.error('❌ Error al cargar torneo:', e);
        this.error = e?.error?.detail || 'No se pudo cargar el torneo.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  ngOnDestroy() {
    // 🔴 DESCONECTAR WEBSOCKET AL SALIR
    this.disconnectWebSocket();
  }

  // 🔴 CONECTAR AL WEBSOCKET
  private connectWebSocket(tournamentId: number) {
    console.log('🔌 Iniciando conexión WebSocket...');
    
    this.wsSubscription = this.wsService.connect(tournamentId).subscribe({
      next: (message: WebSocketMessage) => {
        this.handleWebSocketMessage(message);
      },
      error: (error) => {
        console.error('❌ Error en WebSocket:', error);
        this.wsConnected = false;
        this.cdr.detectChanges();
      }
    });
  }

  // 🔴 MANEJAR MENSAJES WEBSOCKET
  private handleWebSocketMessage(message: WebSocketMessage) {
    console.log('📨 Mensaje recibido:', message.type, message);

    switch (message.type) {
      case 'connection_info':
        this.wsConnected = true;
        console.log(`✅ Conectado: ${message.mensaje}`);
        this.cdr.detectChanges();
        break;

      case 'game_update':
        // Actualizar partido en la lista
        this.updateGameInList(message.data);
        break;

      case 'standings_update':
        // Recargar tabla de posiciones
        console.log('📊 Actualizando tabla de posiciones...');
        if (this.torneo) {
          this.loadStandings(this.torneo.id_torneo);
        }
        break;

      case 'pong':
        // Respuesta al ping (mantener viva la conexión)
        break;
    }
  }

  // 🔴 ACTUALIZAR PARTIDO EN LA LISTA
  private updateGameInList(gameData: any) {
    console.log('🔄 Actualizando partido:', gameData.id_partido);

    // Actualizar en upcomingGames
    const index = this.upcomingGames.findIndex(g => g.id_partido === gameData.id_partido);
    
    if (index !== -1) {
      this.upcomingGames[index] = {
        ...this.upcomingGames[index],
        puntos_local: gameData.puntos_local,
        puntos_visitante: gameData.puntos_visitante,
        estado: gameData.estado,
        en_vivo: gameData.estado === 'JUGADO' || gameData.estado === 'EN_VIVO'
      };

      // Recalcular partidos en vivo
      this.liveGamesCount = this.upcomingGames.filter(g => g.en_vivo).length;

      // Reaplicar filtros
      this.aplicarFiltros();

      this.cdr.detectChanges();
      
      console.log(`✅ Partido ${gameData.id_partido} actualizado: ${gameData.puntos_local} - ${gameData.puntos_visitante}`);
    }
  }

  // 🔴 DESCONECTAR WEBSOCKET
  private disconnectWebSocket() {
    if (this.wsSubscription) {
      this.wsSubscription.unsubscribe();
    }
    this.wsService.disconnect();
    this.wsConnected = false;
    console.log('🔌 WebSocket desconectado');
  }

  loadStandings(id: number) {
    this.loadingStandings = true;
    this.cdr.detectChanges();
    
    this.http.get<{torneo: number, rows: StandingRow[]}>(`https://hoopsbackend-production.up.railway.app/tournaments/${id}/standings`)
      .subscribe({
        next: (response) => {
          this.standings = response.rows || [];
          this.loadingStandings = false;
          this.cdr.detectChanges();
          console.log('✅ Tabla cargada:', this.standings);
        },
        error: (e) => {
          console.error('❌ Error al cargar tabla:', e);
          this.standings = [];
          this.loadingStandings = false;
          this.cdr.detectChanges();
        }
      });
  }

  loadScorers(id: number) {
    this.loadingScorers = true;
    this.cdr.detectChanges();
    
    this.http.get<{torneo: number, rows: ScorerRow[]}>(`https://hoopsbackend-production.up.railway.app/tournaments/${id}/leaders/scorers?limit=10`)
      .subscribe({
        next: (response) => {
          this.scorers = response.rows || [];
          this.loadingScorers = false;
          this.cdr.detectChanges();
          console.log('✅ Anotadores cargados:', this.scorers);
        },
        error: (e) => {
          console.error('❌ Error al cargar anotadores:', e);
          this.scorers = [];
          this.loadingScorers = false;
          this.cdr.detectChanges();
        }
      });
  }

  loadUpcomingGames(id: number) {
    this.loadingGames = true;
    this.cdr.detectChanges();
    
    this.http.get<UpcomingGame[]>(`https://hoopsbackend-production.up.railway.app/tournaments/${id}/games/upcoming?limit=100`)
      .subscribe({
        next: (games) => {
          this.upcomingGames = games || [];
          this.liveGamesCount = games.filter(g => g.en_vivo).length;
          this.aplicarFiltros();
          this.loadingGames = false;
          this.cdr.detectChanges();
          console.log('✅ Juegos cargados:', this.upcomingGames);
        },
        error: (e) => {
          console.error('❌ Error al cargar juegos:', e);
          this.upcomingGames = [];
          this.filteredGames = [];
          this.loadingGames = false;
          this.cdr.detectChanges();
        }
      });
  }

  cambiarFiltroPeriodo(periodo: FiltroPeriodo) {
    this.scheduleFilters.periodo = periodo;
    this.aplicarFiltros();
  }

  cambiarFiltroEstado(estado: FiltroEstado) {
    this.scheduleFilters.estado = estado;
    this.aplicarFiltros();
  }

  aplicarFiltros() {
    console.log('🔍 Aplicando filtros:', this.scheduleFilters);
    
    let filtrados = [...this.upcomingGames];

    if (this.scheduleFilters.periodo !== 'todos') {
      const hoy = new Date();
      filtrados = filtrados.filter(game => {
        const fechaPartido = new Date(game.fecha);
        
        if (this.scheduleFilters.periodo === 'semana') {
          const unaSemana = new Date(hoy);
          unaSemana.setDate(hoy.getDate() + 7);
          return fechaPartido >= hoy && fechaPartido <= unaSemana;
        } else if (this.scheduleFilters.periodo === 'mes') {
          const unMes = new Date(hoy);
          unMes.setMonth(hoy.getMonth() + 1);
          return fechaPartido >= hoy && fechaPartido <= unMes;
        }
        return true;
      });
    }

    if (this.scheduleFilters.estado !== 'todos') {
      filtrados = filtrados.filter(game => game.estado === this.scheduleFilters.estado);
    }

    this.filteredGames = filtrados;
    console.log(`✅ ${this.filteredGames.length} partidos después de filtros`);
    this.cdr.detectChanges();
  }

  downloadStandingsPDF() {
    if (!this.torneo || this.downloadingPDF) return;
    
    this.downloadingPDF = true;
    const url = `https://hoopsbackend-production.up.railway.app/tournaments/${this.torneo.id_torneo}/pdf/standings`;
    
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
    const url = `https://hoopsbackend-production.up.railway.app/tournaments/${this.torneo.id_torneo}/pdf/scorers`;
    
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
    
    let params = new HttpParams();
    
    if (this.scheduleFilters.estado !== 'todos') {
      params = params.set('estado', this.scheduleFilters.estado);
    }

    if (this.scheduleFilters.periodo === 'semana') {
      const hoy = new Date();
      const unaSemana = new Date(hoy);
      unaSemana.setDate(hoy.getDate() + 7);
      
      params = params.set('fecha_desde', hoy.toISOString().split('T')[0]);
      params = params.set('fecha_hasta', unaSemana.toISOString().split('T')[0]);
    } else if (this.scheduleFilters.periodo === 'mes') {
      const hoy = new Date();
      const unMes = new Date(hoy);
      unMes.setMonth(hoy.getMonth() + 1);
      
      params = params.set('fecha_desde', hoy.toISOString().split('T')[0]);
      params = params.set('fecha_hasta', unMes.toISOString().split('T')[0]);
    }

    const url = `https://hoopsbackend-production.up.railway.app/tournaments/${this.torneo.id_torneo}/pdf/schedule`;
    
    this.http.get(url, { responseType: 'blob', params }).subscribe({
      next: (blob) => {
        let filename = `calendario_${this.torneo!.nombre.replace(/ /g, '_')}`;
        
        if (this.scheduleFilters.estado !== 'todos') {
          filename += `_${this.scheduleFilters.estado.toLowerCase()}`;
        }
        if (this.scheduleFilters.periodo !== 'todos') {
          filename += `_${this.scheduleFilters.periodo}`;
        }
        
        filename += '.pdf';
        
        this.downloadFile(blob, filename);
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